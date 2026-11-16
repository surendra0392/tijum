<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $property_id
 * @property int $published_review_count
 * @property float $average_rating
 * @property float|null $cleanliness_average
 * @property float|null $food_average
 * @property float|null $communication_average
 * @property float|null $value_average
 * @property int $star_1_count
 * @property int $star_2_count
 * @property int $star_3_count
 * @property int $star_4_count
 * @property int $star_5_count
 * @property CarbonImmutable|null $last_recalculated_at
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read Property $property
 */
class PropertyRatingSummary extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     published_review_count: 'integer',
     *     average_rating: 'float',
     *     cleanliness_average: 'float',
     *     food_average: 'float',
     *     communication_average: 'float',
     *     value_average: 'float',
     *     star_1_count: 'integer',
     *     star_2_count: 'integer',
     *     star_3_count: 'integer',
     *     star_4_count: 'integer',
     *     star_5_count: 'integer',
     *     last_recalculated_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'published_review_count' => 'integer',
            'average_rating' => 'float',
            'cleanliness_average' => 'float',
            'food_average' => 'float',
            'communication_average' => 'float',
            'value_average' => 'float',
            'star_1_count' => 'integer',
            'star_2_count' => 'integer',
            'star_3_count' => 'integer',
            'star_4_count' => 'integer',
            'star_5_count' => 'integer',
            'last_recalculated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return array<int, int>
     */
    public function starDistribution(): array
    {
        return [
            5 => $this->star_5_count,
            4 => $this->star_4_count,
            3 => $this->star_3_count,
            2 => $this->star_2_count,
            1 => $this->star_1_count,
        ];
    }
}
