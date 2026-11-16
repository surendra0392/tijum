<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Properties;

use App\Actions\Owner\Properties\CancelPropertyAmendment;
use App\Actions\Owner\Properties\CreateProperty;
use App\Actions\Owner\Properties\StartPropertyAmendment;
use App\Actions\Owner\Properties\TogglePropertyOperationalStatus;
use App\Actions\Owner\Properties\UpdatePropertyDetails;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Properties\StoreOrUpdatePropertyRequest;
use App\Http\Requests\Owner\Properties\UpdatePropertyOperationalStatusRequest;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyVerificationChecklist;
use App\Services\StayTimingPolicy;
use App\Support\PropertyPortalData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    public function __construct(
        public readonly PropertyVerificationChecklist $checklist,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function index(Request $request): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewAnyByOwner', Property::class);

        $search = trim($request->string('search')->toString());
        $statusFilter = trim($request->string('status')->toString());
        $verificationFilter = trim($request->string('verification_status')->toString());
        $cityFilter = trim($request->string('city')->toString());
        $categoryFilter = trim($request->string('category')->toString());
        $moduleFilter = trim($request->string('module')->toString());

        $query = Property::query()
            ->where('owner_id', $owner->id)
            ->with([
                'category',
                'city',
                'roomTypes',
                'rooms',
                'media',
                'activeVerificationApplication',
                'latestVerificationApplication',
            ])
            ->orderByDesc('updated_at')
            ->orderByDesc('id');

        if ($moduleFilter === 'food') {
            $query->where('food_provided', true);
        }

        if ($search !== '') {
            $like = '%'.addcslashes($search, '\\%_').'%';
            $query->where(function (Builder $q) use ($like): void {
                $q->where('property_reference', 'like', $like)
                    ->orWhere('name', 'like', $like)
                    ->orWhere('locality', 'like', $like);
            });
        }

        if ($statusFilter !== '' && in_array($statusFilter, PropertyOperationalStatus::values(), true)) {
            $query->where('status', $statusFilter);
        }

        if ($cityFilter !== '') {
            $query->whereHas('city', static fn (Builder $q) => $q->where('slug', $cityFilter));
        }

        if ($categoryFilter !== '') {
            $query->whereHas('category', static fn (Builder $q) => $q->where('slug', $categoryFilter));
        }

        if ($verificationFilter !== '' && in_array($verificationFilter, PropertyVerificationStatus::values(), true)) {
            $query->whereHas('latestVerificationApplication', static fn (Builder $q) => $q->where('status', $verificationFilter));
        }

        $paginated = $query->paginate(9)->withQueryString();
        $paginated->through(static fn (Property $property): array => PropertyPortalData::ownerSummary($property));

        $allOwnerProperties = Property::query()->where('owner_id', $owner->id)->get(['id', 'status', 'is_verified']);

        return Inertia::render('owner/properties/index', [
            'properties' => $paginated,
            'stats' => [
                'total' => $allOwnerProperties->count(),
                'verified' => $allOwnerProperties->where('is_verified', true)->count(),
                'active' => $allOwnerProperties->where('status', PropertyOperationalStatus::Active)->count(),
                'drafts' => $allOwnerProperties->where('status', PropertyOperationalStatus::Draft)->count(),
            ],
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
                'verification_status' => $verificationFilter,
                'city' => $cityFilter,
                'category' => $categoryFilter,
                'module' => $moduleFilter,
            ],
            'cities' => City::query()->active()->ordered()->get()->map(static fn (City $c): array => $c->toSelectorArray())->values(),
            'categories' => PropertyCategory::query()->active()->ordered()->get()->map(static fn (PropertyCategory $c): array => $c->toOptionArray())->values(),
            'operationalStatuses' => array_map(
                static fn (PropertyOperationalStatus $s): array => ['value' => $s->value, 'label' => $s->label()],
                PropertyOperationalStatus::cases(),
            ),
            'verificationStatuses' => array_map(
                static fn (PropertyVerificationStatus $s): array => ['value' => $s->value, 'label' => $s->label()],
                PropertyVerificationStatus::cases(),
            ),
            'canCreateProperty' => $owner->canPublishProperties(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function create(Request $request): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('createByOwner', Property::class);

        return Inertia::render('owner/properties/create', [
            'categories' => PropertyCategory::query()->active()->ordered()->get()->map(static fn (PropertyCategory $c): array => $c->toOptionArray())->values(),
            'cities' => City::query()->active()->ordered()->get()->map(static fn (City $c): array => $c->toSelectorArray())->values(),
            'ownershipArrangements' => array_map(
                static fn (PropertyOwnershipArrangement $a): array => [
                    'value' => $a->value,
                    'label' => $a->label(),
                    'guidance' => $a->ownershipDocumentGuidance(),
                ],
                PropertyOwnershipArrangement::cases(),
            ),
            'timingRules' => $this->timing->timingSummary(),
        ]);
    }

    public function store(StoreOrUpdatePropertyRequest $request, CreateProperty $createProperty): RedirectResponse
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('createByOwner', Property::class);

        $property = $createProperty->execute($owner, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Property draft created. Next, configure your Room Types (4/3/2 Sharing or Single Room).'),
        ]);

        return to_route('owner.properties.room-types.index', $property)
            ->with('status', 'property-created');
    }

    public function show(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $property->load([
            'category',
            'city',
            'roomTypes.rooms',
            'roomTypes.media',
            'rooms.roomType',
            'media.roomType',
            'media.room',
            'activeVerificationApplication.documents',
            'latestVerificationApplication.documents',
            'verificationEvents',
        ]);

        $application = $property->activeVerificationApplication ?? $property->latestVerificationApplication;
        $evaluation = $this->checklist->evaluate($property, $application);

        $ownerEvents = $property->verificationEvents
            ->filter(static fn (PropertyVerificationEvent $e): bool => $e->event_type->isVisibleToOwner())
            ->map(static fn (PropertyVerificationEvent $e): array => $e->toTimelineArray())
            ->values()
            ->all();

        $summary = PropertyPortalData::ownerSummary($property);
        $effectiveFields = $property->effectiveFieldsForRevision($property->activeVerificationApplication);

        return Inertia::render('owner/properties/show', [
            'property' => [
                ...$summary,
                'details' => $effectiveFields,
                'approved_details' => $property->toApprovedPropertyFieldsSnapshot(),
                'approved_snapshot' => $property->approved_snapshot,
                'suspended_reason' => $property->suspended_reason,
                'can_edit_details' => Gate::forUser($owner)->allows('updateDetailsByOwner', $property),
                'can_manage_inventory' => Gate::forUser($owner)->allows('manageInventoryByOwner', $property),
            ],
            'roomTypes' => $property->roomTypes
                ->map(static fn (PropertyRoomType $rt): array => $rt->toPortalArray($property->activeVerificationApplication))
                ->values()
                ->all(),
            'rooms' => $property->rooms
                ->map(static fn (PropertyRoom $r): array => $r->toPortalArray())
                ->values()
                ->all(),
            'roomSummary' => [
                'total_rooms' => $property->rooms->count(),
                'active_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Active)->count(),
                'maintenance_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Maintenance)->count(),
                'blocked_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Blocked)->count(),
                'inactive_rooms' => $property->rooms->where('operational_status', PropertyRoomStatus::Inactive)->count(),
                'nominal_active_capacity' => $summary['nominal_active_capacity'],
            ],
            'media' => $property->media
                ->map(static fn (PropertyMedia $m): array => $m->toPortalArray('owner'))
                ->values()
                ->all(),
            'application' => $application?->toOwnerArray(),
            'evaluation' => $evaluation,
            'events' => $ownerEvents,
            'timingRules' => $this->timing->timingSummary(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function edit(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $property->load(['category', 'city', 'activeVerificationApplication', 'latestVerificationApplication']);
        $activeApp = $property->activeVerificationApplication;
        $latestApp = $activeApp ?? $property->latestVerificationApplication;
        $canEditDetails = Gate::forUser($owner)->allows('updateDetailsByOwner', $property);

        return Inertia::render('owner/properties/edit', [
            'property' => [
                ...PropertyPortalData::ownerSummary($property),
                'details' => $property->effectiveFieldsForRevision($activeApp),
                'approved_details' => $property->toApprovedPropertyFieldsSnapshot(),
                'ownership_arrangement' => $latestApp->ownership_arrangement->value,
                'can_edit_details' => $canEditDetails,
            ],
            'categories' => PropertyCategory::query()->active()->ordered()->get()->map(static fn (PropertyCategory $c): array => $c->toOptionArray())->values(),
            'cities' => City::query()->active()->ordered()->get()->map(static fn (City $c): array => $c->toSelectorArray())->values(),
            'ownershipArrangements' => array_map(
                static fn (PropertyOwnershipArrangement $a): array => [
                    'value' => $a->value,
                    'label' => $a->label(),
                    'guidance' => $a->ownershipDocumentGuidance(),
                ],
                PropertyOwnershipArrangement::cases(),
            ),
            'timingRules' => $this->timing->timingSummary(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(
        StoreOrUpdatePropertyRequest $request,
        Property $property,
        UpdatePropertyDetails $updateDetails,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('updateDetailsByOwner', $property);

        $updateDetails->execute($owner, $property, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Property details saved.'),
        ]);

        return to_route('owner.properties.edit', $property)
            ->with('status', 'property-updated');
    }

    public function updateOperationalStatus(
        UpdatePropertyOperationalStatusRequest $request,
        Property $property,
        TogglePropertyOperationalStatus $toggleStatus,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('manageOperationalStatusByOwner', $property);

        $target = PropertyOperationalStatus::from($request->string('status')->toString());
        $toggleStatus->execute($owner, $property, $target);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Property operational status set to %s.', $target->label()),
        ]);

        return to_route('owner.properties.show', $property)
            ->with('status', 'operational-status-updated');
    }

    public function startAmendment(
        Request $request,
        Property $property,
        StartPropertyAmendment $startAmendment,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('startAmendmentByOwner', $property);

        $amendment = $startAmendment->execute($owner, $property);

        Inertia::flash('toast', [
            'type' => 'info',
            'message' => sprintf('Re-Verification Amendment %s started. Your approved snapshot stays preserved.', $amendment->application_number),
        ]);

        return to_route('owner.properties.edit', $property)
            ->with('status', 'amendment-started');
    }

    public function cancelAmendment(
        Request $request,
        Property $property,
        CancelPropertyAmendment $cancelAmendment,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);

        $cancelAmendment->execute($owner, $property);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Amendment cancelled cleanly and previous approved snapshot restored.'),
        ]);

        return to_route('owner.properties.show', $property)
            ->with('status', 'amendment-cancelled');
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
