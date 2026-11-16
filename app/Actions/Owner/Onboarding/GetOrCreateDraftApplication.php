<?php

declare(strict_types=1);

namespace App\Actions\Owner\Onboarding;

use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GetOrCreateDraftApplication
{
    public function execute(Owner $owner, bool $createIfTerminal = false): OwnerVerificationApplication
    {
        $existingActive = $owner->activeVerificationApplication()->first();

        if ($existingActive instanceof OwnerVerificationApplication) {
            return $existingActive;
        }

        $latest = $owner->latestVerificationApplication()->first();

        if ($latest instanceof OwnerVerificationApplication) {
            if ($latest->status === OwnerVerificationStatus::Approved) {
                throw ValidationException::withMessages([
                    'application' => 'Your partner verification application is already approved.',
                ]);
            }

            if ($latest->status->isTerminal() && ! $createIfTerminal) {
                return $latest;
            }
        }

        return DB::transaction(function () use ($owner, $createIfTerminal): OwnerVerificationApplication {
            Owner::query()->whereKey($owner->id)->lockForUpdate()->first();

            $active = OwnerVerificationApplication::query()
                ->where('active_owner_id', $owner->id)
                ->first();

            if ($active instanceof OwnerVerificationApplication) {
                return $active;
            }

            $latestLocked = OwnerVerificationApplication::query()
                ->where('owner_id', $owner->id)
                ->orderByDesc('id')
                ->first();

            if ($latestLocked instanceof OwnerVerificationApplication) {
                if ($latestLocked->status === OwnerVerificationStatus::Approved) {
                    throw ValidationException::withMessages([
                        'application' => 'Your partner verification application is already approved.',
                    ]);
                }

                if ($latestLocked->status->isTerminal() && ! $createIfTerminal) {
                    return $latestLocked;
                }
            }

            $nextRevision = $latestLocked instanceof OwnerVerificationApplication
                ? $latestLocked->revision_number + 1
                : 1;

            $application = new OwnerVerificationApplication;
            $application->forceFill([
                'owner_id' => $owner->id,
                'active_owner_id' => $owner->id,
                'application_number' => 'TMP-'.Str::ulid()->toString(),
                'status' => OwnerVerificationStatus::Draft,
                'revision_number' => $nextRevision,
            ]);
            $application->save();

            $application->forceFill([
                'application_number' => sprintf('TJV-%s-%06d', now()->format('Y'), $application->id),
            ])->save();

            OwnerVerificationEvent::record(
                application: $application,
                eventType: OwnerVerificationEventType::ApplicationCreated,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: null,
                newStatus: OwnerVerificationStatus::Draft,
                notes: $nextRevision > 1
                    ? "Started new partner verification revision (#{$nextRevision})."
                    : 'Created partner verification draft application.',
            );

            return $application->refresh();
        });
    }
}
