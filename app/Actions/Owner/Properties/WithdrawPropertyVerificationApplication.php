<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WithdrawPropertyVerificationApplication
{
    public function __construct(
        public readonly CancelPropertyAmendment $cancelAmendment,
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(
        Owner $owner,
        Property $property,
        ?string $reason = null,
    ): PropertyVerificationApplication {
        return DB::transaction(function () use ($owner, $property, $reason): PropertyVerificationApplication {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'application' => 'You are not authorised to withdraw this property verification application.',
                ]);
            }

            $lockedApp = $lockedProperty->activeVerificationApplication()
                ->lockForUpdate()
                ->first();

            if (! $lockedApp instanceof PropertyVerificationApplication || ! $lockedApp->status->canWithdrawByOwner()) {
                throw ValidationException::withMessages([
                    'application' => 'No active verification application can be withdrawn.',
                ]);
            }

            $previousStatus = $lockedApp->status;
            $cleanReason = is_string($reason) && trim($reason) !== ''
                ? trim($reason)
                : 'Application withdrawn by partner prior to decision.';

            $lockedApp->forceFill([
                'status' => PropertyVerificationStatus::Withdrawn,
                'active_property_id' => null,
                'decision_reason' => $cleanReason,
            ])->save();

            if ($lockedApp->is_amendment && $lockedProperty->hasApprovedBaseline()) {
                $mediaToDeleteFiles = $this->cancelAmendment->rollbackAmendmentStaging($lockedProperty, $lockedApp);

                DB::afterCommit(function () use ($mediaToDeleteFiles): void {
                    foreach ($mediaToDeleteFiles as $mediaObj) {
                        $this->mediaProcessor->deletePrivateAssets($mediaObj);
                    }
                });
            } else {
                $lockedProperty->forceFill([
                    'booking_eligible' => false,
                ])->save();

                $publishedMediaIds = $lockedProperty->media()
                    ->pluck('id')
                    ->map(static fn (mixed $id): int => (int) $id)
                    ->values()
                    ->all();

                DB::afterCommit(function () use ($publishedMediaIds): void {
                    foreach ($publishedMediaIds as $mediaId) {
                        $this->mediaProcessor->scheduleUnpublication($mediaId);
                    }
                });
            }

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $lockedApp,
                eventType: PropertyVerificationEventType::ApplicationWithdrawn,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previousStatus,
                newStatus: PropertyVerificationStatus::Withdrawn,
                notes: $cleanReason,
            );

            return $lockedApp->fresh() ?? $lockedApp;
        });
    }
}
