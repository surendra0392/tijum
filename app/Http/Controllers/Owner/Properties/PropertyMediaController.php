<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Properties;

use App\Actions\Owner\Properties\DeletePropertyMedia;
use App\Actions\Owner\Properties\UpdatePropertyMediaDetails;
use App\Actions\Owner\Properties\UploadPropertyMedia;
use App\Enums\PropertyMediaCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Properties\ReorderPropertyMediaRequest;
use App\Http\Requests\Owner\Properties\UpdatePropertyMediaRequest;
use App\Http\Requests\Owner\Properties\UploadPropertyMediaRequest;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Services\PropertyVerificationChecklist;
use App\Support\PropertyPortalData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PropertyMediaController extends Controller
{
    public function __construct(
        public readonly PropertyVerificationChecklist $checklist,
    ) {}

    public function index(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $property->load([
            'category',
            'city',
            'roomTypes',
            'rooms',
            'media.roomType',
            'media.room',
            'activeVerificationApplication',
            'latestVerificationApplication',
        ]);

        $application = $property->activeVerificationApplication ?? $property->latestVerificationApplication;
        $evaluation = $this->checklist->evaluate($property, $application);

        return Inertia::render('owner/properties/media/index', [
            'property' => PropertyPortalData::ownerSummary($property),
            'canManageInventory' => Gate::forUser($owner)->allows('manageInventoryByOwner', $property),
            'media' => $property->media
                ->map(static fn (PropertyMedia $m): array => $m->toPortalArray('owner'))
                ->values()
                ->all(),
            'roomTypes' => $property->roomTypes
                ->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($property->activeVerificationApplication))
                ->values()
                ->all(),
            'rooms' => $property->rooms
                ->map(static fn (PropertyRoom $r): array => $r->toPortalArray())
                ->values()
                ->all(),
            'mediaCategories' => array_map(
                static fn (PropertyMediaCategory $cat): array => [
                    'value' => $cat->value,
                    'label' => $cat->label(),
                    'is_room_category' => $cat->isRoomCategory(),
                ],
                PropertyMediaCategory::cases(),
            ),
            'evaluation' => $evaluation,
            'maxImageSizeMb' => (int) round(((int) config('tijum.property_media.max_image_kb', 8192)) / 1024),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(
        UploadPropertyMediaRequest $request,
        Property $property,
        UploadPropertyMedia $uploadMedia,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('uploadByOwner', [PropertyMedia::class, $property]);

        $file = $request->file('image');
        if ($file === null) {
            abort(422);
        }

        $uploadMedia->execute(
            owner: $owner,
            property: $property,
            file: $file,
            category: PropertyMediaCategory::from($request->string('media_type')->toString()),
            altText: $request->string('alt_text')->toString(),
            roomTypeId: $request->filled('property_room_type_id') ? $request->integer('property_room_type_id') : null,
            roomId: $request->filled('property_room_id') ? $request->integer('property_room_id') : null,
            makeCover: $request->boolean('is_cover'),
            replacesMediaId: $request->filled('replaces_media_id') ? $request->integer('replaces_media_id') : null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Photograph uploaded privately and optimised derivatives generated.'),
        ]);

        return to_route('owner.properties.media.index', $property)
            ->with('status', 'media-uploaded');
    }

    public function update(
        UpdatePropertyMediaRequest $request,
        Property $property,
        PropertyMedia $media,
        UpdatePropertyMediaDetails $updateMedia,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $media);
        Gate::forUser($owner)->authorize('updateByOwner', $media);

        $category = $request->filled('media_type')
            ? PropertyMediaCategory::from($request->string('media_type')->toString())
            : null;

        $updateMedia->updateMetadata(
            owner: $owner,
            property: $property,
            media: $media,
            altText: $request->string('alt_text')->toString(),
            category: $category,
            makeCover: $request->boolean('is_cover'),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Photograph details updated.'),
        ]);

        return to_route('owner.properties.media.index', $property)
            ->with('status', 'media-updated');
    }

    public function reorder(
        ReorderPropertyMediaRequest $request,
        Property $property,
        UpdatePropertyMediaDetails $updateMedia,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageInventoryByOwner', $property);

        /** @var list<int> $ids */
        $ids = array_map(static fn (mixed $v): int => (int) $v, $request->input('media_ids', []));
        $updateMedia->reorder($owner, $property, $ids);

        return to_route('owner.properties.media.index', $property)
            ->with('status', 'media-reordered');
    }

    public function destroy(
        Request $request,
        Property $property,
        PropertyMedia $media,
        DeletePropertyMedia $deleteMedia,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $media);
        Gate::forUser($owner)->authorize('deleteByOwner', $media);

        $deleteMedia->execute($owner, $property, $media);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Photograph removed cleanly.'),
        ]);

        return to_route('owner.properties.media.index', $property)
            ->with('status', 'media-deleted');
    }

    public function preview(Request $request, Property $property, PropertyMedia $media): StreamedResponse
    {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $media);
        Gate::forUser($owner)->authorize('viewByOwner', $media);

        $disk = (string) config('tijum.property_media.private_disk', 'property_media_private');
        $path = $request->string('variant')->toString() === 'thumbnail'
            ? $media->thumbnail_path
            : $media->optimized_private_path;

        if (! Storage::disk($disk)->exists($path)) {
            abort(404);
        }

        return Storage::disk($disk)->response($path, $media->original_filename, [
            'Content-Type' => 'image/webp',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store, private',
        ], 'inline');
    }

    private function ensureSameProperty(Property $property, PropertyMedia $media): void
    {
        if ($media->property_id !== $property->id) {
            abort(404);
        }
    }

    private function resolveOwner(Request $request): Owner
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner) {
            abort(403);
        }

        return $owner;
    }
}
