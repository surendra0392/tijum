<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\Properties\DeletePropertyMedia;
use App\Actions\Owner\Properties\UploadPropertyMedia;
use App\Enums\PropertyMediaCategory;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OwnerMediaController extends ApiController
{
    /**
     * List all media for the property.
     */
    public function index(Request $request, int|string $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $mediaList = PropertyMedia::query()
            ->where('property_id', $property->id)
            ->with(['roomType', 'room'])
            ->orderByDesc('is_cover')
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        $data = $mediaList->map(static fn (PropertyMedia $m): array => [
            'id' => $m->id,
            'url' => $m->publicOptimizedUrl() ?? $m->publicThumbnailUrl() ?? '',
            'alt_text' => $m->alt_text,
            'media_type' => $m->media_type->value,
            'media_type_label' => $m->media_type->label(),
            'is_cover' => (bool) $m->is_cover,
            'moderation_status' => $m->moderation_status->value,
            'publication_status' => $m->publication_status->value,
            'property_room_type_id' => $m->property_room_type_id,
            'room_type_name' => $m->roomType?->name,
            'property_room_id' => $m->property_room_id,
            'room_number' => $m->room?->room_number,
        ])->values()->all();

        return $this->success($data, 'Property media retrieved successfully.');
    }

    /**
     * Upload photo / media for the property.
     */
    public function store(
        Request $request,
        int|string $id,
        UploadPropertyMedia $uploadAction
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:12288'],
            'category' => ['required', 'string', Rule::in(PropertyMediaCategory::values())],
            'alt_text' => ['required', 'string', 'max:255'],
            'property_room_type_id' => ['nullable', 'integer'],
            'property_room_id' => ['nullable', 'integer'],
            'make_cover' => ['nullable', 'boolean'],
        ]);

        $category = PropertyMediaCategory::from($validated['category']);
        $makeCover = (bool) ($validated['make_cover'] ?? false);
        $roomTypeId = isset($validated['property_room_type_id']) ? (int) $validated['property_room_type_id'] : null;
        $roomId = isset($validated['property_room_id']) ? (int) $validated['property_room_id'] : null;

        try {
            $media = $uploadAction->execute(
                $owner,
                $property,
                $validated['file'],
                $category,
                $validated['alt_text'],
                $roomTypeId,
                $roomId,
                $makeCover
            );
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $media->id,
            'url' => $media->publicOptimizedUrl() ?? $media->publicThumbnailUrl() ?? '',
            'alt_text' => $media->alt_text,
            'media_type' => $media->media_type->value,
            'is_cover' => (bool) $media->is_cover,
        ], 'Photograph uploaded successfully.', 201);
    }

    /**
     * Delete media item.
     */
    public function destroy(
        Request $request,
        int|string $id,
        int $mediaId,
        DeletePropertyMedia $deleteAction
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($id): void {
                if (is_numeric($id)) {
                    $query->where('id', (int) $id);
                } else {
                    $query->where('slug', (string) $id);
                }
            })
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $media = PropertyMedia::query()
            ->where('id', $mediaId)
            ->where('property_id', $property->id)
            ->first();

        if ($media === null) {
            return $this->error("Media item '{$mediaId}' not found in property.", 'NOT_FOUND', 404);
        }

        try {
            $deleteAction->execute($owner, $property, $media);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success(null, 'Photograph removed successfully.');
    }
}
