<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\PropertyDetailResource;
use App\Models\Owner;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerPropertyController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $properties = Property::query()
            ->where('owner_id', $owner->id)
            ->with(['city', 'category', 'roomTypes', 'media', 'ratingSummary'])
            ->latest('id')
            ->paginate(15);

        return $this->success(
            PropertyDetailResource::collection($properties->items()),
            'Partner properties retrieved',
            200,
            [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'total' => $properties->total(),
            ]
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('id', $id)
            ->where('owner_id', $owner->id)
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
            return $this->error('Property not found or does not belong to your partner account.', 'NOT_FOUND', 404);
        }

        return $this->success(new PropertyDetailResource($property));
    }
}
