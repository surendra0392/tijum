<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyVerificationDocument extends Model
{
    /**
     * Storage paths and checksums are managed exclusively by UploadPropertyVerificationDocument.
     *
     * @var list<string>
     */
    protected $fillable = [];

    /**
     * Private storage path must never leak to frontend Inertia props.
     *
     * @var list<string>
     */
    protected $hidden = [
        'storage_path',
    ];

    /**
     * @return array{
     *     document_type: 'App\\Enums\\PropertyVerificationDocumentType',
     *     file_size: 'integer',
     *     status: 'App\\Enums\\PropertyVerificationDocumentStatus',
     *     reviewed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'document_type' => PropertyVerificationDocumentType::class,
            'file_size' => 'integer',
            'status' => PropertyVerificationDocumentStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PropertyVerificationApplication, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(PropertyVerificationApplication::class, 'application_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function reviewedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by_admin_id');
    }

    public function formattedFileSize(): string
    {
        if ($this->file_size < 1024) {
            return $this->file_size.' B';
        }

        if ($this->file_size < 1048576) {
            return round($this->file_size / 1024, 1).' KB';
        }

        return round($this->file_size / 1048576, 2).' MB';
    }

    /**
     * @return array<string, mixed>
     */
    public function toOwnerArray(int $propertyId): array
    {
        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'document_type' => $this->document_type->value,
            'document_type_label' => $this->document_type->label(),
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'file_size_label' => $this->formattedFileSize(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'reviewer_note' => $this->reviewer_note,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'preview_url' => route('owner.properties.verification.documents.show', [
                'property' => $propertyId,
                'document' => $this->id,
            ]),
            'download_url' => route('owner.properties.verification.documents.show', [
                'property' => $propertyId,
                'document' => $this->id,
                'download' => 1,
            ]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toAdminArray(bool $canViewFiles = true): array
    {
        $this->loadMissing('reviewedByAdmin');

        return [
            'id' => $this->id,
            'application_id' => $this->application_id,
            'document_type' => $this->document_type->value,
            'document_type_label' => $this->document_type->label(),
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'file_size_label' => $this->formattedFileSize(),
            'checksum' => $canViewFiles ? $this->checksum : null,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'reviewer_note' => $this->reviewer_note,
            'reviewed_by_name' => $this->reviewedByAdmin?->name,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'preview_url' => $canViewFiles
                ? route('admin.properties.documents.show', ['document' => $this->id])
                : null,
            'download_url' => $canViewFiles
                ? route('admin.properties.documents.show', ['document' => $this->id, 'download' => 1])
                : null,
        ];
    }
}
