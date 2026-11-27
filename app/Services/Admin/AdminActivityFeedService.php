<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\PropertyReview;
use App\Models\Reservation;
use App\Models\ReservationPayment;

class AdminActivityFeedService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function getRecentActivities(int $limit = 20): array
    {
        $activities = collect();

        // 1. Recent Reservations
        $reservations = Reservation::query()
            ->with(['property'])
            ->latest('created_at')
            ->limit(10)
            ->get();

        foreach ($reservations as $r) {
            $activities->push([
                'id' => "res-{$r->id}",
                'type' => 'reservation',
                'reference' => $r->booking_reference,
                'title' => "Reservation {$r->status->label()}",
                'description' => "Booking for {$r->contact_name} at {$r->property?->name}",
                'actor_label' => 'Customer',
                'created_at' => $r->created_at?->toIso8601String(),
                'created_timestamp' => $r->created_at?->timestamp ?? 0,
                'created_formatted' => $r->created_at?->diffForHumans() ?? '',
                'action_url' => route('admin.reservations.show', $r),
                'badge_variant' => match ($r->status) {
                    ReservationStatus::Confirmed => 'success',
                    ReservationStatus::AwaitingPayment => 'warning',
                    default => 'neutral',
                },
            ]);
        }

        // 2. Recent Payments
        $payments = ReservationPayment::query()
            ->with(['reservation.property'])
            ->latest('created_at')
            ->limit(10)
            ->get();

        foreach ($payments as $p) {
            $activities->push([
                'id' => "pay-{$p->id}",
                'type' => 'payment',
                'reference' => $p->gateway_payment_id ?? "PAY-{$p->id}",
                'title' => 'Payment '.ucfirst($p->status->value),
                'description' => '₹'.number_format($p->amount_minor / 100, 2)." for {$p->reservation?->booking_reference}",
                'actor_label' => 'Gateway',
                'created_at' => $p->created_at?->toIso8601String(),
                'created_timestamp' => $p->created_at?->timestamp ?? 0,
                'created_formatted' => $p->created_at?->diffForHumans() ?? '',
                'action_url' => "/admin/payments/{$p->id}",
                'badge_variant' => $p->status->value === 'captured' ? 'success' : 'error',
            ]);
        }

        // 3. Recent Customer Protection Cases
        $cases = CustomerProtectionCase::query()
            ->with(['reservation'])
            ->latest('created_at')
            ->limit(10)
            ->get();

        foreach ($cases as $c) {
            $activities->push([
                'id' => "case-{$c->id}",
                'type' => 'protection',
                'reference' => $c->case_reference,
                'title' => "Protection Case {$c->priority->label()}",
                'description' => "{$c->category->label()} for {$c->reservation?->booking_reference}",
                'actor_label' => 'Customer Support',
                'created_at' => $c->created_at?->toIso8601String(),
                'created_timestamp' => $c->created_at?->timestamp ?? 0,
                'created_formatted' => $c->created_at?->diffForHumans() ?? '',
                'action_url' => "/admin/customer-cases/{$c->case_reference}",
                'badge_variant' => $c->priority->value === 'urgent' ? 'error' : 'warning',
            ]);
        }

        // 4. Recent Settlements
        $settlements = PartnerSettlement::query()
            ->with('owner')
            ->latest('created_at')
            ->limit(10)
            ->get();

        foreach ($settlements as $s) {
            $activities->push([
                'id' => "settle-{$s->id}",
                'type' => 'settlement',
                'reference' => $s->settlement_reference,
                'title' => 'Settlement '.ucfirst($s->status->value),
                'description' => '₹'.number_format($s->net_settlement_amount_minor / 100, 2)." to {$s->owner?->name}",
                'actor_label' => 'Finance Operations',
                'created_at' => $s->created_at?->toIso8601String(),
                'created_timestamp' => $s->created_at?->timestamp ?? 0,
                'created_formatted' => $s->created_at?->diffForHumans() ?? '',
                'action_url' => "/admin/settlements/{$s->id}",
                'badge_variant' => match ($s->status->value) {
                    'settled' => 'success',
                    'pending_approval', 'approved', 'transfer_pending' => 'warning',
                    default => 'neutral',
                },
            ]);
        }

        // 5. Recent Partners
        $partners = Owner::query()
            ->with('latestVerificationApplication')
            ->latest('created_at')
            ->limit(5)
            ->get();

        foreach ($partners as $o) {
            $partnerUrl = $o->latestVerificationApplication !== null
                ? route('admin.partners.show', $o->latestVerificationApplication)
                : route('admin.partners.index');

            $activities->push([
                'id' => "partner-{$o->id}",
                'type' => 'partner',
                'reference' => "PTR-{$o->id}",
                'title' => 'Partner Onboarded',
                'description' => "{$o->name} ({$o->email})",
                'actor_label' => 'Partner',
                'created_at' => $o->created_at?->toIso8601String(),
                'created_timestamp' => $o->created_at?->timestamp ?? 0,
                'created_formatted' => $o->created_at?->diffForHumans() ?? '',
                'action_url' => $partnerUrl,
                'badge_variant' => $o->status->value === 'active' ? 'success' : 'neutral',
            ]);
        }

        // 6. Recent Reviews
        $reviews = PropertyReview::query()
            ->with(['property'])
            ->latest('created_at')
            ->limit(5)
            ->get();

        foreach ($reviews as $rev) {
            $activities->push([
                'id' => "review-{$rev->id}",
                'type' => 'review',
                'reference' => "REV-{$rev->id}",
                'title' => "Review {$rev->status->label()}",
                'description' => "{$rev->overall_rating} Stars by {$rev->customer_display_name} for {$rev->property->name}",
                'actor_label' => 'Customer',
                'created_at' => $rev->created_at->toIso8601String(),
                'created_timestamp' => $rev->created_at->timestamp,
                'created_formatted' => $rev->created_at->diffForHumans(),
                'action_url' => "/admin/reviews/{$rev->id}",
                'badge_variant' => $rev->status === ReviewStatus::Published ? 'success' : 'neutral',
            ]);
        }

        return $activities
            ->sortByDesc('created_timestamp')
            ->take($limit)
            ->values()
            ->all();
    }
}
