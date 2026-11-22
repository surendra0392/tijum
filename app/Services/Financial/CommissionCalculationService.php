<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionGstType;
use App\Enums\CommissionSnapshotStatus;
use App\Models\PartnerCommissionAgreement;
use App\Models\PlatformSetting;
use App\Models\Property;
use App\Models\Reservation;
use Carbon\CarbonImmutable;

class CommissionCalculationService
{
    /**
     * @return array{
     *     commissionable_base_minor: int,
     *     commission_rate_bps: int,
     *     commission_amount_minor: int,
     *     commission_tax_amount_minor: int,
     *     net_partner_payable_minor: int,
     * }
     */
    public function calculate(
        int $bookingAmountMinor,
        PartnerCommissionAgreement $agreement,
        int $gstRateBps = 1800,
    ): array {
        $baseAmount = $bookingAmountMinor;
        $rateBps = $agreement->commission_rate_bps;

        // Integer paise arithmetic with deterministic rounding
        $commissionAmount = (int) round(($baseAmount * $rateBps) / 10000);

        $taxAmount = 0;
        if ($agreement->commission_gst_type === CommissionGstType::Exclusive) {
            $taxAmount = (int) round(($commissionAmount * $gstRateBps) / 10000);
        }

        $netPayable = max(0, $baseAmount - $commissionAmount - $taxAmount);

        return [
            'commissionable_base_minor' => $baseAmount,
            'commission_rate_bps' => $rateBps,
            'commission_amount_minor' => $commissionAmount,
            'commission_tax_amount_minor' => $taxAmount,
            'net_partner_payable_minor' => $netPayable,
        ];
    }

    public function resolveActiveAgreementForProperty(
        Property $property,
        CarbonImmutable $date,
    ): ?PartnerCommissionAgreement {
        $dateStr = $date->toDateString();

        // 1. Property-specific active agreement
        $propertyAgreement = PartnerCommissionAgreement::query()
            ->where('owner_id', $property->owner_id)
            ->where('property_id', $property->id)
            ->where('status', CommissionAgreementStatus::Active)
            ->where('effective_from', '<=', $dateStr)
            ->where(function ($query) use ($dateStr): void {
                $query->whereNull('effective_until')
                    ->orWhere('effective_until', '>=', $dateStr);
            })
            ->latest('id')
            ->first();

        if ($propertyAgreement instanceof PartnerCommissionAgreement) {
            return $propertyAgreement;
        }

        // 2. Owner-wide active agreement
        return PartnerCommissionAgreement::query()
            ->where('owner_id', $property->owner_id)
            ->whereNull('property_id')
            ->where('status', CommissionAgreementStatus::Active)
            ->where('effective_from', '<=', $dateStr)
            ->where(function ($query) use ($dateStr): void {
                $query->whereNull('effective_until')
                    ->orWhere('effective_until', '>=', $dateStr);
            })
            ->latest('id')
            ->first();
    }

    public function snapshotCommissionOnReservation(
        Reservation $reservation,
        ?PartnerCommissionAgreement $agreement = null,
    ): Reservation {
        if ($agreement === null && $reservation->property !== null) {
            $agreement = $this->resolveActiveAgreementForProperty(
                $reservation->property,
                CarbonImmutable::parse($reservation->submitted_at ?? now()),
            );
        }

        $baseAmount = ($reservation->original_amount_minor !== null && $reservation->original_amount_minor > 0)
            ? max(0, $reservation->original_amount_minor - ($reservation->coupon_property_share_minor ?? 0))
            : $reservation->total_amount_minor;
        $currency = strtoupper(trim((string) ($reservation->currency_code ?: 'INR')));

        if ($agreement === null) {
            $reservation->forceFill([
                'commission_status' => CommissionSnapshotStatus::Unassigned,
                'commission_agreement_id' => null,
                'commission_agreement_version' => null,
                'commission_rate_bps' => null,
                'commission_base_type' => null,
                'commissionable_base_minor' => null,
                'commission_amount_minor' => null,
                'commission_tax_amount_minor' => null,
                'net_partner_payable_minor' => $baseAmount,
                'commission_currency' => $currency,
            ])->save();

            return $reservation;
        }

        $gstBps = (int) (PlatformSetting::get('financial.commission_gst_rate_bps') ?? config('tijum.settlements.commission_gst_rate_bps', 1800));
        $calc = $this->calculate($baseAmount, $agreement, $gstBps);

        $reservation->forceFill([
            'commission_agreement_id' => $agreement->id,
            'commission_agreement_version' => $agreement->terms_version,
            'commission_rate_bps' => $calc['commission_rate_bps'],
            'commission_base_type' => $agreement->commission_base_type,
            'commissionable_base_minor' => $calc['commissionable_base_minor'],
            'commission_amount_minor' => $calc['commission_amount_minor'],
            'commission_tax_amount_minor' => $calc['commission_tax_amount_minor'],
            'net_partner_payable_minor' => $calc['net_partner_payable_minor'],
            'commission_currency' => $currency,
            'commission_status' => CommissionSnapshotStatus::Snapshotted,
        ])->save();

        return $reservation;
    }
}
