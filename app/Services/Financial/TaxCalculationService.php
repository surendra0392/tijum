<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\Reservation;
use App\Models\TaxConfiguration;
use Carbon\CarbonImmutable;

class TaxCalculationService
{
    /**
     * @return array{
     *     tds_rate_bps: int,
     *     tds_amount_minor: int,
     *     tcs_rate_bps: int,
     *     tcs_amount_minor: int,
     *     is_section_9_5_applicable: bool,
     *     is_tax_review_required: bool,
     *     tax_review_reason: string|null,
     * }
     */
    public function evaluateTaxes(
        Owner $owner,
        ?OwnerFinancialProfile $profile,
        int $grossAmountMinor,
        CarbonImmutable $date,
    ): array {
        $reviewRequired = $this->isTaxReviewRequired($owner, $profile);
        $reviewReason = null;

        if ($reviewRequired) {
            $reviewReason = 'Partner tax profile is incomplete, unverified, or pending accountant classification.';
        }

        $dateStr = $date->toDateString();

        // 1. Check approved Income-tax Act, 2025 Section 393(1) withholding rule (0.10% / 10 bps default)
        $tdsConfig = TaxConfiguration::query()
            ->where('code', 'ITA_2025_SEC_393')
            ->where('is_approved', true)
            ->where('effective_from', '<=', $dateStr)
            ->where(function ($query) use ($dateStr): void {
                $query->whereNull('effective_until')
                    ->orWhere('effective_until', '>=', $dateStr);
            })
            ->first();

        $tdsRateBps = 0;
        $tdsAmountMinor = 0;

        $isExemptFromConfig = $tdsConfig instanceof TaxConfiguration && $tdsConfig->is_exempt;

        if (! $isExemptFromConfig) {
            $isIndividualOrHuf = in_array(
                $profile?->business_constitution,
                ['individual', 'proprietorship'],
                true,
            );
            $threshold = (int) config('tijum.settlements.tds_individual_huf_threshold_minor', 50000000); // INR 5,00,000 threshold

            $hasVerifiedPan = $profile?->pan_verified_at !== null && ! blank($profile?->pan_number);

            $cumulativeFySales = $this->getCumulativeFinancialYearSales($owner, $date);
            $projectedFySales = $cumulativeFySales + $grossAmountMinor;

            // Individual/HUF exemption applies only if PAN is verified and cumulative FY turnover <= threshold
            $exempt = $isIndividualOrHuf
                && $hasVerifiedPan
                && $projectedFySales <= $threshold;

            if (! $exempt) {
                $tdsRateBps = $tdsConfig instanceof TaxConfiguration
                    ? $tdsConfig->rate_bps
                    : (int) config('tijum.settlements.default_tds_rate_bps', 10); // 10 bps = 0.10%
                $tdsAmountMinor = (int) round(($grossAmountMinor * $tdsRateBps) / 10000);
            }
        }

        // 2. Section 9(5) CGST Act classification
        $isSection95 = $profile?->supplier_legal_classification === 'unregistered'
            && ! ($profile?->gst_registered ?? false);

        // 3. GST TCS Section 52
        $tcsRateBps = 0;
        $tcsAmountMinor = 0;
        if (! $isSection95 && ($profile?->gst_registered ?? false)) {
            $tcsConfig = TaxConfiguration::query()
                ->where('code', 'GST_TCS_SEC_52')
                ->where('is_approved', true)
                ->where('effective_from', '<=', $dateStr)
                ->first();

            if ($tcsConfig instanceof TaxConfiguration && ! $tcsConfig->is_exempt) {
                $tcsRateBps = $tcsConfig->rate_bps;
                $tcsAmountMinor = (int) round(($grossAmountMinor * $tcsRateBps) / 10000);
            }
        }

        return [
            'tds_rate_bps' => $tdsRateBps,
            'tds_amount_minor' => $tdsAmountMinor,
            'tcs_rate_bps' => $tcsRateBps,
            'tcs_amount_minor' => $tcsAmountMinor,
            'is_section_9_5_applicable' => $isSection95,
            'is_tax_review_required' => $reviewRequired,
            'tax_review_reason' => $reviewReason,
        ];
    }

    public function isTaxReviewRequired(Owner $owner, ?OwnerFinancialProfile $profile): bool
    {
        if ($profile === null) {
            return true;
        }

        if (blank($profile->pan_number) || $profile->pan_verified_at === null) {
            return true;
        }

        if (blank($profile->supplier_legal_classification)) {
            return true;
        }

        if ($profile->gst_registered && blank($profile->gstin)) {
            return true;
        }

        return false;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public function getFinancialYearBounds(CarbonImmutable $date): array
    {
        $year = $date->year;
        if ($date->month < 4) {
            $fyStart = CarbonImmutable::create($year - 1, 4, 1, 0, 0, 0, $date->getTimezone());
            $fyEnd = CarbonImmutable::create($year, 3, 31, 23, 59, 59, $date->getTimezone());
        } else {
            $fyStart = CarbonImmutable::create($year, 4, 1, 0, 0, 0, $date->getTimezone());
            $fyEnd = CarbonImmutable::create($year + 1, 3, 31, 23, 59, 59, $date->getTimezone());
        }

        return [$fyStart, $fyEnd];
    }

    public function getCumulativeFinancialYearSales(Owner $owner, CarbonImmutable $date): int
    {
        [$fyStart, $fyEnd] = $this->getFinancialYearBounds($date);

        $propertyIds = $owner->properties()->pluck('id');
        if ($propertyIds->isEmpty()) {
            return 0;
        }

        return (int) Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereBetween('check_in_date', [$fyStart->toDateString(), $fyEnd->toDateString()])
            ->sum('total_amount_minor');
    }
}
