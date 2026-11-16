<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentPageRevision extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'content_page_id',
        'admin_id',
        'version',
        'title',
        'content_blocks',
        'seo_payload',
        'change_notes',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'content_blocks' => 'array',
            'seo_payload' => 'array',
            'version' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ContentPage, $this>
     */
    public function page(): BelongsTo
    {
        return $this->belongsTo(ContentPage::class, 'content_page_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }
}
