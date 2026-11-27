<?php

declare(strict_types=1);

namespace App\Services\Protection;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Services\ReservationAvailabilityService;
use App\Services\ReservationPricingService;

class RelocationMatchingService
{
    public function __construct(
        private readonly ReservationAvailabilityService $availability,
        private readonly ReservationPricingService $pricing,
    ) {}

    /**
     * Search for eligible alternative food-inclusive accommodations.
     *
     * @return list<array<string, mixed>>
     */
    public function findAlternatives(Reservation $reservation): array
    {
        $cityId = $reservation->property->city_id;
        $checkIn = $reservation->check_in_date->toDateString();
        $checkout = $reservation->checkout_date->toDateString();
        $quantity = $reservation->quantity;

        // Query verified, booking-eligible properties in the same city with active operational status and food provided
        $candidateProperties = Property::query()
            ->where('city_id', $cityId)
            ->where('id', '!=', $reservation->property_id)
            ->where('status', PropertyOperationalStatus::Active->value)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->where('food_provided', true)
            ->with(['city', 'category', 'roomTypes.rooms'])
            ->get();

        $alternatives = [];

        foreach ($candidateProperties as $property) {
            foreach ($property->roomTypes as $roomType) {
                if (! $roomType->is_active) {
                    continue;
                }

                // Check guest gender policy compatibility
                if (! $this->isGenderEligible($roomType, $reservation->guest_gender)) {
                    continue;
                }

                // Check guest composition compatibility
                $allowedCompositions = array_map('strval', (array) $roomType->guest_composition_policy);
                if (! in_array((string) $reservation->guest_composition, $allowedCompositions, true)) {
                    continue;
                }

                // Calculate alternative price in integer paise (skip if rate for duration type is missing/zero)
                $alternativePriceMinor = $this->calculateStayPrice(
                    $roomType,
                    $reservation->duration_type,
                    $reservation->duration_quantity,
                    $quantity,
                );
                if ($alternativePriceMinor === null || $alternativePriceMinor <= 0) {
                    continue;
                }

                // Check authoritative capacity over the entire stay interval
                $stayCapacity = $this->availability->stayCapacity(
                    $roomType,
                    $checkIn,
                    $checkout,
                    $quantity,
                );

                if (! $stayCapacity['available']) {
                    continue;
                }

                // Price difference: original - alternative.
                // Positive => alternative is cheaper, customer receives refund for the difference.
                // Negative => alternative is more expensive; customer NEVER pays extra.
                $priceDifferenceMinor = $reservation->total_amount_minor - $alternativePriceMinor;

                $alternatives[] = [
                    'property_id' => $property->id,
                    'property_name' => $property->name,
                    'locality' => $property->locality,
                    'city_name' => $property->city?->name,
                    'property_owner_id' => $property->owner_id,
                    'room_type_id' => $roomType->id,
                    'room_type_name' => $roomType->name,
                    'is_air_conditioned' => (bool) $roomType->is_air_conditioned,
                    'sharing_mode' => $roomType->accommodation_mode->value,
                    'available_capacity' => $stayCapacity['minimum_remaining'],
                    'food_provided' => (bool) $property->food_provided,
                    'breakfast_included' => (bool) $property->breakfast_included,
                    'lunch_included' => (bool) $property->lunch_included,
                    'dinner_included' => (bool) $property->dinner_included,
                    'original_amount_minor' => $reservation->total_amount_minor,
                    'alternative_amount_minor' => $alternativePriceMinor,
                    'price_difference_minor' => $priceDifferenceMinor,
                    'refund_due_to_customer_minor' => max(0, $priceDifferenceMinor),
                    'customer_additional_cost_minor' => 0, // Explicitly guaranteed 0 per product rules
                ];
            }
        }

        return $alternatives;
    }

    private function isGenderEligible(PropertyRoomType $roomType, string $gender): bool
    {
        $policy = $roomType->gender_policy instanceof PropertyGenderPolicy
            ? $roomType->gender_policy
            : PropertyGenderPolicy::tryFrom((string) $roomType->gender_policy);

        return match ($policy) {
            PropertyGenderPolicy::MaleOnly => $gender === 'male',
            PropertyGenderPolicy::FemaleOnly => $gender === 'female',
            PropertyGenderPolicy::AllGenders, PropertyGenderPolicy::NotApplicable, null => in_array($gender, ['male', 'female', 'mixed'], true),
        };
    }

    private function calculateStayPrice(
        PropertyRoomType $roomType,
        string $durationType,
        int $durationQuantity,
        int $quantity,
    ): ?int {
        $unitRate = match ($durationType) {
            'monthly' => $roomType->monthly_rate_minor,
            'weekly' => $roomType->weekly_rate_minor,
            default => $roomType->daily_rate_minor,
        };

        if ($unitRate === null || (int) $unitRate <= 0) {
            return null;
        }

        return (int) $unitRate * $durationQuantity * $quantity;
    }
}
