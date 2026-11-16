<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PropertyMedia extends Model
{
    /**
     * Storage paths and moderation/publication state are managed by media actions & jobs.
     *
     * @var list<string>
     */
    protected $fillable = [];

    /**
     * Private storage paths must never serialize into default or Inertia payloads.
     *
     * @var list<string>
     */
    protected $hidden = [
        'storage_path',
        'optimized_private_path',
        'thumbnail_path',
    ];

    /**
     * @return array{
     *     media_type: 'App\\Enums\\PropertyMediaCategory',
     *     file_size: 'integer',
     *     width: 'integer',
     *     height: 'integer',
     *     sort_order: 'integer',
     *     is_cover: 'boolean',
     *     moderation_status: 'App\\Enums\\PropertyMediaModerationStatus',
     *     moderated_at: 'datetime',
     *     publication_status: 'App\\Enums\\PropertyMediaPublicationStatus',
     *     published_at: 'datetime',
     *     is_archived: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'media_type' => PropertyMediaCategory::class,
            'file_size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'sort_order' => 'integer',
            'is_cover' => 'boolean',
            'moderation_status' => PropertyMediaModerationStatus::class,
            'moderated_at' => 'datetime',
            'publication_status' => PropertyMediaPublicationStatus::class,
            'published_at' => 'datetime',
            'is_archived' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<PropertyRoomType, $this>
     */
    public function roomType(): BelongsTo
    {
        return $this->belongsTo(PropertyRoomType::class, 'property_room_type_id');
    }

    /**
     * @return BelongsTo<PropertyRoom, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(PropertyRoom::class, 'property_room_id');
    }

    /**
     * @return BelongsTo<PropertyVerificationApplication, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(PropertyVerificationApplication::class, 'property_verification_application_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function moderatedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'moderated_by_admin_id');
    }

    public function isPubliclyPublished(): bool
    {
        return ! $this->is_archived
            && $this->moderation_status === PropertyMediaModerationStatus::Approved
            && $this->publication_status === PropertyMediaPublicationStatus::Published
            && $this->public_optimized_path !== null
            && $this->public_thumbnail_path !== null;
    }

    public function publicOptimizedUrl(): ?string
    {
        if (! $this->isPubliclyPublished() || $this->public_optimized_path === null) {
            return null;
        }

        return Storage::disk((string) config('tijum.property_media.public_disk', 'property_media_public'))
            ->url($this->public_optimized_path);
    }

    public function publicThumbnailUrl(): ?string
    {
        if (! $this->isPubliclyPublished() || $this->public_thumbnail_path === null) {
            return null;
        }

        return Storage::disk((string) config('tijum.property_media.public_disk', 'property_media_public'))
            ->url($this->public_thumbnail_path);
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
    public function toPortalArray(string $portal): array
    {
        $this->loadMissing(['roomType', 'room']);

        $previewUrl = $portal === 'admin'
            ? route('admin.properties.media.preview', ['property' => $this->property_id, 'media' => $this->id])
            : route('owner.properties.media.preview', ['property' => $this->property_id, 'media' => $this->id]);

        $thumbnailPreviewUrl = $portal === 'admin'
            ? route('admin.properties.media.preview', ['property' => $this->property_id, 'media' => $this->id, 'variant' => 'thumbnail'])
            : route('owner.properties.media.preview', ['property' => $this->property_id, 'media' => $this->id, 'variant' => 'thumbnail']);

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'property_room_type_id' => $this->property_room_type_id,
            'room_type_name' => $this->roomType?->name,
            'property_room_id' => $this->property_room_id,
            'room_number' => $this->room?->room_number,
            'property_verification_application_id' => $this->property_verification_application_id,
            'pending_removal_in_application_id' => $this->pending_removal_in_application_id,
            'media_type' => $this->media_type->value,
            'media_type_label' => $this->media_type->label(),
            'is_room_category' => $this->media_type->isRoomCategory(),
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'file_size_label' => $this->formattedFileSize(),
            'width' => $this->width,
            'height' => $this->height,
            'alt_text' => $this->alt_text,
            'sort_order' => $this->sort_order,
            'is_cover' => $this->is_cover,
            'moderation_status' => $this->moderation_status->value,
            'moderation_status_label' => $this->moderation_status->label(),
            'moderation_note' => $this->moderation_note,
            'moderated_at' => $this->moderated_at?->toISOString(),
            'publication_status' => $this->publication_status->value,
            'publication_status_label' => $this->publication_status->label(),
            'published_at' => $this->published_at?->toISOString(),
            'is_publicly_published' => $this->isPubliclyPublished(),
            'preview_url' => $previewUrl,
            'thumbnail_preview_url' => $thumbnailPreviewUrl,
            'public_optimized_url' => $this->publicOptimizedUrl(),
            'public_thumbnail_url' => $this->publicThumbnailUrl(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
