<?php

declare(strict_types=1);

namespace App\Actions\Owner\Amenities;

use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Models\Amenity;
use App\Models\AmenityAssignmentEvent;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAmenity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SavePropertyAmenityAssignment
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Owner $owner, Property $property, array $data, ?PropertyAmenity $assignment = null): PropertyAmenity
    {
        return DB::transaction(function () use ($owner, $property, $data, $assignment): PropertyAmenity {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages(['amenity' => 'You are not authorised to manage amenities for this property.']);
            }

            $amenityId = (int) ($data['amenity_id'] ?? 0);
            $amenity = Amenity::query()->active()->with('category')->find($amenityId);
            if (! $amenity instanceof Amenity || ! $amenity->applicability_scope->appliesToProperty()) {
                throw ValidationException::withMessages(['amenity_id' => 'Select a valid, active property amenity.']);
            }

            $target = $assignment;
            if ($target instanceof PropertyAmenity) {
                $target = PropertyAmenity::query()->whereKey($target->id)->lockForUpdate()->firstOrFail();
                if ($target->property_id !== $lockedProperty->id) {
                    throw ValidationException::withMessages(['amenity' => 'This amenity assignment does not belong to the property.']);
                }
                if (! $target->status->isEditableByOwner()) {
                    throw ValidationException::withMessages(['amenity' => 'This amenity assignment cannot be edited in its current state.']);
                }
            } else {
                $existingCurrent = PropertyAmenity::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('amenity_id', $amenity->id)
                    ->where('is_current', true)
                    ->lockForUpdate()
                    ->first();

                if ($existingCurrent instanceof PropertyAmenity) {
                    $target = $existingCurrent;
                    if (! $target->status->isEditableByOwner()) {
                        throw ValidationException::withMessages(['amenity_id' => 'A revision or review is already in progress for this property amenity.']);
                    }
                }
            }

            $availability = (string) ($data['availability'] ?? AmenityAvailability::Included->value);
            if (! in_array($availability, AmenityAvailability::values(), true)) {
                throw ValidationException::withMessages(['availability' => 'Select a valid availability option.']);
            }

            $isNew = false;
            $eventType = AmenityAssignmentEventType::Updated;
            $previousStatus = $target?->status?->value;

            if (! $target instanceof PropertyAmenity) {
                $isNew = true;
                $eventType = AmenityAssignmentEventType::Created;
                $target = new PropertyAmenity;
                $target->forceFill([
                    'property_id' => $lockedProperty->id,
                    'amenity_id' => $amenity->id,
                    'assignment_group_id' => (string) Str::ulid(),
                    'parent_property_amenity_id' => null,
                    'superseded_by_property_amenity_id' => null,
                    'assignment_reference' => sprintf('TPA-%s-%s', now()->format('Y'), strtoupper(Str::random(6))),
                    'status' => AmenityVerificationStatus::Draft,
                    'revision_number' => 1,
                    'is_current' => true,
                ]);
            }

            $target->forceFill([
                'amenity_id' => $amenity->id,
                'availability' => $availability,
                'is_customer_visible' => array_key_exists('is_customer_visible', $data) ? (bool) $data['is_customer_visible'] : $amenity->is_customer_visible,
                'details' => $this->nullableString($data['details'] ?? null),
                'requested_information' => null,
                'decision_reason' => null,
            ])->save();

            AmenityAssignmentEvent::record(
                assignment: $target,
                eventType: $eventType,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previousStatus,
                newStatus: $target->status->value,
                notes: $isNew ? 'Property amenity assignment created.' : 'Property amenity assignment updated.',
            );

            return $target->fresh(['amenity.category']) ?? $target;
        });
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return trim($value);
    }
}
