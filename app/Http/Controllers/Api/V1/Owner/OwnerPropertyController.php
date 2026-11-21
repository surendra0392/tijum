<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\Properties\CreateProperty;
use App\Actions\Owner\Properties\SubmitPropertyVerificationApplication;
use App\Actions\Owner\Properties\UpdatePropertyDetails;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\PropertyDetailResource;
use App\Models\Amenity;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Services\PropertyVerificationChecklist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnerPropertyController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $properties = Property::query()
            ->where('owner_id', $owner->id)
            ->with(['city', 'category', 'roomTypes', 'media', 'ratingSummary', 'activeVerificationApplication'])
            ->latest('id')
            ->paginate(15);

        return $this->success(
            PropertyDetailResource::collection($properties->items()),
            'Partner properties retrieved',
            200,
            [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'total' => $properties->total(),
            ]
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('id', $id)
            ->where('owner_id', $owner->id)
            ->with([
                'city',
                'category',
                'roomTypes',
                'media',
                'ratingSummary',
                'activeVerificationApplication',
                'currentAmenityAssignments.amenity.category',
            ])
            ->first();

        if ($property === null) {
            return $this->error('Property not found or does not belong to your partner account.', 'NOT_FOUND', 404);
        }

        return $this->success(new PropertyDetailResource($property));
    }

    public function store(Request $request, CreateProperty $createProperty): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category_id' => ['nullable'],
            'category' => ['nullable'],
            'property_category_id' => ['nullable'],
            'city_id' => ['required', 'integer'],
            'description' => ['required', 'string', 'max:5000'],
            'contact_person_name' => ['required', 'string', 'max:100'],
            'contact_phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'contact_email' => ['nullable', 'email', 'max:150'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'locality' => ['required', 'string', 'max:100'],
            'landmark' => ['nullable', 'string', 'max:150'],
            'postal_code' => ['required', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'ownership_arrangement' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        try {
            $property = $createProperty->execute($owner, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $property->load(['city', 'category', 'roomTypes', 'media', 'ratingSummary', 'activeVerificationApplication']);

        return $this->success(
            new PropertyDetailResource($property),
            'Property draft created successfully.',
            201
        );
    }

    public function update(Request $request, int $id, UpdatePropertyDetails $updateProperty): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('id', $id)
            ->where('owner_id', $owner->id)
            ->first();

        if ($property === null) {
            return $this->error('Property not found or unauthorized.', 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'category_id' => ['nullable'],
            'category' => ['nullable'],
            'property_category_id' => ['nullable'],
            'city_id' => ['required', 'integer'],
            'description' => ['required', 'string', 'max:5000'],
            'contact_person_name' => ['required', 'string', 'max:100'],
            'contact_phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'contact_email' => ['nullable', 'email', 'max:150'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'locality' => ['required', 'string', 'max:100'],
            'landmark' => ['nullable', 'string', 'max:150'],
            'postal_code' => ['required', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'ownership_arrangement' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        try {
            $property = $updateProperty->execute($owner, $property, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        $property->load(['city', 'category', 'roomTypes', 'media', 'ratingSummary', 'activeVerificationApplication']);

        return $this->success(
            new PropertyDetailResource($property),
            'Property details updated successfully.'
        );
    }

    public function submitVerification(
        Request $request,
        int $id,
        SubmitPropertyVerificationApplication $submitAction
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('id', $id)
            ->where('owner_id', $owner->id)
            ->first();

        if ($property === null) {
            return $this->error('Property not found or unauthorized.', 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'declaration_accepted' => ['required', 'boolean'],
        ]);

        try {
            $application = $submitAction->execute($owner, $property, (bool) $validated['declaration_accepted']);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'application_id' => $application->id,
            'status' => $application->status->value,
            'status_label' => $application->status->label(),
            'revision_number' => $application->revision_number,
            'submitted_at' => $application->submitted_at?->toIso8601String(),
        ], 'Property submitted for verification review successfully.');
    }

    public function verificationStatus(Request $request, int $id, PropertyVerificationChecklist $checklist): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $property = Property::query()
            ->where('id', $id)
            ->where('owner_id', $owner->id)
            ->with(['city', 'category', 'roomTypes', 'rooms', 'media', 'activeVerificationApplication'])
            ->first();

        if ($property === null) {
            return $this->error('Property not found or unauthorized.', 'NOT_FOUND', 404);
        }

        $application = $property->activeVerificationApplication ?? $property->latestVerificationApplication;
        $evaluation = $checklist->evaluate($property, $application);

        return $this->success([
            'property_id' => $property->id,
            'property_reference' => $property->property_reference,
            'status' => $property->status->value,
            'is_verified' => (bool) $property->is_verified,
            'booking_eligible' => (bool) $property->booking_eligible,
            'application' => $application ? [
                'id' => $application->id,
                'status' => $application->status->value,
                'status_label' => $application->status->label(),
                'is_editable' => $application->status->isEditableByOwner(),
                'revision_number' => $application->revision_number,
                'submitted_at' => $application->submitted_at?->toIso8601String(),
                'decision_reason' => $application->decision_reason,
                'requested_information' => $application->requested_information,
                'requested_changes' => $application->requested_changes,
            ] : null,
            'evaluation' => $evaluation,
        ], 'Property verification evaluation retrieved.');
    }

    public function referenceData(Request $request): JsonResponse
    {
        $cities = City::query()->active()->orderBy('name')->get(['id', 'name', 'slug', 'state', 'country_code']);
        $categories = PropertyCategory::query()->active()->orderBy('sort_order')->get(['id', 'name', 'slug', 'code', 'description']);
        $amenities = Amenity::query()->active()->with('category')->orderBy('display_order')->get();

        return $this->success([
            'cities' => $cities,
            'categories' => $categories,
            'canonical_categories' => [
                ['slug' => 'hostels-pg', 'name' => 'Hostels & PG'],
                ['slug' => 'homestays', 'name' => 'Homestays'],
                ['slug' => 'co-living', 'name' => 'Co-Living'],
            ],
            'room_type_modes' => array_map(
                static fn (PropertyRoomTypeMode $m): array => ['value' => $m->value, 'label' => $m->label()],
                PropertyRoomTypeMode::cases()
            ),
            'gender_policies' => array_map(
                static fn (PropertyGenderPolicy $p): array => ['value' => $p->value, 'label' => $p->label()],
                PropertyGenderPolicy::cases()
            ),
            'guest_compositions' => array_map(
                static fn (PropertyGuestComposition $c): array => ['value' => $c->value, 'label' => $c->label()],
                PropertyGuestComposition::cases()
            ),
            'room_operational_statuses' => array_map(
                static fn (PropertyRoomStatus $s): array => ['value' => $s->value, 'label' => $s->label()],
                PropertyRoomStatus::cases()
            ),
            'block_scopes' => array_map(
                static fn (PropertyAvailabilityBlockScope $s): array => ['value' => $s->value, 'label' => $s->label()],
                PropertyAvailabilityBlockScope::cases()
            ),
            'block_types' => array_map(
                static fn (PropertyAvailabilityBlockType $t): array => ['value' => $t->value, 'label' => $t->label()],
                PropertyAvailabilityBlockType::cases()
            ),
            'amenities' => $amenities->map(static fn (Amenity $a): array => [
                'id' => $a->id,
                'name' => $a->name,
                'code' => $a->code,
                'category' => $a->category?->name,
                'icon_key' => $a->icon_key,
            ]),
        ], 'Owner reference data retrieved.');
    }
}
