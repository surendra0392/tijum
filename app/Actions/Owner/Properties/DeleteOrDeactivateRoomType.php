<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Models\Reservation;
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
    ): void {
        DB::transaction(function () use ($owner, $property, $roomType, $deactivateOnly): void {
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
            $hasApproved = $lockedProperty->hasApprovedBaseline();

            if ($hasApproved && (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner())) {
                throw ValidationException::withMessages([
                    'room_type' => 'Deactivating or deleting a room type on an approved property requires an active amendment.',
                ]);
            }

            $lockedRoomType = PropertyRoomType::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($roomType->id)
                ->lockForUpdate()
                ->firstOrFail();

            $today = CarbonImmutable::now($this->timing->timezone())->toDateString();
            $hasOccupancy = Reservation::query()->where('property_room_type_id', $lockedRoomType->id)
                ->consuming()
                ->whereDate('checkout_date', '>', $today)
                ->exists();

            if ($hasOccupancy) {
                throw ValidationException::withMessages([
                    'room_type' => 'Cannot deactivate a room type with pending or confirmed reservations occupying current or future dates.',
                ]);
            }

            $hasRooms = $lockedRoomType->rooms()->exists();

            if ($deactivateOnly) {
                if ($hasApproved && $lockedRoomType->is_approved_version) {
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

            if ($hasRooms) {
                throw ValidationException::withMessages([
                    'room_type' => 'This room type cannot be deleted while physical rooms reference it. Deactivate it instead or reassign rooms.',
                ]);
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
                notes: sprintf('Removed unreferenced room type "%s".', $deletedName),
            );
        });
    }
}
