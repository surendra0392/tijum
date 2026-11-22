<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Property
 */
class PropertyCardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $meals = [];
        if ($this->breakfast_included) {
            $meals[] = 'Breakfast';
        }
        if ($this->lunch_included) {
            $meals[] = 'Lunch';
        }
        if ($this->dinner_included) {
            $meals[] = 'Dinner';
        }

        $activeRoomTypes = $this->relationLoaded('roomTypes')
            ? $this->roomTypes->where('is_active', true)
            : collect();

        $minMonthlyPrice = $activeRoomTypes->where('monthly_rate_minor', '>', 0)->min('monthly_rate_minor');
        $minDailyPrice = $activeRoomTypes->where('daily_rate_minor', '>', 0)->min('daily_rate_minor');
        $minWeeklyPrice = $activeRoomTypes->where('weekly_rate_minor', '>', 0)->min('weekly_rate_minor');
        $coverImage = $this->coverImageUrl();
        $coords = $this->resolvedCoordinates();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'category' => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
                'code' => $this->category->code,
                'icon' => $this->category->accommodationCategory()?->iconName() ?? 'Building2',
            ] : null,
            'city' => $this->city ? [
                'id' => $this->city->id,
                'name' => $this->city->name,
                'slug' => $this->city->slug,
            ] : null,
            'locality' => $this->locality ?: $this->city?->name,
            'address_line' => $this->address_line_1,
            'latitude' => $coords['latitude'] ?? null,
            'longitude' => $coords['longitude'] ?? null,
            'has_coordinates' => $coords !== null,
            'location_precision' => $coords !== null ? 'exact' : 'area_only',
            'distance_km' => isset($this->distance_km) ? (float) $this->distance_km : null,
            'distance_label' => $this->distance_label ?? null,
            'is_locality_match' => isset($this->is_locality_match) ? (bool) $this->is_locality_match : null,
            'gender_eligibility' => $this->relationLoaded('roomTypes') ? $this->gender_eligibility : 'All Genders',
            'starting_price_daily_paise' => $minDailyPrice !== null ? (int) $minDailyPrice : null,
            'starting_price_weekly_paise' => $minWeeklyPrice !== null ? (int) $minWeeklyPrice : null,
            'starting_price_monthly_paise' => $minMonthlyPrice !== null ? (int) $minMonthlyPrice : null,
            'rating_average' => (float) ($this->ratingSummary->average_rating ?? 0),
            'reviews_count' => (int) ($this->ratingSummary->published_review_count ?? 0),
            'cover_image_url' => $coverImage,
            'food_provided' => (bool) $this->food_provided,
            'breakfast_included' => (bool) $this->breakfast_included,
            'lunch_included' => (bool) $this->lunch_included,
            'dinner_included' => (bool) $this->dinner_included,
            'food_inclusions' => [
                'provided' => (bool) $this->food_provided,
                'breakfast' => (bool) $this->breakfast_included,
                'lunch' => (bool) $this->lunch_included,
                'dinner' => (bool) $this->dinner_included,
            ],
            'included_meals' => $meals,
            'included_meals_label' => ! empty($meals) ? implode(' • ', $meals) : null,
            'is_verified' => (bool) $this->is_verified,
            'booking_eligible' => (bool) $this->booking_eligible,
        ];
    }
}
