<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PropertyCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PropertyCategory>
 */
class PropertyCategoryFactory extends Factory
{
    protected $model = PropertyCategory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = 'Category '.Str::title($this->faker->unique()->word().' '.$this->faker->word());

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'code' => Str::slug($name, '_'),
            'description' => $this->faker->sentence(),
            'is_active' => true,
            'sort_order' => 10,
        ];
    }

    public function hostelsPg(): static
    {
        return $this->state(fn (array $attributes): array => [
            'name' => 'Hostels/PG',
            'slug' => PropertyCategory::SLUG_HOSTELS_PG,
            'code' => PropertyCategory::SLUG_HOSTELS_PG,
            'description' => 'Student, working-professional, and paying guest shared or private accommodation offering regular home-style meals and structured house rules.',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    public function homestays(): static
    {
        return $this->state(fn (array $attributes): array => [
            'name' => 'Homestays',
            'slug' => PropertyCategory::SLUG_HOMESTAYS,
            'code' => PropertyCategory::SLUG_HOMESTAYS,
            'description' => 'Warm host-managed residential accommodation with authentic regional dining included for short, weekly, and monthly guests.',
            'is_active' => true,
            'sort_order' => 2,
        ]);
    }

    public function coLiving(): static
    {
        return $this->state(fn (array $attributes): array => [
            'name' => 'Co-Living',
            'slug' => PropertyCategory::SLUG_CO_LIVING,
            'code' => PropertyCategory::SLUG_CO_LIVING,
            'description' => 'Modern managed community accommodation designed for urban professionals with flexible durations, curated communal spaces, and food options.',
            'is_active' => true,
            'sort_order' => 3,
        ]);
    }
}
