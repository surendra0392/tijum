<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    protected $model = Reservation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays($this->faker->numberBetween(2, 30))->startOfDay();
        $checkout = $checkIn->copy()->addDays($this->faker->numberBetween(1, 7));
        $quantity = $this->faker->numberBetween(1, 4);
        $rate = $this->faker->numberBetween(50000, 200000);

        return [
            'user_id' => User::factory()->create()->id,
            'property_id' => Property::query()->where('is_verified', true)->where('status', 'active')->inRandomOrder()->value('id')
                ?? Property::factory()->activeApproved()->create()->id,
            'property_room_type_id' => static fn (array $attributes): int => PropertyRoomType::query()
                ->where('property_id', $attributes['property_id'])
                ->where('is_active', true)
                ->inRandomOrder()
                ->value('id') ?? self::createFallbackRoomType((int) $attributes['property_id'])->id,
            'booking_reference' => 'TJR-'.CarbonImmutable::now('Asia/Kolkata')->format('Y').'-'.Str::ulid(),
            'submission_token' => Str::uuid()->toString(),
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkout->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => (int) $checkIn->diffInDays($checkout),
            'total_stay_days' => (int) $checkIn->diffInDays($checkout),
            'quantity' => $quantity,
            'guest_count' => $quantity,
            'quantity_basis' => ReservationQuantityBasis::GuestPlaces->value,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => $this->faker->name(),
            'contact_email' => $this->faker->unique()->safeEmail(),
            'contact_phone' => '+9198'.(string) $this->faker->numberBetween(10000000, 99999999),
            'early_check_in_requested' => false,
            'requested_arrival_time' => null,
            'snapshot_property_name' => 'Test Property',
            'snapshot_property_locality' => 'Madhapur',
            'snapshot_property_city' => 'Hyderabad',
            'snapshot_property_state' => 'Telangana',
            'snapshot_property_country_code' => 'IN',
            'snapshot_category_name' => 'PG',
            'snapshot_room_type_name' => 'Test Room Type',
            'snapshot_is_air_conditioned' => false,
            'snapshot_sharing_mode' => 'shared',
            'snapshot_max_capacity' => 4,
            'snapshot_food_provided' => true,
            'snapshot_breakfast_included' => true,
            'snapshot_lunch_included' => false,
            'snapshot_dinner_included' => true,
            'currency_code' => 'INR',
            'unit_rate_minor' => $rate,
            'rate_unit' => ReservationRateUnit::PerGuest->value,
            'total_amount_minor' => $rate * $quantity * (int) $checkIn->diffInDays($checkout),
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now('Asia/Kolkata')->addMinutes(15),
            'submitted_at' => CarbonImmutable::now('Asia/Kolkata'),
        ];
    }

    /**
     * Mark the reservation as confirmed.
     */
    public function confirmed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ReservationStatus::Confirmed,
            'confirmed_at' => CarbonImmutable::now('Asia/Kolkata'),
        ]);
    }

    /**
     * Mark the reservation as cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ReservationStatus::Cancelled,
            'cancelled_at' => CarbonImmutable::now('Asia/Kolkata'),
            'cancellation_reason' => 'Guest requested cancellation.',
        ]);
    }

    private static function createFallbackRoomType(int $propertyId): PropertyRoomType
    {
        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $propertyId,
            'name' => 'Factory Room Type',
            'slug' => Str::slug('factory-room-type').'-'.Str::lower(Str::random(6)),
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'max_guests_per_room' => 4,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => [],
            'daily_rate_minor' => 100000,
        ])->save();

        return $roomType;
    }
}
