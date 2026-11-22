<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\AcceptCommissionAgreement;
use App\Actions\Owner\UpdateFinancialProfile;
use App\Enums\CommissionAgreementStatus;
use App\Enums\SettlementStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\PartnerCommissionAgreement;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OwnerFinancialController extends ApiController
{
    /**
     * Financial summary metrics (earnings, pending, settled).
     */
    public function summary(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $totalSettled = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->where('status', SettlementStatus::Settled->value)
            ->sum('net_settlement_amount_minor');

        $pendingSettlements = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->whereIn('status', [
                SettlementStatus::PendingApproval->value,
                SettlementStatus::Approved->value,
                SettlementStatus::TransferPending->value,
            ])
            ->sum('net_settlement_amount_minor');

        $statementsCount = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->count();

        return $this->success([
            'currency' => 'INR',
            'lifetime_settled_paise' => (int) $totalSettled,
            'total_settled_paise' => (int) $totalSettled,
            'pending_settlement_paise' => (int) $pendingSettlements,
            'pending_payout_paise' => (int) $pendingSettlements,
            'total_statements_count' => $statementsCount,
            'settlement_hold_hours' => (int) config('tijum.settlements.hold_interval_hours', 24),
            'note' => 'Marketplace settlements are processed automatically to your verified bank account following stay fulfilment.',
        ]);
    }

    /**
     * Paginated list of settlement payout batches.
     */
    public function settlements(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $settlements = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->latest('period_end')
            ->paginate(15);

        return $this->success(
            $settlements->items(),
            'Partner settlement statements retrieved',
            200,
            [
                'current_page' => $settlements->currentPage(),
                'last_page' => $settlements->lastPage(),
                'total' => $settlements->total(),
            ]
        );
    }

    /**
     * Detailed settlement view with reservation line items.
     */
    public function show(Request $request, string|int $reference): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $settlement = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($reference): void {
                if (is_numeric($reference)) {
                    $query->where('id', (int) $reference);
                } else {
                    $query->where('settlement_reference', (string) $reference);
                }
            })
            ->with(['items.reservation.property', 'financialProfile'])
            ->first();

        if ($settlement === null) {
            return $this->error("Settlement statement '{$reference}' not found.", 'NOT_FOUND', 404);
        }

        $items = $settlement->items->map(static fn (PartnerSettlementItem $item): array => [
            'id' => $item->id,
            'reservation_id' => $item->reservation_id,
            'booking_reference' => $item->reservation?->booking_reference,
            'property_name' => $item->reservation?->property?->name,
            'stay_dates' => $item->reservation
                ? $item->reservation->check_in_date->format('M d, Y').' – '.$item->reservation->checkout_date->format('M d, Y')
                : null,
            'item_type' => $item->item_type->value,
            'item_type_label' => $item->item_type->label(),
            'gross_amount_minor' => $item->gross_amount_minor,
            'commission_amount_minor' => $item->commission_amount_minor,
            'commission_tax_amount_minor' => $item->commission_tax_amount_minor,
            'tax_deduction_minor' => $item->tax_deduction_minor,
            'refund_deduction_minor' => $item->refund_deduction_minor,
            'net_payable_minor' => $item->net_payable_minor,
            'notes' => $item->notes,
        ])->values()->all();

        return $this->success([
            'id' => $settlement->id,
            'settlement_reference' => $settlement->settlement_reference,
            'period_start' => $settlement->period_start->toDateString(),
            'period_end' => $settlement->period_end->toDateString(),
            'currency' => $settlement->currency,
            'gross_booking_value_minor' => $settlement->gross_booking_value_minor,
            'commission_amount_minor' => $settlement->commission_amount_minor,
            'commission_tax_amount_minor' => $settlement->commission_tax_amount_minor,
            'statutory_deductions_minor' => $settlement->statutory_deductions_minor,
            'refund_adjustments_minor' => $settlement->refund_adjustments_minor,
            'relocation_adjustments_minor' => $settlement->relocation_adjustments_minor,
            'other_adjustments_minor' => $settlement->other_adjustments_minor,
            'net_settlement_amount_minor' => $settlement->net_settlement_amount_minor,
            'status' => $settlement->status->value,
            'status_label' => $settlement->status->label(),
            'provider_transfer_id' => $settlement->provider_transfer_id,
            'provider_status' => $settlement->provider_status,
            'failure_reason' => $settlement->failure_reason,
            'settled_at' => $settlement->settled_at?->toIso8601String(),
            'transfer_initiated_at' => $settlement->transfer_initiated_at?->toIso8601String(),
            'created_at' => $settlement->created_at?->toIso8601String(),
            'bank_account_masked' => $settlement->financialProfile?->bank_account_number_masked,
            'bank_name' => $settlement->financialProfile?->bank_name,
            'bank_ifsc' => $settlement->financialProfile?->bank_ifsc,
            'items' => $items,
        ], 'Settlement details retrieved successfully.');
    }

    /**
     * Retrieve owner financial profile (legal entity, PAN, GSTIN, masked bank account).
     */
    public function profile(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $profile = $owner->financialProfile;

        if ($profile === null) {
            return $this->success(null, 'No financial profile configured yet.');
        }

        return $this->success([
            'id' => $profile->id,
            'legal_business_name' => $profile->legal_business_name,
            'business_constitution' => $profile->business_constitution,
            'pan_number' => $profile->pan_number,
            'pan_verified' => $profile->pan_verified_at !== null,
            'gst_registered' => (bool) $profile->gst_registered,
            'gstin' => $profile->gstin,
            'supplier_legal_classification' => $profile->supplier_legal_classification,
            'razorpay_account_id' => $profile->razorpay_account_id,
            'linked_account_status' => $profile->linked_account_status->value,
            'linked_account_label' => $profile->linked_account_status->label(),
            'bank_beneficiary_name' => $profile->bank_beneficiary_name,
            'bank_account_number_masked' => $profile->bank_account_number_masked,
            'bank_ifsc' => $profile->bank_ifsc,
            'bank_name' => $profile->bank_name,
            'beneficiary_verified' => $profile->beneficiary_verified_at !== null,
            'onboarding_status' => $profile->onboarding_status->value,
            'onboarding_label' => $profile->onboarding_status->label(),
            'is_eligible' => $profile->isSettlementEligible(),
            'rejection_reason' => $profile->rejection_reason,
            'verified_at' => $profile->verified_at?->toIso8601String(),
        ], 'Financial profile retrieved successfully.');
    }

    /**
     * Update owner financial profile.
     */
    public function updateProfile(
        Request $request,
        UpdateFinancialProfile $action,
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $classificationMap = [
            'unregistered_hostel' => 'unregistered',
            'homestay_individual' => 'unregistered',
            'registered_hotelier' => 'regular',
        ];
        $classification = (string) $request->input('supplier_legal_classification', '');
        if (isset($classificationMap[$classification])) {
            $request->merge(['supplier_legal_classification' => $classificationMap[$classification]]);
        }

        $validated = $request->validate([
            'legal_business_name' => ['required', 'string', 'max:255'],
            'business_constitution' => ['required', 'string', Rule::in(['individual', 'proprietorship', 'partnership', 'llp', 'private_limited', 'trust_society'])],
            'pan_number' => ['required', 'string', 'regex:/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/'],
            'gst_registered' => ['required', 'boolean'],
            'gstin' => ['nullable', 'required_if:gst_registered,true', 'string', 'max:20'],
            'supplier_legal_classification' => ['required', 'string', Rule::in(['unregistered', 'regular', 'composition'])],
            'bank_beneficiary_name' => ['required', 'string', 'max:255'],
            'bank_account_number' => ['required', 'string', 'min:9', 'max:18'],
            'bank_ifsc' => ['required', 'string', 'regex:/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/'],
            'bank_name' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $profile = $action->execute($owner, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $profile->id,
            'legal_business_name' => $profile->legal_business_name,
            'pan_number' => $profile->pan_number,
            'bank_account_number_masked' => $profile->bank_account_number_masked,
            'bank_ifsc' => $profile->bank_ifsc,
            'onboarding_status' => $profile->onboarding_status->value,
            'is_eligible' => $profile->isSettlementEligible(),
        ], 'Financial profile submitted for verification successfully.');
    }

    /**
     * List commission agreements and terms.
     */
    public function agreements(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $agreements = $owner->commissionAgreements()
            ->with(['property'])
            ->get()
            ->map(static fn (PartnerCommissionAgreement $a): array => [
                'id' => $a->id,
                'agreement_reference' => $a->agreement_reference,
                'property_id' => $a->property_id,
                'property_name' => $a->property->name,
                'commission_rate_bps' => $a->commission_rate_bps,
                'commission_rate_percentage' => $a->getCommissionPercentage(),
                'commission_base_type' => $a->commission_base_type->value,
                'commission_base_label' => $a->commission_base_type->label(),
                'commission_gst_type' => $a->commission_gst_type->value,
                'commission_gst_label' => $a->commission_gst_type->label(),
                'terms_version' => $a->terms_version,
                'status' => $a->status->value,
                'status_label' => $a->status->label(),
                'effective_from' => $a->effective_from->toDateString(),
                'effective_until' => $a->effective_until?->toDateString(),
                'terms_hash' => $a->terms_hash,
                'accepted_by_owner_id' => $a->accepted_by_owner_id,
                'accepted_at' => $a->accepted_at?->toIso8601String(),
                'is_pending_acceptance' => $a->status === CommissionAgreementStatus::PendingAcceptance,
                'is_active' => $a->status === CommissionAgreementStatus::Active,
            ])->values()->all();

        return $this->success($agreements, 'Commission agreements retrieved successfully.');
    }

    /**
     * Electronically accept a pending commission agreement.
     */
    public function acceptAgreement(
        Request $request,
        int|string $id,
        AcceptCommissionAgreement $action,
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $agreement = PartnerCommissionAgreement::query()
            ->where('owner_id', $owner->id)
            ->where('id', (int) $id)
            ->first();

        if ($agreement === null) {
            return $this->error("Commission agreement '{$id}' not found.", 'NOT_FOUND', 404);
        }

        try {
            $accepted = $action->execute(
                $agreement,
                $owner,
                $request->ip(),
                $request->userAgent(),
            );
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $accepted->id,
            'agreement_reference' => $accepted->agreement_reference,
            'status' => $accepted->status->value,
            'terms_hash' => $accepted->terms_hash,
            'accepted_by_owner_id' => $accepted->accepted_by_owner_id,
            'accepted_at' => $accepted->accepted_at?->toIso8601String(),
        ], 'Commercial agreement terms accepted successfully.');
    }
}
