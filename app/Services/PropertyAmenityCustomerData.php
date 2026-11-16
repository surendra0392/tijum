<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AmenityAvailability;
use App\Enums\PropertyOperationalStatus;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyRoomTypeAmenity;

class PropertyAmenityCustomerData
{
    /**
     * Build a customer-safe amenity payload.
     *
     * Only approved/current, customer-visible assignments from an approved and
     * booking-eligible active property are exposed. Drafts, pending, rejected,
     * inactive, internal notes, and internal storage paths are omitted.
     * Scope separation is preserved (property vs room type); AC/Non-AC remains
     * a room-type attribute and is never represented as an amenity.
     *
     * @return array<string, mixed>|null
     */
    public function serialize(Property $property): ?array
    {
        $property->loadMissing([
            'category',
            'city',
            'roomTypes',
            'amenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.roomType',
        ]);

        if (! $property->booking_eligible
            || $property->status !== PropertyOperationalStatus::Active
            || ! $property->is_verified) {
            return null;
        }

        $propertyAmenities = $property->amenityAssignments
            ->filter(static function (PropertyAmenity $assignment): bool {
                if (! $assignment->isApprovedCurrent()) {
                    return false;
                }

                $amenity = $assignment->amenity;

                return $amenity !== null
                    && $amenity->is_active
                    && $amenity->is_customer_visible
                    && $assignment->is_customer_visible
                    && $assignment->availability !== AmenityAvailability::NotAvailable;
            })
            ->map(fn (PropertyAmenity $assignment): array => $this->serializePropertyAssignment($assignment))
            ->values()
            ->all();

        $roomTypeAmenities = [];
        foreach ($property->roomTypes as $roomType) {
            if (! $roomType->is_active) {
                continue;
            }

            $items = $property->roomTypeAmenityAssignments
                ->filter(static function (PropertyRoomTypeAmenity $assignment) use ($roomType): bool {
                    if ($assignment->property_room_type_id !== $roomType->id || ! $assignment->isApprovedCurrent()) {
                        return false;
                    }

                    $amenity = $assignment->amenity;

                    return $amenity !== null
                        && $amenity->is_active
                        && $amenity->is_customer_visible
                        && $assignment->is_customer_visible
                        && $assignment->availability !== AmenityAvailability::NotAvailable;
                })
                ->map(fn (PropertyRoomTypeAmenity $assignment): array => $this->serializeRoomTypeAssignment($assignment))
                ->values()
                ->all();

            if ($items === []) {
                continue;
            }

            $roomTypeAmenities[] = [
                'property_room_type_id' => $roomType->id,
                'name' => $roomType->name,
                'amenities' => $items,
            ];
        }

        return [
            'property' => [
                'property_reference' => $property->property_reference,
                'name' => $property->name,
                'slug' => $property->slug,
                'locality' => $property->locality,
                'state' => $property->state,
                'category_name' => $property->category?->name,
                'city_name' => $property->city?->name,
            ],
            'property_amenities' => $propertyAmenities,
            'room_type_amenities' => $roomTypeAmenities,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializePropertyAssignment(PropertyAmenity $assignment): array
    {
        $amenity = $assignment->amenity;

        return [
            'code' => $amenity->code,
            'name' => $amenity->name,
            'slug' => $amenity->slug,
            'description' => $amenity->description,
            'category' => $amenity->category ? [
                'code' => $amenity->category->code,
                'name' => $amenity->category->name,
                'slug' => $amenity->category->slug,
            ] : null,
            'icon_key' => $amenity->icon_key,
            'availability' => $assignment->availability->value,
            'availability_label' => $assignment->availability->label(),
            'details' => $assignment->details,
            'approved_at' => $assignment->approved_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRoomTypeAssignment(PropertyRoomTypeAmenity $assignment): array
    {
        $amenity = $assignment->amenity;

        return [
            'code' => $amenity->code,
            'name' => $amenity->name,
            'slug' => $amenity->slug,
            'description' => $amenity->description,
            'category' => $amenity->category ? [
                'code' => $amenity->category->code,
                'name' => $amenity->category->name,
                'slug' => $amenity->category->slug,
            ] : null,
            'icon_key' => $amenity->icon_key,
            'availability' => $assignment->availability->value,
            'availability_label' => $assignment->availability->label(),
            'details' => $assignment->details,
            'approved_at' => $assignment->approved_at?->toISOString(),
        ];
    }
}
