<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Amenity;
use App\Models\AmenityCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Amenity>
 */
class AmenityFactory extends Factory
{
    public function definition(): array
    {
        /** @var string $name */
        $name = fake()->unique()->words(2, true);

        return [
            'amenity_category_id' => AmenityCategory::factory(),
            'code' => strtoupper((string) fake()->unique()->lexify('AMENITY_????')),
            'name' => ucfirst($name),
            'slug' => str($name)->slug()->toString(),
            'description' => fake()->optional()->sentence(),
            'applicability_scope' => fake()->randomElement(['property', 'room_type', 'both']),
            'icon_key' => fake()->optional()->randomElement(['wifi', 'parking', 'tv', 'bath', 'utensils']),
            'is_customer_visible' => true,
            'requires_review' => true,
            'display_order' => fake()->numberBetween(0, 100),
            'is_active' => true,
        ];
    }
}
