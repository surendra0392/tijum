<?php

declare(strict_types=1);

namespace App\Actions\Admin\PartnerVerification;

use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use App\Notifications\Owner\PartnerApplicationUnderReviewNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartPartnerReview
{
    public function execute(Admin $actingAdmin, OwnerVerificationApplication $application): OwnerVerificationApplication
    {
        return DB::transaction(function () use ($actingAdmin, $application): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canStartReview()) {
                throw ValidationException::withMessages([
                    'status' => sprintf(
                        'Application must be in Submitted state before starting review (currently "%s").',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $previousStatus = $lockedApp->status;
            $lockedApp->forceFill([
                'status' => OwnerVerificationStatus::UnderReview,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
            ])->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::ReviewStarted,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previousStatus,
                newStatus: OwnerVerificationStatus::UnderReview,
                notes: "Started verification review ({$actingAdmin->role->label()}).",
            );

            $applicationId = $lockedApp->id;

            DB::afterCommit(static function () use ($applicationId): void {
                $committedApp = OwnerVerificationApplication::query()->with('owner')->find($applicationId);
                if ($committedApp instanceof OwnerVerificationApplication && $committedApp->owner instanceof Owner) {
                    $committedApp->owner->notify(new PartnerApplicationUnderReviewNotification($committedApp));
                }
            });

            return $lockedApp->refresh();
        });
    }
}
