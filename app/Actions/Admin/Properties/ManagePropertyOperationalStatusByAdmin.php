<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManagePropertyOperationalStatusByAdmin
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(
        Admin $actingAdmin,
        Property $property,
        PropertyOperationalStatus $targetStatus,
        ?string $reason = null,
    ): Property {
        if ($targetStatus === PropertyOperationalStatus::Active && ! $property->hasApprovedBaseline()) {
            throw ValidationException::withMessages([
                'status' => 'An unverified property cannot be set operationally Active.',
            ]);
        }

        if ($targetStatus === PropertyOperationalStatus::Suspended && (! is_string($reason) || trim($reason) === '')) {
            throw ValidationException::withMessages([
                'reason' => 'Provide an operational or compliance reason before suspending a property.',
            ]);
        }

        return DB::transaction(function () use ($actingAdmin, $property, $targetStatus, $reason): Property {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            $previous = $lockedProperty->status;
            $hasActiveAmendment = $lockedProperty->activeVerificationApplication()->exists();
            $cleanReason = is_string($reason) && trim($reason) !== '' ? trim($reason) : null;

            $bookingEligible = $targetStatus === PropertyOperationalStatus::Active
                && $lockedProperty->hasApprovedBaseline()
                && ! $hasActiveAmendment;

            $lockedProperty->forceFill([
                'status' => $targetStatus,
                'booking_eligible' => $bookingEligible,
                'suspended_reason' => $targetStatus === PropertyOperationalStatus::Suspended ? $cleanReason : null,
            ])->save();

            $eventType = match (true) {
                $targetStatus === PropertyOperationalStatus::Suspended => PropertyVerificationEventType::PropertySuspended,
                $previous === PropertyOperationalStatus::Suspended => PropertyVerificationEventType::PropertyReinstated,
                default => PropertyVerificationEventType::PropertyOperationalStatusChanged,
            };

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: null,
                eventType: $eventType,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                notes: $cleanReason ?? sprintf('Operational status changed from %s to %s.', $previous->label(), $targetStatus->label()),
                metadata: [
                    'previous_operational_status' => $previous->value,
                    'new_operational_status' => $targetStatus->value,
                ],
            );

            $mediaIds = PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->where('is_archived', false)
                ->where('moderation_status', PropertyMediaModerationStatus::Approved->value)
                ->pluck('id')
                ->all();

            DB::afterCommit(function () use ($targetStatus, $lockedProperty, $mediaIds): void {
                if (in_array($targetStatus, [PropertyOperationalStatus::Suspended, PropertyOperationalStatus::Archived], true)) {
                    foreach ($mediaIds as $mediaId) {
                        $this->mediaProcessor->scheduleUnpublication((int) $mediaId);
                    }
                } elseif ($targetStatus === PropertyOperationalStatus::Active && $lockedProperty->hasApprovedBaseline()) {
                    foreach ($mediaIds as $mediaId) {
                        $this->mediaProcessor->schedulePublication((int) $mediaId);
                    }
                }
            });

            return $lockedProperty->fresh() ?? $lockedProperty;
        });
    }
}
