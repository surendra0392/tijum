<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class SeoRedirect extends Model
{
    protected $fillable = [
        'source_path',
        'destination_url',
        'http_status',
        'is_active',
        'hits_count',
        'last_hit_at',
        'admin_id',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::saved(fn (): bool => self::bumpCacheGeneration());
        static::deleted(fn (): bool => self::bumpCacheGeneration());
    }

    protected function casts(): array
    {
        return [
            'http_status' => 'integer',
            'is_active' => 'boolean',
            'hits_count' => 'integer',
            'last_hit_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    /**
     * @param  Builder<SeoRedirect>  $query
     * @return Builder<SeoRedirect>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Resolve an active redirect for a path through the cache, keyed by a generation counter.
     */
    public static function cachedActiveForPath(string $path): ?self
    {
        $cacheKey = 'seo_redirects:'.self::cacheGeneration().':'.$path;

        $cached = Cache::get($cacheKey, false);

        if ($cached !== false) {
            return $cached;
        }

        /** @var SeoRedirect|null $redirect */
        $redirect = self::query()
            ->where('is_active', true)
            ->where('source_path', $path)
            ->first();

        Cache::put($cacheKey, $redirect ?? false, now()->addMinutes(10));

        return $redirect;
    }

    private static function cacheGeneration(): int
    {
        return (int) Cache::get('seo_redirects:generation', 0);
    }

    private static function bumpCacheGeneration(): bool
    {
        return Cache::put('seo_redirects:generation', self::cacheGeneration() + 1, now()->addDay());
    }
}
