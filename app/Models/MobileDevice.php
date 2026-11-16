<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $device_installation_id
 * @property string $notifiable_type
 * @property int $notifiable_id
 * @property string $platform
 * @property string|null $push_token
 * @property string|null $push_token_hash
 * @property string|null $app_version
 * @property string|null $device_name
 * @property bool $is_active
 * @property Carbon $registered_at
 * @property Carbon|null $last_used_at
 * @property Carbon|null $revoked_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class MobileDevice extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'device_installation_id',
        'notifiable_type',
        'notifiable_id',
        'platform',
        'push_token',
        'push_token_hash',
        'app_version',
        'device_name',
        'is_active',
        'registered_at',
        'last_used_at',
        'revoked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'push_token' => 'encrypted',
            'is_active' => 'boolean',
            'registered_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @param  Builder<$this>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true)->whereNull('revoked_at');
    }

    public function revoke(): void
    {
        $this->update([
            'is_active' => false,
            'revoked_at' => now(),
        ]);
    }

    public function touchLastUsed(): void
    {
        $this->update([
            'last_used_at' => now(),
        ]);
    }
}
