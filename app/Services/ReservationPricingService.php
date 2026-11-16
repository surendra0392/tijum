<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Models\PropertyRoomType;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Integer-safe pricing for reservations using StayTimingPolicy durations and
 * direct room-type rates. No early-check-in fee exists in Phase 12.
 */
class ReservationPricingService
{
    public function __construct(private readonly StayTimingPolicy $timing) {}

    public function timezone(): string
    {
        return $this->timing->timezone();
    }

    /**
     * @return array{
     *     check_in_date: string,
     *     check_out_date: string,
     *     check_in_at: string,
     *     check_out_at: string,
     *     duration_type: string,
     *     duration_quantity: int,
     *     total_stay_days: int,
     *     quantity: int,
     *     quantity_basis: string,
     *     guest_count: int,
     *     unit_rate_minor: int,
     *     rate_unit: string,
     *     total_amount_minor: int,
     *     currency_code: string,
     *     early_check_in: array<string, mixed>,
     * }
     */
    public function quote(
        PropertyRoomType $roomType,
        string $checkInDate,
        string $durationType,
        int $durationQuantity,
        int $quantity,
        ?string $requestedArrivalTime = null,
    ): array {
        if ($durationQuantity < 1 || $durationQuantity > 30) {
            throw new InvalidArgumentException('Duration quantity must be between 1 and 30.');
        }

        if ($quantity < 1 || $quantity > 100) {
            throw new InvalidArgumentException('Quantity must be between 1 and 100.');
        }

        $daysPerUnit = $this->timing->durationDays($durationType);
        $totalDays = $daysPerUnit * $durationQuantity;

        $checkIn = CarbonImmutable::parse($checkInDate, $this->timing->timezone())->startOfDay();
        $checkoutDate = $this->timing->calculateCheckoutDate($checkIn, $durationType, $durationQuantity);

        $rateColumn = match ($durationType) {
            'weekly' => 'weekly_rate_minor',
            'monthly' => 'monthly_rate_minor',
            default => 'daily_rate_minor',
        };

        $rate = (int) ($roomType->{$rateColumn} ?? 0);
        if ($rate <= 0) {
            throw new InvalidArgumentException('No direct rate configured for this stay duration.');
        }

        $isShared = $roomType->accommodation_mode->value === PropertyRoomTypeMode::Shared->value;
        if (! $isShared && (int) $roomType->max_guests_per_room !== 1) {
            throw new InvalidArgumentException('Private room types must accommodate exactly one guest per room.');
        }
        $quantityBasis = $isShared
            ? ReservationQuantityBasis::GuestPlaces->value
            : ReservationQuantityBasis::PrivateRooms->value;
        $rateUnit = $isShared
            ? ReservationRateUnit::PerGuest->value
            : ReservationRateUnit::PerPrivateRoom->value;

        // Phase 12 rule: guest count equals quantity on either basis.
        $guestCount = $quantity;

        $totalAmount = $this->checkedMultiply($rate, $quantity, $durationQuantity);

        $arrival = $requestedArrivalTime !== null
            ? $this->timing->calculateArrivalTimestamp($checkIn, $requestedArrivalTime)
            : $this->timing->calculateArrivalTimestamp($checkIn);
        $departure = $this->timing->calculateCheckoutTimestamp($checkIn, $durationType, $durationQuantity);

        $early = $this->timing->evaluateEarlyCheckInEligibility($roomType, $requestedArrivalTime ?? $this->timing->getStandardCheckInTime());

        if ($requestedArrivalTime !== null && (! $early['permitted'] || ! $early['is_early_arrival'])) {
            throw new InvalidArgumentException((string) $early['message']);
        }

        return [
            'check_in_date' => $checkIn->toDateString(),
            'check_out_date' => $checkoutDate->toDateString(),
            'check_in_at' => $arrival->toIso8601String(),
            'check_out_at' => $departure->toIso8601String(),
            'duration_type' => $durationType,
            'duration_quantity' => $durationQuantity,
            'total_stay_days' => $totalDays,
            'quantity' => $quantity,
            'quantity_basis' => $quantityBasis,
            'guest_count' => $guestCount,
            'unit_rate_minor' => $rate,
            'rate_unit' => $rateUnit,
            'total_amount_minor' => (int) $totalAmount,
            'currency_code' => (string) config('tijum.pricing.currency_code', 'INR'),
            'early_check_in' => [
                'requested' => $requestedArrivalTime !== null,
                'requested_arrival_time' => $requestedArrivalTime,
                'outcome' => $early['outcome'],
                'label' => $early['label'],
                'permitted' => $early['permitted'],
            ],
        ];
    }

    private function checkedMultiply(int ...$values): int
    {
        $result = 1;

        foreach ($values as $value) {
            if ($value < 0 || ($value > 0 && $result > intdiv(PHP_INT_MAX, $value))) {
                throw new InvalidArgumentException('The calculated reservation total is too large.');
            }

            $result *= $value;
        }

        return $result;
    }
}
