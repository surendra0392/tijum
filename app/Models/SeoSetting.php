<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeoSetting extends Model
{
    protected $fillable = [
        'site_name',
        'title_template',
        'default_meta_description',
        'default_og_image',
        'default_robots',
        'google_site_verification',
        'bing_site_verification',
        'updated_by_admin_id',
    ];

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function updatedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'updated_by_admin_id');
    }

    public static function current(): self
    {
        /** @var self $setting */
        $setting = self::query()->firstOrCreate([], [
            'site_name' => 'TIJUM',
            'title_template' => '%s | TIJUM',
            'default_meta_description' => 'Discover Hostels/PG, Homestays, and Co-Living accommodation across Hyderabad, Guntur, Vijayawada, and Visakhapatnam with property-specific food and room details.',
            'default_og_image' => '/images/public/og-tijum-cover.jpg',
            'default_robots' => 'index, follow',
        ]);

        return $setting;
    }
}
