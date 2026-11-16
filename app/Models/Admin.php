<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AdminRole;
use App\Notifications\Admin\ResetPasswordNotification;
use Database\Factories\AdminFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Admin extends Authenticatable
{
    /** @use HasFactory<AdminFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'email_verified_at',
    ];

    /**
     * The model's default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
        'email_verified_at' => null,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array{
     *     email_verified_at: 'datetime',
     *     password: 'hashed',
     *     role: 'App\\Enums\\AdminRole',
     *     is_active: 'boolean',
     *     two_factor_secret: 'encrypted',
     *     two_factor_recovery_codes: 'encrypted:array',
     *     two_factor_confirmed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => AdminRole::class,
            'is_active' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function hasTwoFactorEnabled(): bool
    {
        return filled($this->two_factor_secret) && $this->two_factor_confirmed_at !== null;
    }

    public function hasRole(AdminRole ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === AdminRole::SuperAdmin || ($this->role instanceof AdminRole && $this->role->isSuperAdmin());
    }

    public function hasPermission(string $permission): bool
    {
        if (! $this->isActive()) {
            return false;
        }

        return $this->role->hasPermission($permission);
    }

    /**
     * @return list<string>
     */
    public function recoveryCodes(): array
    {
        $codes = $this->two_factor_recovery_codes;

        if (! is_array($codes)) {
            return [];
        }

        return array_values(array_filter(
            $codes,
            static fn (mixed $code): bool => is_string($code) && $code !== '',
        ));
    }

    /**
     * Validate and consume a single recovery code in timing-safe manner.
     */
    public function consumeRecoveryCode(string $candidate): bool
    {
        $codes = $this->recoveryCodes();
        $matchedIndex = null;

        foreach ($codes as $index => $storedCode) {
            if (hash_equals($storedCode, $candidate)) {
                $matchedIndex = $index;
                break;
            }
        }

        if ($matchedIndex === null) {
            return false;
        }

        unset($codes[$matchedIndex]);

        return $this->forceFill([
            'two_factor_recovery_codes' => array_values($codes),
        ])->save();
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Project safe admin attributes for Inertia shared props.
     *
     * @return array{
     *     id: int,
     *     name: string,
     *     email: string,
     *     role: string,
     *     role_label: string,
     *     permissions: list<string>,
     *     is_active: bool,
     *     email_verified_at: string|null,
     *     two_factor_enabled: bool,
     *     two_factor_confirmed_at: string|null,
     *     created_at: string|null,
     *     updated_at: string|null,
     * }
     */
    public function toPortalArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'permissions' => $this->role->permissions(),
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'two_factor_enabled' => $this->hasTwoFactorEnabled(),
            'two_factor_confirmed_at' => $this->two_factor_confirmed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * @return MorphMany<NotificationDelivery, $this>
     */
    public function notificationDeliveries(): MorphMany
    {
        return $this->morphMany(NotificationDelivery::class, 'notifiable');
    }
}
