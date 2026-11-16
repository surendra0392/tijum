<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ContentFaq extends Model
{
    protected $fillable = [
        'question',
        'answer',
        'category',
        'display_order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    /**
     * @param  Builder<ContentFaq>  $query
     * @return Builder<ContentFaq>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true)->orderBy('display_order')->orderBy('id');
    }
}
