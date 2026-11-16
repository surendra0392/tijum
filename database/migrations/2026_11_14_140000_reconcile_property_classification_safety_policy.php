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
     * Corrects and reconciles property classification safety policy:
     * - Prevents false-positive suspensions based solely on text keyword matching.
     * - Preserves valid canonical category assignments for verified properties.
     * - Ensures genuinely unverified properties with commercial keywords remain in
     *   draft / review workflow ('draft', is_verified=false, booking_eligible=false)
     *   rather than punitive 'suspended' status.
     * - Historical reservations and category snapshots are never modified.
     */
    public function up(): void
    {
        if (! Schema::hasTable('properties') || ! Schema::hasTable('property_categories')) {
            return;
        }

        $canonicalCategoryIds = DB::table('property_categories')
            ->whereIn('slug', [
                PropertyCategory::SLUG_HOSTELS_PG,
                PropertyCategory::SLUG_HOMESTAYS,
                PropertyCategory::SLUG_CO_LIVING,
            ])
            ->pluck('id')
            ->all();

        if (empty($canonicalCategoryIds)) {
            return;
        }

        // 1. If any property was suspended solely due to keywords but was previously
        // approved by an administrator into a canonical category, restore its verified active status.
        DB::table('properties')
            ->whereIn('property_category_id', $canonicalCategoryIds)
            ->where('status', PropertyOperationalStatus::Suspended->value)
            ->whereNotNull('approved_by_admin_id')
            ->whereNotNull('approved_at')
            ->whereNull('suspended_reason')
            ->update([
                'status' => PropertyOperationalStatus::Active->value,
                'is_verified' => true,
                'booking_eligible' => true,
                'updated_at' => now(),
            ]);

        // 2. For unverified properties with commercial keywords that do not have admin approval,
        // ensure they are held in the standard onboarding review state ('draft') rather than
        // being labeled with the punitive 'suspended' operational status.
        $ambiguousKeywords = ['hotel', 'lodge', 'guest house', 'guesthouse', 'motel', 'resort'];
        $unverifiedProperties = DB::table('properties')
            ->whereNull('approved_by_admin_id')
            ->where('status', PropertyOperationalStatus::Suspended->value)
            ->whereNull('suspended_reason')
            ->get();

        foreach ($unverifiedProperties as $property) {
            $nameLower = strtolower($property->name ?? '');
            foreach ($ambiguousKeywords as $keyword) {
                if (str_contains($nameLower, $keyword)) {
                    DB::table('properties')
                        ->where('id', $property->id)
                        ->update([
                            'status' => PropertyOperationalStatus::Draft->value,
                            'is_verified' => false,
                            'booking_eligible' => false,
                            'updated_at' => now(),
                        ]);
                    break;
                }
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
