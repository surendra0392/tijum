<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationEvent;
use App\Models\Reservation;
use App\Services\PropertyMediaProcessor;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TogglePropertyOperationalStatus
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function execute(
        Owner $owner,
        Property $property,
        PropertyOperationalStatus $targetStatus,
    ): Property {
        if (! in_array($targetStatus, [
            PropertyOperationalStatus::Active,
            PropertyOperationalStatus::TemporarilyClosed,
            PropertyOperationalStatus::Archived,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => 'Partners can only switch an approved property between Active, Temporarily Closed, or Archived.',
            ]);
        }

        return DB::transaction(function () use ($owner, $property, $targetStatus): Property {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'status' => 'You are not authorised to update this property status.',
                ]);
            }

            if (! $lockedProperty->hasApprovedBaseline()) {
                throw ValidationException::withMessages([
                    'status' => 'Only verified properties can be marked Active or Temporarily Closed.',
                ]);
            }

            if ($lockedProperty->status === PropertyOperationalStatus::Suspended) {
                throw ValidationException::withMessages([
                    'status' => 'Suspended properties require administrative reinstatement before changing operational status.',
                ]);
            }

            if ($targetStatus !== PropertyOperationalStatus::Active) {
                $today = CarbonImmutable::now($this->timing->timezone())->toDateString();

                $hasOccupancy = Reservation::query()->where('property_id', $lockedProperty->id)
                    ->consuming()
                    ->whereDate('checkout_date', '>', $today)
                    ->exists();

                if ($hasOccupancy) {
                    throw ValidationException::withMessages([
                        'status' => 'Cannot deactivate a property with pending or confirmed reservations occupying current or future dates.',
                    ]);
                }
            }

            $previous = $lockedProperty->status;
            $hasActiveAmendment = $lockedProperty->activeVerificationApplication()->exists();

            $bookingEligible = match ($targetStatus) {
                PropertyOperationalStatus::Active => ! $hasActiveAmendment,
                PropertyOperationalStatus::TemporarilyClosed,
                PropertyOperationalStatus::Archived => false,
            };

            $lockedProperty->forceFill([
                'status' => $targetStatus,
                'booking_eligible' => $bookingEligible,
            ])->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: null,
                eventType: PropertyVerificationEventType::PropertyOperationalStatusChanged,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf(
                    'Operational status updated from %s to %s (verification approval preserved).',
                    $previous->label(),
                    $targetStatus->label(),
                ),
                metadata: [
                    'previous_operational_status' => $previous->value,
                    'new_operational_status' => $targetStatus->value,
                ],
            );

            if ($targetStatus === PropertyOperationalStatus::Archived) {
                $mediaIds = $lockedProperty->media()->pluck('id')->all();
                DB::afterCommit(function () use ($mediaIds): void {
                    foreach ($mediaIds as $mediaId) {
                        $this->mediaProcessor->scheduleUnpublication((int) $mediaId);
                    }
                });
            }

            return $lockedProperty->fresh() ?? $lockedProperty;
        });
    }
}
