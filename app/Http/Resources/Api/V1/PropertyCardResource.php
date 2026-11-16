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

        $minMonthlyPrice = ($this->relationLoaded('roomTypes')
            ? $this->roomTypes->min('monthly_rate_minor')
            : null) ?: 600000;
        $coverImage = $this->coverImageUrl() ?? '/images/public/hero-stay.jpg';

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
            'starting_price_monthly_paise' => (int) $minMonthlyPrice,
            'rating_average' => $this->ratingSummary?->average_rating ? (float) $this->ratingSummary->average_rating : 4.8,
            'reviews_count' => (int) ($this->ratingSummary?->published_review_count ?? 0),
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
            'included_meals_label' => ! empty($meals) ? implode(' • ', $meals) : 'Food Included',
            'is_verified' => (bool) $this->is_verified,
            'booking_eligible' => (bool) $this->booking_eligible,
        ];
    }
}
