<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\Properties\DeleteOrDeactivateRoomType;
use App\Actions\Owner\Properties\SavePropertyRoomType;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\RoomTypeResource;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnerRoomTypeController extends ApiController
{
    /**
     * List all room types for the property.
     */
    public function index(Request $request, int|string $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $roomTypes = PropertyRoomType::query()
            ->where('property_id', $property->id)
            ->with(['rooms', 'media'])
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return $this->success(
            RoomTypeResource::collection($roomTypes),
            'Room types retrieved successfully.'
        );
    }

    /**
     * Create a new room type for the property.
     */
    public function store(
        Request $request,
        int|string $id,
        SavePropertyRoomType $saveRoomType
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'accommodation_mode' => ['required', 'string'],
            'sharing_capacity' => ['nullable', 'integer'],
            'max_guests_per_room' => ['nullable', 'integer'],
            'gender_policy' => ['required', 'string'],
            'guest_composition_policy' => ['required', 'array', 'min:1'],
            'is_air_conditioned' => ['nullable', 'boolean'],
            'early_check_in_enabled' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:2000'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            $roomType = $saveRoomType->execute($owner, $property, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $roomType->load(['rooms', 'media']);

        return $this->success(
            new RoomTypeResource($roomType),
            "Room type '{$roomType->name}' created successfully.",
            201
        );
    }

    /**
     * Update an existing room type.
     */
    public function update(
        Request $request,
        int|string $id,
        int $roomTypeId,
        SavePropertyRoomType $saveRoomType
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $existing = PropertyRoomType::query()
            ->where('id', $roomTypeId)
            ->where('property_id', $property->id)
            ->first();

        if ($existing === null) {
            return $this->error("Room type '{$roomTypeId}' not found in property.", 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'accommodation_mode' => ['required', 'string'],
            'sharing_capacity' => ['nullable', 'integer'],
            'max_guests_per_room' => ['nullable', 'integer'],
            'gender_policy' => ['required', 'string'],
            'guest_composition_policy' => ['required', 'array', 'min:1'],
            'is_air_conditioned' => ['nullable', 'boolean'],
            'early_check_in_enabled' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:2000'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            $roomType = $saveRoomType->execute($owner, $property, $validated, $existing);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $roomType->load(['rooms', 'media']);

        return $this->success(
            new RoomTypeResource($roomType),
            "Room type '{$roomType->name}' updated successfully."
        );
    }

    /**
     * Delete or deactivate room type.
     */
    public function destroy(
        Request $request,
        int|string $id,
        int $roomTypeId,
        DeleteOrDeactivateRoomType $deleteAction
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $roomType = PropertyRoomType::query()
            ->where('id', $roomTypeId)
            ->where('property_id', $property->id)
            ->first();

        if ($roomType === null) {
            return $this->error("Room type '{$roomTypeId}' not found in property.", 'NOT_FOUND', 404);
        }

        $deactivateOnly = (bool) $request->boolean('deactivate_only', false);
        $deleteRooms = (bool) $request->boolean('delete_rooms', false);

        try {
            $deleteAction->execute($owner, $property, $roomType, $deactivateOnly, $deleteRooms);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success(
            null,
            $deactivateOnly
                ? "Room type '{$roomType->name}' has been deactivated."
                : "Room type '{$roomType->name}' removed successfully."
        );
    }
}
