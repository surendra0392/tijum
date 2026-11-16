<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\RecoveryCode;

/**
 * @extends Factory<Admin>
 */
class AdminFactory extends Factory
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
            'password' => static::$password ??= Hash::make('password'),
            'role' => AdminRole::Operations,
            'is_active' => true,
            'email_verified_at' => now(),
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'remember_token' => Str::random(10),
        ];
    }

    public function role(AdminRole $role): static
    {
        return $this->state(fn (array $attributes): array => [
            'role' => $role,
        ]);
    }

    public function superAdmin(): static
    {
        return $this->role(AdminRole::SuperAdmin);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_active' => false,
        ]);
    }

    public function withTwoFactor(?string $secret = null): static
    {
        return $this->state(function (array $attributes) use ($secret): array {
            $provider = app(TwoFactorAuthenticationProvider::class);

            return [
                'two_factor_secret' => $secret ?? $provider->generateSecretKey(),
                'two_factor_recovery_codes' => Collection::times(
                    8,
                    static fn (): string => RecoveryCode::generate(),
                )->all(),
                'two_factor_confirmed_at' => now(),
            ];
        });
    }

    public function withoutTwoFactor(): static
    {
        return $this->state(fn (array $attributes): array => [
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);
    }
}
