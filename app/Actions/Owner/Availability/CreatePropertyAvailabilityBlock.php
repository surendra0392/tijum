<?php

declare(strict_types=1);

namespace App\Actions\Owner\Availability;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyAvailabilityBlockEvent;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Services\ReservationAvailabilityService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePropertyAvailabilityBlock
{
    public function __construct(private readonly ReservationAvailabilityService $availability) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(
        Owner $owner,
        Property $property,
        array $data,
        string $actorType = 'owner',
        ?Model $actor = null,
        bool $isAdminRestriction = false,
    ): PropertyAvailabilityBlock {
        return DB::transaction(function () use ($owner, $property, $data, $actorType, $actor, $isAdminRestriction): PropertyAvailabilityBlock {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages(['availability' => 'You are not authorised to manage availability for this property.']);
            }

            $scope = is_string($data['scope'] ?? null) ? PropertyAvailabilityBlockScope::tryFrom((string) $data['scope']) : null;
            $type = is_string($data['block_type'] ?? null) ? PropertyAvailabilityBlockType::tryFrom((string) $data['block_type']) : null;
            $start = $this->nullableString($data['start_date'] ?? null);
            $end = $this->nullableString($data['end_date'] ?? null);

            if (! $scope instanceof PropertyAvailabilityBlockScope) {
                throw ValidationException::withMessages(['scope' => 'Select a valid availability scope.']);
            }

            if (! $type instanceof PropertyAvailabilityBlockType) {
                throw ValidationException::withMessages(['block_type' => 'Select a valid block type.']);
            }

            if ($start === null || $end === null) {
                throw ValidationException::withMessages(['start_date' => 'Provide start and end dates for the availability block.']);
            }

            if ($start > $end) {
                throw ValidationException::withMessages(['end_date' => 'End date must be on or after the start date.']);
            }

            $roomTypeId = null;
            $roomId = null;

            if ($scope === PropertyAvailabilityBlockScope::RoomType) {
                $roomTypeId = isset($data['property_room_type_id']) && is_numeric($data['property_room_type_id'])
                    ? (int) $data['property_room_type_id']
                    : null;
                $roomType = $roomTypeId !== null ? PropertyRoomType::query()->whereKey($roomTypeId)->first() : null;
                if (! $roomType instanceof PropertyRoomType || $roomType->property_id !== $lockedProperty->id) {
                    throw ValidationException::withMessages(['property_room_type_id' => 'Select a valid room type for this property.']);
                }
            }

            if ($scope === PropertyAvailabilityBlockScope::Room) {
                $roomId = isset($data['property_room_id']) && is_numeric($data['property_room_id'])
                    ? (int) $data['property_room_id']
                    : null;
                $room = $roomId !== null ? PropertyRoom::query()->with('roomType')->whereKey($roomId)->first() : null;
                if (! $room instanceof PropertyRoom || $room->property_id !== $lockedProperty->id) {
                    throw ValidationException::withMessages(['property_room_id' => 'Select a valid physical room for this property.']);
                }
                $roomTypeId = $room->property_room_type_id;
            }

            $resolvedActor = $actor ?? $owner;
            $resolvedActorType = $isAdminRestriction ? 'admin' : $actorType;
            $actorId = (int) $resolvedActor->getKey();
            $actorName = $resolvedActor instanceof Owner ? $resolvedActor->name : ($resolvedActor instanceof Admin ? $resolvedActor->name : $owner->name);

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
                'created_by_owner_id' => $isAdminRestriction ? null : $owner->id,
                'created_by_admin_id' => $isAdminRestriction && $resolvedActor instanceof Admin ? $resolvedActor->id : null,
                'scope' => $scope->value,
                'block_type' => $type->value,
                'status' => PropertyAvailabilityBlockStatus::Active->value,
                'start_date' => $start,
                'end_date' => $end,
                'reason' => $this->nullableString($data['reason'] ?? null),
                'is_admin_restriction' => $isAdminRestriction,
            ])->save();

            PropertyAvailabilityBlockEvent::record(
                block: $block,
                eventType: 'created',
                actorType: $resolvedActorType,
                actorId: $actorId,
                actorName: $actorName,
                newSnapshot: $block->toPortalArray(true),
                notes: $block->reason,
            );

            return $block->fresh(['roomType', 'room']) ?? $block;
        });
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return trim($value);
    }
}
