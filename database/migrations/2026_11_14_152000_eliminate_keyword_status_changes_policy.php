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
     * Eliminates keyword-only status changes and restores workflow integrity:
     * - Property classification and property moderation status are two distinct decisions.
     * - Never automatically suspend, reject, or move a property to draft solely due to commercial keywords in its name or description.
     * - Preserves legitimate canonical category assignments without altering moderation status.
     * - Restores active status for canonical properties that have approval records (approved_at or admin approval) that may have been affected by previous keyword sweeps.
     * - Ensures moderation remains strictly governed by the formal PropertyVerificationApplication workflow and human administrator review.
     * - Leaves historical reservation records and category snapshots 100% untouched.
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

        // If any canonical category property was modified solely due to keyword sweeps
        // in previous migrations without an explicit suspended_reason, and has approval history
        // (approved_at is not null or approved_by_admin_id is not null), restore its active status.
        DB::table('properties')
            ->whereIn('property_category_id', $canonicalCategoryIds)
            ->whereIn('status', [PropertyOperationalStatus::Suspended->value, PropertyOperationalStatus::Draft->value])
            ->where(function ($query) {
                $query->whereNotNull('approved_at')
                    ->orWhereNotNull('approved_by_admin_id');
            })
            ->whereNull('suspended_reason')
            ->update([
                'status' => PropertyOperationalStatus::Active->value,
                'is_verified' => true,
                'booking_eligible' => true,
                'updated_at' => now(),
            ]);

        // Explicit rule: No automated status modifications are performed on unverified properties
        // based on text keywords. Their onboarding and verification status remains strictly governed
        // by the formal PropertyVerificationApplication lifecycle.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only safety migration
    }
};
