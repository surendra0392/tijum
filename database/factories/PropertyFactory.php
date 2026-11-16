<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PropertyOperationalStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    protected $model = Property::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = $this->faker->unique()->company().' Residency';
        $reference = 'TJP-'.now()->format('Y').'-'.str_pad((string) $this->faker->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT);

        return [
            'owner_id' => Owner::factory()->active(),
            'property_category_id' => static fn (): int => PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id')
                ?? PropertyCategory::query()->where('slug', 'pg-accommodation')->value('id')
                ?? PropertyCategory::factory()->create([
                    'name' => 'Hostels/PG',
                    'slug' => PropertyCategory::SLUG_HOSTELS_PG,
                    'code' => PropertyCategory::SLUG_HOSTELS_PG,
                    'sort_order' => 1,
                ])->id,
            'city_id' => static fn (): int => City::query()->where('slug', 'hyderabad')->value('id')
                ?? (int) City::query()->create([
                    'name' => 'Hyderabad',
                    'slug' => 'hyderabad',
                    'state' => 'Telangana',
                    'state_code' => 'TG',
                    'country_code' => 'IN',
                    'is_active' => true,
                    'sort_order' => 1,
                ])->id,
            'property_reference' => $reference,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(5)),
            'description' => 'Clean, affordable, food-inclusive accommodation prepared for verified guests in launch cities.',
            'contact_person_name' => $this->faker->name(),
            'contact_phone' => '+9198'.(string) $this->faker->numberBetween(10000000, 99999999),
            'contact_email' => $this->faker->safeEmail(),
            'address_line_1' => 'Plot 14, Madhapur Main Road',
            'address_line_2' => 'Opposite Metro Station',
            'locality' => 'Madhapur',
            'landmark' => 'Hitech City Arch',
            'postal_code' => '500081',
            'state' => 'Telangana',
            'country_code' => 'IN',
            'latitude' => '17.4482920',
            'longitude' => '78.3914850',
            'status' => PropertyOperationalStatus::Draft,
            'is_verified' => false,
            'booking_eligible' => false,
        ];
    }

    public function activeApproved(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => PropertyOperationalStatus::Active,
            'is_verified' => true,
            'booking_eligible' => true,
            'approved_at' => now(),
        ]);
    }

    public function hostelsPg(): static
    {
        return $this->state(fn (array $attributes): array => [
            'property_category_id' => PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id')
                ?? PropertyCategory::factory()->create([
                    'name' => 'Hostels/PG',
                    'slug' => PropertyCategory::SLUG_HOSTELS_PG,
                    'code' => PropertyCategory::SLUG_HOSTELS_PG,
                    'sort_order' => 1,
                ])->id,
        ]);
    }

    public function homestays(): static
    {
        return $this->state(fn (array $attributes): array => [
            'property_category_id' => PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOMESTAYS)->value('id')
                ?? PropertyCategory::factory()->create([
                    'name' => 'Homestays',
                    'slug' => PropertyCategory::SLUG_HOMESTAYS,
                    'code' => PropertyCategory::SLUG_HOMESTAYS,
                    'sort_order' => 2,
                ])->id,
        ]);
    }

    public function coLiving(): static
    {
        return $this->state(fn (array $attributes): array => [
            'property_category_id' => PropertyCategory::query()->where('slug', PropertyCategory::SLUG_CO_LIVING)->value('id')
                ?? PropertyCategory::factory()->create([
                    'name' => 'Co-Living',
                    'slug' => PropertyCategory::SLUG_CO_LIVING,
                    'code' => PropertyCategory::SLUG_CO_LIVING,
                    'sort_order' => 3,
                ])->id,
        ]);
    }
}
