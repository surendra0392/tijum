<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Owner\Amenities\SavePropertyAmenityAssignment;
use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAmenity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OwnerAmenityController extends ApiController
{
    /**
     * List current amenity assignments and the amenity catalog.
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
            ->with([
                'currentAmenityAssignments.amenity.category',
            ])
            ->first();

        if ($property === null) {
            return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $assigned = $property->currentAmenityAssignments
            ->map(static fn (PropertyAmenity $pa): array => [
                'id' => $pa->id,
                'amenity_id' => $pa->amenity_id,
                'name' => $pa->amenity?->name,
                'code' => $pa->amenity?->code,
                'category' => $pa->amenity?->category?->name,
                'icon_key' => $pa->amenity?->icon_key,
                'availability' => $pa->availability->value,
                'status' => $pa->status->value,
                'is_current' => (bool) $pa->is_current,
                'is_customer_visible' => (bool) $pa->is_customer_visible,
                'details' => $pa->details,
            ])->values()->all();

        $catalogue = AmenityCategory::query()
            ->active()
            ->ordered()
            ->with(['activeAmenities' => fn ($q) => $q->ordered()->with('category')])
            ->get()
            ->map(static fn (AmenityCategory $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'amenities' => $category->activeAmenities->map(static fn (Amenity $a): array => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'code' => $a->code,
                    'icon_key' => $a->icon_key,
                ])->values()->all(),
            ])->values()->all();

        return $this->success([
            'assigned' => $assigned,
            'catalogue' => $catalogue,
        ], 'Property amenities retrieved successfully.');
    }

    /**
     * Assign or update an amenity on the property.
     */
    public function store(
        Request $request,
        int|string $id,
        SavePropertyAmenityAssignment $saveAction
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
            'amenity_id' => ['required', 'integer'],
            'availability' => ['nullable', 'string', Rule::in(AmenityAvailability::values())],
            'details' => ['nullable', 'string', 'max:500'],
        ]);

        if (empty($validated['availability'])) {
            $validated['availability'] = AmenityAvailability::Included->value;
        }

        try {
            $assignment = $saveAction->execute($owner, $property, $validated);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $assignment->id,
            'amenity_id' => $assignment->amenity_id,
            'availability' => $assignment->availability->value,
            'status' => $assignment->status->value,
        ], 'Amenity assigned to property successfully.', 201);
    }

    /**
     * Remove or deactivate an amenity assignment from the property.
     */
    public function destroy(Request $request, int|string $id, int $amenityAssignmentId): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        if (! $owner->canPublishProperties()) {
            return $this->error(
                'Your partner account must be verified and active with a confirmed email address to modify property amenities.',
                'FORBIDDEN',
                403,
            );
        }

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

        $assignment = PropertyAmenity::query()
            ->where('property_id', $property->id)
            ->where('id', $amenityAssignmentId)
            ->first();

        if ($assignment === null) {
            return $this->error('Amenity assignment not found.', 'NOT_FOUND', 404);
        }

        $assignment->forceFill([
            'is_current' => false,
            'status' => AmenityVerificationStatus::Inactive,
        ])->save();

        return $this->success(null, 'Amenity assignment removed successfully.');
    }
}
