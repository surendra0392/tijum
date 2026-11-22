<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyRoomTypeAmenity;
use Carbon\CarbonImmutable;

class PropertySearchCustomerData
{
    public function __construct(
        private readonly PropertySearchEligibility $eligibility,
        private readonly StayTimingPolicy $timing,
        private readonly ReservationAvailabilityService $availability,
    ) {}

    /**
     * Build a customer-safe search card for an eligible property, or null if no qualifying room type remains.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>|null
     */
    public function searchCard(Property $property, array $filters, CarbonImmutable $checkIn, CarbonImmutable $checkOut): ?array
    {
        $qualifying = $this->qualifyingRoomTypes($property, $filters, $checkIn, $checkOut);
        if ($qualifying === []) {
            return null;
        }

        $guests = max(1, (int) ($filters['guests'] ?? 1));
        $durationType = (string) ($filters['duration_type'] ?? 'daily');
        $durationCount = max(1, (int) ($filters['duration_count'] ?? 1));

        usort($qualifying, static fn (array $a, array $b): int => $a['total_minor'] <=> $b['total_minor']);
        $best = $qualifying[0];

        $min = $filters['min_price'] ?? null;
        $max = $filters['max_price'] ?? null;
        if (is_int($min) && $best['total_minor'] < $min) {
            return null;
        }
        if (is_int($max) && $best['total_minor'] > $max) {
            return null;
        }

        $minRating = isset($filters['min_rating']) && is_numeric($filters['min_rating'])
            ? (float) $filters['min_rating']
            : null;
        $ratingSummary = $property->ratingSummary;
        $avgRating = $ratingSummary ? (float) $ratingSummary->average_rating : 0.0;
        $reviewCount = $ratingSummary ? (int) $ratingSummary->published_review_count : 0;

        if ($minRating !== null && $minRating > 0) {
            if ($reviewCount === 0 || $avgRating < $minRating) {
                return null;
            }
        }

        $propertyImages = $this->approvedPropertyImages($property);
        $cover = $propertyImages[0] ?? null;

        $propertyAmenities = $this->approvedPropertyAmenities($property);
        $shownAmenities = array_slice($propertyAmenities, 0, 5);
        $moreCount = max(0, count($propertyAmenities) - count($shownAmenities));

        $eligibleGender = $this->eligibleGenderLabel($qualifying);
        $roomSummaries = $this->roomSummaries($qualifying);
        $coords = $property->resolvedCoordinates();

        return [
            'id' => $property->id,
            'slug' => $property->slug,
            'name' => $property->name,
            'category' => [
                'name' => $property->category?->name,
                'slug' => $property->category?->slug,
            ],
            'city' => [
                'name' => $property->city?->name,
                'slug' => $property->city?->slug,
            ],
            'locality' => $property->locality,
            'latitude' => $coords['latitude'] ?? null,
            'longitude' => $coords['longitude'] ?? null,
            'has_coordinates' => $coords !== null,
            'location_precision' => $coords !== null ? 'exact' : 'area_only',
            'gender_eligibility' => $eligibleGender,
            'cover_image' => $cover,
            'property_amenities' => $shownAmenities,
            'property_amenities_more_count' => $moreCount,
            'food' => $property->foodSummary(),
            'timing' => [
                'check_in' => $this->timing->getStandardCheckInTime(),
                'check_out' => $this->timing->getStandardCheckOutTime(),
            ],
            'price' => [
                'amount_minor' => $best['unit_minor'],
                'total_minor' => $best['total_minor'],
                'currency' => (string) config('tijum.pricing.currency_code', 'INR'),
                'duration_type' => $durationType,
                'duration_count' => $durationCount,
                'pricing_basis' => $best['pricing_basis'],
                'pricing_basis_label' => $best['pricing_basis_label'],
                'is_estimate' => $best['is_estimate'],
                'label' => $best['price_label'],
            ],
            'indicative_total_minor' => $best['total_minor'],
            'approved_at_ts' => $property->approved_at?->getTimestamp() ?? 0,
            'room_summaries' => $roomSummaries,
            'has_early_check_in' => collect($qualifying)->contains(static fn (array $q): bool => $q['early_check_in_enabled'] === true),
            'average_rating' => $avgRating,
            'review_count' => $reviewCount,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function qualifyingRoomTypes(Property $property, array $filters, CarbonImmutable $checkIn, CarbonImmutable $checkOut): array
    {
        $guests = max(1, (int) ($filters['guests'] ?? 1));
        $durationType = (string) ($filters['duration_type'] ?? 'daily');
        $durationCount = max(1, (int) ($filters['duration_count'] ?? 1));
        $priceCol = $this->eligibility->priceColumn($durationType);

        $blocks = $property->availabilityBlocks
            ->where('status', PropertyAvailabilityBlockStatus::Active)
            ->filter(static function (PropertyAvailabilityBlock $b) use ($checkIn, $checkOut): bool {
                $start = $b->start_date;
                $end = $b->end_date;

                return $start->toDateString() <= $checkOut->subDay()->toDateString()
                    && $end->toDateString() >= $checkIn->toDateString();
            });

        $hasPropertyBlock = $blocks->contains(static fn (PropertyAvailabilityBlock $b): bool => $b->scope === PropertyAvailabilityBlockScope::Property);
        if ($hasPropertyBlock) {
            return [];
        }

        $genderPref = $filters['gender_preference'] ?? 'all';
        $sharing = is_array($filters['sharing_capacity'] ?? null) ? $filters['sharing_capacity'] : [];
        $ac = is_array($filters['ac'] ?? null) ? $filters['ac'] : [];
        $early = (bool) ($filters['early_check_in'] ?? false);
        $amenityIds = array_values(array_unique(array_map('intval', is_array($filters['amenities'] ?? null) ? $filters['amenities'] : [])));

        $amenities = $amenityIds !== [] ? Amenity::query()->whereIn('id', $amenityIds)->get(['id', 'applicability_scope'])->keyBy('id') : collect();
        $propertyAmenityIds = $amenities->filter(static fn (Amenity $a): bool => $a->applicability_scope->appliesToProperty())->keys()->map(static fn ($v): int => (int) $v)->all();
        $roomTypeAmenityIds = $amenities->filter(static fn (Amenity $a): bool => $a->applicability_scope->appliesToRoomType())->keys()->map(static fn ($v): int => (int) $v)->all();

        $results = [];
        foreach ($property->roomTypes->where('is_active', true) as $roomType) {
            /** @var PropertyRoomType $roomType */
            $unit = $roomType->{$priceCol};
            if ($unit === null || (int) $unit <= 0) {
                continue;
            }
            $unitMinor = (int) $unit;

            if ($genderPref === 'male' && $roomType->gender_policy->value !== 'male_only') {
                continue;
            }
            if ($genderPref === 'female' && $roomType->gender_policy->value !== 'female_only') {
                continue;
            }
            if ($genderPref === 'both' && $roomType->gender_policy->value !== 'all_genders') {
                continue;
            }

            if ($sharing !== []) {
                $matchesSharing = false;
                foreach ($sharing as $s) {
                    $sv = (int) $s;
                    if ($sv === 1 && $roomType->accommodation_mode === PropertyRoomTypeMode::Private) {
                        $matchesSharing = true;
                    }
                    if (in_array($sv, [2, 3, 4], true) && $roomType->accommodation_mode === PropertyRoomTypeMode::Shared && (int) $roomType->sharing_capacity === $sv) {
                        $matchesSharing = true;
                    }
                }
                if (! $matchesSharing) {
                    continue;
                }
            }

            if ($ac !== []) {
                $hasAc = in_array('ac', $ac, true);
                $hasNon = in_array('non_ac', $ac, true);
                if ($hasAc && ! $hasNon && ! $roomType->is_air_conditioned) {
                    continue;
                }
                if ($hasNon && ! $hasAc && $roomType->is_air_conditioned) {
                    continue;
                }
            }

            if ($early && ! $roomType->early_check_in_enabled) {
                continue;
            }

            $rtBlocked = $blocks->contains(static fn (PropertyAvailabilityBlock $b): bool => $b->scope === PropertyAvailabilityBlockScope::RoomType && (int) $b->property_room_type_id === (int) $roomType->id);
            if ($rtBlocked) {
                continue;
            }

            $blockedRoomIds = $blocks
                ->filter(static fn (PropertyAvailabilityBlock $b): bool => $b->scope === PropertyAvailabilityBlockScope::Room)
                ->pluck('property_room_id')
                ->filter()
                ->map(static fn ($v): int => (int) $v)
                ->all();

            $eligibleRooms = $property->rooms
                ->where('property_room_type_id', $roomType->id)
                ->filter(static fn (PropertyRoom $r): bool => $r->operational_status === PropertyRoomStatus::Active)
                ->filter(static fn (PropertyRoom $r): bool => ! in_array((int) $r->id, $blockedRoomIds, true));

            $roomCount = $eligibleRooms->count();
            if ($roomCount < 1) {
                continue;
            }

            $stayAvailability = $this->availability->stayCapacity(
                $roomType,
                $checkIn->toDateString(),
                $checkOut->toDateString(),
                $guests,
            );

            if (! $stayAvailability['available']) {
                continue;
            }

            $isShared = $roomType->accommodation_mode === PropertyRoomTypeMode::Shared;
            $capacityPerRoom = max(1, (int) $roomType->max_guests_per_room);
            if ($isShared) {
                $totalMinor = $unitMinor * $guests * $durationCount;
                $pricingBasis = 'per_guest';
                $pricingBasisLabel = 'Per Guest';
                $isEstimate = $guests > 1 || $durationCount > 1;
                $priceLabel = $this->formatMoney($unitMinor).' per guest/'.$this->durationSingular($durationType);
            } else {
                $totalMinor = $unitMinor * $guests * $durationCount;
                $pricingBasis = 'per_room';
                $pricingBasisLabel = 'Per Room';
                $isEstimate = $guests > 1 || $durationCount > 1;
                $priceLabel = $this->formatMoney($unitMinor).' per room/'.$this->durationSingular($durationType);
            }

            if ($propertyAmenityIds !== [] && ! $this->propertyHasApprovedAmenities($property, $propertyAmenityIds)) {
                continue;
            }
            if ($roomTypeAmenityIds !== [] && ! $this->roomTypeHasApprovedAmenities($property, $roomType, $roomTypeAmenityIds)) {
                continue;
            }

            $results[] = [
                'id' => $roomType->id,
                'name' => $roomType->name,
                'accommodation_mode' => $roomType->accommodation_mode->value,
                'accommodation_mode_label' => $roomType->accommodation_mode->label(),
                'sharing_capacity' => $roomType->sharing_capacity,
                'sharing_label' => $this->sharingLabel($roomType),
                'max_guests_per_room' => $capacityPerRoom,
                'is_air_conditioned' => (bool) $roomType->is_air_conditioned,
                'gender_policy' => $roomType->gender_policy->value,
                'gender_policy_label' => $roomType->gender_policy->label(),
                'early_check_in_enabled' => (bool) $roomType->early_check_in_enabled,
                'eligible_room_count' => $roomCount,
                'available_quantity' => (int) $stayAvailability['minimum_remaining'],
                'unit_minor' => $unitMinor,
                'daily_rate_minor' => $roomType->daily_rate_minor,
                'weekly_rate_minor' => $roomType->weekly_rate_minor,
                'monthly_rate_minor' => $roomType->monthly_rate_minor,
                'total_minor' => $totalMinor,
                'pricing_basis' => $pricingBasis,
                'pricing_basis_label' => $pricingBasisLabel,
                'is_estimate' => $isEstimate,
                'price_label' => $priceLabel,
                'room_type_amenities' => $this->approvedRoomTypeAmenities($property, $roomType),
            ];
        }

        return $results;
    }

    /**
     * @param  array<int, int>  $amenityIds
     */
    private function propertyHasApprovedAmenities(Property $property, array $amenityIds): bool
    {
        $approved = $property->amenityAssignments
            ->where('is_current', true)
            ->where('status', AmenityVerificationStatus::Approved)
            ->where('is_customer_visible', true)
            ->filter(static fn (PropertyAmenity $a): bool => $a->availability !== AmenityAvailability::NotAvailable)
            ->filter(static function (PropertyAmenity $a): bool {
                $am = $a->amenity;

                return $am !== null && $am->is_active && $am->is_customer_visible;
            })
            ->pluck('amenity_id')->map(static fn ($v): int => (int) $v)->unique()->all();

        foreach ($amenityIds as $id) {
            if (! in_array($id, $approved, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<int, int>  $amenityIds
     */
    private function roomTypeHasApprovedAmenities(Property $property, PropertyRoomType $roomType, array $amenityIds): bool
    {
        $approved = $property->roomTypeAmenityAssignments
            ->where('property_room_type_id', $roomType->id)
            ->where('is_current', true)
            ->where('status', AmenityVerificationStatus::Approved)
            ->where('is_customer_visible', true)
            ->filter(static fn (PropertyRoomTypeAmenity $a): bool => $a->availability !== AmenityAvailability::NotAvailable)
            ->filter(static function (PropertyRoomTypeAmenity $a): bool {
                $am = $a->amenity;

                return $am !== null && $am->is_active && $am->is_customer_visible;
            })
            ->pluck('amenity_id')->map(static fn ($v): int => (int) $v)->unique()->all();

        foreach ($amenityIds as $id) {
            if (! in_array($id, $approved, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function approvedPropertyImages(Property $property): array
    {
        return $property->media
            ->filter(static function (PropertyMedia $m): bool {
                return $m->is_archived === false
                    && $m->moderation_status->value === 'approved'
                    && $m->publication_status->value === 'published'
                    && $m->public_optimized_path !== null
                    && $m->public_thumbnail_path !== null
                    && $m->property_room_type_id === null
                    && $m->property_room_id === null;
            })
            ->sortByDesc('is_cover')
            ->sortBy('sort_order')
            ->values()
            ->map(static fn (PropertyMedia $m): array => [
                'url' => $m->publicOptimizedUrl(),
                'thumbnail_url' => $m->publicThumbnailUrl(),
                'alt_text' => $m->alt_text,
                'is_cover' => (bool) $m->is_cover,
            ])->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function approvedPropertyAmenities(Property $property): array
    {
        return $property->amenityAssignments
            ->filter(static function (PropertyAmenity $a): bool {
                if (! $a->isApprovedCurrent()) {
                    return false;
                }
                $am = $a->amenity;

                return $am !== null && $am->is_active && $am->is_customer_visible && $a->is_customer_visible && $a->availability !== AmenityAvailability::NotAvailable;
            })
            ->sortBy(static fn (PropertyAmenity $a): int => $a->amenity?->display_order ?? PHP_INT_MAX)
            ->map(static function (PropertyAmenity $a): array {
                $am = $a->amenity;

                return [
                    'id' => $am?->id,
                    'name' => $am?->name,
                    'code' => $am?->code,
                    'icon_key' => $am?->icon_key,
                ];
            })->unique('id')->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function approvedRoomTypeAmenities(Property $property, PropertyRoomType $roomType): array
    {
        return $property->roomTypeAmenityAssignments
            ->filter(static function (PropertyRoomTypeAmenity $a) use ($roomType): bool {
                if ((int) $a->property_room_type_id !== (int) $roomType->id || ! $a->isApprovedCurrent()) {
                    return false;
                }
                $am = $a->amenity;

                return $am !== null && $am->is_active && $am->is_customer_visible && $a->is_customer_visible && $a->availability !== AmenityAvailability::NotAvailable;
            })
            ->sortBy(static fn (PropertyRoomTypeAmenity $a): int => $a->amenity?->display_order ?? PHP_INT_MAX)
            ->map(static function (PropertyRoomTypeAmenity $a): array {
                $am = $a->amenity;

                return [
                    'id' => $am?->id,
                    'name' => $am?->name,
                    'code' => $am?->code,
                    'icon_key' => $am?->icon_key,
                ];
            })->unique('id')->values()->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $qualifying
     */
    private function eligibleGenderLabel(array $qualifying): string
    {
        $policies = collect($qualifying)->pluck('gender_policy')->unique()->values()->all();
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

    /**
     * @param  array<int, array<string, mixed>>  $qualifying
     * @return array<int, array<string, mixed>>
     */
    private function roomSummaries(array $qualifying): array
    {
        return collect($qualifying)->map(static function (array $q): array {
            return [
                'id' => $q['id'],
                'name' => $q['name'],
                'sharing_label' => $q['sharing_label'],
                'is_air_conditioned' => $q['is_air_conditioned'],
                'pricing_basis' => $q['pricing_basis'],
                'pricing_basis_label' => $q['pricing_basis_label'],
                'price_label' => $q['price_label'],
                'available_quantity' => $q['available_quantity'],
                'quantity_basis_label' => $q['pricing_basis_label'],
                'room_type_amenities' => collect($q['room_type_amenities'] ?? [])->values()->all(),
            ];
        })->values()->all();
    }

    private function sharingLabel(PropertyRoomType $roomType): string
    {
        if ($roomType->accommodation_mode === PropertyRoomTypeMode::Private) {
            return 'Single Room';
        }

        $cap = (int) ($roomType->sharing_capacity ?? $roomType->max_guests_per_room);

        return $cap.' Sharing';
    }

    private function durationSingular(string $type): string
    {
        return match ($type) {
            'weekly' => 'week',
            'monthly' => 'month',
            default => 'day',
        };
    }

    /**
     * Build a summary card payload (featured listings, wishlists) using approved media,
     * room eligibility policies, meals, amenities, pricing, and rating summary.
     *
     * @return array<string, mixed>
     */
    public function summaryCard(Property $property): array
    {
        $policies = $property->roomTypes
            ->pluck('gender_policy')
            ->map(static fn ($policy): string => $policy instanceof \BackedEnum ? (string) $policy->value : (string) $policy)
            ->filter()
            ->unique()
            ->values();

        $genderEligibility = match ($policies->count()) {
            1 => match ($policies->first()) {
                'male_only' => 'Male Only',
                'female_only' => 'Female Only',
                default => 'Both',
            },
            0 => null,
            default => 'Both',
        };

        $amenities = $this->approvedPropertyAmenities($property);
        $shownAmenities = array_slice($amenities, 0, 5);
        $moreAmenities = max(0, count($amenities) - count($shownAmenities));

        $minDaily = $property->roomTypes->where('daily_rate_minor', '>', 0)->min('daily_rate_minor');
        $minMonthly = $property->roomTypes->where('monthly_rate_minor', '>', 0)->min('monthly_rate_minor');

        $reviewCount = (int) ($property->ratingSummary?->published_review_count ?? 0);
        $rating = $reviewCount > 0 && $property->ratingSummary?->average_rating !== null
            ? (float) $property->ratingSummary->average_rating
            : null;

        return [
            'id' => $property->id,
            'name' => $property->name,
            'slug' => $property->slug,
            'description' => $property->description,
            'locality' => $property->locality,
            'gender_eligibility' => $genderEligibility,
            'city' => $property->city ? [
                'id' => $property->city->id,
                'name' => $property->city->name,
                'slug' => $property->city->slug,
            ] : null,
            'category' => $property->category ? [
                'id' => $property->category->id,
                'name' => $property->category->name,
                'slug' => $property->category->slug,
                'code' => $property->category->code,
            ] : null,
            'cover_image_url' => $property->coverImageUrl(),
            'property_amenities' => $shownAmenities,
            'property_amenities_more_count' => $moreAmenities,
            'food_provided' => (bool) $property->food_provided,
            'breakfast_included' => (bool) $property->breakfast_included,
            'lunch_included' => (bool) $property->lunch_included,
            'dinner_included' => (bool) $property->dinner_included,
            'starting_price' => $minDaily !== null ? (int) $minDaily : null,
            'monthly_price' => $minMonthly !== null ? (int) $minMonthly : null,
            'rating' => $rating,
            'review_count' => $reviewCount,
        ];
    }

    public function formatMoney(int $amountMinor): string
    {
        $currency = (string) config('tijum.pricing.currency_code', 'INR');
        $symbol = $currency === 'INR' ? '₹' : $currency.' ';
        $value = $amountMinor / 100;

        return $symbol.number_format($value, (fmod($value, 1.0) === 0.0) ? 0 : 2);
    }
}
