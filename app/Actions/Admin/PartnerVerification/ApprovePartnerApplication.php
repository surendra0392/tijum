<?php

declare(strict_types=1);

namespace App\Actions\Admin\PartnerVerification;

use App\Enums\OwnerStatus;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use App\Notifications\Owner\PartnerApplicationApprovedNotification;
use App\Services\PartnerVerificationChecklist;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApprovePartnerApplication
{
    public function __construct(
        public readonly PartnerVerificationChecklist $checklist,
    ) {}

    public function execute(
        Admin $actingAdmin,
        OwnerVerificationApplication $application,
        ?string $decisionReason = null,
        ?string $internalReviewerNotes = null,
    ): OwnerVerificationApplication {
        return DB::transaction(function () use (
            $actingAdmin,
            $application,
            $decisionReason,
            $internalReviewerNotes,
        ): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canApprove()) {
                throw ValidationException::withMessages([
                    'application' => sprintf(
                        'Application must be Under Review before approval (currently "%s").',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $lockedOwner = Owner::query()
                ->whereKey($lockedApp->owner_id)
                ->lockForUpdate()
                ->firstOrFail();

            $evaluation = $this->checklist->evaluate($lockedOwner, $lockedApp);

            if (! $evaluation['ready_for_submission']) {
                throw ValidationException::withMessages([
                    'application' => $evaluation['missing_requirements'][0]
                        ?? 'Cannot approve an application with incomplete verification requirements.',
                ]);
            }

            $now = now();
            $previousStatus = $lockedApp->status;
            $cleanDecisionReason = is_string($decisionReason) && trim($decisionReason) !== ''
                ? trim($decisionReason)
                : 'Partner identity, business profile, operating cities, and verification documents approved.';
            $cleanInternalNotes = is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== ''
                ? trim($internalReviewerNotes)
                : $lockedApp->internal_reviewer_notes;

            OwnerVerificationDocument::query()
                ->where('application_id', $lockedApp->id)
                ->where('status', OwnerVerificationDocumentStatus::Uploaded->value)
                ->update([
                    'status' => OwnerVerificationDocumentStatus::Reviewed->value,
                    'reviewed_by_admin_id' => $actingAdmin->id,
                    'reviewed_at' => $now,
                ]);

            $lockedApp->forceFill([
                'status' => OwnerVerificationStatus::Approved,
                'active_owner_id' => null,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => $now,
                'requested_information' => null,
                'requested_changes' => null,
                'decision_reason' => $cleanDecisionReason,
                'internal_reviewer_notes' => $cleanInternalNotes,
            ])->save();

            $lockedOwner->forceFill([
                'status' => OwnerStatus::Active,
                'approved_by_admin_id' => $actingAdmin->id,
                'approved_at' => $now,
            ])->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::ApplicationApproved,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previousStatus,
                newStatus: OwnerVerificationStatus::Approved,
                notes: $cleanDecisionReason,
                metadata: [
                    'owner_status' => OwnerStatus::Active->value,
                    'approved_at' => $now->toISOString(),
                ],
            );

            $applicationId = $lockedApp->id;

            DB::afterCommit(static function () use ($applicationId): void {
                $committedApp = OwnerVerificationApplication::query()->with('owner')->find($applicationId);
                if ($committedApp instanceof OwnerVerificationApplication && $committedApp->owner instanceof Owner) {
                    $committedApp->owner->notify(new PartnerApplicationApprovedNotification($committedApp));
                }
            });

            return $lockedApp->refresh();
        });
    }
}
