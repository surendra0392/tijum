<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Properties;

use App\Actions\Owner\Properties\DeleteOrDeactivateRoomType;
use App\Actions\Owner\Properties\SavePropertyRoomType;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomTypeMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Properties\SavePropertyRoomTypeRequest;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Services\StayTimingPolicy;
use App\Support\PropertyPortalData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PropertyRoomTypeController extends Controller
{
    public function __construct(private readonly StayTimingPolicy $timing) {}

    public function index(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $property->load([
            'category',
            'city',
            'roomTypes.rooms',
            'roomTypes.media',
            'activeVerificationApplication',
            'latestVerificationApplication',
        ]);

        return Inertia::render('owner/properties/room-types/index', [
            'property' => PropertyPortalData::ownerSummary($property),
            'canManageInventory' => Gate::forUser($owner)->allows('manageInventoryByOwner', $property),
            'roomTypes' => $property->roomTypes
                ->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($property->activeVerificationApplication))
                ->values()
                ->all(),
            'timingRules' => $this->timing->timingSummary(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function create(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageInventoryByOwner', $property);

        return Inertia::render('owner/properties/room-types/create', [
            'property' => PropertyPortalData::ownerSummary($property),
            'options' => $this->formOptions(),
            'timingRules' => $this->timing->timingSummary(),
        ]);
    }

    public function store(
        SavePropertyRoomTypeRequest $request,
        Property $property,
        SavePropertyRoomType $saveRoomType,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageInventoryByOwner', $property);

        $roomType = $saveRoomType->execute($owner, $property, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Room type "%s" saved.', $roomType->name),
        ]);

        return to_route('owner.properties.room-types.index', $property)
            ->with('status', 'room-type-saved');
    }

    public function edit(Request $request, Property $property, PropertyRoomType $roomType): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);
        $this->ensureSameProperty($property, $roomType);

        $property->load('activeVerificationApplication');
        $roomType->loadCount(['rooms', 'media']);

        return Inertia::render('owner/properties/room-types/edit', [
            'property' => PropertyPortalData::ownerSummary($property),
            'canManageInventory' => Gate::forUser($owner)->allows('manageInventoryByOwner', $property),
            'roomType' => $roomType->toPortalArray($property->activeVerificationApplication),
            'options' => $this->formOptions(),
            'timingRules' => $this->timing->timingSummary(),
        ]);
    }

    public function update(
        SavePropertyRoomTypeRequest $request,
        Property $property,
        PropertyRoomType $roomType,
        SavePropertyRoomType $saveRoomType,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $roomType);
        Gate::forUser($owner)->authorize('updateByOwner', $roomType);

        $updated = $saveRoomType->execute($owner, $property, $request->validated(), $roomType);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Room type "%s" updated.', $updated->name),
        ]);

        return to_route('owner.properties.room-types.index', $property)
            ->with('status', 'room-type-updated');
    }

    public function destroy(
        Request $request,
        Property $property,
        PropertyRoomType $roomType,
        DeleteOrDeactivateRoomType $deleteOrDeactivate,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $roomType);
        Gate::forUser($owner)->authorize('deleteByOwner', $roomType);

        $deactivate = $request->boolean('deactivate');
        $deleteRooms = $request->boolean('delete_rooms');
        $deleteOrDeactivate->execute($owner, $property, $roomType, $deactivate, $deleteRooms);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $deactivate
                ? __('Room type deactivated while retaining historical physical rooms.')
                : ($deleteRooms
                    ? __('Room type and its physical rooms removed.')
                    : __('Room type removed.')),
        ]);

        return to_route('owner.properties.room-types.index', $property)
            ->with('status', 'room-type-removed');
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'modes' => array_map(
                static fn (PropertyRoomTypeMode $m): array => [
                    'value' => $m->value,
                    'label' => $m->label(),
                    'description' => $m->description(),
                ],
                PropertyRoomTypeMode::cases(),
            ),
            'sharingCapacities' => [2, 3, 4],
            'genderPolicies' => array_map(
                static fn (PropertyGenderPolicy $g): array => ['value' => $g->value, 'label' => $g->label()],
                PropertyGenderPolicy::cases(),
            ),
            'guestCompositions' => array_map(
                static fn (PropertyGuestComposition $c): array => ['value' => $c->value, 'label' => $c->label()],
                PropertyGuestComposition::cases(),
            ),
        ];
    }

    private function ensureSameProperty(Property $property, PropertyRoomType $roomType): void
    {
        if ($roomType->property_id !== $property->id) {
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
