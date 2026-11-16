<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StartPropertyAmendment
{
    public function __construct(
        public readonly CreatePropertyApplicationRecord $createApplicationRecord,
    ) {}

    public function execute(Owner $owner, Property $property): PropertyVerificationApplication
    {
        return DB::transaction(function () use ($owner, $property): PropertyVerificationApplication {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'amendment' => 'You are not authorised to amend this property.',
                ]);
            }

            if (! $lockedProperty->hasApprovedBaseline()) {
                throw ValidationException::withMessages([
                    'amendment' => 'Initial verification must be approved before starting a Re-Verification Amendment.',
                ]);
            }

            if ($lockedProperty->activeVerificationApplication()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'amendment' => 'An active property verification revision is already in progress.',
                ]);
            }

            $approvedApp = $lockedProperty->latestApprovedApplication;
            $latestApp = $lockedProperty->latestVerificationApplication;
            $nextRevision = max(
                (int) $lockedProperty->verificationApplications()->max('revision_number') + 1,
                2,
            );

            $baseline = $lockedProperty->approved_snapshot
                ?? $approvedApp->approved_snapshot
                ?? $lockedProperty->toApprovedPropertyFieldsSnapshot();

            // Seed from approved baseline (or previous rejected amendment proposed edits if restarting after rejection).
            $seededProposedData = (
                $latestApp->is_amendment
                && $latestApp->status === PropertyVerificationStatus::Rejected
                && is_array($latestApp->proposed_property_data)
            ) ? $latestApp->proposed_property_data : $lockedProperty->toApprovedPropertyFieldsSnapshot();

            $arrangement = $latestApp->ownership_arrangement;

            $amendment = $this->createApplicationRecord->execute(
                property: $lockedProperty,
                revisionNumber: $nextRevision,
                isAmendment: true,
                parentApplication: $approvedApp,
                arrangement: $arrangement,
                proposedPropertyData: $seededProposedData,
                baselineSnapshot: $baseline,
            );

            if ($approvedApp instanceof PropertyVerificationApplication) {
                $disk = Storage::disk((string) config('tijum.property_verification.disk', 'property_verification'));
                $approvedDocs = $approvedApp->documents()
                    ->whereNotIn('status', [
                        PropertyVerificationDocumentStatus::Rejected->value,
                        PropertyVerificationDocumentStatus::Replaced->value,
                    ])
                    ->get();

                foreach ($approvedDocs as $prevDoc) {
                    if (! $disk->exists($prevDoc->storage_path)) {
                        continue;
                    }

                    $ext = pathinfo($prevDoc->storage_path, PATHINFO_EXTENSION) ?: 'pdf';
                    $copiedPath = sprintf(
                        '%d/%d/%d/%s.%s',
                        $lockedProperty->owner_id,
                        $lockedProperty->id,
                        $amendment->id,
                        Str::uuid()->toString(),
                        $ext,
                    );

                    if (! $disk->copy($prevDoc->storage_path, $copiedPath)) {
                        continue;
                    }

                    $copiedDoc = new PropertyVerificationDocument;
                    $copiedDoc->forceFill([
                        'application_id' => $amendment->id,
                        'document_type' => $prevDoc->document_type,
                        'original_filename' => $prevDoc->original_filename,
                        'storage_path' => $copiedPath,
                        'mime_type' => $prevDoc->mime_type,
                        'file_size' => $prevDoc->file_size,
                        'checksum' => $prevDoc->checksum,
                        'status' => $prevDoc->status,
                        'reviewed_by_admin_id' => $prevDoc->reviewed_by_admin_id,
                        'reviewed_at' => $prevDoc->reviewed_at,
                    ])->save();
                }
            }

            // Suspend new customer-facing booking eligibility while amendment is active, without revoking portal access.
            $lockedProperty->forceFill([
                'booking_eligible' => false,
            ])->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $amendment,
                eventType: PropertyVerificationEventType::AmendmentStarted,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                newStatus: PropertyVerificationStatus::Draft,
                notes: sprintf(
                    'Started Re-Verification Amendment revision #%d (%s) from immutable approved snapshot.',
                    $nextRevision,
                    $amendment->application_number,
                ),
            );

            return $amendment;
        });
    }
}
