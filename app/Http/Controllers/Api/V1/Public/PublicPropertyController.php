<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\AccommodationCategory;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\PropertyCardResource;
use App\Http\Resources\Api\V1\PropertyDetailResource;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicPropertyController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Property::query()
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->with(['city', 'category', 'roomTypes', 'media', 'ratingSummary']);

        if ($request->filled('city')) {
            $cityParam = (string) $request->query('city');
            $query->whereHas('city', function ($q) use ($cityParam): void {
                $q->where('slug', $cityParam)
                    ->orWhereRaw('LOWER(name) = ?', [strtolower($cityParam)]);
            });
        }

        if ($request->filled('category')) {
            $catParam = (string) $request->query('category');
            $canonicalEnum = AccommodationCategory::tryFromLegacy($catParam);
            $targetSlug = $canonicalEnum ? $canonicalEnum->value : $catParam;

            $query->whereHas('category', function ($q) use ($targetSlug, $catParam): void {
                $q->where('slug', $targetSlug)
                    ->orWhere('code', $catParam)
                    ->orWhere('id', is_numeric($catParam) ? (int) $catParam : 0);
            });
        }

        if ($request->filled('locality')) {
            $locality = (string) $request->query('locality');
            $query->where(function ($q) use ($locality): void {
                $q->where('locality', 'like', "%{$locality}%")
                    ->orWhere('name', 'like', "%{$locality}%");
            });
        }

        if ($request->boolean('breakfast')) {
            $query->where('breakfast_included', true);
        }

        if ($request->boolean('lunch')) {
            $query->where('lunch_included', true);
        }

        if ($request->boolean('dinner')) {
            $query->where('dinner_included', true);
        }

        if ($request->filled('ac')) {
            $isAc = $request->boolean('ac');
            $query->whereHas('roomTypes', function ($q) use ($isAc): void {
                $q->where('is_air_conditioned', $isAc);
            });
        }

        if ($request->filled('gender') || $request->filled('gender_preference')) {
            $gender = strtolower(trim((string) ($request->query('gender') ?? $request->query('gender_preference'))));
            if ($gender === 'male' || $gender === 'male_only') {
                $query->whereHas('roomTypes', static fn ($q) => $q->where('gender_policy', PropertyGenderPolicy::MaleOnly));
            } elseif ($gender === 'female' || $gender === 'female_only') {
                $query->whereHas('roomTypes', static fn ($q) => $q->where('gender_policy', PropertyGenderPolicy::FemaleOnly));
            } elseif ($gender === 'both') {
                $query->whereHas('roomTypes', static fn ($q) => $q->where('gender_policy', PropertyGenderPolicy::AllGenders));
            }
            // If $gender is 'all' or 'any', no gender restriction is applied (shows all properties)
        }

        if ($request->filled('min_price')) {
            $minPrice = (int) $request->query('min_price');
            $query->whereHas('roomTypes', function ($q) use ($minPrice): void {
                $q->where('monthly_rate_minor', '>=', $minPrice);
            });
        }

        if ($request->filled('max_price')) {
            $maxPrice = (int) $request->query('max_price');
            $query->whereHas('roomTypes', function ($q) use ($maxPrice): void {
                $q->where('monthly_rate_minor', '<=', $maxPrice);
            });
        }

        $perPage = min((int) ($request->query('per_page', 12)), 50);
        $paginated = $query->latest('id')->paginate($perPage);

        return $this->success(
            PropertyCardResource::collection($paginated->items()),
            'Properties retrieved successfully',
            200,
            [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
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
                'roomTypes',
                'media',
                'ratingSummary',
                'currentAmenityAssignments.amenity.category',
            ])
            ->first();

        if ($property === null) {
            return $this->error("Property '{$slug}' not found or not currently available for booking.", 'PROPERTY_NOT_FOUND', 404);
        }

        return $this->success(new PropertyDetailResource($property));
    }
}
