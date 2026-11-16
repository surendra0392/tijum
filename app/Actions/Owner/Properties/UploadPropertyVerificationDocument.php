<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use finfo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class UploadPropertyVerificationDocument
{
    public function __construct(
        public readonly CreatePropertyApplicationRecord $createApplicationRecord,
    ) {}

    public function execute(
        Owner $owner,
        Property $property,
        PropertyVerificationDocumentType $documentType,
        UploadedFile $file,
    ): PropertyVerificationDocument {
        $realPath = $file->getRealPath();

        if (! is_string($realPath) || ! is_file($realPath)) {
            throw ValidationException::withMessages([
                'document' => 'Uploaded verification document could not be inspected on the server.',
            ]);
        }

        $detectedMime = $this->inspectVerifiedMimeType($realPath);
        $allowedMap = config('tijum.property_verification.allowed_mime_types', [
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
        ]);

        if (! is_array($allowedMap) || ! isset($allowedMap[$detectedMime])) {
            throw ValidationException::withMessages([
                'document' => 'Unsupported or spoofed file content. Upload a genuine PDF, JPG, JPEG, or PNG document.',
            ]);
        }

        $canonicalExt = (string) $allowedMap[$detectedMime];
        $fileSize = filesize($realPath);
        $maxBytes = ((int) config('tijum.property_verification.max_document_kb', 10240)) * 1024;

        if ($fileSize === false || $fileSize <= 0 || $fileSize > $maxBytes) {
            throw ValidationException::withMessages([
                'document' => 'The property verification file is empty or exceeds the 10 MB size limit.',
            ]);
        }

        $checksum = hash_file('sha256', $realPath);
        if (! is_string($checksum)) {
            throw ValidationException::withMessages([
                'document' => 'Unable to compute document checksum.',
            ]);
        }

        $application = $this->resolveEditableApplication($owner, $property);

        $diskName = (string) config('tijum.property_verification.disk', 'property_verification');
        $directory = sprintf('%d/%d/%d', $owner->id, $property->id, $application->id);
        $storedFilename = sprintf('%s.%s', Str::uuid()->toString(), $canonicalExt);
        $storagePath = "{$directory}/{$storedFilename}";

        $stored = Storage::disk($diskName)->putFileAs($directory, $file, $storedFilename);

        if ($stored === false) {
            throw ValidationException::withMessages([
                'document' => 'Failed to persist property verification document into private storage.',
            ]);
        }

        $safeOriginalName = $this->sanitizeOriginalFilename($file->getClientOriginalName(), $canonicalExt);

        try {
            return DB::transaction(function () use (
                $owner,
                $property,
                $application,
                $documentType,
                $safeOriginalName,
                $storagePath,
                $detectedMime,
                $fileSize,
                $checksum,
            ): PropertyVerificationDocument {
                $lockedApp = PropertyVerificationApplication::query()
                    ->whereKey($application->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $lockedApp->status->isEditableByOwner()) {
                    throw ValidationException::withMessages([
                        'document' => 'Verification documents cannot be uploaded while this application is locked.',
                    ]);
                }

                $existingActive = PropertyVerificationDocument::query()
                    ->where('application_id', $lockedApp->id)
                    ->where('document_type', $documentType->value)
                    ->where('status', '!=', PropertyVerificationDocumentStatus::Replaced->value)
                    ->get();

                $isReplacement = $existingActive->isNotEmpty();

                foreach ($existingActive as $oldDoc) {
                    $oldDoc->forceFill([
                        'status' => PropertyVerificationDocumentStatus::Replaced,
                    ])->save();
                }

                $document = new PropertyVerificationDocument;
                $document->forceFill([
                    'application_id' => $lockedApp->id,
                    'document_type' => $documentType,
                    'original_filename' => $safeOriginalName,
                    'storage_path' => $storagePath,
                    'mime_type' => $detectedMime,
                    'file_size' => $fileSize,
                    'checksum' => $checksum,
                    'status' => PropertyVerificationDocumentStatus::Uploaded,
                ]);
                $document->save();

                PropertyVerificationEvent::record(
                    property: $property,
                    application: $lockedApp,
                    eventType: $isReplacement
                        ? PropertyVerificationEventType::DocumentReplaced
                        : PropertyVerificationEventType::DocumentUploaded,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf(
                        '%s %s document (%s).',
                        $isReplacement ? 'Replaced' : 'Uploaded',
                        $documentType->label(),
                        $safeOriginalName,
                    ),
                    metadata: [
                        'document_type' => $documentType->value,
                        'file_size' => $fileSize,
                        'mime_type' => $detectedMime,
                    ],
                );

                return $document;
            });
        } catch (Throwable $exception) {
            Storage::disk($diskName)->delete($storagePath);

            throw $exception;
        }
    }

    private function resolveEditableApplication(Owner $owner, Property $property): PropertyVerificationApplication
    {
        return DB::transaction(function () use ($owner, $property): PropertyVerificationApplication {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'document' => 'You are not authorised to upload verification documents for this property.',
                ]);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();

            if ($lockedProperty->hasApprovedBaseline()) {
                if (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner()) {
                    throw ValidationException::withMessages([
                        'document' => 'Property verification documents on an approved property require an active Re-Verification Amendment.',
                    ]);
                }

                return $activeApp;
            }

            if ($activeApp instanceof PropertyVerificationApplication) {
                if (! $activeApp->status->isEditableByOwner()) {
                    throw ValidationException::withMessages([
                        'document' => 'Documents are locked while the property verification application is under review.',
                    ]);
                }

                return $activeApp;
            }

            $latestRev = (int) $lockedProperty->verificationApplications()->max('revision_number');

            return $this->createApplicationRecord->execute(
                property: $lockedProperty,
                revisionNumber: max(1, $latestRev + 1),
                isAmendment: false,
            );
        });
    }

    private function inspectVerifiedMimeType(string $realPath): string
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($realPath);

        if (! is_string($detected)) {
            return '';
        }

        $normalized = strtolower(trim($detected));
        if ($normalized === 'image/pjpeg') {
            $normalized = 'image/jpeg';
        }

        if ($normalized === 'application/pdf') {
            $handle = fopen($realPath, 'rb');
            if ($handle === false) {
                return '';
            }
            $header = fread($handle, 5);
            fclose($handle);

            return $header === '%PDF-' ? 'application/pdf' : '';
        }

        if (in_array($normalized, ['image/jpeg', 'image/png'], true)) {
            $imageInfo = @getimagesize($realPath);

            return is_array($imageInfo) && $imageInfo[0] > 0 && $imageInfo[1] > 0
                ? $normalized
                : '';
        }

        return '';
    }

    private function sanitizeOriginalFilename(string $rawName, string $extension): string
    {
        $base = pathinfo(basename($rawName), PATHINFO_FILENAME);
        $cleanBase = Str::of($base)
            ->replaceMatches('/[^A-Za-z0-9\-_\s]+/', ' ')
            ->squish()
            ->limit(120, '')
            ->toString();

        if ($cleanBase === '') {
            $cleanBase = 'property-document';
        }

        return "{$cleanBase}.{$extension}";
    }
}
