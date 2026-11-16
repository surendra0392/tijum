<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationRejectedNotification;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RejectPropertyApplication
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(
        Admin $actingAdmin,
        PropertyVerificationApplication $application,
        string $decisionReason,
        ?string $internalReviewerNotes = null,
    ): PropertyVerificationApplication {
        $cleanReason = trim($decisionReason);
        if ($cleanReason === '') {
            throw ValidationException::withMessages([
                'decision_reason' => 'A clear decision reason is mandatory when rejecting a property verification application.',
            ]);
        }

        return DB::transaction(function () use (
            $actingAdmin,
            $application,
            $cleanReason,
            $internalReviewerNotes,
        ): PropertyVerificationApplication {
            $lockedApp = PropertyVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canReject()) {
                throw ValidationException::withMessages([
                    'application' => 'This verification application cannot be rejected in its current state.',
                ]);
            }

            $lockedProperty = Property::query()
                ->whereKey($lockedApp->property_id)
                ->lockForUpdate()
                ->firstOrFail();

            $now = now();
            $previous = $lockedApp->status;
            $cleanInternalNotes = is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== ''
                ? trim($internalReviewerNotes)
                : $lockedApp->internal_reviewer_notes;

            $lockedApp->forceFill([
                'status' => PropertyVerificationStatus::Rejected,
                'active_property_id' => null,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => $now,
                'decision_reason' => $cleanReason,
                'internal_reviewer_notes' => $cleanInternalNotes,
            ])->save();

            // Preserve any previously approved snapshot for rejected amendments; ensure non-verified properties stay unpublished.
            $mediaToUnpublish = [];
            if (! $lockedProperty->hasApprovedBaseline()) {
                $mediaToUnpublish = PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('publication_status', 'published')
                    ->pluck('id')
                    ->all();

                $lockedProperty->forceFill([
                    'is_verified' => false,
                    'booking_eligible' => false,
                ])->save();
            }

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $lockedApp,
                eventType: PropertyVerificationEventType::ApplicationRejected,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previous,
                newStatus: PropertyVerificationStatus::Rejected,
                notes: $cleanReason,
                metadata: [
                    'is_amendment' => $lockedApp->is_amendment,
                    'preserved_previous_approval' => $lockedProperty->hasApprovedBaseline(),
                ],
            );

            $appId = $lockedApp->id;

            DB::afterCommit(function () use ($appId, $mediaToUnpublish): void {
                foreach ($mediaToUnpublish as $mediaId) {
                    $this->mediaProcessor->scheduleUnpublication((int) $mediaId);
                }

                $app = PropertyVerificationApplication::query()->with('property.owner')->find($appId);
                if ($app?->property?->owner !== null) {
                    $app->property->owner->notify(new PropertyApplicationRejectedNotification($app));
                }
            });

            return $lockedApp->fresh() ?? $lockedApp;
        });
    }
}
