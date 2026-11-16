<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationUnderReviewNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartPropertyReview
{
    public function execute(
        Admin $actingAdmin,
        PropertyVerificationApplication $application,
    ): PropertyVerificationApplication {
        return DB::transaction(function () use ($actingAdmin, $application): PropertyVerificationApplication {
            $lockedApp = PropertyVerificationApplication::query()
                ->whereKey($application->id)
                ->with('property')
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canStartReview()) {
                throw ValidationException::withMessages([
                    'application' => sprintf(
                        'Application cannot start review from "%s" status.',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $previous = $lockedApp->status;
            $lockedApp->forceFill([
                'status' => PropertyVerificationStatus::UnderReview,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => now(),
            ])->save();

            if ($lockedApp->property !== null) {
                PropertyVerificationEvent::record(
                    property: $lockedApp->property,
                    application: $lockedApp,
                    eventType: PropertyVerificationEventType::ReviewStarted,
                    actorType: 'admin',
                    actorId: $actingAdmin->id,
                    actorName: $actingAdmin->name,
                    previousStatus: $previous,
                    newStatus: PropertyVerificationStatus::UnderReview,
                    notes: sprintf('Administrative verification started by %s.', $actingAdmin->name),
                );
            }

            $appId = $lockedApp->id;

            DB::afterCommit(static function () use ($appId): void {
                $app = PropertyVerificationApplication::query()->with('property.owner')->find($appId);
                if ($app?->property?->owner !== null) {
                    $app->property->owner->notify(new PropertyApplicationUnderReviewNotification($app));
                }
            });

            return $lockedApp->fresh() ?? $lockedApp;
        });
    }
}
