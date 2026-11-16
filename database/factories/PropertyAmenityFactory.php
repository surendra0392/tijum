<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\PropertyAmenity;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PropertyAmenity>
 */
class PropertyAmenityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'property_id' => Property::factory(),
            'amenity_id' => Amenity::factory(),
            'assignment_group_id' => (string) Str::ulid(),
            'parent_property_amenity_id' => null,
            'superseded_by_property_amenity_id' => null,
            'assignment_reference' => 'TPA-'.strtoupper((string) fake()->unique()->bothify('####??##')),
            'availability' => AmenityAvailability::Included,
            'status' => AmenityVerificationStatus::Draft,
            'revision_number' => 1,
            'is_current' => true,
            'is_customer_visible' => true,
            'details' => null,
            'declaration_version' => null,
            'declaration_accepted_at' => null,
            'submitted_at' => null,
            'under_review_at' => null,
            'reviewed_at' => null,
            'approved_at' => null,
            'assigned_admin_id' => null,
            'reviewed_by_admin_id' => null,
            'requested_information' => null,
            'decision_reason' => null,
            'internal_reviewer_notes' => null,
            'approved_snapshot' => null,
        ];
    }
}
