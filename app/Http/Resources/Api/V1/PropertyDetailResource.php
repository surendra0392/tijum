<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyMedia;
use App\Models\PropertyReview;
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

        $activeRoomTypes = $this->relationLoaded('roomTypes')
            ? $this->roomTypes->where('is_active', true)->values()
            : collect();

        $minMonthlyPrice = ($activeRoomTypes->where('monthly_rate_minor', '>', 0)->min('monthly_rate_minor')) ?: 600000;
        $minDailyPrice = $activeRoomTypes->where('daily_rate_minor', '>', 0)->min('daily_rate_minor');
        $minWeeklyPrice = $activeRoomTypes->where('weekly_rate_minor', '>', 0)->min('weekly_rate_minor');
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

        $reviews = [];
        if ($this->relationLoaded('reviews')) {
            $reviews = $this->reviews
                ->map(fn (PropertyReview $r): array => [
                    'id' => $r->id,
                    'customer_display_name' => $r->customer_display_name,
                    'overall_rating' => (int) $r->overall_rating,
                    'cleanliness_rating' => $r->cleanliness_rating !== null ? (int) $r->cleanliness_rating : null,
                    'food_quality_rating' => $r->food_quality_rating !== null ? (int) $r->food_quality_rating : null,
                    'communication_rating' => $r->communication_rating !== null ? (int) $r->communication_rating : null,
                    'value_rating' => $r->value_rating !== null ? (int) $r->value_rating : null,
                    'title' => $r->title,
                    'content' => $r->content,
                    'verified_booking' => (bool) $r->verified_booking,
                    'published_at' => $r->published_at?->toIso8601String(),
                ])->values()->all();
        }

        $timingPolicy = app(StayTimingPolicy::class)->timingSummary();
        $lat = $this->latitude !== null ? (float) $this->latitude : null;
        $lng = $this->longitude !== null ? (float) $this->longitude : null;

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
            'landmark' => $this->landmark,
            'pincode' => $this->postal_code,
            'latitude' => $lat,
            'longitude' => $lng,
            'google_maps_url' => ($lat !== null && $lng !== null) ? "https://www.google.com/maps/search/?api=1&query={$lat},{$lng}" : null,
            'gender_eligibility' => $this->relationLoaded('roomTypes') ? $this->gender_eligibility : 'All Genders',
            'starting_price_daily_paise' => $minDailyPrice !== null ? (int) $minDailyPrice : null,
            'starting_price_weekly_paise' => $minWeeklyPrice !== null ? (int) $minWeeklyPrice : null,
            'starting_price_monthly_paise' => (int) $minMonthlyPrice,
            'rating_average' => $this->ratingSummary?->average_rating ? (float) $this->ratingSummary->average_rating : 4.8,
            'reviews_count' => (int) ($this->ratingSummary?->published_review_count ?? 0),
            'cover_image_url' => $coverImage,
            'gallery' => $gallery,
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
            'amenities' => $amenities,
            'room_types' => RoomTypeResource::collection($activeRoomTypes),
            'reviews' => $reviews,
            'check_in_time' => strlen((string) ($timingPolicy['standard_check_in_time'] ?? '')) === 5
                ? $timingPolicy['standard_check_in_time'].':00'
                : '09:00:00',
            'check_out_time' => strlen((string) ($timingPolicy['standard_check_out_time'] ?? '')) === 5
                ? $timingPolicy['standard_check_out_time'].':00'
                : '08:00:00',
            'timing' => $timingPolicy,
            'is_verified' => (bool) $this->is_verified,
            'booking_eligible' => (bool) $this->booking_eligible,
        ];
    }
}
