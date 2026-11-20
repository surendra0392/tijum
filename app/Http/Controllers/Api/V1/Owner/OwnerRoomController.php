<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\Properties\SavePropertyRoom;
use App\Actions\Owner\Properties\UpdatePropertyRoomOperationalStatus;
use App\Actions\Reservations\SaveReservationAllocations;
use App\Enums\PropertyRoomStatus;
use App\Enums\ReservationStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnerRoomController extends ApiController
{
    /**
     * List physical rooms for the owner's property.
     */
    public function rooms(Request $request, int|string $id): JsonResponse
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

        $rooms = PropertyRoom::query()
            ->where('property_id', $property->id)
            ->with('roomType')
            ->orderBy('room_number')
            ->orderBy('id')
            ->get();

        $data = $rooms->map(static fn (PropertyRoom $room): array => [
            'id' => $room->id,
            'property_id' => $room->property_id,
            'property_room_type_id' => $room->property_room_type_id,
            'room_type_name' => $room->roomType?->name,
            'room_number' => $room->room_number,
            'floor_number' => $room->floor_number,
            'wing_name' => $room->wing_name,
            'building_name' => $room->building_name,
            'operational_status' => $room->operational_status->value,
            'operational_status_label' => $room->operational_status->label(),
            'is_active' => $room->operational_status === PropertyRoomStatus::Active,
            'is_approved_version' => (bool) $room->is_approved_version,
            'configured_capacity' => $room->configuredCapacity(),
        ])->values()->all();

        return $this->success($data, 'Property rooms retrieved successfully.');
    }

    /**
     * Create a new physical room for the property.
     */
    public function store(Request $request, int|string $id, SavePropertyRoom $saveRoom): JsonResponse
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

        $validated = $request->validate([
            'room_number' => ['required', 'string', 'max:50'],
            'property_room_type_id' => ['required', 'integer'],
            'operational_status' => ['nullable', 'string'],
            'floor_number' => ['nullable', 'string', 'max:50'],
            'wing_name' => ['nullable', 'string', 'max:50'],
            'building_name' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $room = $saveRoom->execute($owner, $property, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $room->load('roomType');

        return $this->success([
            'id' => $room->id,
            'property_id' => $room->property_id,
            'property_room_type_id' => $room->property_room_type_id,
            'room_type_name' => $room->roomType?->name,
            'room_number' => $room->room_number,
            'floor_number' => $room->floor_number,
            'wing_name' => $room->wing_name,
            'building_name' => $room->building_name,
            'operational_status' => $room->operational_status->value,
            'operational_status_label' => $room->operational_status->label(),
            'is_active' => $room->operational_status === PropertyRoomStatus::Active,
            'configured_capacity' => $room->configuredCapacity(),
        ], "Physical room {$room->room_number} created successfully.", 201);
    }

    /**
     * Update an existing physical room.
     */
    public function update(
        Request $request,
        int|string $id,
        int $roomId,
        SavePropertyRoom $saveRoom
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

        $existingRoom = PropertyRoom::query()
            ->where('id', $roomId)
            ->where('property_id', $property->id)
            ->first();

        if ($existingRoom === null) {
            return $this->error("Room '{$roomId}' not found in property.", 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'room_number' => ['required', 'string', 'max:50'],
            'property_room_type_id' => ['required', 'integer'],
            'operational_status' => ['nullable', 'string'],
            'floor_number' => ['nullable', 'string', 'max:50'],
            'wing_name' => ['nullable', 'string', 'max:50'],
            'building_name' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $room = $saveRoom->execute($owner, $property, $validated, $existingRoom);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $room->load('roomType');

        return $this->success([
            'id' => $room->id,
            'property_id' => $room->property_id,
            'property_room_type_id' => $room->property_room_type_id,
            'room_type_name' => $room->roomType?->name,
            'room_number' => $room->room_number,
            'floor_number' => $room->floor_number,
            'wing_name' => $room->wing_name,
            'building_name' => $room->building_name,
            'operational_status' => $room->operational_status->value,
            'operational_status_label' => $room->operational_status->label(),
            'is_active' => $room->operational_status === PropertyRoomStatus::Active,
            'configured_capacity' => $room->configuredCapacity(),
        ], "Physical room {$room->room_number} updated successfully.");
    }

    /**
     * Update room operational status (e.g. Active, Maintenance, Blocked, Inactive).
     */
    public function updateStatus(
        Request $request,
        int|string $id,
        int $roomId,
        UpdatePropertyRoomOperationalStatus $updateStatus
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

        $room = PropertyRoom::query()
            ->where('id', $roomId)
            ->where('property_id', $property->id)
            ->first();

        if ($room === null) {
            return $this->error("Room '{$roomId}' not found in property.", 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'operational_status' => ['required', 'string'],
            'internal_description' => ['nullable', 'string', 'max:500'],
        ]);

        $targetStatus = PropertyRoomStatus::tryFrom($validated['operational_status']);
        if ($targetStatus === null) {
            return $this->error('Invalid operational status.', 'VALIDATION_ERROR', 422);
        }

        try {
            $updatedRoom = $updateStatus->execute(
                $owner,
                $property,
                $room,
                $targetStatus,
                $validated['internal_description'] ?? null
            );
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $updatedRoom->id,
            'operational_status' => $updatedRoom->operational_status->value,
            'operational_status_label' => $updatedRoom->operational_status->label(),
            'is_active' => $updatedRoom->operational_status === PropertyRoomStatus::Active,
        ], "Room {$room->room_number} status updated to {$targetStatus->label()}.");
    }

    /**
     * Allocate a physical room to a confirmed reservation.
     */
    public function allocate(
        Request $request,
        string $reference,
        SaveReservationAllocations $saveReservationAllocations,
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->whereHas('property', static fn ($p) => $p->where('owner_id', $owner->id))
            ->with(['property.city', 'roomType', 'user', 'allocations.room'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        if ($reservation->status !== ReservationStatus::Confirmed) {
            return $this->error('Only confirmed reservations can have room allocations.', 'INVALID_STATUS', 422);
        }

        $validated = $request->validate([
            'physical_room_id' => ['nullable', 'integer'],
            'property_room_id' => ['nullable', 'integer'],
            'allocated_quantity' => ['nullable', 'integer', 'min:1'],
            'allocations' => ['nullable', 'array'],
            'allocations.*.property_room_id' => ['required_with:allocations', 'integer'],
            'allocations.*.allocated_quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        if ($request->has('physical_room_id') || $request->has('property_room_id')) {
            $roomId = $validated['physical_room_id'] ?? $validated['property_room_id'];
            if ($roomId === null) {
                $allocationData = ['allocations' => []];
            } else {
                $quantity = (int) ($validated['allocated_quantity'] ?? $reservation->quantity ?? 1);
                $allocationData = [
                    'allocations' => [
                        [
                            'property_room_id' => (int) $roomId,
                            'allocated_quantity' => $quantity,
                        ],
                    ],
                ];
            }
        } elseif ($request->has('allocations')) {
            $allocationsList = $validated['allocations'] ?? [];
            $allocationData = [
                'allocations' => array_map(static fn (array $item): array => [
                    'property_room_id' => (int) $item['property_room_id'],
                    'allocated_quantity' => (int) ($item['allocated_quantity'] ?? 1),
                ], $allocationsList),
            ];
        } else {
            return $this->error('Either physical_room_id or allocations is required.', 'VALIDATION_ERROR', 422, [
                'physical_room_id' => ['Either physical_room_id or allocations is required.'],
            ]);
        }

        try {
            $saveReservationAllocations->execute($owner, $reservation, $allocationData);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $reservation->load(['allocations.room', 'property.city', 'roomType', 'user']);

        return $this->success(
            new ReservationResource($reservation),
            "Physical room allocation updated for reservation '{$reservation->booking_reference}'."
        );
    }
}
