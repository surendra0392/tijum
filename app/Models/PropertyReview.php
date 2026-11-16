<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewStatus;
use Carbon\CarbonImmutable;
use Database\Factories\PropertyReviewFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $reservation_id
 * @property int $property_id
 * @property int $user_id
 * @property int|null $property_room_type_id
 * @property int $owner_id
 * @property int $overall_rating
 * @property int|null $cleanliness_rating
 * @property int|null $food_quality_rating
 * @property int|null $communication_rating
 * @property int|null $value_rating
 * @property string|null $title
 * @property string|null $content
 * @property ReviewStatus $status
 * @property bool $verified_booking
 * @property string $customer_display_name
 * @property CarbonImmutable|null $submitted_at
 * @property CarbonImmutable|null $published_at
 * @property CarbonImmutable|null $moderated_at
 * @property int|null $moderated_by_admin_id
 * @property string|null $moderation_reason
 * @property string|null $moderation_internal_notes
 * @property bool $is_edited
 * @property CarbonImmutable|null $edited_at
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read Reservation $reservation
 * @property-read Property $property
 * @property-read User $user
 * @property-read PropertyRoomType|null $roomType
 * @property-read Owner $owner
 * @property-read Admin|null $moderatedByAdmin
 * @property-read PropertyReviewResponse|null $response
 * @property-read Collection<int, PropertyReviewRevision> $revisions
 * @property-read Collection<int, PropertyReviewReport> $reports
 */
class PropertyReview extends Model
{
    /** @use HasFactory<PropertyReviewFactory> */
    use HasFactory;

    protected $guarded = [];

    /**
     * @return array{
     *     status: 'App\\Enums\\ReviewStatus',
     *     overall_rating: 'integer',
     *     cleanliness_rating: 'integer',
     *     food_quality_rating: 'integer',
     *     communication_rating: 'integer',
     *     value_rating: 'integer',
     *     verified_booking: 'boolean',
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
            'status' => ReviewStatus::class,
            'overall_rating' => 'integer',
            'cleanliness_rating' => 'integer',
            'food_quality_rating' => 'integer',
            'communication_rating' => 'integer',
            'value_rating' => 'integer',
            'verified_booking' => 'boolean',
            'is_edited' => 'boolean',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
            'moderated_at' => 'datetime',
            'edited_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<PropertyRoomType, $this>
     */
    public function roomType(): BelongsTo
    {
        return $this->belongsTo(PropertyRoomType::class, 'property_room_type_id');
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

    /**
     * @return HasOne<PropertyReviewResponse, $this>
     */
    public function response(): HasOne
    {
        return $this->hasOne(PropertyReviewResponse::class, 'property_review_id');
    }

    /**
     * @return HasMany<PropertyReviewRevision, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(PropertyReviewRevision::class, 'property_review_id')->latest('created_at');
    }

    /**
     * @return HasMany<PropertyReviewReport, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(PropertyReviewReport::class, 'property_review_id')->latest('created_at');
    }

    public function isPublished(): bool
    {
        return $this->status === ReviewStatus::Published;
    }

    public function canBeEditedByUser(User $user): bool
    {
        if ($this->user_id !== $user->id) {
            return false;
        }

        if (! $this->status->isEditable()) {
            return false;
        }

        $editWindowDays = (int) config('tijum.reviews.edit_window_days', 7);
        $referenceDate = $this->published_at ?? $this->submitted_at ?? $this->created_at;

        if ($referenceDate === null) {
            return true;
        }

        return $referenceDate->addDays($editWindowDays)->isFuture();
    }

    /**
     * Generate privacy-safe customer display name (e.g. "Suresh R." or "Verified Guest").
     */
    public static function formatCustomerDisplayName(?string $fullName): string
    {
        if ($fullName === null || trim($fullName) === '') {
            return 'Verified Guest';
        }

        $parts = preg_split('/\s+/', trim($fullName)) ?: [];

        if (count($parts) === 1) {
            return $parts[0];
        }

        $first = $parts[0];
        $lastInitial = mb_substr(end($parts), 0, 1);

        return $first.' '.$lastInitial.'.';
    }
}
