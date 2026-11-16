<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Owner;
use App\Models\PlatformSetting;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class SettlementCalculationService
{
    public function __construct(
        private readonly StayTimingPolicy $timingPolicy,
        private readonly CommissionCalculationService $commissionService,
        private readonly TaxCalculationService $taxService,
    ) {}

    /**
     * @return Collection<int, Reservation>
     */
    public function getEligibleReservations(Owner $owner, ?CarbonImmutable $asOf = null): Collection
    {
        $now = $asOf ?? CarbonImmutable::now($this->timingPolicy->timezone());
        $holdHours = (int) (PlatformSetting::get('financial.hold_interval_hours') ?? config('tijum.settlements.hold_interval_hours', 24));

        // Fetch properties belonging to owner
        $propertyIds = $owner->properties()->pluck('id');
        if ($propertyIds->isEmpty()) {
            return collect();
        }

        /** @var Collection<int, Reservation> $reservations */
        $reservations = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereHas('payments', function (Builder $query): void {
                $query->whereIn('status', [
                    PaymentStatus::Captured,
                    PaymentStatus::PartiallyRefunded,
                ]);
            })
            // Exclude already settled items
            ->whereDoesntHave('settlementItems', function (Builder $query): void {
                $query->whereHas('settlement', function (Builder $subQuery): void {
                    $subQuery->whereNotIn('status', [SettlementStatus::Cancelled, SettlementStatus::Failed]);
                });
            })
            // Exclude reservations with pending refunds
            ->whereDoesntHave('refunds', function (Builder $query): void {
                $query->whereIn('status', [
                    RefundStatus::Requested,
                    RefundStatus::Approved,
                    RefundStatus::Processing,
                ]);
            })
            // Exclude reservations with open customer protection cases
            ->whereDoesntHave('cases', function (Builder $query): void {
                $query->whereNotIn('status', [CaseStatus::Resolved, CaseStatus::Closed]);
            })
            ->with(['payments', 'refunds', 'cases', 'property'])
            ->get();

        // Filter by StayTimingPolicy standard checkout time (08:00 AM IST) + hold hours
        return $reservations->filter(function (Reservation $reservation) use ($now, $holdHours): bool {
            // Exclude reservations that have been fully refunded
            $processedRefunds = (int) $reservation->refunds
                ->where('status', RefundStatus::Processed)
                ->sum('amount_minor');

            if ($processedRefunds >= $reservation->total_amount_minor) {
                return false;
            }

            $checkoutDate = $reservation->checkout_date;
            $checkoutTime = $this->timingPolicy->getStandardCheckOutTime(); // e.g. "08:00"
            [$hour, $minute] = explode(':', $checkoutTime);

            $checkoutTimestamp = CarbonImmutable::parse($checkoutDate->toDateString(), $this->timingPolicy->timezone())
                ->setHour((int) $hour)
                ->setMinute((int) $minute)
                ->setSecond(0);

            $eligibleAfter = $checkoutTimestamp->addHours($holdHours);

            return $now->greaterThanOrEqualTo($eligibleAfter);
        })->values();
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return array{
     *     gross_booking_value_minor: int,
     *     commission_amount_minor: int,
     *     commission_tax_amount_minor: int,
     *     statutory_deductions_minor: int,
     *     refund_adjustments_minor: int,
     *     relocation_adjustments_minor: int,
     *     other_adjustments_minor: int,
     *     net_settlement_amount_minor: int,
     *     items: list<array<string, mixed>>,
     *     tax_review_required: bool,
     *     tax_review_reasons: list<string>,
     * }
     */
    public function calculateSettlementSummary(
        Owner $owner,
        Collection $reservations,
        ?CarbonImmutable $periodEnd = null,
    ): array {
        $profile = $owner->financialProfile;
        $date = $periodEnd ?? CarbonImmutable::now($this->timingPolicy->timezone());

        $grossTotal = 0;
        $commissionTotal = 0;
        $commissionTaxTotal = 0;
        $statutoryTotal = 0;
        $refundTotal = 0;
        $items = [];
        $taxReasons = [];

        $taxEval = $this->taxService->evaluateTaxes($owner, $profile, 0, $date);
        $taxReviewRequired = $taxEval['is_tax_review_required'];
        if ($taxEval['tax_review_reason'] !== null) {
            $taxReasons[] = $taxEval['tax_review_reason'];
        }

        foreach ($reservations as $reservation) {
            // Snapshot commission if not yet snapshotted
            if ($reservation->commission_amount_minor === null) {
                $reservation = $this->commissionService->snapshotCommissionOnReservation($reservation);
            }

            $bookingGross = ($reservation->original_amount_minor !== null && $reservation->original_amount_minor > 0)
                ? max(0, $reservation->original_amount_minor - ($reservation->coupon_property_share_minor ?? 0))
                : $reservation->total_amount_minor;
            $commAmount = $reservation->commission_amount_minor ?? 0;
            $commTax = $reservation->commission_tax_amount_minor ?? 0;

            // Calculate completed customer refunds on this reservation
            $completedRefunds = $reservation->refunds
                ->where('status', RefundStatus::Processed)
                ->sum('amount_minor');

            // Tax evaluation for this line
            $resTax = $this->taxService->evaluateTaxes($owner, $profile, $bookingGross, $date);
            $tdsAmount = $resTax['tds_amount_minor'];

            $lineNet = max(0, $bookingGross - $commAmount - $commTax - $tdsAmount - $completedRefunds);

            $grossTotal += $bookingGross;
            $commissionTotal += $commAmount;
            $commissionTaxTotal += $commTax;
            $statutoryTotal += $tdsAmount;
            $refundTotal += $completedRefunds;

            /** @var ReservationPayment|null $payment */
            $payment = $reservation->payments->first(function (ReservationPayment $payment): bool {
                return in_array($payment->status, [
                    PaymentStatus::Captured,
                    PaymentStatus::PartiallyRefunded,
                ], true);
            });

            $items[] = [
                'reservation_id' => $reservation->id,
                'reservation_payment_id' => $payment?->id,
                'booking_reference' => $reservation->booking_reference,
                'item_type' => SettlementItemType::BookingPayable,
                'gross_amount_minor' => $bookingGross,
                'commission_amount_minor' => $commAmount,
                'commission_tax_amount_minor' => $commTax,
                'tax_deduction_minor' => $tdsAmount,
                'refund_deduction_minor' => $completedRefunds,
                'net_payable_minor' => $lineNet,
                'notes' => "Fulfilled stay at {$reservation->property?->name}",
            ];
        }

        $netTotal = max(0, $grossTotal - $commissionTotal - $commissionTaxTotal - $statutoryTotal - $refundTotal);

        return [
            'gross_booking_value_minor' => $grossTotal,
            'commission_amount_minor' => $commissionTotal,
            'commission_tax_amount_minor' => $commissionTaxTotal,
            'statutory_deductions_minor' => $statutoryTotal,
            'refund_adjustments_minor' => $refundTotal,
            'relocation_adjustments_minor' => 0,
            'other_adjustments_minor' => 0,
            'net_settlement_amount_minor' => $netTotal,
            'items' => $items,
            'tax_review_required' => $taxReviewRequired,
            'tax_review_reasons' => array_unique($taxReasons),
        ];
    }
}
