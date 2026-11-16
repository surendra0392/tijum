<?php

declare(strict_types=1);

namespace App\Actions\Owner\Onboarding;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationEventType;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Models\OwnerVerificationEvent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class UploadVerificationDocument
{
    public function __construct(
        public readonly GetOrCreateDraftApplication $getOrCreateDraft,
    ) {}

    public function execute(
        Owner $owner,
        OwnerVerificationDocumentType $documentType,
        UploadedFile $file,
    ): OwnerVerificationDocument {
        $realPath = $file->getRealPath();

        if (! is_string($realPath) || ! is_file($realPath)) {
            throw ValidationException::withMessages([
                'document' => 'Uploaded file could not be inspected on the server.',
            ]);
        }

        $detectedMime = $this->inspectVerifiedMimeType($realPath);
        $allowedMap = config('tijum.owner_verification.allowed_mime_types', [
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
        ]);

        if (! is_array($allowedMap) || ! isset($allowedMap[$detectedMime])) {
            throw ValidationException::withMessages([
                'document' => 'Unsupported or spoofed file content. Upload a genuine PDF, JPG, JPEG, or PNG file.',
            ]);
        }

        $canonicalExt = (string) $allowedMap[$detectedMime];
        $fileSize = filesize($realPath);
        $maxBytes = ((int) config('tijum.owner_verification.max_document_kb', 10240)) * 1024;

        if ($fileSize === false || $fileSize <= 0 || $fileSize > $maxBytes) {
            throw ValidationException::withMessages([
                'document' => 'The verification file is empty or exceeds the 10 MB size limit.',
            ]);
        }

        $checksum = hash_file('sha256', $realPath);
        if (! is_string($checksum)) {
            throw ValidationException::withMessages([
                'document' => 'Unable to compute document integrity checksum.',
            ]);
        }

        $application = $this->getOrCreateDraft->execute($owner);

        if (! $application->status->isEditableByOwner()) {
            throw ValidationException::withMessages([
                'document' => 'Verification documents cannot be uploaded while the application is locked.',
            ]);
        }

        $diskName = (string) config('tijum.owner_verification.disk', 'owner_verification');
        $directory = sprintf('%d/%d', $owner->id, $application->id);
        $storedFilename = sprintf('%s.%s', Str::uuid()->toString(), $canonicalExt);
        $storagePath = "{$directory}/{$storedFilename}";

        $stored = Storage::disk($diskName)->putFileAs($directory, $file, $storedFilename);

        if ($stored === false) {
            throw ValidationException::withMessages([
                'document' => 'Failed to persist verification document into private storage.',
            ]);
        }

        $safeOriginalName = $this->sanitizeOriginalFilename($file->getClientOriginalName(), $canonicalExt);

        try {
            return DB::transaction(function () use (
                $owner,
                $application,
                $documentType,
                $safeOriginalName,
                $storagePath,
                $detectedMime,
                $fileSize,
                $checksum,
            ): OwnerVerificationDocument {
                $lockedApp = OwnerVerificationApplication::query()
                    ->whereKey($application->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $lockedApp->status->isEditableByOwner()) {
                    throw ValidationException::withMessages([
                        'document' => 'Verification documents cannot be uploaded in the current application status.',
                    ]);
                }

                $existingActive = OwnerVerificationDocument::query()
                    ->where('application_id', $lockedApp->id)
                    ->where('document_type', $documentType->value)
                    ->where('status', '!=', OwnerVerificationDocumentStatus::Replaced->value)
                    ->get();

                $replacedCount = 0;

                foreach ($existingActive as $previous) {
                    $previous->forceFill([
                        'status' => OwnerVerificationDocumentStatus::Replaced,
                    ])->save();
                    $replacedCount++;
                }

                $document = new OwnerVerificationDocument;
                $document->forceFill([
                    'application_id' => $lockedApp->id,
                    'document_type' => $documentType->value,
                    'original_filename' => $safeOriginalName,
                    'storage_path' => $storagePath,
                    'mime_type' => $detectedMime,
                    'file_size' => $fileSize,
                    'checksum' => $checksum,
                    'status' => OwnerVerificationDocumentStatus::Uploaded,
                ]);
                $document->save();

                $eventType = $replacedCount > 0
                    ? OwnerVerificationEventType::DocumentReplaced
                    : OwnerVerificationEventType::DocumentUploaded;

                OwnerVerificationEvent::record(
                    application: $lockedApp,
                    eventType: $eventType,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    previousStatus: $lockedApp->status,
                    newStatus: $lockedApp->status,
                    notes: sprintf('%s %s.', $replacedCount > 0 ? 'Replaced' : 'Uploaded', $documentType->label()),
                    metadata: [
                        'document_id' => $document->id,
                        'document_type' => $documentType->value,
                        'mime_type' => $detectedMime,
                        'file_size' => $fileSize,
                    ],
                );

                return $document->refresh();
            });
        } catch (Throwable $exception) {
            Storage::disk($diskName)->delete($storagePath);

            throw $exception;
        }
    }

    private function inspectVerifiedMimeType(string $realPath): string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detected = $finfo !== false ? finfo_file($finfo, $realPath) : false;

        if (! is_string($detected)) {
            return '';
        }

        if ($detected === 'application/pdf') {
            $handle = fopen($realPath, 'rb');
            if ($handle === false) {
                return '';
            }

            $header = fread($handle, 1024);
            fclose($handle);

            return is_string($header) && str_contains($header, '%PDF-') ? 'application/pdf' : '';
        }

        if (in_array($detected, ['image/jpeg', 'image/png'], true)) {
            $imageInfo = @getimagesize($realPath);
            if (! is_array($imageInfo)) {
                return '';
            }

            return match ($imageInfo[2]) {
                IMAGETYPE_JPEG => 'image/jpeg',
                IMAGETYPE_PNG => 'image/png',
                default => '',
            };
        }

        return '';
    }

    private function sanitizeOriginalFilename(string $clientName, string $fallbackExtension): string
    {
        $base = basename(str_replace('\\', '/', $clientName));
        $cleaned = preg_replace('/[^\p{L}\p{N}._\-\s()]+/u', '_', $base);
        $trimmed = is_string($cleaned) ? trim($cleaned, " .\t\n\r\0\x0B") : '';

        if ($trimmed === '') {
            return "verification-document.{$fallbackExtension}";
        }

        return Str::limit($trimmed, 200, '');
    }
}
