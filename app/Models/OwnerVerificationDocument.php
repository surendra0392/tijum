<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OwnerVerificationDocument extends Model
{
    /**
     * Storage paths and integrity hashes are managed exclusively by UploadVerificationDocument.
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
     *     document_type: 'App\\Enums\\OwnerVerificationDocumentType',
     *     file_size: 'integer',
     *     status: 'App\\Enums\\OwnerVerificationDocumentStatus',
     *     reviewed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'document_type' => OwnerVerificationDocumentType::class,
            'file_size' => 'integer',
            'status' => OwnerVerificationDocumentStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<OwnerVerificationApplication, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(OwnerVerificationApplication::class, 'application_id');
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
     * @return array{
     *     id: int,
     *     application_id: int,
     *     document_type: string,
     *     document_type_label: string,
     *     original_filename: string,
     *     mime_type: string,
     *     file_size: int,
     *     file_size_label: string,
     *     status: string,
     *     status_label: string,
     *     reviewer_note: string|null,
     *     reviewed_at: string|null,
     *     created_at: string|null,
     *     preview_url: string,
     *     download_url: string,
     * }
     */
    public function toOwnerArray(): array
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
            'preview_url' => route('owner.onboarding.documents.show', $this),
            'download_url' => route('owner.onboarding.documents.show', ['document' => $this, 'download' => 1]),
        ];
    }

    /**
     * @return array{
     *     id: int,
     *     application_id: int,
     *     document_type: string,
     *     document_type_label: string,
     *     original_filename: string,
     *     mime_type: string,
     *     file_size: int,
     *     file_size_label: string,
     *     checksum: string,
     *     status: string,
     *     status_label: string,
     *     reviewer_note: string|null,
     *     reviewed_at: string|null,
     *     created_at: string|null,
     *     preview_url: string|null,
     *     download_url: string|null,
     * }
     */
    public function toAdminArray(bool $includeAccessUrls): array
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
            'checksum' => $this->checksum,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'reviewer_note' => $this->reviewer_note,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'preview_url' => $includeAccessUrls
                ? route('admin.partners.documents.show', $this)
                : null,
            'download_url' => $includeAccessUrls
                ? route('admin.partners.documents.show', ['document' => $this, 'download' => 1])
                : null,
        ];
    }
}
