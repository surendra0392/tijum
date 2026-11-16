<?php

declare(strict_types=1);

namespace App\Actions\Admin\PartnerVerification;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use App\Notifications\Owner\PartnerInformationRequestedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestPartnerInformation
{
    /**
     * @param  array{
     *     requested_information: string,
     *     required_profile_changes?: list<string>,
     *     required_document_types?: list<string>,
     *     document_notes?: array<string, string|null>,
     *     internal_reviewer_notes?: string|null,
     * }  $payload
     */
    public function execute(
        Admin $actingAdmin,
        OwnerVerificationApplication $application,
        array $payload,
    ): OwnerVerificationApplication {
        return DB::transaction(function () use ($actingAdmin, $application, $payload): OwnerVerificationApplication {
            $lockedApp = OwnerVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->canRequestInformation()) {
                throw ValidationException::withMessages([
                    'requested_information' => sprintf(
                        'Cannot request additional information when application status is "%s".',
                        $lockedApp->status->label(),
                    ),
                ]);
            }

            $previousStatus = $lockedApp->status;
            $requiredProfileChanges = $payload['required_profile_changes'] ?? [];
            $requiredDocumentTypes = $payload['required_document_types'] ?? [];
            $documentNotes = $payload['document_notes'] ?? [];
            $flaggedDocumentTypes = $requiredDocumentTypes;

            foreach ($documentNotes as $rawDocId => $note) {
                $cleanNote = is_string($note) ? trim($note) : '';
                if ($cleanNote === '') {
                    continue;
                }

                $doc = OwnerVerificationDocument::query()
                    ->where('application_id', $lockedApp->id)
                    ->whereKey((int) $rawDocId)
                    ->first();

                if ($doc instanceof OwnerVerificationDocument && $doc->status !== OwnerVerificationDocumentStatus::Replaced) {
                    $doc->forceFill([
                        'status' => OwnerVerificationDocumentStatus::Rejected,
                        'reviewer_note' => $cleanNote,
                        'reviewed_by_admin_id' => $actingAdmin->id,
                        'reviewed_at' => now(),
                    ])->save();

                    $flaggedDocumentTypes[] = $doc->document_type->value;
                }
            }

            if ($requiredDocumentTypes !== []) {
                OwnerVerificationDocument::query()
                    ->where('application_id', $lockedApp->id)
                    ->whereIn('document_type', $requiredDocumentTypes)
                    ->where('status', '!=', OwnerVerificationDocumentStatus::Replaced->value)
                    ->update([
                        'status' => OwnerVerificationDocumentStatus::Rejected->value,
                        'reviewed_by_admin_id' => $actingAdmin->id,
                        'reviewed_at' => now(),
                    ]);
            }

            $internalNotes = isset($payload['internal_reviewer_notes']) && trim((string) $payload['internal_reviewer_notes']) !== ''
                ? trim((string) $payload['internal_reviewer_notes'])
                : $lockedApp->internal_reviewer_notes;

            $structuredChanges = [
                'required_profile_changes' => array_values(array_unique($requiredProfileChanges)),
                'required_document_types' => array_values(array_unique($flaggedDocumentTypes)),
            ];

            $lockedApp->forceFill([
                'status' => OwnerVerificationStatus::NeedsInformation,
                'assigned_admin_id' => $lockedApp->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => now(),
                'requested_information' => trim($payload['requested_information']),
                'requested_changes' => $structuredChanges,
                'internal_reviewer_notes' => $internalNotes,
            ])->save();

            OwnerVerificationEvent::record(
                application: $lockedApp,
                eventType: OwnerVerificationEventType::InformationRequested,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previousStatus,
                newStatus: OwnerVerificationStatus::NeedsInformation,
                notes: trim($payload['requested_information']),
                metadata: [
                    'required_profile_changes' => $structuredChanges['required_profile_changes'],
                    'required_document_types' => $structuredChanges['required_document_types'],
                ],
            );

            $applicationId = $lockedApp->id;

            DB::afterCommit(static function () use ($applicationId): void {
                $committedApp = OwnerVerificationApplication::query()->with('owner')->find($applicationId);
                if ($committedApp instanceof OwnerVerificationApplication && $committedApp->owner instanceof Owner) {
                    $committedApp->owner->notify(new PartnerInformationRequestedNotification($committedApp));
                }
            });

            return $lockedApp->refresh();
        });
    }
}
