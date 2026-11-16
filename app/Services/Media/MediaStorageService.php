<?php

declare(strict_types=1);

namespace App\Services\Media;

use App\Models\Admin;
use App\Models\MediaAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class MediaStorageService
{
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
    ];

    private const ALLOWED_EXTENSIONS = [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'svg',
    ];

    private const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    public function storeUpload(
        UploadedFile $file,
        ?Admin $admin = null,
        ?string $title = null,
        ?string $altText = null,
        ?string $caption = null,
    ): MediaAsset {
        $mime = $file->getMimeType() ?: $file->getClientMimeType();
        $ext = strtolower($file->getClientOriginalExtension());

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new InvalidArgumentException("Invalid file type ({$mime}). Only JPEG, PNG, WebP, and SVG images are allowed.");
        }

        if (! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            throw new InvalidArgumentException("Invalid file extension (.{$ext}).");
        }

        if ($file->getSize() > self::MAX_SIZE_BYTES) {
            throw new InvalidArgumentException('File exceeds maximum allowed upload size of 5 MB.');
        }

        // SVG sanitization check to prevent script injection
        if ($mime === 'image/svg+xml' || $ext === 'svg') {
            $content = (string) file_get_contents($file->getRealPath());
            if (preg_match('/<script|onload|onerror|javascript:/i', $content)) {
                throw new InvalidArgumentException('Uploaded SVG contains potentially unsafe script content.');
            }
        }

        $directory = 'media/'.date('Y/m');
        $safeName = Str::random(28).'.'.$ext;
        $path = $file->storeAs($directory, $safeName, 'public');

        if (! $path) {
            throw new \RuntimeException('Failed to store media file.');
        }

        $width = null;
        $height = null;

        if ($ext !== 'svg' && function_exists('getimagesize')) {
            $dimensions = @getimagesize($file->getRealPath());
            if (is_array($dimensions)) {
                $width = $dimensions[0] ?? null;
                $height = $dimensions[1] ?? null;
            }
        }

        /** @var MediaAsset $asset */
        $asset = MediaAsset::query()->create([
            'filename' => $safeName,
            'original_name' => $file->getClientOriginalName(),
            'disk' => 'public',
            'path' => $path,
            'mime_type' => $mime,
            'file_size_bytes' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'title' => $title ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'alt_text' => $altText ?: $title,
            'caption' => $caption,
            'admin_id' => $admin?->id,
        ]);

        return $asset;
    }

    public function delete(MediaAsset $asset): void
    {
        Storage::disk($asset->disk)->delete($asset->path);
        $asset->delete();
    }
}
