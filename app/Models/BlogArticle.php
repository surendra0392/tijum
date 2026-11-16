<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ContentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class BlogArticle extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'featured_image',
        'author_id',
        'category_id',
        'reading_time_minutes',
        'status',
        'published_at',
        'scheduled_for',
        'admin_id',
        'seo_title',
        'seo_description',
        'canonical_override',
        'og_image',
        'view_count',
    ];

    protected function casts(): array
    {
        return [
            'status' => ContentStatus::class,
            'reading_time_minutes' => 'integer',
            'published_at' => 'datetime',
            'scheduled_for' => 'datetime',
            'view_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ContentAuthor, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(ContentAuthor::class, 'author_id');
    }

    /**
     * @return BelongsTo<BlogCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'category_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    /**
     * @return BelongsToMany<BlogTag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(BlogTag::class, 'blog_article_tag');
    }

    /**
     * @param  Builder<BlogArticle>  $query
     * @return Builder<BlogArticle>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', ContentStatus::Published->value)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
