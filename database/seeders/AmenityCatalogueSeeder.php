<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AmenityApplicabilityScope;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use Illuminate\Database\Seeder;

class AmenityCatalogueSeeder extends Seeder
{
    /**
     * Seed the central amenity catalogue idempotently.
     *
     * Catalogue is master/reference data only: AC/Non-AC is excluded (room-type attribute),
     * and property-level food declaration is managed on the property (not as an amenity).
     */
    public function run(): void
    {
        $categories = [
            ['code' => 'ESSENTIALS', 'name' => 'Essentials', 'slug' => 'essentials', 'display_order' => 10],
            ['code' => 'CONNECTIVITY', 'name' => 'Connectivity', 'slug' => 'connectivity', 'display_order' => 20],
            ['code' => 'COMFORT_COOLING', 'name' => 'Comfort & Cooling', 'slug' => 'comfort-cooling', 'display_order' => 30],
            ['code' => 'BATHROOM_HYGIENE', 'name' => 'Bathroom & Hygiene', 'slug' => 'bathroom-hygiene', 'display_order' => 40],
            ['code' => 'SAFETY_SECURITY', 'name' => 'Safety & Security', 'slug' => 'safety-security', 'display_order' => 50],
            ['code' => 'HOUSEKEEPING_LAUNDRY', 'name' => 'Housekeeping & Laundry', 'slug' => 'housekeeping-laundry', 'display_order' => 60],
            ['code' => 'PARKING_TRANSPORT', 'name' => 'Parking & Transport', 'slug' => 'parking-transport', 'display_order' => 70],
            ['code' => 'WORK_STUDY', 'name' => 'Work & Study', 'slug' => 'work-study', 'display_order' => 80],
            ['code' => 'ACCESSIBILITY', 'name' => 'Accessibility', 'slug' => 'accessibility', 'display_order' => 90],
            ['code' => 'LEISURE_COMMON', 'name' => 'Leisure & Common Areas', 'slug' => 'leisure-common', 'display_order' => 100],
        ];

        $categoryIds = [];
        foreach ($categories as $category) {
            $record = AmenityCategory::query()->updateOrCreate(
                ['code' => $category['code']],
                [
                    'name' => $category['name'],
                    'slug' => $category['slug'],
                    'description' => null,
                    'display_order' => $category['display_order'],
                    'is_active' => true,
                ],
            );
            $categoryIds[$category['code']] = $record->id;
        }

        $amenities = [
            $this->item('ESSENTIALS', 'POWER_BACKUP', 'Power Backup', 'power-backup', 'zap', AmenityApplicabilityScope::Property),
            $this->item('ESSENTIALS', 'DRINKING_WATER', 'Drinking Water', 'drinking-water', 'droplets', AmenityApplicabilityScope::Both),
            $this->item('ESSENTIALS', 'LIFT', 'Lift / Elevator', 'lift-elevator', 'arrow-up-down', AmenityApplicabilityScope::Property),

            $this->item('CONNECTIVITY', 'WIFI', 'Wi-Fi', 'wifi', 'wifi', AmenityApplicabilityScope::Both),
            $this->item('CONNECTIVITY', 'TV', 'Television', 'television', 'tv', AmenityApplicabilityScope::RoomType),

            $this->item('COMFORT_COOLING', 'HOT_WATER', 'Hot Water (Geyser)', 'hot-water', 'flame', AmenityApplicabilityScope::Both),
            $this->item('COMFORT_COOLING', 'CEILING_FAN', 'Ceiling Fan', 'ceiling-fan', 'fan', AmenityApplicabilityScope::RoomType),
            $this->item('COMFORT_COOLING', 'WARDROBE', 'Wardrobe / Storage', 'wardrobe-storage', 'cabinet', AmenityApplicabilityScope::RoomType),
            $this->item('COMFORT_COOLING', 'STUDY_TABLE', 'Study Table', 'study-table', 'table', AmenityApplicabilityScope::RoomType),

            $this->item('BATHROOM_HYGIENE', 'ATTACHED_BATHROOM', 'Attached Bathroom', 'attached-bathroom', 'bath', AmenityApplicabilityScope::RoomType),
            $this->item('BATHROOM_HYGIENE', 'WESTERN_TOILET', 'Western Toilet', 'western-toilet', 'toilet', AmenityApplicabilityScope::RoomType),

            $this->item('SAFETY_SECURITY', 'CCTV', 'CCTV Surveillance', 'cctv', 'cctv', AmenityApplicabilityScope::Property),
            $this->item('SAFETY_SECURITY', 'SECURITY_GUARD', 'Security Guard', 'security-guard', 'shield', AmenityApplicabilityScope::Property),
            $this->item('SAFETY_SECURITY', 'FIRE_SAFETY', 'Fire Safety Equipment', 'fire-safety', 'flame-kindling', AmenityApplicabilityScope::Property),
            $this->item('SAFETY_SECURITY', 'FIRST_AID', 'First Aid Kit', 'first-aid', 'heart-pulse', AmenityApplicabilityScope::Property),

            $this->item('HOUSEKEEPING_LAUNDRY', 'HOUSEKEEPING', 'Housekeeping', 'housekeeping', 'sparkles', AmenityApplicabilityScope::Both),
            $this->item('HOUSEKEEPING_LAUNDRY', 'LAUNDRY', 'Laundry Service', 'laundry-service', 'washing-machine', AmenityApplicabilityScope::Property),
            $this->item('HOUSEKEEPING_LAUNDRY', 'IRONING', 'Ironing Service', 'ironing-service', 'shirt', AmenityApplicabilityScope::Property),

            $this->item('PARKING_TRANSPORT', 'PARKING', 'Parking', 'parking', 'parking-circle', AmenityApplicabilityScope::Property),
            $this->item('PARKING_TRANSPORT', 'TWO_WHEELER_PARKING', 'Two-wheeler Parking', 'two-wheeler-parking', 'bike', AmenityApplicabilityScope::Property),

            $this->item('WORK_STUDY', 'READING_ROOM', 'Reading / Quiet Room', 'reading-room', 'book-open', AmenityApplicabilityScope::Property),

            $this->item('ACCESSIBILITY', 'WHEELCHAIR_ACCESS', 'Wheelchair Access', 'wheelchair-access', 'accessibility', AmenityApplicabilityScope::Property),

            $this->item('LEISURE_COMMON', 'COMMON_AREA', 'Common Area / Lounge', 'common-area-lounge', 'sofa', AmenityApplicabilityScope::Property),
            $this->item('LEISURE_COMMON', 'GYM', 'Gym / Fitness Area', 'gym-fitness', 'dumbbell', AmenityApplicabilityScope::Property),
        ];

        foreach ($amenities as $index => $amenity) {
            $categoryId = $categoryIds[$amenity['category_code']] ?? null;
            if ($categoryId === null) {
                continue;
            }

            Amenity::query()->updateOrCreate(
                ['code' => $amenity['code']],
                [
                    'amenity_category_id' => $categoryId,
                    'name' => $amenity['name'],
                    'slug' => $amenity['slug'],
                    'description' => $amenity['description'],
                    'applicability_scope' => $amenity['applicability_scope'],
                    'icon_key' => $amenity['icon_key'],
                    'is_customer_visible' => true,
                    'requires_review' => true,
                    'display_order' => ($index + 1) * 10,
                    'is_active' => true,
                ],
            );
        }
    }

    /**
     * @return array{
     *     category_code: string,
     *     code: string,
     *     name: string,
     *     slug: string,
     *     description: ?string,
     *     icon_key: ?string,
     *     applicability_scope: AmenityApplicabilityScope,
     * }
     */
    private function item(
        string $categoryCode,
        string $code,
        string $name,
        string $slug,
        ?string $iconKey,
        AmenityApplicabilityScope $scope,
        ?string $description = null,
    ): array {
        return [
            'category_code' => $categoryCode,
            'code' => $code,
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
            'icon_key' => $iconKey,
            'applicability_scope' => $scope,
        ];
    }
}
