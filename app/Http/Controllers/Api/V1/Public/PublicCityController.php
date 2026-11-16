<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\PropertyOperationalStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\CityResource;
use App\Http\Resources\Api\V1\PropertyCardResource;
use App\Models\City;
use App\Models\Property;
use Illuminate\Http\JsonResponse;

class PublicCityController extends ApiController
{
    public function index(): JsonResponse
    {
        $cities = City::query()
            ->where('is_active', true)
            ->withCount(['properties' => function ($q): void {
                $q->where('status', PropertyOperationalStatus::Active)
                    ->where('is_verified', true)
                    ->where('booking_eligible', true);
            }])
            ->get();

        return $this->success(CityResource::collection($cities));
    }

    public function show(string $slug): JsonResponse
    {
        $city = City::query()
            ->where('is_active', true)
            ->where(static function ($q) use ($slug): void {
                $q->where('slug', $slug)
                    ->orWhereRaw('LOWER(name) = ?', [strtolower(str_replace('-', ' ', $slug))]);
            })
            ->withCount(['properties' => function ($q): void {
                $q->where('status', PropertyOperationalStatus::Active)
                    ->where('is_verified', true)
                    ->where('booking_eligible', true);
            }])
            ->first();

        if ($city === null) {
            return $this->error("City '{$slug}' not found.", 'CITY_NOT_FOUND', 404);
        }

        $properties = Property::query()
            ->where('city_id', $city->id)
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->with(['city', 'category', 'roomTypes', 'media', 'ratingSummary'])
            ->take(10)
            ->get();

        return $this->success([
            'city' => new CityResource($city),
            'featured_properties' => PropertyCardResource::collection($properties),
        ]);
    }
}
