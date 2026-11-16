<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MediaAsset extends Model
{
    protected $fillable = [
        'filename',
        'original_name',
        'disk',
        'path',
        'mime_type',
        'file_size_bytes',
        'width',
        'height',
        'title',
        'alt_text',
        'caption',
        'admin_id',
    ];

    protected $appends = [
        'url',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }
}
