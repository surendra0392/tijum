<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyVerificationEventType;
use App\Jobs\PublishApprovedPropertyMediaJob;
use App\Jobs\UnpublishPropertyMediaJob;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationEvent;
use finfo;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class PropertyMediaProcessor
{
    /**
     * Inspect uploaded image magic bytes, strip EXIF/metadata via GD,
     * and store private original + optimized WebP + thumbnail WebP derivatives.
     *
     * @return array{
     *     storage_path: string,
     *     optimized_private_path: string,
     *     thumbnail_path: string,
     *     mime_type: string,
     *     file_size: int,
     *     width: int,
     *     height: int,
     * }
     */
    public function processPrivateUpload(int $propertyId, UploadedFile $file): array
    {
        $realPath = $file->getRealPath();

        if (! is_string($realPath) || ! is_file($realPath)) {
            throw ValidationException::withMessages([
                'image' => 'Uploaded photograph could not be inspected on the server.',
            ]);
        }

        $fileSize = filesize($realPath);
        $maxKb = (int) config('tijum.property_media.max_image_kb', 8192);
        $maxBytes = $maxKb * 1024;

        if ($fileSize === false || $fileSize <= 0 || $fileSize > $maxBytes) {
            throw ValidationException::withMessages([
                'image' => 'The uploaded photograph is empty or exceeds the maximum allowed size.',
            ]);
        }

        $detectedMime = $this->detectGenuineImageMime($realPath);
        $allowedMimes = $this->stringMap(config('tijum.property_media.allowed_mime_types', []));

        if (! isset($allowedMimes[$detectedMime])) {
            throw ValidationException::withMessages([
                'image' => 'Only genuine JPG, JPEG, PNG, or WebP photographs are supported. SVG and executable files are rejected.',
            ]);
        }

        $imageInfo = @getimagesize($realPath);
        if (! is_array($imageInfo)) {
            throw ValidationException::withMessages([
                'image' => 'The uploaded file is not a valid raster image.',
            ]);
        }

        $width = (int) $imageInfo[0];
        $height = (int) $imageInfo[1];
        $minW = (int) config('tijum.property_media.min_width', 100);
        $minH = (int) config('tijum.property_media.min_height', 100);
        $maxW = (int) config('tijum.property_media.max_width', 8000);
        $maxH = (int) config('tijum.property_media.max_height', 8000);

        if ($width < $minW || $height < $minH || $width > $maxW || $height > $maxH) {
            throw ValidationException::withMessages([
                'image' => sprintf(
                    'Image dimensions (%dx%d px) must be between %dx%d px and %dx%d px.',
                    $width,
                    $height,
                    $minW,
                    $minH,
                    $maxW,
                    $maxH,
                ),
            ]);
        }

        $source = $this->createGdImage($realPath, $detectedMime);
        if (! $source instanceof GdImage) {
            throw ValidationException::withMessages([
                'image' => 'Unable to decode uploaded image pixels safely.',
            ]);
        }

        $diskName = (string) config('tijum.property_media.private_disk', 'property_media_private');
        $disk = Storage::disk($diskName);
        $ext = $allowedMimes[$detectedMime];
        $uuid = Str::uuid()->toString();
        $baseDir = sprintf('properties/%d/%s', $propertyId, $uuid);

        $originalPath = "{$baseDir}/original.{$ext}";
        $optimizedPath = "{$baseDir}/optimized.webp";
        $thumbnailPath = "{$baseDir}/thumb.webp";

        try {
            // Re-encoding strips EXIF/XMP/IPTC metadata completely.
            $cleanOriginalBytes = $this->encodeOriginalClean($source, $detectedMime, (int) config('tijum.property_media.jpeg_quality', 84));
            $optimizedBytes = $this->resizeAndEncodeWebp(
                $source,
                $width,
                $height,
                (int) config('tijum.property_media.optimized_max_width', 1600),
                (int) config('tijum.property_media.webp_quality', 82),
            );
            $thumbBytes = $this->resizeAndEncodeWebp(
                $source,
                $width,
                $height,
                (int) config('tijum.property_media.thumbnail_width', 480),
                (int) config('tijum.property_media.webp_quality', 82),
            );

            $storedOrig = $disk->put($originalPath, $cleanOriginalBytes);
            $storedOpt = $disk->put($optimizedPath, $optimizedBytes);
            $storedThumb = $disk->put($thumbnailPath, $thumbBytes);

            if (! $storedOrig || ! $storedOpt || ! $storedThumb) {
                $disk->delete([$originalPath, $optimizedPath, $thumbnailPath]);

                throw ValidationException::withMessages([
                    'image' => 'Failed to persist processed media files into private storage.',
                ]);
            }
        } finally {
            imagedestroy($source);
        }

        return [
            'storage_path' => $originalPath,
            'optimized_private_path' => $optimizedPath,
            'thumbnail_path' => $thumbnailPath,
            'mime_type' => $detectedMime,
            'file_size' => strlen($cleanOriginalBytes),
            'width' => $width,
            'height' => $height,
        ];
    }

    /**
     * Publish approved optimized derivatives from private storage to public disk.
     */
    public function publishToPublicDisk(PropertyMedia $media): bool
    {
        if (
            $media->is_archived
            || $media->moderation_status !== PropertyMediaModerationStatus::Approved
        ) {
            return false;
        }

        $privateDisk = Storage::disk((string) config('tijum.property_media.private_disk', 'property_media_private'));
        $publicDisk = Storage::disk((string) config('tijum.property_media.public_disk', 'property_media_public'));

        $optBytes = $privateDisk->get($media->optimized_private_path);
        $thumbBytes = $privateDisk->get($media->thumbnail_path);

        if (! is_string($optBytes) || ! is_string($thumbBytes)) {
            throw new RuntimeException('Missing private derivative bytes for property media #'.$media->id);
        }

        $publicOptPath = $media->public_optimized_path
            ?? sprintf('properties/%d/%d-opt.webp', $media->property_id, $media->id);
        $publicThumbPath = $media->public_thumbnail_path
            ?? sprintf('properties/%d/%d-thumb.webp', $media->property_id, $media->id);

        if (! $publicDisk->put($publicOptPath, $optBytes) || ! $publicDisk->put($publicThumbPath, $thumbBytes)) {
            throw new RuntimeException('Failed writing public derivatives for property media #'.$media->id);
        }

        $media->forceFill([
            'public_optimized_path' => $publicOptPath,
            'public_thumbnail_path' => $publicThumbPath,
            'publication_status' => PropertyMediaPublicationStatus::Published,
            'published_at' => now(),
        ])->save();

        $media->loadMissing('property');
        if ($media->property !== null) {
            PropertyVerificationEvent::record(
                property: $media->property,
                application: null,
                eventType: PropertyVerificationEventType::MediaPublished,
                actorType: 'system',
                notes: sprintf('Published approved photograph #%d (%s) to public media disk.', $media->id, $media->original_filename),
                metadata: ['media_id' => $media->id],
            );
        }

        return true;
    }

    /**
     * Safely attempt synchronous publish after commit and queue retries on transient I/O errors.
     */
    public function schedulePublication(int $mediaId): void
    {
        $media = PropertyMedia::query()->find($mediaId);
        if (! $media instanceof PropertyMedia) {
            return;
        }

        try {
            $this->publishToPublicDisk($media);
        } catch (Throwable) {
            $media->forceFill([
                'publication_status' => PropertyMediaPublicationStatus::Failed,
            ])->save();

            PublishApprovedPropertyMediaJob::dispatch($mediaId);
        }
    }

    /**
     * Remove public derivatives while retaining private source assets according to retention policy.
     */
    public function unpublishFromPublicDisk(PropertyMedia $media): void
    {
        $publicDisk = Storage::disk((string) config('tijum.property_media.public_disk', 'property_media_public'));

        $pathsToRemove = array_values(array_filter([
            $media->public_optimized_path,
            $media->public_thumbnail_path,
        ], static fn (?string $p): bool => is_string($p) && $p !== ''));

        if ($pathsToRemove !== []) {
            $publicDisk->delete($pathsToRemove);
        }

        $wasPublished = $media->publication_status === PropertyMediaPublicationStatus::Published;

        $media->forceFill([
            'publication_status' => PropertyMediaPublicationStatus::Unpublished,
            'published_at' => null,
            'public_optimized_path' => null,
            'public_thumbnail_path' => null,
        ])->save();

        if ($wasPublished) {
            $media->loadMissing('property');
            if ($media->property !== null) {
                PropertyVerificationEvent::record(
                    property: $media->property,
                    application: null,
                    eventType: PropertyVerificationEventType::MediaUnpublished,
                    actorType: 'system',
                    notes: sprintf('Unpublished photograph #%d (%s) from public media disk.', $media->id, $media->original_filename),
                    metadata: ['media_id' => $media->id],
                );
            }
        }
    }

    public function scheduleUnpublication(int $mediaId): void
    {
        $media = PropertyMedia::query()->find($mediaId);
        if (! $media instanceof PropertyMedia) {
            return;
        }

        try {
            $this->unpublishFromPublicDisk($media);
        } catch (Throwable) {
            UnpublishPropertyMediaJob::dispatch($mediaId);
        }
    }

    public function deletePrivateAssets(PropertyMedia $media): void
    {
        $privateDisk = Storage::disk((string) config('tijum.property_media.private_disk', 'property_media_private'));
        $privateDisk->delete(array_values(array_filter([
            $media->storage_path,
            $media->optimized_private_path,
            $media->thumbnail_path,
        ])));
    }

    /**
     * @return array<string, string>
     */
    private function stringMap(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $result = [];
        foreach ($value as $key => $item) {
            if (is_string($key) && is_string($item)) {
                $result[$key] = $item;
            }
        }

        return $result;
    }

    private function detectGenuineImageMime(string $realPath): string
    {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($realPath);

        if (! is_string($detected)) {
            return '';
        }

        $normalized = strtolower(trim($detected));
        if ($normalized === 'image/pjpeg') {
            return 'image/jpeg';
        }

        $head = file_get_contents($realPath, false, null, 0, 512);
        if (is_string($head) && str_contains(strtolower($head), '<svg')) {
            return 'image/svg+xml';
        }

        return $normalized;
    }

    private function createGdImage(string $realPath, string $mime): GdImage|false
    {
        $raw = file_get_contents($realPath);
        if (! is_string($raw) || $raw === '') {
            return false;
        }

        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($realPath),
            'image/png' => @imagecreatefrompng($realPath),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($realPath) : @imagecreatefromstring($raw),
            default => @imagecreatefromstring($raw),
        };

        return $image instanceof GdImage ? $image : false;
    }

    private function encodeOriginalClean(GdImage $source, string $mime, int $jpegQuality): string
    {
        ob_start();
        match ($mime) {
            'image/png' => imagepng($source, null, 6),
            'image/webp' => imagewebp($source, null, 85),
            default => imagejpeg($source, null, $jpegQuality),
        };
        $bytes = ob_get_clean();

        return is_string($bytes) ? $bytes : '';
    }

    private function resizeAndEncodeWebp(
        GdImage $source,
        int $srcWidth,
        int $srcHeight,
        int $maxWidth,
        int $quality,
    ): string {
        $targetWidth = max(1, min($srcWidth, max(1, $maxWidth)));
        $targetHeight = max(1, (int) round(($srcHeight * $targetWidth) / max(1, $srcWidth)));

        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        if (! $canvas instanceof GdImage) {
            return '';
        }

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        if (is_int($transparent)) {
            imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $transparent);
        }

        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $srcWidth, $srcHeight);

        ob_start();
        imagewebp($canvas, null, $quality);
        $bytes = ob_get_clean();
        imagedestroy($canvas);

        return is_string($bytes) ? $bytes : '';
    }
}
