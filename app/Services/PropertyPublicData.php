<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyReview;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use Carbon\CarbonImmutable;

class PropertyPublicData
{
    public function __construct(
        private readonly PropertySearchCustomerData $customerData,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function isPubliclyViewable(Property $property): bool
    {
        $property->loadMissing(['owner', 'city', 'category', 'roomTypes.rooms', 'availabilityBlocks', 'media.roomType', 'amenityAssignments.amenity.category', 'roomTypeAmenityAssignments.amenity.category']);

        if (! $property->is_verified
            || ! $property->booking_eligible
            || $property->latest_approved_application_id === null
            || $property->status !== PropertyOperationalStatus::Active) {
            return false;
        }
        if (! $property->food_provided || (! $property->breakfast_included && ! $property->lunch_included && ! $property->dinner_included)) {
            return false;
        }
        if ($property->owner === null || ! $property->owner->canPublishProperties()) {
            return false;
        }
        if ($property->city === null || ! $property->city->is_active) {
            return false;
        }
        if ($property->category === null || ! $property->category->is_active) {
            return false;
        }

        $hasActiveRoom = $property->rooms->contains(static fn (PropertyRoom $r): bool => $r->operational_status === PropertyRoomStatus::Active);
        if (! $hasActiveRoom) {
            return false;
        }

        $hasEligible = $property->roomTypes->contains(function (PropertyRoomType $rt) use ($property): bool {
            if (! $rt->is_active) {
                return false;
            }
            $hasPrice = ($rt->daily_rate_minor !== null && (int) $rt->daily_rate_minor > 0)
                || ($rt->weekly_rate_minor !== null && (int) $rt->weekly_rate_minor > 0)
                || ($rt->monthly_rate_minor !== null && (int) $rt->monthly_rate_minor > 0);
            if (! $hasPrice) {
                return false;
            }

            return $property->rooms->contains(static fn (PropertyRoom $r): bool => (int) $r->property_room_type_id === (int) $rt->id && $r->operational_status === PropertyRoomStatus::Active);
        });

        return $hasEligible;
    }

    /**
     * @param  array<string, mixed>|null  $searchContext
     * @return array<string, mixed>|null
     */
    public function detail(Property $property, ?array $searchContext = null): ?array
    {
        $property->loadMissing([
            'category:id,name,slug,code,is_active',
            'city:id,name,slug,state,is_active',
            'roomTypes' => static function ($q): void {
                $q->where('is_active', true)->orderBy('display_order')->orderBy('id');
            },
            'roomTypes.rooms' => static function ($q): void {
                $q->where('operational_status', PropertyRoomStatus::Active->value);
            },
            'rooms' => static function ($q): void {
                $q->where('operational_status', PropertyRoomStatus::Active->value);
            },
            'media' => static function ($q): void {
                $q->where('is_archived', false)
                    ->where('moderation_status', 'approved')
                    ->where('publication_status', 'published')
                    ->whereNotNull('public_optimized_path')
                    ->whereNotNull('public_thumbnail_path')
                    ->orderByDesc('is_cover')
                    ->orderBy('sort_order')
                    ->orderBy('id');
            },
            'media.roomType',
            'amenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.amenity.category',
            'availabilityBlocks' => static function ($q): void {
                $q->where('status', PropertyAvailabilityBlockStatus::Active->value);
            },
            'owner',
            'ratingSummary',
            'reviews' => static function ($q): void {
                $q->where('status', ReviewStatus::Published->value)
                    ->with(['response' => fn ($rq) => $rq->where('status', ReviewResponseStatus::Published->value)->with('owner'), 'roomType'])
                    ->latest('published_at');
            },
        ]);

        if (! $this->isPubliclyViewable($property)) {
            return null;
        }

        $tz = $this->timing->timezone();
        $now = CarbonImmutable::now($tz);
        $checkIn = isset($searchContext['check_in']) ? CarbonImmutable::parse((string) $searchContext['check_in'], $tz)->startOfDay() : $now->startOfDay();
        $durationType = isset($searchContext['duration_type']) ? (string) $searchContext['duration_type'] : 'daily';
        $durationCount = isset($searchContext['duration_count']) ? max(1, (int) $searchContext['duration_count']) : 1;
        $guests = isset($searchContext['guests']) ? max(1, (int) $searchContext['guests']) : 1;
        $checkout = $this->timing->calculateCheckoutDate($checkIn, $durationType, $durationCount);

        $filters = array_merge([
            'check_in' => $checkIn->toDateString(),
            'duration_type' => $durationType,
            'duration_count' => $durationCount,
            'guests' => $guests,
            'gender_preference' => $searchContext['gender_preference'] ?? 'all',
            'sharing_capacity' => $searchContext['sharing_capacity'] ?? [],
            'ac' => $searchContext['ac'] ?? [],
            'food_meals' => $searchContext['food_meals'] ?? [],
            'amenities' => $searchContext['amenities'] ?? [],
            'early_check_in' => $searchContext['early_check_in'] ?? false,
        ], $searchContext ?? []);

        $qualifying = $this->customerData->qualifyingRoomTypes($property, $filters, $checkIn, $checkout);
        $qualifyingIds = collect($qualifying)->pluck('id')->map(static fn ($v): int => (int) $v)->all();

        $roomTypes = [];
        foreach ($property->roomTypes->where('is_active', true) as $rt) {
            /** @var PropertyRoomType $rt */
            $hasActiveRoom = $property->rooms->contains(static fn (PropertyRoom $r): bool => (int) $r->property_room_type_id === (int) $rt->id && $r->operational_status === PropertyRoomStatus::Active);
            $hasAnyPrice = ($rt->daily_rate_minor !== null && (int) $rt->daily_rate_minor > 0)
                || ($rt->weekly_rate_minor !== null && (int) $rt->weekly_rate_minor > 0)
                || ($rt->monthly_rate_minor !== null && (int) $rt->monthly_rate_minor > 0);
            if (! $hasActiveRoom || ! $hasAnyPrice) {
                continue;
            }

            $q = collect($qualifying)->firstWhere('id', $rt->id);
            $isShared = $rt->accommodation_mode === PropertyRoomTypeMode::Shared;
            $sharingLabel = $isShared ? ((int) ($rt->sharing_capacity ?? $rt->max_guests_per_room)).' Sharing' : 'Single Room';
            $pricingBasis = $isShared ? 'per_guest' : 'per_room';

            $roomTypes[] = [
                'id' => $rt->id,
                'name' => $rt->name,
                'accommodation_mode' => $rt->accommodation_mode->value,
                'accommodation_mode_label' => $rt->accommodation_mode->label(),
                'sharing_label' => $sharingLabel,
                'sharing_capacity' => $rt->sharing_capacity,
                'max_guests_per_room' => $rt->max_guests_per_room,
                'is_air_conditioned' => (bool) $rt->is_air_conditioned,
                'gender_policy' => $rt->gender_policy->value,
                'gender_policy_label' => $rt->gender_policy->label(),
                'pricing_basis' => $pricingBasis,
                'pricing_basis_label' => $isShared ? 'Per Guest' : 'Per Room',
                'early_check_in_enabled' => (bool) $rt->early_check_in_enabled,
                'daily_rate_minor' => $rt->daily_rate_minor,
                'weekly_rate_minor' => $rt->weekly_rate_minor,
                'monthly_rate_minor' => $rt->monthly_rate_minor,
                'matches_search' => in_array((int) $rt->id, $qualifyingIds, true),
                'eligible_room_count' => $q['eligible_room_count'] ?? null,
                'available_quantity' => (int) ($q['available_quantity'] ?? 0),
                'amenities' => $this->customerData->approvedRoomTypeAmenities($property, $rt),
            ];
        }

        $gallery = $this->buildGallery($property);
        $eligibleGender = $this->propertyGenderLabel($roomTypes);
        $coords = $property->resolvedCoordinates();

        return [
            'id' => $property->id,
            'slug' => $property->slug,
            'name' => $property->name,
            'description' => $property->description,
            'category' => ['name' => $property->category?->name, 'slug' => $property->category?->slug],
            'city' => ['name' => $property->city?->name, 'slug' => $property->city?->slug, 'state' => $property->city?->state],
            'locality' => $property->locality,
            'address_line_1' => $property->address_line_1,
            'landmark' => $property->landmark,
            'latitude' => $coords['latitude'] ?? null,
            'longitude' => $coords['longitude'] ?? null,
            'has_coordinates' => $coords !== null,
            'location_precision' => $coords !== null ? 'exact' : 'area_only',
            'google_maps_url' => $coords !== null
                ? "https://www.google.com/maps/search/?api=1&query={$coords['latitude']},{$coords['longitude']}"
                : null,
            'gender_eligibility' => $eligibleGender,
            'food' => $property->foodSummary(),
            'timing' => [
                'check_in' => $this->timing->getStandardCheckInTime(),
                'check_out' => $this->timing->getStandardCheckOutTime(),
                'earliest_early_check_in_time' => $this->timing->getEarliestEarlyCheckInTime(),
            ],
            'property_amenities' => $this->customerData->approvedPropertyAmenities($property),
            'gallery' => $gallery,
            'room_types' => $roomTypes,
            'search_context' => [
                'check_in' => $checkIn->toDateString(),
                'check_out' => $checkout->toDateString(),
                'duration_type' => $durationType,
                'duration_count' => $durationCount,
                'guests' => $guests,
            ],
            'durations' => config('tijum.pricing.durations', []),
            'rating_summary' => $property->ratingSummary ? [
                'average_rating' => (float) $property->ratingSummary->average_rating,
                'published_review_count' => (int) $property->ratingSummary->published_review_count,
                'cleanliness_average' => $property->ratingSummary->cleanliness_average !== null ? (float) $property->ratingSummary->cleanliness_average : null,
                'food_average' => $property->ratingSummary->food_average !== null ? (float) $property->ratingSummary->food_average : null,
                'communication_average' => $property->ratingSummary->communication_average !== null ? (float) $property->ratingSummary->communication_average : null,
                'value_average' => $property->ratingSummary->value_average !== null ? (float) $property->ratingSummary->value_average : null,
                'star_distribution' => $property->ratingSummary->starDistribution(),
            ] : [
                'average_rating' => 0.0,
                'published_review_count' => 0,
                'cleanliness_average' => null,
                'food_average' => null,
                'communication_average' => null,
                'value_average' => null,
                'star_distribution' => [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0],
            ],
            'published_reviews' => $property->reviews
                ->where('status', ReviewStatus::Published)
                ->map(fn (PropertyReview $rev): array => [
                    'id' => $rev->id,
                    'customer_display_name' => $rev->customer_display_name,
                    'verified_booking' => $rev->verified_booking,
                    'overall_rating' => $rev->overall_rating,
                    'cleanliness_rating' => $rev->cleanliness_rating,
                    'food_quality_rating' => $rev->food_quality_rating,
                    'communication_rating' => $rev->communication_rating,
                    'value_rating' => $rev->value_rating,
                    'title' => $rev->title,
                    'content' => $rev->content,
                    'published_at' => $rev->published_at?->format('M Y'),
                    'room_type_name' => $rev->roomType?->name ?? 'Standard',
                    'response' => ($rev->response && $rev->response->status === ReviewResponseStatus::Published) ? [
                        'owner_name' => $rev->response->owner?->name ?? 'Host',
                        'response_text' => $rev->response->response_text,
                        'published_at' => $rev->response->published_at?->format('M Y'),
                    ] : null,
                ])->values()->all(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildGallery(Property $property): array
    {
        $property->media->loadMissing('roomType');

        $roomTypesById = $property->relationLoaded('roomTypes')
            ? $property->roomTypes->keyBy('id')
            : null;

        return $property->media
            ->filter(static function (PropertyMedia $m): bool {
                return $m->is_archived === false
                    && $m->moderation_status->value === 'approved'
                    && $m->publication_status->value === 'published'
                    && $m->public_optimized_path !== null
                    && $m->public_thumbnail_path !== null;
            })
            ->sortByDesc('is_cover')
            ->sortBy('sort_order')
            ->values()
            ->map(static function (PropertyMedia $m) use ($roomTypesById): array {
                $roomTypeName = $m->relationLoaded('roomType')
                    ? $m->roomType?->name
                    : ($roomTypesById?->get($m->property_room_type_id)?->name);

                return [
                    'url' => $m->publicOptimizedUrl(),
                    'thumbnail_url' => $m->publicThumbnailUrl(),
                    'alt_text' => $m->alt_text,
                    'is_cover' => (bool) $m->is_cover,
                    'scope' => $m->property_room_type_id !== null ? 'room_type' : 'property',
                    'room_type_name' => $roomTypeName,
                ];
            })->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $roomTypes
     */
    private function propertyGenderLabel(array $roomTypes): string
    {
        $policies = collect($roomTypes)->pluck('gender_policy')->unique()->values()->all();
        if ($policies === []) {
            return '—';
        }
        if (count($policies) === 1) {
            return match ($policies[0]) {
                'male_only' => 'Male Only',
                'female_only' => 'Female Only',
                'all_genders' => 'All Genders',
                default => 'Multiple options',
            };
        }

        return 'Multiple options';
    }
}
