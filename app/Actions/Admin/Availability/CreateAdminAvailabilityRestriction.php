<?php

declare(strict_types=1);

namespace App\Actions\Admin\Availability;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyAvailabilityBlockEvent;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Services\ReservationAvailabilityService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateAdminAvailabilityRestriction
{
    public function __construct(private readonly ReservationAvailabilityService $availability) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Admin $admin, Property $property, array $data): PropertyAvailabilityBlock
    {
        return DB::transaction(function () use ($admin, $property, $data): PropertyAvailabilityBlock {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();

            $scope = is_string($data['scope'] ?? null) ? PropertyAvailabilityBlockScope::tryFrom((string) $data['scope']) : null;
            $type = is_string($data['block_type'] ?? null) ? PropertyAvailabilityBlockType::tryFrom((string) $data['block_type']) : null;
            $start = $this->nullableString($data['start_date'] ?? null);
            $end = $this->nullableString($data['end_date'] ?? null);

            if (! $scope instanceof PropertyAvailabilityBlockScope || ! $type instanceof PropertyAvailabilityBlockType || $start === null || $end === null) {
                throw ValidationException::withMessages(['availability' => 'Provide a valid scope, block type, and date range.']);
            }

            if ($start > $end) {
                throw ValidationException::withMessages(['end_date' => 'End date must be on or after the start date.']);
            }

            $roomTypeId = null;
            $roomId = null;

            if ($scope === PropertyAvailabilityBlockScope::RoomType) {
                $roomTypeId = isset($data['property_room_type_id']) ? (int) $data['property_room_type_id'] : null;
                $roomType = $roomTypeId ? PropertyRoomType::query()->whereKey($roomTypeId)->first() : null;
                if (! $roomType instanceof PropertyRoomType || $roomType->property_id !== $lockedProperty->id) {
                    throw ValidationException::withMessages(['property_room_type_id' => 'Select a valid room type.']);
                }
            }

            if ($scope === PropertyAvailabilityBlockScope::Room) {
                $roomId = isset($data['property_room_id']) ? (int) $data['property_room_id'] : null;
                $room = $roomId ? PropertyRoom::query()->whereKey($roomId)->first() : null;
                if (! $room instanceof PropertyRoom || $room->property_id !== $lockedProperty->id) {
                    throw ValidationException::withMessages(['property_room_id' => 'Select a valid physical room.']);
                }
                $roomTypeId = $room->property_room_type_id;
            }

            if ($scope === PropertyAvailabilityBlockScope::Property || $scope === PropertyAvailabilityBlockScope::RoomType) {
                if ($this->availability->blockOverlapsConsumingReservations(
                    $lockedProperty,
                    $scope === PropertyAvailabilityBlockScope::RoomType ? $roomType : null,
                    $start,
                    $end,
                )) {
                    throw ValidationException::withMessages([
                        'availability' => 'Cannot block while pending or confirmed reservations occupy the requested dates.',
                    ]);
                }
            }

            if ($scope === PropertyAvailabilityBlockScope::Room) {
                if (! $this->availability->roomExclusionCoversOccupancy($room, $start, $end)) {
                    throw ValidationException::withMessages([
                        'availability' => 'Cannot block this room: remaining capacity would not cover pending or confirmed reservations.',
                    ]);
                }
            }

            $block = new PropertyAvailabilityBlock;
            $block->forceFill([
                'property_id' => $lockedProperty->id,
                'property_room_type_id' => $roomTypeId,
                'property_room_id' => $roomId,
                'created_by_owner_id' => null,
                'created_by_admin_id' => $admin->id,
                'scope' => $scope->value,
                'block_type' => $type->value,
                'status' => PropertyAvailabilityBlockStatus::Active->value,
                'start_date' => $start,
                'end_date' => $end,
                'reason' => $this->nullableString($data['reason'] ?? null),
                'is_admin_restriction' => true,
            ])->save();

            PropertyAvailabilityBlockEvent::record(
                block: $block,
                eventType: 'admin_restriction_created',
                actorType: 'admin',
                actorId: $admin->id,
                actorName: $admin->name,
                newSnapshot: $block->toPortalArray(true),
                notes: $block->reason,
            );

            return $block->fresh(['roomType', 'room']) ?? $block;
        });
    }

    private function nullableString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
