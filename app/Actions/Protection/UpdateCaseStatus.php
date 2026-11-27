<?php

declare(strict_types=1);

namespace App\Actions\Protection;

use App\Enums\AdminRole;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
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

        $previousStatus = $case->status;
        $previousPriority = $case->priority;

        $updated = DB::transaction(function () use ($case, $attributes): CustomerProtectionCase {
            $locked = CustomerProtectionCase::query()->whereKey($case->id)->lockForUpdate()->firstOrFail();
            $now = CarbonImmutable::now();

            $updates = [];

            if (array_key_exists('assigned_admin_id', $attributes)) {
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

        try {
            $updated->loadMissing(['user', 'property', 'reservation']);
            $dispatcher = app(NotificationDispatcher::class);
            $propertyName = $updated->reservation->snapshot_property_name
                ?: $updated->property->name;
            $actionUrl = url("/my-support/{$updated->case_reference}");

            if ($updated->status === CaseStatus::Resolved && $previousStatus !== CaseStatus::Resolved) {
                $dispatcher->dispatch(
                    eventType: 'grievance.resolved',
                    recipients: $updated->user,
                    variables: [
                        'customer_name' => $updated->user->name,
                        'case_reference' => $updated->case_reference,
                        'property_name' => $propertyName,
                        'resolution_summary' => Str::limit((string) ($updated->resolution_summary ?: 'Case resolved by TIJUM Support.'), 240),
                        'resolved_at' => ($updated->resolved_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                        'action_url' => $actionUrl,
                    ],
                    related: $updated,
                    relatedReference: $updated->case_reference,
                    idempotencySeed: 'grievance_resolved_'.$updated->id
                );
            } elseif ($updated->priority === CasePriority::Urgent && $previousPriority !== CasePriority::Urgent) {
                $dispatcher->dispatch(
                    eventType: 'grievance.escalated',
                    recipients: $updated->user,
                    variables: [
                        'customer_name' => $updated->user->name,
                        'case_reference' => $updated->case_reference,
                        'escalation_status' => 'Escalated to Priority Desk',
                        'reason' => 'Your case has been escalated for urgent senior team review.',
                        'action_url' => $actionUrl,
                    ],
                    related: $updated,
                    relatedReference: $updated->case_reference,
                    idempotencySeed: 'grievance_escalated_'.$updated->id.'_'.$updated->updated_at->timestamp
                );

                $dispatcher->dispatchToAdmins(
                    eventType: 'admin.customer_protection_urgent',
                    variables: [
                        'case_reference' => $updated->case_reference,
                        'property_name' => $propertyName,
                        'booking_reference' => $updated->reservation->booking_reference,
                        'priority' => $updated->priority->label(),
                        'action_url' => route('admin.customer-cases.show', $updated->case_reference),
                    ],
                    related: $updated,
                    relatedReference: $updated->case_reference,
                    idempotencySeed: 'urgent_case_escalated_'.$updated->id.'_'.$updated->updated_at->timestamp
                );
            } elseif ($updated->status !== $previousStatus) {
                $dispatcher->dispatch(
                    eventType: 'grievance.status_updated',
                    recipients: $updated->user,
                    variables: [
                        'customer_name' => $updated->user->name,
                        'case_reference' => $updated->case_reference,
                        'property_name' => $propertyName,
                        'case_status' => $updated->status->label(),
                        'reason' => 'Case status updated to '.$updated->status->label().'.',
                        'updated_at' => $updated->updated_at->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                        'action_url' => $actionUrl,
                    ],
                    related: $updated,
                    relatedReference: $updated->case_reference,
                    idempotencySeed: 'grievance_status_'.$updated->id.'_'.$updated->status->value.'_'.$updated->updated_at->timestamp
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch grievance status notification: '.$e->getMessage(), [
                'case_id' => $updated->id,
            ]);
        }

        return $updated;
    }
}
