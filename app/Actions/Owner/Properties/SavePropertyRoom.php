<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SavePropertyRoom
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(
        Owner $owner,
        Property $property,
        array $attributes,
        ?PropertyRoom $existingRoom = null,
    ): PropertyRoom {
        $roomNumber = trim((string) ($attributes['room_number'] ?? ''));
        if ($roomNumber === '') {
            throw ValidationException::withMessages([
                'room_number' => 'Room number is required (e.g., 101 or A-101).',
            ]);
        }

        $roomTypeId = (int) ($attributes['property_room_type_id'] ?? 0);
        $targetStatus = PropertyRoomStatus::tryFrom((string) ($attributes['operational_status'] ?? PropertyRoomStatus::Active->value))
            ?? throw ValidationException::withMessages([
                'operational_status' => 'Select a valid room operational status.',
            ]);

        $floorNumber = $this->nullableTrimmed($attributes['floor_number'] ?? null);
        $wingName = $this->nullableTrimmed($attributes['wing_name'] ?? null);
        $buildingName = $this->nullableTrimmed($attributes['building_name'] ?? null);
        $description = $this->nullableTrimmed($attributes['description'] ?? null);

        return DB::transaction(function () use (
            $owner,
            $property,
            $existingRoom,
            $roomNumber,
            $roomTypeId,
            $targetStatus,
            $floorNumber,
            $wingName,
            $buildingName,
            $description,
        ): PropertyRoom {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'room' => 'You are not authorised to manage physical rooms for this property.',
                ]);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();

            $roomType = PropertyRoomType::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($roomTypeId)
                ->first();

            if (! $roomType instanceof PropertyRoomType) {
                throw ValidationException::withMessages([
                    'property_room_type_id' => 'Physical rooms must reference an existing room type belonging to this same property.',
                ]);
            }

            $effectiveType = $roomType->effectiveAttributes($activeApp instanceof PropertyVerificationApplication ? $activeApp : null);
            $creatingOrChangingType = ! $existingRoom instanceof PropertyRoom
                || $existingRoom->property_room_type_id !== $roomType->id;

            if ($creatingOrChangingType && ! (bool) $effectiveType['is_active']) {
                throw ValidationException::withMessages([
                    'property_room_type_id' => 'Inactive room types cannot accept new physical rooms.',
                ]);
            }

            // Duplicate room numbers are blocked within the same property (allowed across different properties).
            $duplicateQuery = PropertyRoom::query()
                ->where('property_id', $lockedProperty->id)
                ->whereRaw('LOWER(room_number) = ?', [mb_strtolower($roomNumber)]);

            if ($existingRoom instanceof PropertyRoom) {
                $duplicateQuery->where('id', '!=', $existingRoom->id);
            }

            if ($duplicateQuery->exists()) {
                throw ValidationException::withMessages([
                    'room_number' => sprintf('Room number "%s" already exists in this property.', $roomNumber),
                ]);
            }

            $hasApproved = $lockedProperty->hasApprovedBaseline();

            if ($existingRoom instanceof PropertyRoom) {
                $lockedRoom = PropertyRoom::query()
                    ->where('property_id', $lockedProperty->id)
                    ->whereKey($existingRoom->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $materialInventoryChange = $lockedRoom->property_room_type_id !== $roomType->id
                    || $lockedRoom->room_number !== $roomNumber;

                if (
                    $hasApproved
                    && $lockedRoom->is_approved_version
                    && $materialInventoryChange
                    && (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner())
                ) {
                    throw ValidationException::withMessages([
                        'property_room_type_id' => 'Changing a verified room’s room number or room type requires an active amendment. Operational statuses and internal notes remain editable.',
                    ]);
                }

                $lockedRoom->forceFill([
                    'property_room_type_id' => $roomType->id,
                    'room_number' => $roomNumber,
                    'floor_number' => $floorNumber,
                    'wing_name' => $wingName,
                    'building_name' => $buildingName,
                    'description' => $description,
                    'operational_status' => $targetStatus,
                ])->save();

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::RoomUpdated,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf('Updated physical room %s (%s · %s).', $roomNumber, $roomType->name, $targetStatus->label()),
                    metadata: ['room_id' => $lockedRoom->id],
                );

                return $lockedRoom->fresh(['roomType']) ?? $lockedRoom;
            }

            if (
                $hasApproved
                && (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner())
            ) {
                throw ValidationException::withMessages([
                    'room' => 'Adding new physical rooms to an approved property requires starting a Re-Verification Amendment.',
                ]);
            }

            if (! $hasApproved && $activeApp instanceof PropertyVerificationApplication && ! $activeApp->status->isEditableByOwner()) {
                throw ValidationException::withMessages([
                    'room' => 'Rooms cannot be added while property verification is locked for review.',
                ]);
            }

            $room = new PropertyRoom;
            $room->forceFill([
                'property_id' => $lockedProperty->id,
                'property_room_type_id' => $roomType->id,
                'amendment_application_id' => $hasApproved ? $activeApp->id : null,
                'is_approved_version' => false,
                'room_number' => $roomNumber,
                'floor_number' => $floorNumber,
                'wing_name' => $wingName,
                'building_name' => $buildingName,
                'description' => $description,
                'operational_status' => $targetStatus,
            ]);
            $room->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $activeApp,
                eventType: PropertyVerificationEventType::RoomAdded,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf('Added physical room %s under %s (capacity %d guests).', $roomNumber, $roomType->name, $roomType->max_guests_per_room),
                metadata: [
                    'room_id' => $room->id,
                    'room_type_id' => $roomType->id,
                ],
            );

            return $room->fresh(['roomType']) ?? $room;
        });
    }

    private function nullableTrimmed(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
