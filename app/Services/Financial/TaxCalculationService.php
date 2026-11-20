<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\Reservation;
use App\Models\ReservationRefund;
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

        $hasVerifiedPan = $profile?->pan_verified_at !== null && ! blank($profile?->pan_number);

        $constitution = strtolower(trim((string) $profile?->business_constitution));
        $isIndividualOrHuf = in_array(
            $constitution,
            ['individual', 'proprietorship', 'sole proprietorship', 'huf'],
            true,
        );

        // Order-level exemption requires explicit CA approval reference, approved order, and verified PAN.
        // Blanket bypass without PAN verification or for non-individual entities is strictly disallowed.
        $isOrderExempt = $tdsConfig instanceof TaxConfiguration
            && $tdsConfig->is_exempt
            && $tdsConfig->is_approved
            && ! blank($tdsConfig->ca_approval_reference)
            && $hasVerifiedPan;

        $threshold = (int) config('tijum.settlements.tds_individual_huf_threshold_minor', 50000000); // INR 5,00,000 threshold
        $cumulativeFySales = $this->getCumulativeFinancialYearSales($owner, $date);
        $projectedFySales = $cumulativeFySales + $grossAmountMinor;

        // Individual/HUF statutory exemption applies only if PAN is verified and cumulative FY turnover <= threshold
        $isStatutoryExempt = $isIndividualOrHuf
            && $hasVerifiedPan
            && $projectedFySales <= $threshold;

        $exempt = $isOrderExempt || $isStatutoryExempt;

        if (! $exempt) {
            $tdsRateBps = $tdsConfig instanceof TaxConfiguration
                ? $tdsConfig->rate_bps
                : (int) config('tijum.settlements.default_tds_rate_bps', 10); // 10 bps = 0.10%
            $tdsAmountMinor = (int) round(($grossAmountMinor * $tdsRateBps) / 10000);
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

        // Section 393(1) withholding applies at time of credit or payment.
        // For reservations, payment is captured/credited at confirmed_at (with created_at fallback for legacy records).
        // Cancelled bookings are excluded, and processed refunds are subtracted to prevent turnover inflation.
        $reservationQuery = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->where(function ($query) use ($fyStart, $fyEnd): void {
                $query->whereBetween('confirmed_at', [$fyStart->toDateTimeString(), $fyEnd->toDateTimeString()])
                    ->orWhere(function ($q) use ($fyStart, $fyEnd): void {
                        $q->whereNull('confirmed_at')
                            ->whereBetween('created_at', [$fyStart->toDateTimeString(), $fyEnd->toDateTimeString()]);
                    });
            });

        $grossSales = (int) $reservationQuery->sum('total_amount_minor');

        $reservationIds = (clone $reservationQuery)->pluck('id');
        $processedRefunds = 0;
        if ($reservationIds->isNotEmpty()) {
            $processedRefunds = (int) ReservationRefund::query()
                ->whereIn('reservation_id', $reservationIds)
                ->where('status', RefundStatus::Processed)
                ->sum('amount_minor');
        }

        return max(0, $grossSales - $processedRefunds);
    }
}
