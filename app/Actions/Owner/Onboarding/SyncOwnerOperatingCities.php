<?php

declare(strict_types=1);

namespace App\Actions\Owner\Onboarding;

use App\Enums\OwnerVerificationEventType;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SyncOwnerOperatingCities
{
    public function __construct(
        public readonly GetOrCreateDraftApplication $getOrCreateDraft,
    ) {}

    /**
     * @param  list<int>  $cityIds
     */
    public function execute(Owner $owner, array $cityIds): Owner
    {
        return DB::transaction(function () use ($owner, $cityIds): Owner {
            $application = $this->getOrCreateDraft->execute($owner);

            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->isEditableByOwner()) {
                throw ValidationException::withMessages([
                    'city_ids' => 'Operating cities cannot be modified while an application is under review or finalised.',
                ]);
            }

            $cities = City::query()
                ->active()
                ->whereIn('id', $cityIds)
                ->ordered()
                ->get(['id', 'name', 'slug']);

            if ($cities->isEmpty() || $cities->count() !== count(array_unique($cityIds))) {
                throw ValidationException::withMessages([
                    'city_ids' => 'Select only active TIJUM launch cities.',
                ]);
            }

            /** @var list<int> $activeIds */
            $activeIds = $cities->pluck('id')->map(static fn (mixed $id): int => (int) $id)->values()->all();
            $owner->operatingCities()->sync($activeIds);

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::OperatingCitiesUpdated,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $lockedApp->status,
                newStatus: $lockedApp->status,
                notes: 'Updated intended operating cities: '.$cities->pluck('name')->implode(', ').'.',
                metadata: [
                    'city_ids' => $activeIds,
                    'city_slugs' => $cities->pluck('slug')->values()->all(),
                ],
            );

            return $owner->load('operatingCities');
        });
    }
}
