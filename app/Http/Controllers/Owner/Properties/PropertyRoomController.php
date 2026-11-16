<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Properties;

use App\Actions\Owner\Properties\SavePropertyRoom;
use App\Actions\Owner\Properties\UpdatePropertyRoomOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Properties\SavePropertyRoomRequest;
use App\Http\Requests\Owner\Properties\UpdatePropertyRoomStatusRequest;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Support\PropertyPortalData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PropertyRoomController extends Controller
{
    public function index(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $search = trim($request->string('search')->toString());
        $roomTypeFilter = trim($request->string('room_type')->toString());
        $statusFilter = trim($request->string('operational_status')->toString());

        $property->load(['category', 'city', 'roomTypes', 'activeVerificationApplication']);

        $roomsQuery = PropertyRoom::query()
            ->where('property_id', $property->id)
            ->with('roomType')
            ->orderBy('room_number')
            ->orderBy('id');

        if ($search !== '') {
            $like = '%'.addcslashes($search, '\\%_').'%';
            $roomsQuery->where(function (Builder $q) use ($like): void {
                $q->where('room_number', 'like', $like)
                    ->orWhere('wing_name', 'like', $like)
                    ->orWhere('building_name', 'like', $like);
            });
        }

        if ($roomTypeFilter !== '' && ctype_digit($roomTypeFilter)) {
            $roomsQuery->where('property_room_type_id', (int) $roomTypeFilter);
        }

        if ($statusFilter !== '' && in_array($statusFilter, PropertyRoomStatus::values(), true)) {
            $roomsQuery->where('operational_status', $statusFilter);
        }

        $rooms = $roomsQuery->get();
        $summary = PropertyPortalData::ownerSummary($property);

        $allRooms = $property->rooms()->with('roomType')->get();

        return Inertia::render('owner/properties/rooms/index', [
            'property' => $summary,
            'canManageInventory' => Gate::forUser($owner)->allows('manageInventoryByOwner', $property),
            'canManageOperations' => Gate::forUser($owner)->allows('manageRoomOperationsByOwner', $property),
            'rooms' => $rooms->map(static fn (PropertyRoom $r): array => $r->toPortalArray())->values()->all(),
            'roomTypes' => $property->roomTypes->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($property->activeVerificationApplication))->values()->all(),
            'roomSummary' => [
                'total_rooms' => $allRooms->count(),
                'active_rooms' => $allRooms->where('operational_status', PropertyRoomStatus::Active)->count(),
                'maintenance_rooms' => $allRooms->where('operational_status', PropertyRoomStatus::Maintenance)->count(),
                'blocked_rooms' => $allRooms->where('operational_status', PropertyRoomStatus::Blocked)->count(),
                'inactive_rooms' => $allRooms->where('operational_status', PropertyRoomStatus::Inactive)->count(),
                'nominal_active_capacity' => $summary['nominal_active_capacity'],
            ],
            'operationalStatuses' => array_map(
                static fn (PropertyRoomStatus $s): array => [
                    'value' => $s->value,
                    'label' => $s->label(),
                    'description' => $s->description(),
                ],
                PropertyRoomStatus::cases(),
            ),
            'filters' => [
                'search' => $search,
                'room_type' => $roomTypeFilter,
                'operational_status' => $statusFilter,
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function create(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageInventoryByOwner', $property);

        $property->load(['roomTypes', 'activeVerificationApplication']);

        return Inertia::render('owner/properties/rooms/create', [
            'property' => PropertyPortalData::ownerSummary($property),
            'roomTypes' => $property->roomTypes
                ->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($property->activeVerificationApplication))
                ->filter(static fn (array $rt): bool => (bool) $rt['is_active'])
                ->values()
                ->all(),
            'operationalStatuses' => array_map(
                static fn (PropertyRoomStatus $s): array => [
                    'value' => $s->value,
                    'label' => $s->label(),
                    'description' => $s->description(),
                ],
                PropertyRoomStatus::cases(),
            ),
        ]);
    }

    public function store(
        SavePropertyRoomRequest $request,
        Property $property,
        SavePropertyRoom $saveRoom,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageInventoryByOwner', $property);

        $room = $saveRoom->execute($owner, $property, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Physical room %s added.', $room->room_number),
        ]);

        return to_route('owner.properties.rooms.index', $property)
            ->with('status', 'room-saved');
    }

    public function edit(Request $request, Property $property, PropertyRoom $room): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);
        $this->ensureSameProperty($property, $room);

        $property->load(['roomTypes', 'activeVerificationApplication']);

        return Inertia::render('owner/properties/rooms/edit', [
            'property' => PropertyPortalData::ownerSummary($property),
            'canManageInventory' => Gate::forUser($owner)->allows('manageInventoryByOwner', $property),
            'room' => $room->toPortalArray(),
            'roomTypes' => $property->roomTypes
                ->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($property->activeVerificationApplication))
                ->values()
                ->all(),
            'operationalStatuses' => array_map(
                static fn (PropertyRoomStatus $s): array => [
                    'value' => $s->value,
                    'label' => $s->label(),
                    'description' => $s->description(),
                ],
                PropertyRoomStatus::cases(),
            ),
        ]);
    }

    public function update(
        SavePropertyRoomRequest $request,
        Property $property,
        PropertyRoom $room,
        SavePropertyRoom $saveRoom,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $room);
        Gate::forUser($owner)->authorize('updateByOwner', $room);

        $updated = $saveRoom->execute($owner, $property, $request->validated(), $room);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Physical room %s updated.', $updated->room_number),
        ]);

        return to_route('owner.properties.rooms.index', $property)
            ->with('status', 'room-updated');
    }

    public function updateStatus(
        UpdatePropertyRoomStatusRequest $request,
        Property $property,
        PropertyRoom $room,
        UpdatePropertyRoomOperationalStatus $updateRoomStatus,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->ensureSameProperty($property, $room);
        Gate::forUser($owner)->authorize('updateByOwner', $room);

        $target = PropertyRoomStatus::from($request->string('operational_status')->toString());
        $description = $request->has('description')
            ? ($request->input('description') === null ? '' : (string) $request->input('description'))
            : null;

        $updateRoomStatus->execute($owner, $property, $room, $target, $description);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Room %s marked %s.', $room->room_number, $target->label()),
        ]);

        return to_route('owner.properties.rooms.index', $property)
            ->with('status', 'room-status-updated');
    }

    private function ensureSameProperty(Property $property, PropertyRoom $room): void
    {
        if ($room->property_id !== $property->id) {
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
