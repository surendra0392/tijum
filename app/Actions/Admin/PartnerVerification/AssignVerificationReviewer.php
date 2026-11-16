<?php

declare(strict_types=1);

namespace App\Actions\Admin\PartnerVerification;

use App\Enums\OwnerVerificationEventType;
use App\Models\Admin;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignVerificationReviewer
{
    public function execute(
        Admin $actingAdmin,
        OwnerVerificationApplication $application,
        ?int $assignedAdminId,
    ): OwnerVerificationApplication {
        return DB::transaction(function () use ($actingAdmin, $application, $assignedAdminId): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canAssignReviewer()) {
                throw ValidationException::withMessages([
                    'assigned_admin_id' => sprintf(
                        'Cannot assign a reviewer when application status is "%s".',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $assignee = null;
            if ($assignedAdminId !== null) {
                $assignee = Admin::query()->find($assignedAdminId);

                if (
                    ! $assignee instanceof Admin
                    || ! $assignee->isActive()
                    || ! $assignee->hasPermission('partners.review')
                ) {
                    throw ValidationException::withMessages([
                        'assigned_admin_id' => 'Assigned administrator must be active and hold partner verification permissions.',
                    ]);
                }
            }

            $previousAssigneeId = $lockedApp->assigned_admin_id;
            $lockedApp->forceFill([
                'assigned_admin_id' => $assignee?->id,
            ])->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::ReviewerAssigned,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $lockedApp->status,
                newStatus: $lockedApp->status,
                notes: $assignee instanceof Admin
                    ? "Assigned application review to {$assignee->name} ({$assignee->role->label()})."
                    : 'Cleared assigned verification reviewer.',
                metadata: [
                    'previous_assigned_admin_id' => $previousAssigneeId,
                    'assigned_admin_id' => $assignee?->id,
                ],
            );

            return $lockedApp->refresh();
        });
    }
}
