<?php

declare(strict_types=1);

namespace App\Actions\Owner\Onboarding;

use App\Enums\OwnerVerificationEventType;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveOwnerBusinessProfile
{
    public function __construct(
        public readonly GetOrCreateDraftApplication $getOrCreateDraft,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     */
    public function execute(Owner $owner, array $validated): OwnerBusinessProfile
    {
        return DB::transaction(function () use ($owner, $validated): OwnerBusinessProfile {
            $application = $this->getOrCreateDraft->execute($owner);

            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->isEditableByOwner()) {
                throw ValidationException::withMessages([
                    'entity_type' => 'Your business profile is locked while the active partner application is under review or finalised.',
                ]);
            }

            $profile = $owner->businessProfile()->firstOrNew([]);
            $profile->fill($validated);
            $profile->owner_id = $owner->id;
            $profile->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::BusinessProfileSaved,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $lockedApp->status,
                newStatus: $lockedApp->status,
                notes: sprintf('Saved %s profile for %s.', $profile->entity_type->label(), $profile->display_business_name),
                metadata: [
                    'entity_type' => $profile->entity_type->value,
                    'city' => $profile->city,
                    'state' => $profile->state,
                ],
            );

            return $profile->refresh();
        });
    }
}
