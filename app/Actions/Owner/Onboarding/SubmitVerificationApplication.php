<?php

declare(strict_types=1);

namespace App\Actions\Owner\Onboarding;

use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use App\Notifications\Owner\PartnerApplicationSubmittedNotification;
use App\Services\PartnerVerificationChecklist;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitVerificationApplication
{
    public function __construct(
        public readonly PartnerVerificationChecklist $checklist,
    ) {}

    public function execute(Owner $owner, ?string $notes = null): OwnerVerificationApplication
    {
        return DB::transaction(function () use ($owner, $notes): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->where('active_owner_id', $owner->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedApp instanceof OwnerVerificationApplication) {
                throw ValidationException::withMessages([
                    'application' => 'Complete your onboarding details before submitting a partner verification application.',
                ]);
            }

            if (! $lockedApp->status->canSubmitByOwner()) {
                throw ValidationException::withMessages([
                    'application' => sprintf(
                        'Cannot submit application in "%s" status.',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            if (! $owner->hasVerifiedEmail()) {
                throw ValidationException::withMessages([
                    'application' => 'Verify your partner email address before submitting your application.',
                ]);
            }

            $evaluation = $this->checklist->evaluate($owner, $lockedApp);

            if (! $evaluation['ready_for_submission']) {
                throw ValidationException::withMessages([
                    'application' => $evaluation['missing_requirements'][0]
                        ?? 'Complete all required profile fields, operating cities, and verification documents before submitting.',
                ]);
            }

            $previousStatus = $lockedApp->status;
            $isResubmission = $previousStatus === OwnerVerificationStatus::NeedsInformation;
            $cleanNotes = is_string($notes) && trim($notes) !== '' ? trim($notes) : null;

            $lockedApp->forceFill([
                'status' => OwnerVerificationStatus::Submitted,
                'revision_number' => $isResubmission
                    ? $lockedApp->revision_number + 1
                    : $lockedApp->revision_number,
                'declaration_version' => (string) config('tijum.owner_verification.declaration_version', '2026.1'),
                'declaration_accepted_at' => now(),
                'submitted_at' => now(),
                'requested_information' => null,
                'requested_changes' => null,
            ])->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: $isResubmission
                    ? OwnerVerificationEventType::ApplicationResubmitted
                    : OwnerVerificationEventType::ApplicationSubmitted,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previousStatus,
                newStatus: OwnerVerificationStatus::Submitted,
                notes: $cleanNotes ?? ($isResubmission
                    ? "Owner resubmitted updated partner application (revision #{$lockedApp->revision_number})."
                    : 'Owner submitted partner verification application.'),
                metadata: [
                    'declaration_version' => $lockedApp->declaration_version,
                    'revision_number' => $lockedApp->revision_number,
                ],
            );

            $applicationId = $lockedApp->id;

            DB::afterCommit(static function () use ($owner, $applicationId, $isResubmission): void {
                $committedApp = OwnerVerificationApplication::query()->find($applicationId);
                if ($committedApp instanceof OwnerVerificationApplication) {
                    $owner->notify(new PartnerApplicationSubmittedNotification($committedApp, $isResubmission));
                }
            });

            return $lockedApp->refresh();
        });
    }
}
