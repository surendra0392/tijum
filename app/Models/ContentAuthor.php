<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentAuthor extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'designation',
        'bio',
        'avatar_url',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<BlogArticle, $this>
     */
    public function articles(): HasMany
    {
        return $this->hasMany(BlogArticle::class, 'author_id');
    }
}
