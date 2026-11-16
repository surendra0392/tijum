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
use Illuminate\Support\Facades\Gate;
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
            'roomTypes' => fn ($q) => $q->where('is_active', true)->orderBy('display_order')->orderBy('name'),
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
