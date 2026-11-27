<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Enums\CaseStatus;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\OwnerStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyVerificationStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Enums\SettlementStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\PlatformSetting;
use App\Models\PropertyReview;
use App\Models\PropertyVerificationApplication;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AdminOperationsQueueService
{
    private string $timezone;

    public function __construct()
    {
        $this->timezone = (string) config('tijum.pricing.timezone', 'Asia/Kolkata');
    }

    /**
     * @return array<string, mixed>
     */
    public function getQueues(): array
    {
        return [
            'partner_onboarding' => $this->getPartnerOnboardingQueue(),
            'property_approval' => $this->getPropertyApprovalQueue(),
            'reservation_operations' => $this->getReservationOperationsQueue(),
            'customer_protection' => $this->getCustomerProtectionQueue(),
            'payment_operations' => $this->getPaymentOperationsQueue(),
            'financial_operations' => $this->getFinancialOperationsQueue(),
            'review_moderation' => $this->getReviewModerationQueue(),
        ];
    }

    /**
     * Partners awaiting document review, approval, or financial verification.
     *
     * @return list<array<string, mixed>>
     */
    public function getPartnerOnboardingQueue(): array
    {
        $owners = Owner::query()
            ->whereIn('status', [
                OwnerStatus::PendingVerification,
                OwnerStatus::PendingReview,
            ])
            ->orWhereHas('financialProfile', function (Builder $q): void {
                $q->where('onboarding_status', FinancialOnboardingStatus::Submitted);
            })
            ->with(['businessProfile', 'financialProfile', 'latestVerificationApplication'])
            ->latest()
            ->limit(10)
            ->get();

        return $owners->map(function (Owner $owner): array {
            $hasFinancialPending = $owner->financialProfile?->onboarding_status === FinancialOnboardingStatus::Submitted;
            $partnerUrl = $owner->latestVerificationApplication !== null
                ? route('admin.partners.show', $owner->latestVerificationApplication)
                : route('admin.partners.index');

            return [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'business_name' => $owner->businessProfile?->display_business_name ?? $owner->businessProfile?->legal_business_name ?? 'Individual Operator',
                'status' => $owner->status->value,
                'status_label' => $owner->status->label(),
                'type' => $hasFinancialPending ? 'bank_verification' : 'partner_approval',
                'badge' => $hasFinancialPending ? 'Bank Review' : 'Identity Review',
                'created_at' => $owner->created_at?->toIso8601String(),
                'created_formatted' => $owner->created_at?->format('d M, H:i'),
                'action_url' => $hasFinancialPending ? route('admin.partners.financial.show', $owner) : $partnerUrl,
            ];
        })->values()->all();
    }

    /**
     * Properties and property amendments submitted for verification.
     *
     * @return list<array<string, mixed>>
     */
    public function getPropertyApprovalQueue(): array
    {
        $applications = PropertyVerificationApplication::query()
            ->whereIn('status', [
                PropertyVerificationStatus::Submitted->value,
                PropertyVerificationStatus::UnderReview->value,
            ])
            ->with(['property.city', 'property.category', 'property.owner'])
            ->latest()
            ->limit(10)
            ->get();

        return $applications->map(function (PropertyVerificationApplication $app): array {
            return [
                'id' => $app->id,
                'property_id' => $app->property_id,
                'property_name' => $app->property?->name ?? 'Unknown Property',
                'city' => $app->property?->city?->name ?? 'Hyderabad',
                'category' => $app->property?->category?->name ?? 'Hostel',
                'owner_name' => $app->property?->owner?->name ?? 'Owner',
                'status' => $app->status,
                'submitted_at' => $app->created_at?->toIso8601String(),
                'submitted_formatted' => $app->created_at?->format('d M, H:i'),
                'action_url' => "/admin/properties/{$app->property_id}",
            ];
        })->values()->all();
    }

    /**
     * Reservations requiring attention: awaiting customer payment, approaching deadline.
     *
     * @return list<array<string, mixed>>
     */
    public function getReservationOperationsQueue(): array
    {
        $reservations = Reservation::query()
            ->whereIn('status', [
                ReservationStatus::AwaitingPayment,
            ])
            ->orWhere(function (Builder $q): void {
                $q->where('status', ReservationStatus::Cancelled)
                    ->whereDoesntHave('cases');
            })
            ->with(['property.city', 'user'])
            ->latest()
            ->limit(10)
            ->get();

        $now = CarbonImmutable::now($this->timezone);

        return array_values($reservations->map(function (Reservation $res) use ($now): array {
            $isAwaitingPayment = $res->status === ReservationStatus::AwaitingPayment;
            $isDeadlineClose = $isAwaitingPayment && $res->payment_deadline_at && $res->payment_deadline_at->diffInMinutes($now, false) > -30;

            return [
                'id' => $res->id,
                'booking_reference' => $res->booking_reference,
                'property_name' => $res->property?->name ?? 'Property',
                'city' => $res->property?->city?->name ?? 'City',
                'guest_name' => $res->contact_name ?: $res->user?->name ?? 'Guest',
                'stay_dates' => "{$res->check_in_date->format('d M')} - {$res->checkout_date->format('d M')}",
                'status' => $res->status->value,
                'status_label' => $res->status->label(),
                'is_urgent' => $isDeadlineClose || $res->status === ReservationStatus::Cancelled,
                'deadline_formatted' => $res->payment_deadline_at?->format('H:i, d M'),
                'action_url' => route('admin.reservations.show', $res),
            ];
        })->all());
    }

    /**
     * Customer protection queue: sorted by Urgent/Safety first, then statutory SLA deadline.
     *
     * @return list<array<string, mixed>>
     */
    public function getCustomerProtectionQueue(): array
    {
        $now = CarbonImmutable::now($this->timezone);
        $ackHours = max(1, (int) PlatformSetting::get('grievance.sla_acknowledgement_hours', config('tijum.customer_protection.sla.acknowledgement_hours', 48)));
        $ackCutoff = $now->subHours($ackHours);

        $cases = CustomerProtectionCase::query()
            ->whereNotIn('status', [CaseStatus::Resolved, CaseStatus::Closed])
            ->with(['reservation.property', 'user'])
            ->orderByRaw("CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END")
            ->orderBy('sla_due_at', 'asc')
            ->limit(10)
            ->get();

        return $cases->map(function (CustomerProtectionCase $case) use ($ackCutoff): array {
            $isAckOverdue = $case->acknowledged_at === null && $case->created_at->lt($ackCutoff);
            $isResolutionOverdue = $case->isOverdue();

            return [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'priority' => $case->priority->value,
                'priority_label' => $case->priority->label(),
                'customer_name' => $case->user?->name ?? 'Guest',
                'property_name' => $case->reservation?->property?->name ?? 'Property',
                'is_ack_overdue' => $isAckOverdue,
                'is_resolution_overdue' => $isResolutionOverdue,
                'created_at' => $case->created_at?->toIso8601String(),
                'created_formatted' => $case->created_at?->format('d M, H:i'),
                'action_url' => "/admin/customer-cases/{$case->case_reference}",
            ];
        })->values()->all();
    }

    /**
     * Payment operations: failed payments, failed refunds, or pending refunds.
     *
     * @return list<array<string, mixed>>
     */
    public function getPaymentOperationsQueue(): array
    {
        $failedRefunds = ReservationRefund::query()
            ->where('status', RefundStatus::Failed)
            ->with(['reservation.user'])
            ->latest()
            ->limit(5)
            ->get();

        $failedPayments = ReservationPayment::query()
            ->where('status', PaymentStatus::Failed)
            ->with(['reservation.user'])
            ->latest()
            ->limit(5)
            ->get();

        $items = [];

        foreach ($failedRefunds as $refund) {
            $items[] = [
                'id' => $refund->id,
                'type' => 'failed_refund',
                'title' => "Failed Refund for {$refund->reservation?->booking_reference}",
                'amount_minor' => $refund->amount_minor,
                'amount_formatted' => '₹'.number_format($refund->amount_minor / 100, 2),
                'customer_name' => $refund->reservation?->user?->name ?? 'Guest',
                'reason' => $refund->failure_reason ?? 'Provider error',
                'action_url' => "/admin/payments/{$refund->reservation_payment_id}",
            ];
        }

        foreach ($failedPayments as $payment) {
            $items[] = [
                'id' => $payment->id,
                'type' => 'failed_payment',
                'title' => "Failed Payment for {$payment->reservation?->booking_reference}",
                'amount_minor' => $payment->amount_minor,
                'amount_formatted' => '₹'.number_format($payment->amount_minor / 100, 2),
                'customer_name' => $payment->reservation?->user?->name ?? 'Guest',
                'reason' => $payment->failure_description ?? 'Payment declined or aborted',
                'action_url' => "/admin/payments/{$payment->id}",
            ];
        }

        return $items;
    }

    /**
     * Financial & settlement queue: pending approvals, failed transfers, reconciliation issues.
     *
     * @return list<array<string, mixed>>
     */
    public function getFinancialOperationsQueue(): array
    {
        $pendingSettlements = PartnerSettlement::query()
            ->whereIn('status', [SettlementStatus::PendingApproval, SettlementStatus::Draft])
            ->with('owner')
            ->latest()
            ->limit(5)
            ->get();

        $failedTransfers = ProviderTransfer::query()
            ->where('status', ProviderTransferStatus::Failed)
            ->with('settlement.owner')
            ->latest()
            ->limit(5)
            ->get();

        $items = [];

        foreach ($pendingSettlements as $settlement) {
            $items[] = [
                'id' => $settlement->id,
                'type' => 'pending_settlement',
                'reference' => $settlement->settlement_reference,
                'title' => 'Settlement Approval Required',
                'partner_name' => $settlement->owner?->name ?? 'Partner',
                'amount_minor' => $settlement->net_settlement_amount_minor,
                'amount_formatted' => '₹'.number_format($settlement->net_settlement_amount_minor / 100, 2),
                'status' => $settlement->status->value,
                'action_url' => "/admin/settlements/{$settlement->id}",
            ];
        }

        foreach ($failedTransfers as $transfer) {
            $items[] = [
                'id' => $transfer->id,
                'type' => 'failed_transfer',
                'reference' => $transfer->settlement?->settlement_reference ?? "TRF-{$transfer->id}",
                'title' => 'Failed Route Transfer',
                'partner_name' => $transfer->settlement?->owner?->name ?? 'Partner',
                'amount_minor' => $transfer->amount_minor,
                'amount_formatted' => '₹'.number_format($transfer->amount_minor / 100, 2),
                'status' => 'failed',
                'action_url' => "/admin/settlements/{$transfer->partner_settlement_id}",
            ];
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function getReviewModerationQueue(): array
    {
        $reviews = PropertyReview::query()
            ->where('status', ReviewStatus::PendingModeration)
            ->with(['property.city', 'user'])
            ->latest('submitted_at')
            ->limit(10)
            ->get();

        return $reviews->map(function (PropertyReview $r): array {
            return [
                'id' => $r->id,
                'customer_display_name' => $r->customer_display_name,
                'property_name' => $r->property->name,
                'city_name' => $r->property->city?->name,
                'overall_rating' => $r->overall_rating,
                'title' => $r->title,
                'submitted_at' => $r->submitted_at?->toIso8601String(),
                'submitted_formatted' => $r->submitted_at?->format('d M, H:i'),
                'action_url' => "/admin/reviews/{$r->id}",
            ];
        })->values()->all();
    }
}
