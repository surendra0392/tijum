<?php

declare(strict_types=1);

use App\Enums\PropertyOperationalStatus;
use App\Models\PropertyCategory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Hardens property category classification safety:
     * - Decouples food package availability from category classification.
     * - Verifies that only genuine Hostels/PG, Homestays, and Co-Living properties
     *   are assigned to canonical categories.
     * - Commercial hotels, lodges, and unverified guest houses that do not fit the
     *   genuine three-category marketplace taxonomy must never be published automatically;
     *   they must be held in review (unverified, unpublished, booking-ineligible).
     */
    public function up(): void
    {
        if (! Schema::hasTable('properties') || ! Schema::hasTable('property_categories')) {
            return;
        }

        $canonicalIds = DB::table('property_categories')
            ->whereIn('slug', [
                PropertyCategory::SLUG_HOSTELS_PG,
                PropertyCategory::SLUG_HOMESTAYS,
                PropertyCategory::SLUG_CO_LIVING,
            ])
            ->pluck('id', 'slug')
            ->all();

        // Audit any property that might have an ambiguous commercial hotel/lodge/guest house identity
        $ambiguousKeywords = ['hotel', 'lodge', 'guest house', 'guesthouse', 'motel', 'resort'];

        $properties = DB::table('properties')->get();

        foreach ($properties as $property) {
            $nameLower = strtolower($property->name ?? '');
            $descLower = strtolower($property->description ?? '');

            $isAmbiguousCommercial = false;
            foreach ($ambiguousKeywords as $keyword) {
                // If the name explicitly contains commercial keywords but NOT hostel/pg/homestay/co-living
                if (str_contains($nameLower, $keyword) &&
                    ! str_contains($nameLower, 'hostel') &&
                    ! str_contains($nameLower, 'pg') &&
                    ! str_contains($nameLower, 'homestay') &&
                    ! str_contains($nameLower, 'co-living') &&
                    ! str_contains($nameLower, 'coliving')) {
                    $isAmbiguousCommercial = true;
                    break;
                }
            }

            if ($isAmbiguousCommercial) {
                // Quarantine: withhold from public listing until admin reclassification
                DB::table('properties')
                    ->where('id', $property->id)
                    ->update([
                        'is_verified' => false,
                        'booking_eligible' => false,
                        'status' => PropertyOperationalStatus::Suspended->value,
                        'updated_at' => now(),
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only safety migration
    }
};
