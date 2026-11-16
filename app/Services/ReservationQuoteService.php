<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Models\Property;
use App\Models\PropertyRoomType;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Quotes and revalidates a stay by reusing PropertySearchEligibility for public
 * eligibility, StayTimingPolicy for timing/rates, and
 * ReservationAvailabilityService for capacity.
 */
class ReservationQuoteService
{
    public function __construct(
        private readonly PropertySearchEligibility $eligibility,
        private readonly StayTimingPolicy $timing,
        private readonly ReservationPricingService $pricing,
        private readonly ReservationAvailabilityService $availability,
    ) {}

    /**
     * @return array{
     *     eligible: bool,
     *     checks: array<string, bool>,
     *     quote: array<string, mixed>|null,
     *     availability: array<string, mixed>|null,
     *     errors: list<string>,
     * }
     */
    public function quote(
        Property $property,
        PropertyRoomType $roomType,
        string $checkInDate,
        string $durationType,
        int $durationQuantity,
        int $quantity,
        ?string $requestedArrivalTime = null,
    ): array {
        $errors = [];
        $checks = $this->publicEligibilityChecks(
            $property,
            $roomType,
            $checkInDate,
            $durationType,
            $durationQuantity,
        );

        if (CarbonImmutable::parse($checkInDate, $this->timing->timezone())->startOfDay()
            ->lessThan(CarbonImmutable::now($this->timing->timezone())->startOfDay())) {
            $errors[] = 'Check-in cannot be in the past.';
        }

        if (! array_reduce($checks, fn (bool $carry, bool $check): bool => $carry && $check, true)) {
            $errors[] = 'The property or room type is not currently bookable for the requested stay.';
        }

        $quote = null;
        $availability = null;

        if ($errors === []) {
            try {
                $quote = $this->pricing->quote(
                    $roomType,
                    $checkInDate,
                    $durationType,
                    $durationQuantity,
                    $quantity,
                    $requestedArrivalTime,
                );

                $checkout = $this->timing->calculateCheckoutDate(
                    $checkInDate,
                    $durationType,
                    $durationQuantity,
                )->toDateString();

                $availability = $this->availability->stayCapacity(
                    $roomType,
                    $checkInDate,
                    $checkout,
                    $quantity,
                );

                if (! $availability['available']) {
                    $errors[] = 'Not enough capacity for the requested quantity across the stay.';
                }
            } catch (InvalidArgumentException $e) {
                $errors[] = $e->getMessage();
            }
        }

        return [
            'eligible' => $errors === [],
            'checks' => $checks,
            'quote' => $quote,
            'availability' => $availability,
            'errors' => $errors,
        ];
    }

    /**
     * Reuse the public search eligibility rules instead of duplicating them.
     *
     * @return array<string, bool>
     */
    private function publicEligibilityChecks(
        Property $property,
        PropertyRoomType $roomType,
        string $checkInDate,
        string $durationType,
        int $durationQuantity,
    ): array {
        $checkIn = CarbonImmutable::parse($checkInDate, $this->timing->timezone())->startOfDay();
        $checkOut = $this->timing->calculateCheckoutDate($checkIn, $durationType, $durationQuantity);
        $filters = [
            'check_in' => $checkIn->toDateString(),
            'duration_type' => $durationType,
            'duration_count' => $durationQuantity,
            'city' => $property->city_id,
            'category' => [],
            'gender_preference' => 'any',
            'sharing_capacity' => [],
            'ac' => [],
            'food_meals' => [],
            'amenities' => [],
            'min_price' => null,
            'max_price' => null,
            'early_check_in' => false,
        ];

        $eligible = $this->eligibility->basePropertyQuery($filters)
            ->whereKey($property->id)
            ->exists();

        $roomTypeQuery = PropertyRoomType::query()
            ->where('property_id', $property->id)
            ->whereKey($roomType->id);
        $this->eligibility->applyRoomTypeEligibility(
            $roomTypeQuery,
            $filters,
            $checkIn,
            $checkOut,
            $durationType,
        );
        $roomTypeEligible = $roomTypeQuery->exists();

        return [
            'property_verified_and_active' => $property->is_verified
                && $property->status === PropertyOperationalStatus::Active,
            'property_booking_eligible' => (bool) $property->booking_eligible,
            'owner_active_and_verified' => $property->owner !== null
                && $property->owner->status->value === 'active'
                && $property->owner->email_verified_at !== null,
            'city_and_category_active' => $property->city->is_active
                && $property->category->is_active,
            'room_type_active_with_rate' => $roomType->is_active
                && (int) ($roomType->{$this->eligibility->priceColumn($durationType)} ?? 0) > 0,
            'room_type_has_active_room' => $roomType->rooms()->where('operational_status', PropertyRoomStatus::Active->value)->exists(),
            'publicly_eligible' => $eligible,
            'room_type_publicly_eligible' => $roomTypeEligible,
        ];
    }
}
