<?php

declare(strict_types=1);

namespace App\Actions\Protection;

use App\Enums\AdminRole;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateCaseStatus
{
    /**
     * @param  array{
     *     status?: string,
     *     assigned_admin_id?: int|null,
     *     priority?: string|null,
     *     resolution_type?: string|null,
     *     resolution_summary?: string|null,
     * }  $attributes
     */
    public function execute(
        CustomerProtectionCase $case,
        Admin $admin,
        array $attributes,
    ): CustomerProtectionCase {
        if (! $admin->isActive() || (! $admin->hasPermission('customer_cases.manage') && ! $admin->hasPermission('bookings.manage') && ! $admin->isSuperAdmin() && $admin->role !== AdminRole::SuperAdmin)) {
            throw ValidationException::withMessages([
                'admin' => 'You are not authorised to manage customer support cases.',
            ]);
        }

        return DB::transaction(function () use ($case, $attributes): CustomerProtectionCase {
            $locked = CustomerProtectionCase::query()->whereKey($case->id)->lockForUpdate()->firstOrFail();
            $now = CarbonImmutable::now();

            $updates = [];

            if (isset($attributes['assigned_admin_id'])) {
                $assignedId = $attributes['assigned_admin_id'] ? (int) $attributes['assigned_admin_id'] : null;
                $updates['assigned_admin_id'] = $assignedId;
            }

            if (isset($attributes['priority'])) {
                $priority = CasePriority::tryFrom((string) $attributes['priority']);
                if ($priority !== null) {
                    $updates['priority'] = $priority;
                }
            }

            if (isset($attributes['status'])) {
                $targetStatus = CaseStatus::tryFrom((string) $attributes['status']);
                if ($targetStatus === null) {
                    throw ValidationException::withMessages([
                        'status' => 'Invalid case status specified.',
                    ]);
                }

                // If acknowledging:
                if ($targetStatus === CaseStatus::Acknowledged && $locked->acknowledged_at === null) {
                    $updates['acknowledged_at'] = $now;
                }

                // If resolving: mandatory resolution details per acceptance criteria
                if ($targetStatus === CaseStatus::Resolved) {
                    $summary = trim((string) ($attributes['resolution_summary'] ?? $locked->resolution_summary ?? ''));
                    if ($summary === '') {
                        throw ValidationException::withMessages([
                            'resolution_summary' => 'A clear resolution summary is required to resolve a customer case.',
                        ]);
                    }
                    $updates['resolved_at'] = $now;
                    $updates['resolution_summary'] = $summary;
                    $updates['resolution_type'] = $attributes['resolution_type'] ?? 'administrative_resolution';
                }

                // If closing:
                if ($targetStatus === CaseStatus::Closed && $locked->closed_at === null) {
                    $updates['closed_at'] = $now;
                }

                $updates['status'] = $targetStatus;
            }

            // Default acknowledgement if admin touches case and acknowledged_at is null
            if ($locked->acknowledged_at === null) {
                $updates['acknowledged_at'] = $now;
            }

            $locked->forceFill($updates)->save();

            return $locked->fresh() ?? $locked;
        }, 3);
    }
}
