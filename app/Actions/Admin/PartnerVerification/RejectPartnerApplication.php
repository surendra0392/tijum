<?php

declare(strict_types=1);

namespace App\Actions\Admin\PartnerVerification;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use App\Notifications\Owner\PartnerApplicationRejectedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RejectPartnerApplication
{
    /**
     * @param  array<string, string|null>  $documentNotes
     */
    public function execute(
        Admin $actingAdmin,
        OwnerVerificationApplication $application,
        string $decisionReason,
        ?string $internalReviewerNotes = null,
        array $documentNotes = [],
    ): OwnerVerificationApplication {
        return DB::transaction(function () use (
            $actingAdmin,
            $application,
            $decisionReason,
            $internalReviewerNotes,
            $documentNotes,
        ): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canReject()) {
                throw ValidationException::withMessages([
                    'decision_reason' => sprintf(
                        'Cannot decline an application in "%s" status.',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $now = now();
            $previousStatus = $lockedApp->status;
            $cleanReason = trim($decisionReason);

            foreach ($documentNotes as $rawDocId => $note) {
                $cleanNote = is_string($note) ? trim($note) : '';
                if ($cleanNote === '') {
                    continue;
                }

                $doc = OwnerVerificationDocument::query()
                    ->where('application_id', $lockedApp->id)
                    ->whereKey((int) $rawDocId)
                    ->first();

                if ($doc instanceof OwnerVerificationDocument && $doc->status !== OwnerVerificationDocumentStatus::Replaced) {
                    $doc->forceFill([
                        'status' => OwnerVerificationDocumentStatus::Rejected,
                        'reviewer_note' => $cleanNote,
                        'reviewed_by_admin_id' => $actingAdmin->id,
                        'reviewed_at' => $now,
                    ])->save();
                }
            }

            $cleanInternalNotes = is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== ''
                ? trim($internalReviewerNotes)
                : $lockedApp->internal_reviewer_notes;

            $lockedApp->forceFill([
                'status' => OwnerVerificationStatus::Rejected,
                'active_owner_id' => null,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => $now,
                'requested_information' => null,
                'requested_changes' => null,
                'decision_reason' => $cleanReason,
                'internal_reviewer_notes' => $cleanInternalNotes,
            ])->save();

            // Ordinary application rejection keeps OwnerStatus::PendingReview unless separately restricted at account level.
            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::ApplicationRejected,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previousStatus,
                newStatus: OwnerVerificationStatus::Rejected,
                notes: $cleanReason,
            );

            $applicationId = $lockedApp->id;

            DB::afterCommit(static function () use ($applicationId): void {
                $committedApp = OwnerVerificationApplication::query()->with('owner')->find($applicationId);
                if ($committedApp instanceof OwnerVerificationApplication && $committedApp->owner instanceof Owner) {
                    $committedApp->owner->notify(new PartnerApplicationRejectedNotification($committedApp));
                }
            });

            return $lockedApp->refresh();
        });
    }
}
