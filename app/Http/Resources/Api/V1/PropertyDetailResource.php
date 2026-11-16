<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyMedia;
use App\Services\StayTimingPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Property
 */
class PropertyDetailResource extends JsonResource
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

        $gallery = [];
        if ($this->relationLoaded('media')) {
            $gallery = $this->media
                ->filter(fn (PropertyMedia $m): bool => $m->isPubliclyPublished())
                ->map(fn (PropertyMedia $m): array => [
                    'id' => $m->id,
                    'url' => $m->publicOptimizedUrl(),
                    'caption' => $m->alt_text,
                    'is_primary' => $m->is_cover,
                ])->values()->all();
        }
        if (empty($gallery) && $coverImage) {
            $gallery[] = ['id' => 1, 'url' => $coverImage, 'caption' => $this->name, 'is_primary' => true];
        }

        $amenities = [];
        if ($this->relationLoaded('currentAmenityAssignments')) {
            $amenities = $this->currentAmenityAssignments
                ->filter(fn (PropertyAmenity $a): bool => (bool) ($a->is_operational ?? true))
                ->map(fn (PropertyAmenity $a): array => [
                    'id' => $a->amenity?->id,
                    'name' => $a->amenity?->name,
                    'code' => $a->amenity?->code,
                    'category' => $a->amenity?->category?->name,
                    'icon_key' => $a->amenity?->icon_key,
                ])
                ->filter(fn (array $item): bool => ! empty($item['name']))
                ->values()
                ->all();
        }

        $timingPolicy = app(StayTimingPolicy::class)->timingSummary();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
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
            'pincode' => $this->postal_code,
            'starting_price_monthly_paise' => (int) $minMonthlyPrice,
            'rating_average' => $this->ratingSummary?->average_rating ? (float) $this->ratingSummary->average_rating : 4.8,
            'reviews_count' => (int) ($this->ratingSummary?->published_review_count ?? 0),
            'cover_image_url' => $coverImage,
            'gallery' => $gallery,
            'food_provided' => (bool) $this->food_provided,
            'breakfast_included' => (bool) $this->breakfast_included,
            'lunch_included' => (bool) $this->lunch_included,
            'dinner_included' => (bool) $this->dinner_included,
            'included_meals' => $meals,
            'included_meals_label' => ! empty($meals) ? implode(' • ', $meals) : 'Food Included',
            'amenities' => $amenities,
            'room_types' => RoomTypeResource::collection($this->whenLoaded('roomTypes')),
            'check_in_time' => '09:00:00',
            'check_out_time' => '08:00:00',
            'timing' => $timingPolicy,
            'is_verified' => (bool) $this->is_verified,
            'booking_eligible' => (bool) $this->booking_eligible,
        ];
    }
}
