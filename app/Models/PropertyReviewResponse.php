<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewResponseStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $property_review_id
 * @property int $owner_id
 * @property string $response_text
 * @property ReviewResponseStatus $status
 * @property CarbonImmutable|null $submitted_at
 * @property CarbonImmutable|null $published_at
 * @property CarbonImmutable|null $moderated_at
 * @property int|null $moderated_by_admin_id
 * @property string|null $moderation_reason
 * @property bool $is_edited
 * @property CarbonImmutable|null $edited_at
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read PropertyReview $review
 * @property-read Owner $owner
 * @property-read Admin|null $moderatedByAdmin
 */
class PropertyReviewResponse extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     status: 'App\\Enums\\ReviewResponseStatus',
     *     is_edited: 'boolean',
     *     submitted_at: 'datetime',
     *     published_at: 'datetime',
     *     moderated_at: 'datetime',
     *     edited_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => ReviewResponseStatus::class,
            'is_edited' => 'boolean',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
            'moderated_at' => 'datetime',
            'edited_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PropertyReview, $this>
     */
    public function review(): BelongsTo
    {
        return $this->belongsTo(PropertyReview::class, 'property_review_id');
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function moderatedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'moderated_by_admin_id');
    }

    public function isPublished(): bool
    {
        return $this->status === ReviewResponseStatus::Published;
    }
}
