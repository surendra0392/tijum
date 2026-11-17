<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Models\Amenity;
use App\Models\City;
use App\Models\Property;
use App\Models\PropertyCategory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Pagination\LengthAwarePaginator;

class PropertySearchService
{
    public function __construct(
        private readonly PropertySearchEligibility $eligibility,
        private readonly PropertySearchCustomerData $customerData,
        private readonly StayTimingPolicy $timing,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function search(array $filters): array
    {
        $checkIn = CarbonImmutable::parse((string) $filters['check_in'], $this->timing->timezone())->startOfDay();
        $checkOut = $this->timing->calculateCheckoutDate($checkIn, (string) $filters['duration_type'], max(1, (int) $filters['duration_count']));

        $sort = $filters['sort'] ?? 'relevant';
        $perPage = 6;
        $page = max(1, (int) ($filters['page'] ?? 1));

        $searchedLocality = isset($filters['locality']) && is_string($filters['locality']) ? trim($filters['locality']) : null;
        $refCoords = $this->resolveReferenceCoordinates($filters);

        // Retrieve candidate properties in the city; locality is handled through proximity distance scoring
        // so nearby stays in the same city are continuously included and displayed
        $queryFilters = $filters;
        unset($queryFilters['locality']);

        $candidateIds = $this->eligibility->basePropertyQuery($queryFilters)
            ->when($sort === 'recent', static fn (Builder $q) => $q->orderByDesc('approved_at')->orderByDesc('id'), static fn (Builder $q) => $q->orderBy('name')->orderBy('id'))
            ->pluck('id');

        $localityFallback = false;
        if ($candidateIds->isEmpty() && ! empty($filters['locality'])) {
            $fallbackFilters = $filters;
            unset($fallbackFilters['locality']);
            $fallbackCandidateIds = $this->eligibility->basePropertyQuery($fallbackFilters)
                ->when($sort === 'recent', static fn (Builder $q) => $q->orderByDesc('approved_at')->orderByDesc('id'), static fn (Builder $q) => $q->orderBy('name')->orderBy('id'))
                ->pluck('id');

            if ($fallbackCandidateIds->isNotEmpty()) {
                $candidateIds = $fallbackCandidateIds;
                $localityFallback = true;
            }
        }

        // Phase 1: Retrieve candidate properties with only the lightweight ranking relations
        // Heavy relations (media photos, amenity assignments) are deferred until after pagination
        $candidateModels = Property::query()
            ->whereIn('id', $candidateIds)
            ->with([
                'category:id,name,slug,code',
                'city:id,name,slug,state',
                'roomTypes' => static function ($q): void {
                    $q->where('is_active', true)->orderBy('display_order')->orderBy('id');
                },
                'roomTypes.rooms' => static function ($q): void {
                    $q->where('operational_status', PropertyRoomStatus::Active->value);
                },
                'rooms' => static function ($q): void {
                    $q->where('operational_status', PropertyRoomStatus::Active->value);
                },
                'amenityAssignments.amenity.category',
                'roomTypeAmenityAssignments.amenity.category',
                'ratingSummary',
                'availabilityBlocks' => static function ($q) use ($checkIn, $checkOut): void {
                    $q->where('status', PropertyAvailabilityBlockStatus::Active->value)
                        ->whereDate('start_date', '<=', $checkOut->subDay()->toDateString())
                        ->whereDate('end_date', '>=', $checkIn->toDateString());
                },
            ])->get()->keyBy('id');

        $scoredCandidates = [];
        foreach ($candidateIds as $id) {
            $property = $candidateModels->get($id);
            if (! $property instanceof Property) {
                continue;
            }

            $qualifying = $this->customerData->qualifyingRoomTypes($property, $filters, $checkIn, $checkOut);
            if ($qualifying === []) {
                continue;
            }

            usort($qualifying, static fn (array $a, array $b): int => $a['total_minor'] <=> $b['total_minor']);
            $best = $qualifying[0];

            $min = $filters['min_price'] ?? null;
            $max = $filters['max_price'] ?? null;
            if (is_int($min) && $best['total_minor'] < $min) {
                continue;
            }
            if (is_int($max) && $best['total_minor'] > $max) {
                continue;
            }

            $minRating = isset($filters['min_rating']) && is_numeric($filters['min_rating'])
                ? (float) $filters['min_rating']
                : null;
            $avgRating = $property->ratingSummary ? (float) $property->ratingSummary->average_rating : 0.0;
            $reviewCount = $property->ratingSummary ? (int) $property->ratingSummary->published_review_count : 0;
            if ($minRating !== null && $minRating > 0 && ($reviewCount === 0 || $avgRating < $minRating)) {
                continue;
            }

            $distKm = null;
            if ($refCoords && $property->latitude !== null && $property->longitude !== null) {
                $distKm = $this->calculateDistanceKm(
                    $refCoords['lat'],
                    $refCoords['lng'],
                    (float) $property->latitude,
                    (float) $property->longitude,
                );
            }

            $isExactLocality = false;
            if ($searchedLocality && $property->locality) {
                $isExactLocality = stripos($property->locality, $searchedLocality) !== false
                    || stripos($searchedLocality, $property->locality) !== false;
            }

            $scoredCandidates[] = [
                'property_id' => $property->id,
                'indicative_total_minor' => $best['total_minor'],
                'distance_km' => $distKm,
                'is_locality_match' => $isExactLocality,
                'approved_at_ts' => $property->approved_at?->getTimestamp() ?? 0,
                'average_rating' => $avgRating,
                'review_count' => $reviewCount,
            ];
        }

        $collection = collect($scoredCandidates);
        if ($sort === 'distance_asc') {
            $collection = $collection->sortBy(static fn (array $c): float => $c['distance_km'] ?? 99999.0)->values();
        } elseif ($sort === 'distance_desc') {
            $collection = $collection->sortByDesc(static fn (array $c): float => $c['distance_km'] ?? -1.0)->values();
        } elseif ($sort === 'price_asc') {
            $collection = $collection->sortBy('indicative_total_minor')->values();
        } elseif ($sort === 'price_desc') {
            $collection = $collection->sortByDesc('indicative_total_minor')->values();
        } elseif ($sort === 'recent') {
            $collection = $collection->sortByDesc('approved_at_ts')->values();
        } elseif ($sort === 'highest_rated') {
            $collection = $collection->sort(static function (array $a, array $b): int {
                $ratingCmp = $b['average_rating'] <=> $a['average_rating'];
                if ($ratingCmp !== 0) {
                    return $ratingCmp;
                }

                return $b['review_count'] <=> $a['review_count'];
            })->values();
        } else {
            // 'relevant': prioritize exact locality match first, then proximity
            if ($searchedLocality) {
                $collection = $collection->sort(function (array $a, array $b): int {
                    $aMatch = $a['is_locality_match'] ? 0 : 1;
                    $bMatch = $b['is_locality_match'] ? 0 : 1;
                    if ($aMatch !== $bMatch) {
                        return $aMatch <=> $bMatch;
                    }
                    $aDist = $a['distance_km'] ?? 99999.0;
                    $bDist = $b['distance_km'] ?? 99999.0;

                    return $aDist <=> $bDist;
                })->values();
            } elseif ($refCoords !== null) {
                $collection = $collection->sortBy(static fn (array $c): float => $c['distance_km'] ?? 99999.0)->values();
            }
        }

        $total = $collection->count();
        $pagedScored = $collection->forPage($page, $perPage)->values();

        // Phase 2: Eager-load heavy presentation media ONLY for the visible properties on this page
        $pagedModels = new EloquentCollection(
            $pagedScored
                ->map(static fn (array $item): ?Property => $candidateModels->get($item['property_id']))
                ->filter(static fn (?Property $p): bool => $p instanceof Property)
                ->all()
        );

        $pagedModels->load([
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
        ]);

        $items = [];
        foreach ($pagedScored as $item) {
            $property = $candidateModels->get($item['property_id']);
            if (! $property instanceof Property) {
                continue;
            }
            $card = $this->customerData->searchCard($property, $filters, $checkIn, $checkOut);
            if ($card !== null) {
                $distKm = $item['distance_km'];
                $card['distance_km'] = $distKm;
                $card['distance_label'] = $distKm !== null
                    ? ($distKm < 1 ? ((int) ($distKm * 1000).' m away') : ($distKm.' km away'))
                    : null;
                $card['is_locality_match'] = $item['is_locality_match'];
                $items[] = $card;
            }
        }

        $paginator = new LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            [
                'path' => url('/search'),
                'query' => $this->queryParamsForPagination($filters),
            ],
        );

        return [
            'paginator' => $paginator,
            'check_out' => $checkOut->toDateString(),
            'check_in' => $checkIn->toDateString(),
            'total' => $total,
            'locality_fallback' => $localityFallback,
            'searched_locality' => $filters['locality'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function queryParamsForPagination(array $filters): array
    {
        $params = $filters;
        unset($params['page']);

        return array_filter($params, static fn ($v) => $v !== null && $v !== '' && $v !== [] && $v !== false);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function searchMeta(array $filters): array
    {
        $city = City::query()->where('is_active', true)->find((int) ($filters['city'] ?? 0));
        $categories = PropertyCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug', 'code']);
        $amenities = Amenity::query()->active()->orderBy('display_order')->orderBy('name')->get(['id', 'name', 'code', 'icon_key', 'applicability_scope']);

        $checkout = null;
        $hasIntent = isset($filters['check_in'], $filters['duration_type'], $filters['duration_count']);
        if ($hasIntent) {
            try {
                $checkout = $this->timing->calculateCheckoutDate(
                    (string) $filters['check_in'],
                    (string) $filters['duration_type'],
                    max(1, (int) $filters['duration_count']),
                )->toDateString();
            } catch (\Throwable) {
                $checkout = null;
            }
        }

        return [
            'city' => $city ? ['id' => $city->id, 'name' => $city->name, 'slug' => $city->slug, 'state' => $city->state] : null,
            'categories' => $categories->map(static fn (PropertyCategory $c): array => ['id' => $c->id, 'name' => $c->name, 'slug' => $c->slug, 'code' => $c->code])->all(),
            'amenities' => $amenities->map(static fn (Amenity $a): array => [
                'id' => $a->id,
                'name' => $a->name,
                'code' => $a->code,
                'icon_key' => $a->icon_key,
                'scope' => $a->applicability_scope->value,
                'scope_label' => $a->applicability_scope->label(),
            ])->all(),
            'checkout_date' => $checkout,
            'timing' => [
                'standard_check_in_time' => $this->timing->getStandardCheckInTime(),
                'standard_check_out_time' => $this->timing->getStandardCheckOutTime(),
                'earliest_early_check_in_time' => $this->timing->getEarliestEarlyCheckInTime(),
                'timezone' => $this->timing->timezone(),
            ],
            'durations' => config('tijum.pricing.durations', []),
        ];
    }

    /**
     * Resolve reference coordinates from filters (lat/lng, locality, or city).
     *
     * @param  array<string, mixed>  $filters
     * @return array{lat: float, lng: float}|null
     */
    public function resolveReferenceCoordinates(array $filters): ?array
    {
        if (isset($filters['lat'], $filters['lng']) && is_numeric($filters['lat']) && is_numeric($filters['lng'])) {
            return [
                'lat' => (float) $filters['lat'],
                'lng' => (float) $filters['lng'],
            ];
        }

        $locality = isset($filters['locality']) && is_string($filters['locality']) ? trim($filters['locality']) : '';
        $cityId = isset($filters['city']) ? (int) $filters['city'] : null;

        if ($locality !== '' && $cityId) {
            $matchedProp = Property::query()
                ->where('city_id', $cityId)
                ->where('locality', 'like', '%'.$locality.'%')
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->first(['latitude', 'longitude']);

            if ($matchedProp && $matchedProp->latitude && $matchedProp->longitude) {
                return [
                    'lat' => (float) $matchedProp->latitude,
                    'lng' => (float) $matchedProp->longitude,
                ];
            }
        }

        // Known localities coordinates dictionary for Andhra Pradesh & Telangana
        $knownLocalities = [
            'madhapur' => ['lat' => 17.4485, 'lng' => 78.3741],
            'hitec' => ['lat' => 17.4504, 'lng' => 78.3808],
            'hitech' => ['lat' => 17.4504, 'lng' => 78.3808],
            'gachibowli' => ['lat' => 17.4401, 'lng' => 78.3489],
            'kondapur' => ['lat' => 17.4682, 'lng' => 78.3614],
            'nanakramguda' => ['lat' => 17.4194, 'lng' => 78.3412],
            'financial district' => ['lat' => 17.4194, 'lng' => 78.3412],
            'banjara hills' => ['lat' => 17.4156, 'lng' => 78.4354],
            'jubilee hills' => ['lat' => 17.4325, 'lng' => 78.4071],
            'kukatpally' => ['lat' => 17.4933, 'lng' => 78.4018],
            'kphb' => ['lat' => 17.4875, 'lng' => 78.3953],
            'satavahana' => ['lat' => 17.4933, 'lng' => 78.4018],
            'ameerpet' => ['lat' => 17.4375, 'lng' => 78.4483],
            'sr nagar' => ['lat' => 17.4410, 'lng' => 78.4450],
            'miyapur' => ['lat' => 17.4969, 'lng' => 78.3614],
            'dilsukhnagar' => ['lat' => 17.3688, 'lng' => 78.5247],
            'lb nagar' => ['lat' => 17.3457, 'lng' => 78.5522],
            'benz circle' => ['lat' => 16.5012, 'lng' => 80.6481],
            'governorpet' => ['lat' => 16.5165, 'lng' => 80.6289],
            'moghalrajpuram' => ['lat' => 16.5054, 'lng' => 80.6421],
            'bhavanipuram' => ['lat' => 16.5085, 'lng' => 80.6542],
            'patamata' => ['lat' => 16.4941, 'lng' => 80.6654],
            'brodipet' => ['lat' => 16.3042, 'lng' => 80.4418],
            'arundelpet' => ['lat' => 16.3089, 'lng' => 80.4356],
            'lakshmipuram' => ['lat' => 16.3156, 'lng' => 80.4289],
            'koretipadu' => ['lat' => 16.3212, 'lng' => 80.4498],
            'mvp colony' => ['lat' => 17.7421, 'lng' => 83.3341],
            'siripuram' => ['lat' => 17.7208, 'lng' => 83.3154],
            'beach road' => ['lat' => 17.7548, 'lng' => 83.3489],
            'madhurawada' => ['lat' => 17.7312, 'lng' => 83.3156],
        ];

        if ($locality !== '') {
            $locLower = strtolower($locality);
            foreach ($knownLocalities as $key => $coords) {
                if (str_contains($locLower, $key)) {
                    return $coords;
                }
            }
        }

        // Default city centers
        $cityCenters = [
            1 => ['lat' => 17.3850, 'lng' => 78.4867], // Hyderabad
            2 => ['lat' => 16.3067, 'lng' => 80.4365], // Guntur
            3 => ['lat' => 16.5062, 'lng' => 80.6480], // Vijayawada
            4 => ['lat' => 17.6868, 'lng' => 83.2185], // Visakhapatnam
        ];

        if ($cityId && isset($cityCenters[$cityId])) {
            return $cityCenters[$cityId];
        }

        if (isset($filters['city']) && $filters['city'] !== '') {
            $cityParam = $filters['city'];
            $city = is_numeric($cityParam)
                ? City::query()->find((int) $cityParam)
                : City::query()->where('slug', (string) $cityParam)->orWhereRaw('LOWER(name) = ?', [strtolower((string) $cityParam)])->first();
            if ($city) {
                $slug = $city->slug;
                if ($slug === 'hyderabad') {
                    return ['lat' => 17.3850, 'lng' => 78.4867];
                }
                if ($slug === 'visakhapatnam') {
                    return ['lat' => 17.6868, 'lng' => 83.2185];
                }
                if ($slug === 'vijayawada') {
                    return ['lat' => 16.5062, 'lng' => 80.6480];
                }
                if ($slug === 'guntur') {
                    return ['lat' => 16.3067, 'lng' => 80.4365];
                }
            }
        }

        return null;
    }

    /**
     * Compute Haversine distance in kilometers between two lat/lng coordinates.
     */
    public function calculateDistanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371; // km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 1);
    }
}
