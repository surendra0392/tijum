<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Models\Reservation;
use App\Models\ReservationRoomAllocation;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteOrDeactivateRoomType
{
    public function __construct(private readonly StayTimingPolicy $timing) {}

    public function execute(
        Owner $owner,
        Property $property,
        PropertyRoomType $roomType,
        bool $deactivateOnly = false,
        bool $deleteRooms = false,
        bool $activateOnly = false,
    ): void {
        DB::transaction(function () use ($owner, $property, $roomType, $deactivateOnly, $deleteRooms, $activateOnly): void {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'room_type' => 'You are not authorised to modify room types for this property.',
                ]);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
            $hasApproved = $lockedProperty->hasApprovedBaseline() || $lockedProperty->is_verified;
            $hasActiveEditableAmendment = $hasApproved
                && $activeApp instanceof PropertyVerificationApplication
                && $activeApp->is_amendment
                && $activeApp->status->isEditableByOwner();

            if (
                ! $hasApproved
                && $activeApp instanceof PropertyVerificationApplication
                && $activeApp->status->isActive()
                && ! $activeApp->status->isEditableByOwner()
            ) {
                throw ValidationException::withMessages([
                    'room_type' => 'Room types cannot be modified while verification is currently in review.',
                ]);
            }

            $lockedRoomType = PropertyRoomType::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($roomType->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($activateOnly) {
                if ($hasActiveEditableAmendment && $lockedRoomType->is_approved_version) {
                    $pending = $lockedRoomType->effectiveAttributes($activeApp);
                    $pending['is_active'] = true;
                    $lockedRoomType->forceFill([
                        'pending_amendment_data' => $pending,
                        'pending_changes_application_id' => $activeApp->id,
                    ])->save();
                } else {
                    $lockedRoomType->forceFill(['is_active' => true])->save();
                }

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::RoomTypeUpdated,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf('Activated room type "%s".', $lockedRoomType->name),
                );

                return;
            }

            $today = CarbonImmutable::now($this->timing->timezone())->toDateString();
            $hasOccupancy = Reservation::query()->where('property_room_type_id', $lockedRoomType->id)
                ->consuming()
                ->whereDate('checkout_date', '>', $today)
                ->exists();

            if ($hasOccupancy) {
                throw ValidationException::withMessages([
                    'room_type' => 'Cannot deactivate or delete a room type with pending or confirmed reservations occupying current or future dates.',
                ]);
            }

            $roomIds = $lockedRoomType->rooms()->pluck('id')->all();
            $hasRooms = $roomIds !== [];

            if ($deactivateOnly) {
                if ($hasActiveEditableAmendment && $lockedRoomType->is_approved_version) {
                    $pending = $lockedRoomType->effectiveAttributes($activeApp);
                    $pending['is_active'] = false;
                    $lockedRoomType->forceFill([
                        'pending_amendment_data' => $pending,
                        'pending_changes_application_id' => $activeApp->id,
                    ])->save();
                } else {
                    $lockedRoomType->forceFill(['is_active' => false])->save();
                }

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::RoomTypeDeactivated,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf('Deactivated room type "%s" without removing historical physical rooms.', $lockedRoomType->name),
                );

                return;
            }

            if ($hasRooms && ! $deleteRooms) {
                throw ValidationException::withMessages([
                    'room_type' => 'This room type cannot be deleted while physical rooms reference it. Deactivate it instead or confirm deleting its rooms.',
                ]);
            }

            if (Reservation::query()->where('property_room_type_id', $lockedRoomType->id)->exists()) {
                throw ValidationException::withMessages([
                    'room_type' => 'This room type has booking history and cannot be permanently deleted. Deactivate it instead.',
                ]);
            }

            if ($hasRooms && ReservationRoomAllocation::query()->whereIn('property_room_id', $roomIds)->exists()) {
                throw ValidationException::withMessages([
                    'room_type' => 'Physical rooms under this room type have reservation allocation history and cannot be permanently deleted. Deactivate it instead.',
                ]);
            }

            if ($hasRooms) {
                PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->whereIn('property_room_id', $roomIds)
                    ->update(['property_room_id' => null]);

                $lockedRoomType->rooms()->delete();
            }

            $deletedName = $lockedRoomType->name;
            $lockedRoomType->media()->update(['property_room_type_id' => null]);
            $lockedRoomType->delete();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $activeApp,
                eventType: PropertyVerificationEventType::RoomTypeDeactivated,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf(
                    'Removed room type "%s"%s.',
                    $deletedName,
                    $hasRooms ? sprintf(' and %d physical room(s)', count($roomIds)) : '',
                ),
            );
        });
    }
}
