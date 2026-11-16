<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AmenityCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AmenityCategory>
 */
class AmenityCategoryFactory extends Factory
{
    public function definition(): array
    {
        /** @var string $name */
        $name = fake()->unique()->words(2, true);

        return [
            'code' => strtoupper((string) fake()->unique()->lexify('CAT_????')),
            'name' => ucfirst($name),
            'slug' => str($name)->slug()->toString(),
            'description' => fake()->optional()->sentence(),
            'display_order' => fake()->numberBetween(0, 100),
            'is_active' => true,
        ];
    }
}
