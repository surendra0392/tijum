<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyVerificationEvent;
use App\Models\Reservation;
use App\Services\ReservationAvailabilityService;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdatePropertyRoomOperationalStatus
{
    public function __construct(
        private readonly ReservationAvailabilityService $availability,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function execute(
        Owner $owner,
        Property $property,
        PropertyRoom $room,
        PropertyRoomStatus $targetStatus,
        ?string $internalDescription = null,
    ): PropertyRoom {
        return DB::transaction(function () use (
            $owner,
            $property,
            $room,
            $targetStatus,
            $internalDescription,
        ): PropertyRoom {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'room' => 'You are not authorised to update room operations for this property.',
                ]);
            }

            $lockedRoom = PropertyRoom::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($room->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($targetStatus !== PropertyRoomStatus::Active) {
                $today = CarbonImmutable::now($this->timing->timezone())->toDateString();
                $lastCheckout = Reservation::query()->where('property_room_type_id', $lockedRoom->property_room_type_id)
                    ->consuming()
                    ->max('checkout_date');

                if ($lastCheckout !== null && CarbonImmutable::parse($lastCheckout)->greaterThan($today)) {
                    $lastOccupiedDate = CarbonImmutable::parse($lastCheckout, $this->timing->timezone())
                        ->subDay()
                        ->toDateString();

                    if (! $this->availability->roomExclusionCoversOccupancy($lockedRoom, $today, $lastOccupiedDate)) {
                        throw ValidationException::withMessages([
                            'room' => 'Cannot deactivate this room: remaining capacity would not cover pending or confirmed reservations.',
                        ]);
                    }
                }
            }

            $previous = $lockedRoom->operational_status;
            $updates = [
                'operational_status' => $targetStatus,
            ];

            if ($internalDescription !== null) {
                $trimmed = trim($internalDescription);
                $updates['description'] = $trimmed === '' ? null : $trimmed;
            }

            $lockedRoom->forceFill($updates)->save();

            // Non-critical operational status changes never revoke property verification.
            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: null,
                eventType: PropertyVerificationEventType::RoomStatusChanged,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf(
                    'Room %s operational status updated from %s to %s.',
                    $lockedRoom->room_number,
                    $previous->label(),
                    $targetStatus->label(),
                ),
                metadata: [
                    'room_id' => $lockedRoom->id,
                    'previous_status' => $previous->value,
                    'new_status' => $targetStatus->value,
                ],
            );

            return $lockedRoom->fresh(['roomType']) ?? $lockedRoom;
        });
    }
}
