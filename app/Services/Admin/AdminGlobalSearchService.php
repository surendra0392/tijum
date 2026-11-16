<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AdminGlobalSearchService
{
    /**
     * @return array<string, list<array<string, mixed>>>
     */
    public function search(string $query, Admin $admin): array
    {
        $clean = trim($query);
        if (strlen($clean) < 2) {
            return [
                'reservations' => [],
                'cases' => [],
                'settlements' => [],
                'payments' => [],
                'partners' => [],
                'properties' => [],
                'customers' => [],
            ];
        }

        $canViewReservations = $admin->hasPermission('*') || $admin->hasPermission('bookings.view') || $admin->hasPermission('bookings.manage');
        $canViewFinance = $admin->hasPermission('*') || $admin->hasPermission('settlements.view');
        $canViewPartners = $admin->hasPermission('*') || $admin->hasPermission('partners.view');
        $canViewProperties = $admin->hasPermission('*') || $admin->hasPermission('properties.view');
        $canViewSupport = $admin->hasPermission('*') || $admin->hasPermission('support.manage') || $admin->hasPermission('operations.manage');

        $results = [
            'reservations' => [],
            'cases' => [],
            'settlements' => [],
            'payments' => [],
            'partners' => [],
            'properties' => [],
            'customers' => [],
            'reviews' => [],
        ];

        // 1. Reservations
        if ($canViewReservations) {
            $reservations = Reservation::query()
                ->where('booking_reference', 'like', "%{$clean}%")
                ->orWhere('contact_name', 'like', "%{$clean}%")
                ->orWhere('contact_email', 'like', "%{$clean}%")
                ->with(['property.city'])
                ->limit(5)
                ->get();

            $results['reservations'] = $reservations->map(fn (Reservation $r) => [
                'id' => $r->id,
                'title' => $r->booking_reference,
                'subtitle' => "{$r->contact_name} • {$r->property?->name} ({$r->status->label()})",
                'url' => "/admin/reservations/{$r->id}",
                'badge' => $r->status->label(),
            ])->all();
        }

        // 2. Customer Protection Cases
        if ($canViewSupport) {
            $cases = CustomerProtectionCase::query()
                ->where('case_reference', 'like', "%{$clean}%")
                ->orWhere('grievance_reference', 'like', "%{$clean}%")
                ->orWhereHas('user', fn ($q) => $q->where('name', 'like', "%{$clean}%"))
                ->with('user')
                ->limit(5)
                ->get();

            $results['cases'] = $cases->map(fn (CustomerProtectionCase $c) => [
                'id' => $c->id,
                'title' => $c->case_reference,
                'subtitle' => "{$c->user->name} • {$c->category->label()} ({$c->status->label()})",
                'url' => "/admin/customer-cases/{$c->case_reference}",
                'badge' => $c->priority->label(),
            ])->all();
        }

        // 3. Settlements
        if ($canViewFinance) {
            $settlements = PartnerSettlement::query()
                ->where('settlement_reference', 'like', "%{$clean}%")
                ->orWhere('provider_transfer_id', 'like', "%{$clean}%")
                ->with('owner')
                ->limit(5)
                ->get();

            $results['settlements'] = $settlements->map(fn (PartnerSettlement $s) => [
                'id' => $s->id,
                'title' => $s->settlement_reference,
                'subtitle' => "{$s->owner?->name} • ₹".number_format($s->net_settlement_amount_minor / 100, 2),
                'url' => "/admin/settlements/{$s->id}",
                'badge' => ucfirst($s->status->value),
            ])->all();
        }

        // 4. Payments
        if ($canViewFinance) {
            $payments = ReservationPayment::query()
                ->where('gateway_payment_id', 'like', "%{$clean}%")
                ->orWhere('gateway_order_id', 'like', "%{$clean}%")
                ->with('reservation')
                ->limit(5)
                ->get();

            $results['payments'] = $payments->map(fn (ReservationPayment $p) => [
                'id' => $p->id,
                'title' => $p->gateway_payment_id ?? "Payment #{$p->id}",
                'subtitle' => "Booking: {$p->reservation?->booking_reference} • ₹".number_format($p->amount_minor / 100, 2),
                'url' => "/admin/payments/{$p->id}",
                'badge' => ucfirst($p->status->value),
            ])->all();
        }

        // 5. Partners
        if ($canViewPartners) {
            $partners = Owner::query()
                ->where('name', 'like', "%{$clean}%")
                ->orWhere('email', 'like', "%{$clean}%")
                ->orWhere('phone', 'like', "%{$clean}%")
                ->limit(5)
                ->get();

            $results['partners'] = $partners->map(fn (Owner $o) => [
                'id' => $o->id,
                'title' => $o->name,
                'subtitle' => "{$o->email} • {$o->phone}",
                'url' => "/admin/partners/{$o->id}",
                'badge' => $o->status->label(),
            ])->all();
        }

        // 6. Properties
        if ($canViewProperties) {
            $properties = Property::query()
                ->where('name', 'like', "%{$clean}%")
                ->orWhere('address_line_1', 'like', "%{$clean}%")
                ->orWhere('locality', 'like', "%{$clean}%")
                ->with(['city', 'category'])
                ->limit(5)
                ->get();

            $results['properties'] = $properties->map(fn (Property $p) => [
                'id' => $p->id,
                'title' => $p->name,
                'subtitle' => "{$p->category?->name} in {$p->city?->name} ({$p->locality})",
                'url' => "/admin/properties/{$p->id}",
                'badge' => $p->is_verified ? 'Verified' : 'Unverified',
            ])->all();
        }

        // 7. Customers
        if ($canViewReservations || $canViewSupport) {
            $customers = User::query()
                ->where('name', 'like', "%{$clean}%")
                ->orWhere('email', 'like', "%{$clean}%")
                ->orWhere('phone', 'like', "%{$clean}%")
                ->limit(5)
                ->get();

            $results['customers'] = $customers->map(fn (User $u) => [
                'id' => $u->id,
                'title' => $u->name,
                'subtitle' => "{$u->email} • {$u->phone}",
                'url' => "/admin/reservations?customer={$u->id}",
                'badge' => $u->email_verified_at ? 'Verified' : 'Unverified',
            ])->all();
        }

        // 8. Reviews
        if ($admin->hasPermission('*') || $admin->hasPermission('reviews.view')) {
            $reviews = PropertyReview::query()
                ->where(function (Builder $q) use ($clean): void {
                    $q->where('title', 'like', "%{$clean}%")
                        ->orWhere('customer_display_name', 'like', "%{$clean}%")
                        ->orWhereHas('property', fn (Builder $pq) => $pq->where('name', 'like', "%{$clean}%"));
                })
                ->with(['property'])
                ->limit(5)
                ->get();

            $results['reviews'] = $reviews->map(fn (PropertyReview $r) => [
                'id' => $r->id,
                'title' => $r->title ?: "Review for {$r->property->name}",
                'subtitle' => "{$r->overall_rating} Stars • {$r->customer_display_name} • {$r->property->name}",
                'status' => $r->status->value,
                'url' => "/admin/reviews/{$r->id}",
            ])->all();
        }

        return $results;
    }
}
