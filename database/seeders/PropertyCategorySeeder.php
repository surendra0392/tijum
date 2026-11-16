<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AccommodationCategory;
use App\Models\PropertyCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PropertyCategorySeeder extends Seeder
{
    /**
     * The three canonical consolidated accommodation categories of TIJUM.
     *
     * @return list<array{
     *     name: string,
     *     slug: string,
     *     code: string,
     *     description: string,
     *     is_active: bool,
     *     sort_order: int
     * }>
     */
    public static function categories(): array
    {
        return [
            [
                'name' => AccommodationCategory::HostelsPg->label(),
                'slug' => AccommodationCategory::HostelsPg->value,
                'code' => AccommodationCategory::HostelsPg->code(),
                'description' => AccommodationCategory::HostelsPg->description(),
                'is_active' => true,
                'sort_order' => AccommodationCategory::HostelsPg->sortOrder(),
            ],
            [
                'name' => AccommodationCategory::Homestays->label(),
                'slug' => AccommodationCategory::Homestays->value,
                'code' => AccommodationCategory::Homestays->code(),
                'description' => AccommodationCategory::Homestays->description(),
                'is_active' => true,
                'sort_order' => AccommodationCategory::Homestays->sortOrder(),
            ],
            [
                'name' => AccommodationCategory::CoLiving->label(),
                'slug' => AccommodationCategory::CoLiving->value,
                'code' => AccommodationCategory::CoLiving->code(),
                'description' => AccommodationCategory::CoLiving->description(),
                'is_active' => true,
                'sort_order' => AccommodationCategory::CoLiving->sortOrder(),
            ],
        ];
    }

    public function run(): void
    {
        $now = now();

        $rows = array_map(
            static fn (array $category): array => [
                ...$category,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            self::categories(),
        );

        DB::table('property_categories')->upsert(
            $rows,
            ['slug'],
            ['name', 'code', 'description', 'is_active', 'sort_order', 'updated_at'],
        );

        // Fetch canonical category IDs
        $hostelsPgId = (int) DB::table('property_categories')->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id');
        $homestaysId = (int) DB::table('property_categories')->where('slug', PropertyCategory::SLUG_HOMESTAYS)->value('id');

        // Reconcile legacy categories if present
        $legacyHostelIds = DB::table('property_categories')
            ->whereIn('slug', ['independent-hostel', 'pg-accommodation', 'hostel', 'pg'])
            ->pluck('id')
            ->all();

        if ($legacyHostelIds !== [] && $hostelsPgId > 0) {
            DB::table('properties')
                ->whereIn('property_category_id', $legacyHostelIds)
                ->update(['property_category_id' => $hostelsPgId]);

            DB::table('property_categories')
                ->whereIn('id', $legacyHostelIds)
                ->delete();
        }

        $legacyHomestayIds = DB::table('property_categories')
            ->whereIn('slug', ['homestay'])
            ->pluck('id')
            ->all();

        if ($legacyHomestayIds !== [] && $homestaysId > 0) {
            DB::table('properties')
                ->whereIn('property_category_id', $legacyHomestayIds)
                ->update(['property_category_id' => $homestaysId]);

            DB::table('property_categories')
                ->whereIn('id', $legacyHomestayIds)
                ->delete();
        }
    }
}
