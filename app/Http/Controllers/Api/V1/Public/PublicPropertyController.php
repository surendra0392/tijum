<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\AccommodationCategory;
use App\Enums\AmenityVerificationStatus;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Reservations\QuoteReservationRequest;
use App\Http\Resources\Api\V1\PropertyCardResource;
use App\Http\Resources\Api\V1\PropertyDetailResource;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyRoomType;
use App\Services\PropertySearchService;
use App\Services\ReservationQuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class PublicPropertyController extends ApiController
{
    public function index(Request $request, PropertySearchService $searchService): JsonResponse
    {
        $query = Property::query()
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->with([
                'city',
                'category',
                'roomTypes' => static fn ($q) => $q->where('is_active', true)->orderBy('display_order')->orderBy('id'),
                'media',
                'ratingSummary',
            ]);

        if ($request->filled('city')) {
            $cityParam = trim((string) $request->query('city'));
            $query->whereHas('city', function ($q) use ($cityParam): void {
                if (is_numeric($cityParam)) {
                    $q->where('id', (int) $cityParam);
                } else {
                    $q->where('slug', $cityParam)
                        ->orWhereRaw('LOWER(name) = ?', [strtolower($cityParam)]);
                }
            });
        }

        if ($request->filled('category')) {
            $rawCategories = $request->query('category');
            $catList = is_array($rawCategories) ? $rawCategories : explode(',', (string) $rawCategories);
            $catList = array_values(array_filter(array_map('trim', $catList), static fn (string $v): bool => $v !== ''));

            if ($catList !== []) {
                $targetSlugs = [];
                $numericIds = [];
                foreach ($catList as $catParam) {
                    if (is_numeric($catParam)) {
                        $numericIds[] = (int) $catParam;
                    } else {
                        $canonicalEnum = AccommodationCategory::tryFromLegacy($catParam);
                        $targetSlugs[] = $canonicalEnum ? $canonicalEnum->value : $catParam;
                    }
                }

                $query->whereHas('category', function ($q) use ($targetSlugs, $numericIds, $catList): void {
                    $q->where(function ($sub) use ($targetSlugs, $numericIds, $catList): void {
                        if ($targetSlugs !== []) {
                            $sub->orWhereIn('slug', $targetSlugs);
                        }
                        $sub->orWhereIn('code', $catList);
                        if ($numericIds !== []) {
                            $sub->orWhereIn('id', $numericIds);
                        }
                    });
                });
            }
        }

        $searchedLocality = $request->filled('locality') ? trim((string) $request->query('locality')) : null;
        $refCoords = $searchService->resolveReferenceCoordinates([
            'lat' => $request->query('lat'),
            'lng' => $request->query('lng'),
            'locality' => $searchedLocality,
            'city' => $request->query('city'),
        ]);

        // Only hard-filter by locality text if neither city nor reference coordinates exist
        // so nearby properties in the same city/radius are preserved and scored by distance.
        if ($searchedLocality !== null && $searchedLocality !== '' && ! $request->filled('city') && $refCoords === null) {
            $query->where(function ($q) use ($searchedLocality): void {
                $q->where('locality', 'like', "%{$searchedLocality}%")
                    ->orWhere('name', 'like', "%{$searchedLocality}%");
            });
        }

        $foodMeals = $this->parseCsvOrArray($request->query('food_meals'));
        if ($request->boolean('breakfast') || in_array('breakfast', $foodMeals, true)) {
            $query->where('breakfast_included', true);
        }
        if ($request->boolean('lunch') || in_array('lunch', $foodMeals, true)) {
            $query->where('lunch_included', true);
        }
        if ($request->boolean('dinner') || in_array('dinner', $foodMeals, true)) {
            $query->where('dinner_included', true);
        }

        if ($request->filled('ac')) {
            $acInput = $request->query('ac');
            if (is_array($acInput) || (is_string($acInput) && (str_contains($acInput, 'ac') || str_contains($acInput, 'non_ac')))) {
                $acValues = $this->parseCsvOrArray($acInput);
                $wantAc = in_array('ac', $acValues, true);
                $wantNonAc = in_array('non_ac', $acValues, true);
                if ($wantAc !== $wantNonAc) {
                    $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('is_air_conditioned', $wantAc));
                }
            } else {
                $isAc = $request->boolean('ac');
                $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('is_air_conditioned', $isAc));
            }
        }

        if ($request->boolean('early_check_in')) {
            $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('early_check_in_enabled', true));
        }

        $sharingCapacities = array_values(array_filter(array_map('intval', $this->parseCsvOrArray($request->query('sharing_capacity'))), static fn (int $v): bool => $v > 0));
        if ($sharingCapacities !== []) {
            $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->whereIn('sharing_capacity', $sharingCapacities));
        }

        $amenityIds = array_values(array_filter(array_map('intval', $this->parseCsvOrArray($request->query('amenities'))), static fn (int $v): bool => $v > 0));
        foreach ($amenityIds as $amenityId) {
            $query->whereHas('currentAmenityAssignments', static function ($q) use ($amenityId): void {
                $q->where('amenity_id', $amenityId)
                    ->where('verification_status', AmenityVerificationStatus::Approved->value);
            });
        }

        if ($request->filled('gender') || $request->filled('gender_preference')) {
            $gender = strtolower(trim((string) ($request->query('gender') ?? $request->query('gender_preference'))));
            if ($gender === 'male' || $gender === 'male_only') {
                $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('gender_policy', PropertyGenderPolicy::MaleOnly));
            } elseif ($gender === 'female' || $gender === 'female_only') {
                $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('gender_policy', PropertyGenderPolicy::FemaleOnly));
            } elseif ($gender === 'both') {
                $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('gender_policy', PropertyGenderPolicy::AllGenders));
            }
        }

        if ($request->filled('min_price')) {
            $minPrice = (int) $request->query('min_price');
            $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('monthly_rate_minor', '>=', $minPrice));
        }

        if ($request->filled('max_price')) {
            $maxPrice = (int) $request->query('max_price');
            $query->whereHas('roomTypes', static fn ($q) => $q->where('is_active', true)->where('monthly_rate_minor', '<=', $maxPrice));
        }

        if ($request->filled('min_rating') && is_numeric($request->query('min_rating'))) {
            $minRating = (float) $request->query('min_rating');
            if ($minRating > 0) {
                $query->whereHas('ratingSummary', static function ($q) use ($minRating): void {
                    $q->where('published_review_count', '>', 0)
                        ->where('average_rating', '>=', $minRating);
                });
            }
        }

        $perPage = max(1, min((int) ($request->query('per_page', 12)), 50));
        $page = max(1, (int) ($request->query('page', 1)));
        $sort = (string) ($request->query('sort', ($searchedLocality !== null || $refCoords !== null) ? 'relevant' : 'recent'));

        $properties = $query->latest('id')->get();

        // Annotate each property with distance & locality match
        $properties->each(function (Property $property) use ($refCoords, $searchedLocality, $searchService): void {
            $distKm = null;
            if ($refCoords !== null && $property->latitude !== null && $property->longitude !== null) {
                $distKm = $searchService->calculateDistanceKm(
                    $refCoords['lat'],
                    $refCoords['lng'],
                    (float) $property->latitude,
                    (float) $property->longitude,
                );
            }

            $isExactLocality = false;
            if ($searchedLocality !== null && $searchedLocality !== '' && $property->locality) {
                $isExactLocality = stripos($property->locality, $searchedLocality) !== false
                    || stripos($searchedLocality, $property->locality) !== false;
            }

            $property->setAttribute('distance_km', $distKm);
            $property->setAttribute('distance_label', $distKm !== null
                ? ($distKm < 1 ? ((int) ($distKm * 1000).' m away') : ($distKm.' km away'))
                : null);
            $property->setAttribute('is_locality_match', $searchedLocality !== null ? $isExactLocality : null);
        });

        $sorted = match ($sort) {
            'distance_asc' => $properties->sortBy(static fn (Property $p): float => $p->getAttribute('distance_km') ?? 99999.0)->values(),
            'distance_desc' => $properties->sortByDesc(static fn (Property $p): float => $p->getAttribute('distance_km') ?? -1.0)->values(),
            'price_asc' => $properties->sortBy(static fn (Property $p): int => (int) ($p->roomTypes->where('monthly_rate_minor', '>', 0)->min('monthly_rate_minor') ?? PHP_INT_MAX))->values(),
            'price_desc' => $properties->sortByDesc(static fn (Property $p): int => (int) ($p->roomTypes->where('monthly_rate_minor', '>', 0)->min('monthly_rate_minor') ?? 0))->values(),
            'highest_rated' => $properties->sort(static function (Property $a, Property $b): int {
                $ratingA = $a->ratingSummary ? (float) $a->ratingSummary->average_rating : 0.0;
                $ratingB = $b->ratingSummary ? (float) $b->ratingSummary->average_rating : 0.0;
                $cmp = $ratingB <=> $ratingA;

                $countA = $a->ratingSummary ? (int) $a->ratingSummary->published_review_count : 0;
                $countB = $b->ratingSummary ? (int) $b->ratingSummary->published_review_count : 0;

                return $cmp !== 0 ? $cmp : ($countB <=> $countA);
            })->values(),
            'relevant' => $properties->sort(static function (Property $a, Property $b): int {
                $aMatch = $a->getAttribute('is_locality_match') ? 0 : 1;
                $bMatch = $b->getAttribute('is_locality_match') ? 0 : 1;
                if ($aMatch !== $bMatch) {
                    return $aMatch <=> $bMatch;
                }
                $aDist = $a->getAttribute('distance_km') ?? 99999.0;
                $bDist = $b->getAttribute('distance_km') ?? 99999.0;
                if ($aDist !== $bDist) {
                    return $aDist <=> $bDist;
                }

                return $b->id <=> $a->id;
            })->values(),
            default => $properties->values(),
        };

        $total = $sorted->count();
        $paginated = new LengthAwarePaginator(
            $sorted->forPage($page, $perPage)->values(),
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return $this->success(
            PropertyCardResource::collection($paginated->items()),
            'Properties retrieved successfully',
            200,
            [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'searched_locality' => $searchedLocality,
                'reference_coordinates' => $refCoords,
            ]
        );
    }

    public function show(string $slug): JsonResponse
    {
        $property = Property::query()
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->where(function ($q) use ($slug): void {
                $q->where('slug', $slug)
                    ->orWhere('id', is_numeric($slug) ? (int) $slug : 0);
            })
            ->with([
                'city',
                'category',
                'roomTypes' => static fn ($q) => $q->where('is_active', true)->orderBy('display_order')->orderBy('id'),
                'roomTypes.rooms' => static fn ($q) => $q->where('operational_status', PropertyRoomStatus::Active->value),
                'media',
                'ratingSummary',
                'currentAmenityAssignments.amenity.category',
                'reviews' => static fn ($q) => $q->where('status', ReviewStatus::Published->value)->latest('published_at')->limit(10),
            ])
            ->first();

        if ($property === null) {
            return $this->error("Property '{$slug}' not found or not currently available for booking.", 'PROPERTY_NOT_FOUND', 404);
        }

        return $this->success(new PropertyDetailResource($property));
    }

    public function quote(
        QuoteReservationRequest $request,
        Property $property,
        ReservationQuoteService $quotes,
    ): JsonResponse {
        if ($property->status !== PropertyOperationalStatus::Active || ! $property->is_verified || ! $property->booking_eligible) {
            return $this->error('This property is not currently available for booking.', 'PROPERTY_NOT_BOOKABLE', 404);
        }

        $validated = $request->validated();
        $roomType = PropertyRoomType::query()
            ->where('property_id', $property->id)
            ->whereKey((int) $validated['property_room_type_id'])
            ->first();

        if ($roomType === null) {
            return $this->error('The selected room type is not valid for this property.', 'INVALID_ROOM_TYPE', 422);
        }

        $quoteResult = $quotes->quote(
            $property,
            $roomType,
            (string) $validated['check_in_date'],
            (string) $validated['duration_type'],
            (int) $validated['duration_quantity'],
            (int) $validated['quantity'],
            $validated['requested_arrival_time'] ?? null,
        );

        if (! $quoteResult['eligible'] || ! is_array($quoteResult['quote'])) {
            return $this->error(
                implode(' ', $quoteResult['errors']),
                'QUOTE_INELIGIBLE',
                422,
                ['errors' => $quoteResult['errors']]
            );
        }

        return $this->success(
            $quotes->formatApiQuotePayload($property, $roomType, $quoteResult),
            'Stay quote retrieved successfully.'
        );
    }

    public function reviews(Request $request, string $slug): JsonResponse
    {
        $property = Property::query()
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->where(function ($q) use ($slug): void {
                $q->where('slug', $slug)
                    ->orWhere('id', is_numeric($slug) ? (int) $slug : 0);
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$slug}' not found.", 'PROPERTY_NOT_FOUND', 404);
        }

        $perPage = max(1, min((int) ($request->query('per_page', 10)), 30));
        $paginated = PropertyReview::query()
            ->where('property_id', $property->id)
            ->where('status', ReviewStatus::Published->value)
            ->with(['roomType:id,name'])
            ->latest('published_at')
            ->paginate($perPage);

        $items = collect($paginated->items())->map(static fn (PropertyReview $r): array => [
            'id' => $r->id,
            'customer_display_name' => $r->customer_display_name,
            'overall_rating' => (int) $r->overall_rating,
            'cleanliness_rating' => $r->cleanliness_rating !== null ? (int) $r->cleanliness_rating : null,
            'food_quality_rating' => $r->food_quality_rating !== null ? (int) $r->food_quality_rating : null,
            'communication_rating' => $r->communication_rating !== null ? (int) $r->communication_rating : null,
            'value_rating' => $r->value_rating !== null ? (int) $r->value_rating : null,
            'title' => $r->title,
            'content' => $r->content,
            'room_type_name' => $r->roomType?->name,
            'verified_booking' => (bool) $r->verified_booking,
            'published_at' => $r->published_at?->toIso8601String(),
        ])->all();

        return $this->success(
            $items,
            'Property reviews retrieved successfully.',
            200,
            [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ]
        );
    }

    /**
     * @return list<string>
     */
    private function parseCsvOrArray(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $list = is_array($value) ? $value : explode(',', (string) $value);

        return array_values(array_filter(array_map(static fn ($v): string => trim((string) $v), $list), static fn (string $v): bool => $v !== ''));
    }
}
