<?php

declare(strict_types=1);

namespace App\Services\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Property;
use App\Models\PropertyRatingSummary;
use App\Models\PropertyReview;
use Carbon\CarbonImmutable;

class ReviewRatingCalculationService
{
    /**
     * Recalculate property rating summary authoritatively from published reviews.
     */
    public function recalculateForProperty(Property|int $property): PropertyRatingSummary
    {
        $propertyId = $property instanceof Property ? $property->id : $property;

        $reviews = PropertyReview::query()
            ->where('property_id', $propertyId)
            ->where('status', ReviewStatus::Published)
            ->get();

        $count = $reviews->count();

        if ($count === 0) {
            return PropertyRatingSummary::query()->updateOrCreate(
                ['property_id' => $propertyId],
                [
                    'published_review_count' => 0,
                    'average_rating' => 0.00,
                    'cleanliness_average' => null,
                    'food_average' => null,
                    'communication_average' => null,
                    'value_average' => null,
                    'star_1_count' => 0,
                    'star_2_count' => 0,
                    'star_3_count' => 0,
                    'star_4_count' => 0,
                    'star_5_count' => 0,
                    'last_recalculated_at' => CarbonImmutable::now(),
                ]
            );
        }

        $overallAverage = round($reviews->avg('overall_rating'), 2);

        $cleanlinessReviews = $reviews->whereNotNull('cleanliness_rating');
        $cleanlinessAverage = $cleanlinessReviews->isNotEmpty()
            ? round($cleanlinessReviews->avg('cleanliness_rating'), 2)
            : null;

        $foodReviews = $reviews->whereNotNull('food_quality_rating');
        $foodAverage = $foodReviews->isNotEmpty()
            ? round($foodReviews->avg('food_quality_rating'), 2)
            : null;

        $communicationReviews = $reviews->whereNotNull('communication_rating');
        $communicationAverage = $communicationReviews->isNotEmpty()
            ? round($communicationReviews->avg('communication_rating'), 2)
            : null;

        $valueReviews = $reviews->whereNotNull('value_rating');
        $valueAverage = $valueReviews->isNotEmpty()
            ? round($valueReviews->avg('value_rating'), 2)
            : null;

        $starCounts = [
            1 => $reviews->where('overall_rating', 1)->count(),
            2 => $reviews->where('overall_rating', 2)->count(),
            3 => $reviews->where('overall_rating', 3)->count(),
            4 => $reviews->where('overall_rating', 4)->count(),
            5 => $reviews->where('overall_rating', 5)->count(),
        ];

        return PropertyRatingSummary::query()->updateOrCreate(
            ['property_id' => $propertyId],
            [
                'published_review_count' => $count,
                'average_rating' => $overallAverage,
                'cleanliness_average' => $cleanlinessAverage,
                'food_average' => $foodAverage,
                'communication_average' => $communicationAverage,
                'value_average' => $valueAverage,
                'star_1_count' => $starCounts[1],
                'star_2_count' => $starCounts[2],
                'star_3_count' => $starCounts[3],
                'star_4_count' => $starCounts[4],
                'star_5_count' => $starCounts[5],
                'last_recalculated_at' => CarbonImmutable::now(),
            ]
        );
    }

    /**
     * Reconcile all properties in the marketplace to eliminate any rating drift.
     *
     * @return int Count of properties reconciled
     */
    public function reconcileAll(): int
    {
        $properties = Property::query()->pluck('id');

        foreach ($properties as $propertyId) {
            $this->recalculateForProperty((int) $propertyId);
        }

        return $properties->count();
    }
}
