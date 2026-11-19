<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Properties;

use App\Actions\Owner\Amenities\SavePropertyAmenityAssignment;
use App\Actions\Owner\Amenities\SavePropertyRoomTypeAmenityAssignment;
use App\Actions\Owner\Amenities\SubmitPropertyAmenityAssignment;
use App\Actions\Owner\Amenities\SubmitPropertyRoomTypeAmenityAssignment;
use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\Amenities\SavePropertyAmenityRequest;
use App\Http\Requests\Owner\Amenities\SavePropertyRoomTypeAmenityRequest;
use App\Http\Requests\Owner\Amenities\SubmitAmenityAssignmentRequest;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyRoomType;
use App\Models\PropertyRoomTypeAmenity;
use App\Services\PropertyAmenityReadiness;
use App\Support\PropertyPortalData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PropertyAmenityController extends Controller
{
    public function __construct(
        public readonly PropertyAmenityReadiness $readiness,
    ) {}

    public function index(Request $request, Property $property): Response
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);
        Gate::forUser($owner)->authorize('viewAnyByOwner', [PropertyAmenity::class, $property]);

        $property->load([
            'roomTypes' => fn ($q) => $q->orderBy('display_order')->orderBy('name'),
            'amenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.roomType',
        ]);

        $propertyAssignments = $property->amenityAssignments
            ->where('is_current', true)
            ->sortByDesc('id')
            ->values()
            ->map(static fn (PropertyAmenity $a): array => $a->toSummaryArray())
            ->all();

        $roomTypeAssignments = $property->roomTypeAmenityAssignments
            ->where('is_current', true)
            ->sortByDesc('id')
            ->values()
            ->map(static fn (PropertyRoomTypeAmenity $a): array => $a->toSummaryArray())
            ->all();

        $catalogue = AmenityCategory::query()
            ->active()
            ->ordered()
            ->with(['activeAmenities' => fn ($q) => $q->ordered()->with('category')])
            ->get()
            ->map(static function (AmenityCategory $category): array {
                return [
                    ...$category->toOptionArray(),
                    'amenities' => $category->activeAmenities->map(static fn (Amenity $a): array => $a->toAdminArray())->values()->all(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('owner/properties/amenities/index', [
            'property' => PropertyPortalData::ownerSummary($property),
            'roomTypes' => $property->roomTypes->map(static fn (PropertyRoomType $rt): array => [
                'id' => $rt->id,
                'name' => $rt->name,
                'is_active' => $rt->is_active,
            ])->values()->all(),
            'catalogue' => $catalogue,
            'propertyAssignments' => $propertyAssignments,
            'roomTypeAssignments' => $roomTypeAssignments,
            'evaluation' => $this->readiness->evaluate($property),
            'options' => [
                'availability' => array_map(
                    static fn (AmenityAvailability $a): array => ['value' => $a->value, 'label' => $a->label()],
                    AmenityAvailability::cases(),
                ),
                'statuses' => array_map(
                    static fn (AmenityVerificationStatus $s): array => ['value' => $s->value, 'label' => $s->label()],
                    AmenityVerificationStatus::cases(),
                ),
            ],
            'canManage' => Gate::forUser($owner)->allows('createByOwner', [PropertyAmenity::class, $property]),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function storeProperty(
        SavePropertyAmenityRequest $request,
        Property $property,
        SavePropertyAmenityAssignment $save,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('createByOwner', [PropertyAmenity::class, $property]);

        $save->execute($owner, $property, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Property amenity saved as draft.')]);

        return back()->with('status', 'property-amenity-saved');
    }

    public function updateProperty(
        SavePropertyAmenityRequest $request,
        Property $property,
        PropertyAmenity $amenity,
        SavePropertyAmenityAssignment $save,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->authorizePropertyAssignment($owner, $property, $amenity);
        Gate::forUser($owner)->authorize('updateByOwner', $amenity);

        $save->execute($owner, $property, $request->validated(), $amenity);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Property amenity updated.')]);

        return back()->with('status', 'property-amenity-updated');
    }

    public function submitProperty(
        SubmitAmenityAssignmentRequest $request,
        Property $property,
        PropertyAmenity $amenity,
        SubmitPropertyAmenityAssignment $submit,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->authorizePropertyAssignment($owner, $property, $amenity);
        Gate::forUser($owner)->authorize('submitByOwner', $amenity);

        $submit->execute($owner, $property, $amenity, $request->boolean('declaration_accepted'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Property amenity submitted for verification.')]);

        return back()->with('status', 'property-amenity-submitted');
    }

    public function storeRoomType(
        SavePropertyRoomTypeAmenityRequest $request,
        Property $property,
        SavePropertyRoomTypeAmenityAssignment $save,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('createByOwner', [PropertyRoomTypeAmenity::class, $property]);

        $save->execute($owner, $property, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Room-type amenity saved as draft.')]);

        return back()->with('status', 'room-type-amenity-saved');
    }

    public function updateRoomType(
        SavePropertyRoomTypeAmenityRequest $request,
        Property $property,
        PropertyRoomTypeAmenity $amenity,
        SavePropertyRoomTypeAmenityAssignment $save,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->authorizeRoomTypeAssignment($owner, $property, $amenity);
        Gate::forUser($owner)->authorize('updateByOwner', $amenity);

        $save->execute($owner, $property, $request->validated(), $amenity);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Room-type amenity updated.')]);

        return back()->with('status', 'room-type-amenity-updated');
    }

    public function submitRoomType(
        SubmitAmenityAssignmentRequest $request,
        Property $property,
        PropertyRoomTypeAmenity $amenity,
        SubmitPropertyRoomTypeAmenityAssignment $submit,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        $this->authorizeRoomTypeAssignment($owner, $property, $amenity);
        Gate::forUser($owner)->authorize('submitByOwner', $amenity);

        $submit->execute($owner, $property, $amenity, $request->boolean('declaration_accepted'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Room-type amenity submitted for verification.')]);

        return back()->with('status', 'room-type-amenity-submitted');
    }

    public function sync(Request $request, Property $property): RedirectResponse
    {
        $owner = $this->resolveOwner($request);
        Gate::forUser($owner)->authorize('viewByOwner', $property);
        Gate::forUser($owner)->authorize('createByOwner', [PropertyAmenity::class, $property]);

        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:property,room_type'],
            'amenity_ids' => ['present', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
            'property_room_type_id' => ['nullable', 'integer'],
            'apply_to_all_room_types' => ['sometimes', 'boolean'],
        ]);

        $selectedIds = array_values(array_unique(array_map(
            static fn (mixed $id): int => (int) $id,
            $validated['amenity_ids'],
        )));

        if ($validated['scope'] === 'property') {
            $validAmenityIds = Amenity::query()
                ->active()
                ->whereIn('id', $selectedIds)
                ->get()
                ->filter(static fn (Amenity $amenity): bool => $amenity->applicability_scope->appliesToProperty())
                ->pluck('id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->values()
                ->all();

            DB::transaction(function () use ($property, $validAmenityIds): void {
                $currentAssignments = PropertyAmenity::query()
                    ->where('property_id', $property->id)
                    ->where('is_current', true)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('amenity_id');

                $now = now();

                foreach ($currentAssignments as $amenityId => $assignment) {
                    if (! in_array((int) $amenityId, $validAmenityIds, true)) {
                        $assignment->forceFill([
                            'is_current' => false,
                            'status' => AmenityVerificationStatus::Inactive,
                        ])->save();
                    }
                }

                foreach ($validAmenityIds as $amenityId) {
                    $existing = $currentAssignments->get($amenityId);

                    if ($existing instanceof PropertyAmenity) {
                        $existing->forceFill([
                            'availability' => AmenityAvailability::Included,
                            'status' => AmenityVerificationStatus::Approved,
                            'is_customer_visible' => true,
                            'is_current' => true,
                            'approved_at' => $existing->approved_at ?? $now,
                        ])->save();
                    } else {
                        $assignment = new PropertyAmenity;
                        $assignment->forceFill([
                            'property_id' => $property->id,
                            'amenity_id' => $amenityId,
                            'assignment_group_id' => (string) Str::ulid(),
                            'parent_property_amenity_id' => null,
                            'superseded_by_property_amenity_id' => null,
                            'assignment_reference' => sprintf('TPA-%s-%s', $now->format('Y'), strtoupper(Str::random(6))),
                            'availability' => AmenityAvailability::Included,
                            'status' => AmenityVerificationStatus::Approved,
                            'revision_number' => 1,
                            'is_current' => true,
                            'is_customer_visible' => true,
                            'approved_at' => $now,
                        ])->save();
                    }
                }
            });

            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __('Property amenities updated.'),
            ]);

            return back()->with('status', 'property-amenities-synced');
        }

        $applyToAll = (bool) ($validated['apply_to_all_room_types'] ?? false);
        if ($applyToAll) {
            $targetRoomTypes = $property->roomTypes()->where('is_active', true)->get();
            if ($targetRoomTypes->isEmpty()) {
                $targetRoomTypes = $property->roomTypes()->get();
            }
            if ($targetRoomTypes->isEmpty()) {
                throw ValidationException::withMessages([
                    'property_room_type_id' => 'Add at least one room type before assigning room-type amenities.',
                ]);
            }
        } else {
            $roomTypeId = (int) ($validated['property_room_type_id'] ?? 0);
            $roomType = $property->roomTypes()->whereKey($roomTypeId)->first();
            if (! $roomType instanceof PropertyRoomType) {
                throw ValidationException::withMessages([
                    'property_room_type_id' => 'Select a valid room type for this property.',
                ]);
            }
            $targetRoomTypes = collect([$roomType]);
        }

        $validRoomAmenityIds = Amenity::query()
            ->active()
            ->whereIn('id', $selectedIds)
            ->get()
            ->filter(static fn (Amenity $amenity): bool => $amenity->applicability_scope->appliesToRoomType())
            ->pluck('id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->values()
            ->all();

        DB::transaction(function () use ($property, $targetRoomTypes, $validRoomAmenityIds): void {
            $now = now();

            foreach ($targetRoomTypes as $roomType) {
                $currentAssignments = PropertyRoomTypeAmenity::query()
                    ->where('property_id', $property->id)
                    ->where('property_room_type_id', $roomType->id)
                    ->where('is_current', true)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('amenity_id');

                foreach ($currentAssignments as $amenityId => $assignment) {
                    if (! in_array((int) $amenityId, $validRoomAmenityIds, true)) {
                        $assignment->forceFill([
                            'is_current' => false,
                            'status' => AmenityVerificationStatus::Inactive,
                        ])->save();
                    }
                }

                foreach ($validRoomAmenityIds as $amenityId) {
                    $existing = $currentAssignments->get($amenityId);

                    if ($existing instanceof PropertyRoomTypeAmenity) {
                        $existing->forceFill([
                            'availability' => AmenityAvailability::Included,
                            'status' => AmenityVerificationStatus::Approved,
                            'is_customer_visible' => true,
                            'is_current' => true,
                            'approved_at' => $existing->approved_at ?? $now,
                        ])->save();
                    } else {
                        $assignment = new PropertyRoomTypeAmenity;
                        $assignment->forceFill([
                            'property_id' => $property->id,
                            'property_room_type_id' => $roomType->id,
                            'amenity_id' => $amenityId,
                            'assignment_group_id' => (string) Str::ulid(),
                            'parent_property_room_type_amenity_id' => null,
                            'superseded_by_property_room_type_amenity_id' => null,
                            'assignment_reference' => sprintf('TRA-%s-%s', $now->format('Y'), strtoupper(Str::random(6))),
                            'availability' => AmenityAvailability::Included,
                            'status' => AmenityVerificationStatus::Approved,
                            'revision_number' => 1,
                            'is_current' => true,
                            'is_customer_visible' => true,
                            'approved_at' => $now,
                        ])->save();
                    }
                }
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $applyToAll
                ? __('Room-type amenities updated for all room types.')
                : __('Room-type amenities updated.'),
        ]);

        return back()->with('status', 'room-type-amenities-synced');
    }

    private function authorizePropertyAssignment(Owner $owner, Property $property, PropertyAmenity $assignment): void
    {
        if ($assignment->property_id !== $property->id) {
            abort(404);
        }
    }

    private function authorizeRoomTypeAssignment(Owner $owner, Property $property, PropertyRoomTypeAmenity $assignment): void
    {
        if ($assignment->property_id !== $property->id) {
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
