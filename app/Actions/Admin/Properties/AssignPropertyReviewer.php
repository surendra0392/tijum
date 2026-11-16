<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyVerificationEventType;
use App\Models\Admin;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignPropertyReviewer
{
    public function execute(
        Admin $actingAdmin,
        PropertyVerificationApplication $application,
        Admin $assignee,
    ): PropertyVerificationApplication {
        if (! $assignee->isActive() || ! $assignee->hasPermission('properties.review')) {
            throw ValidationException::withMessages([
                'assigned_admin_id' => 'Reviewer must be an active administrator with property review permission.',
            ]);
        }

        return DB::transaction(function () use ($actingAdmin, $application, $assignee): PropertyVerificationApplication {
            $lockedApp = PropertyVerificationApplication::query()
                ->whereKey($application->id)
                ->with('property')
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canAssignReviewer()) {
                throw ValidationException::withMessages([
                    'assigned_admin_id' => 'A reviewer cannot be assigned after the verification application has reached a terminal state.',
                ]);
            }

            $lockedApp->forceFill([
                'assigned_admin_id' => $assignee->id,
            ])->save();

            if ($lockedApp->property !== null) {
                PropertyVerificationEvent::record(
                    property: $lockedApp->property,
                    application: $lockedApp,
                    eventType: PropertyVerificationEventType::ReviewerAssigned,
                    actorType: 'admin',
                    actorId: $actingAdmin->id,
                    actorName: $actingAdmin->name,
                    previousStatus: $lockedApp->status,
                    newStatus: $lockedApp->status,
                    notes: sprintf('Assigned property reviewer: %s.', $assignee->name),
                    metadata: ['assigned_admin_id' => $assignee->id],
                );
            }

            return $lockedApp->fresh(['assignedAdmin']) ?? $lockedApp;
        });
    }
}
