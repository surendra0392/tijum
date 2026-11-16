<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $property_review_id
 * @property string|null $previous_title
 * @property string|null $previous_content
 * @property int $previous_overall_rating
 * @property int|null $previous_cleanliness_rating
 * @property int|null $previous_food_quality_rating
 * @property int|null $previous_communication_rating
 * @property int|null $previous_value_rating
 * @property int $edited_by_user_id
 * @property CarbonImmutable $created_at
 * @property-read PropertyReview $review
 * @property-read User $editedByUser
 */
class PropertyReviewRevision extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    /**
     * @return array{
     *     previous_overall_rating: 'integer',
     *     previous_cleanliness_rating: 'integer',
     *     previous_food_quality_rating: 'integer',
     *     previous_communication_rating: 'integer',
     *     previous_value_rating: 'integer',
     *     created_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'previous_overall_rating' => 'integer',
            'previous_cleanliness_rating' => 'integer',
            'previous_food_quality_rating' => 'integer',
            'previous_communication_rating' => 'integer',
            'previous_value_rating' => 'integer',
            'created_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function editedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by_user_id');
    }
}
