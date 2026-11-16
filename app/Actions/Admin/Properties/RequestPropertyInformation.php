<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyInformationRequestedNotification;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestPropertyInformation
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    /**
     * @param  array<int, string>  $rejectedDocumentNotes
     * @param  array<int, string>  $rejectedMediaNotes
     */
    public function execute(
        Admin $actingAdmin,
        PropertyVerificationApplication $application,
        string $requestedInformation,
        ?string $internalReviewerNotes = null,
        array $rejectedDocumentNotes = [],
        array $rejectedMediaNotes = [],
    ): PropertyVerificationApplication {
        $cleanRequest = trim($requestedInformation);
        if ($cleanRequest === '') {
            throw ValidationException::withMessages([
                'requested_information' => 'Specify the clarification, photo replacement, or missing evidence needed from the partner.',
            ]);
        }

        return DB::transaction(function () use (
            $actingAdmin,
            $application,
            $cleanRequest,
            $internalReviewerNotes,
            $rejectedDocumentNotes,
            $rejectedMediaNotes,
        ): PropertyVerificationApplication {
            $lockedApp = PropertyVerificationApplication::query()
                ->whereKey($application->id)
                ->with('property')
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canRequestInformation()) {
                throw ValidationException::withMessages([
                    'application' => 'Additional information can only be requested while Submitted or Under Review.',
                ]);
            }

            $now = now();
            $flaggedDocumentIds = [];
            $flaggedMediaIds = [];
            $unpublishedIds = [];

            foreach ($rejectedDocumentNotes as $docId => $note) {
                $cleanNote = trim($note);
                if ($cleanNote === '') {
                    continue;
                }

                $doc = PropertyVerificationDocument::query()
                    ->where('application_id', $lockedApp->id)
                    ->where('status', '!=', PropertyVerificationDocumentStatus::Replaced->value)
                    ->find((int) $docId);

                if ($doc instanceof PropertyVerificationDocument) {
                    $doc->forceFill([
                        'status' => PropertyVerificationDocumentStatus::Rejected,
                        'reviewer_note' => $cleanNote,
                        'reviewed_by_admin_id' => $actingAdmin->id,
                        'reviewed_at' => $now,
                    ])->save();
                    $flaggedDocumentIds[] = $doc->id;
                }
            }

            foreach ($rejectedMediaNotes as $mediaId => $note) {
                $cleanNote = trim($note);
                if ($cleanNote === '') {
                    continue;
                }

                $media = PropertyMedia::query()
                    ->where('property_id', $lockedApp->property_id)
                    ->where('is_archived', false)
                    ->find((int) $mediaId);

                if ($media instanceof PropertyMedia) {
                    $wasPublished = $media->isPubliclyPublished();
                    $media->forceFill([
                        'moderation_status' => PropertyMediaModerationStatus::Rejected,
                        'moderation_note' => $cleanNote,
                        'moderated_by_admin_id' => $actingAdmin->id,
                        'moderated_at' => $now,
                        'is_cover' => false,
                    ])->save();
                    $flaggedMediaIds[] = $media->id;
                    if ($wasPublished) {
                        $unpublishedIds[] = $media->id;
                    }
                }
            }

            $previous = $lockedApp->status;
            $cleanInternalNotes = is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== ''
                ? trim($internalReviewerNotes)
                : $lockedApp->internal_reviewer_notes;

            $lockedApp->forceFill([
                'status' => PropertyVerificationStatus::NeedsInformation,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => $now,
                'requested_information' => $cleanRequest,
                'requested_changes' => [
                    'flagged_document_ids' => $flaggedDocumentIds,
                    'flagged_media_ids' => $flaggedMediaIds,
                ],
                'internal_reviewer_notes' => $cleanInternalNotes,
            ])->save();

            if ($lockedApp->property !== null) {
                PropertyVerificationEvent::record(
                    property: $lockedApp->property,
                    application: $lockedApp,
                    eventType: PropertyVerificationEventType::InformationRequested,
                    actorType: 'admin',
                    actorId: $actingAdmin->id,
                    actorName: $actingAdmin->name,
                    previousStatus: $previous,
                    newStatus: PropertyVerificationStatus::NeedsInformation,
                    notes: $cleanRequest,
                    metadata: [
                        'flagged_document_ids' => $flaggedDocumentIds,
                        'flagged_media_ids' => $flaggedMediaIds,
                    ],
                );
            }

            $appId = $lockedApp->id;

            DB::afterCommit(function () use ($appId, $unpublishedIds): void {
                foreach ($unpublishedIds as $mediaId) {
                    $this->mediaProcessor->scheduleUnpublication((int) $mediaId);
                }

                $app = PropertyVerificationApplication::query()->with('property.owner')->find($appId);
                if ($app?->property?->owner !== null) {
                    $app->property->owner->notify(new PropertyInformationRequestedNotification($app));
                }
            });

            return $lockedApp->fresh() ?? $lockedApp;
        });
    }
}
