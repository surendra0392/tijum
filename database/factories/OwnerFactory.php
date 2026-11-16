<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OwnerStatus;
use App\Models\Owner;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<Owner>
 */
class OwnerFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password = null;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+91'.fake()->unique()->numerify('9#########'),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'status' => OwnerStatus::PendingReview,
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes): array => [
            'email_verified_at' => null,
            'status' => OwnerStatus::PendingVerification,
        ]);
    }

    public function pendingReview(): static
    {
        return $this->state(fn (array $attributes): array => [
            'email_verified_at' => now(),
            'status' => OwnerStatus::PendingReview,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes): array => [
            'email_verified_at' => now(),
            'status' => OwnerStatus::Active,
            'approved_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => OwnerStatus::Rejected,
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => OwnerStatus::Suspended,
        ]);
    }
}
