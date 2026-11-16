<?php

declare(strict_types=1);

namespace App\Actions\Owner\Onboarding;

use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WithdrawVerificationApplication
{
    public function execute(Owner $owner, ?string $reason = null): OwnerVerificationApplication
    {
        return DB::transaction(function () use ($owner, $reason): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->where('active_owner_id', $owner->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedApp instanceof OwnerVerificationApplication || ! $lockedApp->status->canWithdrawByOwner()) {
                throw ValidationException::withMessages([
                    'application' => 'There is no active verification application available to withdraw.',
                ]);
            }

            $previousStatus = $lockedApp->status;
            $cleanReason = is_string($reason) && trim($reason) !== '' ? trim($reason) : null;

            $lockedApp->forceFill([
                'status' => OwnerVerificationStatus::Withdrawn,
                'active_owner_id' => null,
            ])->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::ApplicationWithdrawn,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previousStatus,
                newStatus: OwnerVerificationStatus::Withdrawn,
                notes: $cleanReason ?? 'Owner withdrew the verification application.',
            );

            return $lockedApp->refresh();
        });
    }
}
