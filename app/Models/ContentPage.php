<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ContentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentPage extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'internal_name',
        'summary',
        'content_blocks',
        'featured_image',
        'status',
        'published_at',
        'scheduled_for',
        'author_admin_id',
        'seo_title',
        'seo_description',
        'canonical_override',
        'robots_directive',
        'og_image',
        'view_count',
    ];

    protected function casts(): array
    {
        return [
            'content_blocks' => 'array',
            'status' => ContentStatus::class,
            'published_at' => 'datetime',
            'scheduled_for' => 'datetime',
            'view_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function authorAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'author_admin_id');
    }

    /**
     * @return HasMany<ContentPageRevision, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(ContentPageRevision::class, 'content_page_id')->orderByDesc('version');
    }

    /**
     * @param  Builder<ContentPage>  $query
     * @return Builder<ContentPage>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', ContentStatus::Published->value)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
