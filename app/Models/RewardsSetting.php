<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * @property int $id
 * @property string $key
 * @property mixed $value
 * @property string|null $description
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class RewardsSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember('rewards_setting:'.$key, 3600, function () use ($key, $default) {
            $setting = static::query()->where('key', $key)->first();

            return $setting !== null ? ($setting->value ?? $default) : $default;
        });
    }

    public static function set(string $key, mixed $value, ?string $description = null): self
    {
        Cache::forget('rewards_setting:'.$key);

        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'description' => $description,
            ]
        );
    }
}
