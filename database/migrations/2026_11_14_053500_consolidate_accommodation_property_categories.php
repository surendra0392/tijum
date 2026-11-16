<?php

declare(strict_types=1);

use App\Enums\AccommodationCategory;
use App\Models\PropertyCategory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Consolidates accommodation taxonomy into exactly three canonical categories:
     * 1. Hostels/PG (hostels-pg)
     * 2. Homestays (homestays)
     * 3. Co-Living (co-living)
     *
     * Remaps all existing properties, reservations snapshots, and verification application snapshots.
     */
    public function up(): void
    {
        if (! Schema::hasTable('property_categories')) {
            return;
        }

        $now = now();

        // 1. Ensure canonical categories exist or are upserted
        $canonicalSpecs = [
            [
                'name' => AccommodationCategory::HostelsPg->label(),
                'slug' => PropertyCategory::SLUG_HOSTELS_PG,
                'code' => PropertyCategory::SLUG_HOSTELS_PG,
                'description' => AccommodationCategory::HostelsPg->description(),
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => AccommodationCategory::Homestays->label(),
                'slug' => PropertyCategory::SLUG_HOMESTAYS,
                'code' => PropertyCategory::SLUG_HOMESTAYS,
                'description' => AccommodationCategory::Homestays->description(),
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => AccommodationCategory::CoLiving->label(),
                'slug' => PropertyCategory::SLUG_CO_LIVING,
                'code' => PropertyCategory::SLUG_CO_LIVING,
                'description' => AccommodationCategory::CoLiving->description(),
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($canonicalSpecs as $spec) {
            $existing = DB::table('property_categories')->where('slug', $spec['slug'])->first();
            if ($existing) {
                DB::table('property_categories')->where('id', $existing->id)->update([
                    'name' => $spec['name'],
                    'code' => $spec['code'],
                    'description' => $spec['description'],
                    'is_active' => true,
                    'sort_order' => $spec['sort_order'],
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('property_categories')->insert($spec);
            }
        }

        // Fetch canonical IDs
        $hostelsPgId = (int) DB::table('property_categories')->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id');
        $homestaysId = (int) DB::table('property_categories')->where('slug', PropertyCategory::SLUG_HOMESTAYS)->value('id');
        $coLivingId = (int) DB::table('property_categories')->where('slug', PropertyCategory::SLUG_CO_LIVING)->value('id');

        // 2. Identify legacy category IDs
        $legacyHostelSlugs = [
            'independent-hostel',
            'pg-accommodation',
            'hostel',
            'hostels',
            'pg',
            'paying-guest',
            'hotel',
            'lodge',
        ];

        $legacyHostelIds = DB::table('property_categories')
            ->whereIn('slug', $legacyHostelSlugs)
            ->whereNotIn('id', [$hostelsPgId, $homestaysId, $coLivingId])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $legacyHomestaySlugs = [
            'homestay',
            'guest-house',
            'guesthouse',
        ];

        $legacyHomestayIds = DB::table('property_categories')
            ->whereIn('slug', $legacyHomestaySlugs)
            ->whereNotIn('id', [$hostelsPgId, $homestaysId, $coLivingId])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        // 3. Reconcile properties table
        if (Schema::hasTable('properties')) {
            if ($legacyHostelIds !== []) {
                DB::table('properties')
                    ->whereIn('property_category_id', $legacyHostelIds)
                    ->update(['property_category_id' => $hostelsPgId]);
            }

            if ($legacyHomestayIds !== []) {
                DB::table('properties')
                    ->whereIn('property_category_id', $legacyHomestayIds)
                    ->update(['property_category_id' => $homestaysId]);
            }

            // Fallback: any property pointing to an unknown/deleted category
            DB::table('properties')
                ->whereNotIn('property_category_id', [$hostelsPgId, $homestaysId, $coLivingId])
                ->update(['property_category_id' => $hostelsPgId]);

            // Reconcile approved_snapshot JSON column
            $propertiesWithSnapshot = DB::table('properties')
                ->whereNotNull('approved_snapshot')
                ->get(['id', 'approved_snapshot']);

            foreach ($propertiesWithSnapshot as $prop) {
                if (is_string($prop->approved_snapshot)) {
                    $decoded = json_decode($prop->approved_snapshot, true);
                    if (is_array($decoded)) {
                        $updated = false;
                        if (isset($decoded['property_category_id']) && in_array((int) $decoded['property_category_id'], $legacyHostelIds, true)) {
                            $decoded['property_category_id'] = $hostelsPgId;
                            $decoded['category_name'] = 'Hostels/PG';
                            $updated = true;
                        } elseif (isset($decoded['property_category_id']) && in_array((int) $decoded['property_category_id'], $legacyHomestayIds, true)) {
                            $decoded['property_category_id'] = $homestaysId;
                            $decoded['category_name'] = 'Homestays';
                            $updated = true;
                        }
                        if ($updated) {
                            DB::table('properties')->where('id', $prop->id)->update([
                                'approved_snapshot' => json_encode($decoded, JSON_THROW_ON_ERROR),
                            ]);
                        }
                    }
                }
            }
        }

        // 4. Reconcile reservations snapshot_category_name
        if (Schema::hasTable('reservations') && Schema::hasColumn('reservations', 'snapshot_category_name')) {
            DB::table('reservations')
                ->whereIn('snapshot_category_name', [
                    'Independent Hostel',
                    'PG Accommodation',
                    'Hostel',
                    'PG',
                    'independent-hostel',
                    'pg-accommodation',
                ])
                ->update(['snapshot_category_name' => 'Hostels/PG']);

            DB::table('reservations')
                ->whereIn('snapshot_category_name', [
                    'Homestay',
                    'homestay',
                ])
                ->update(['snapshot_category_name' => 'Homestays']);
        }

        // 5. Reconcile property_verification_applications JSON snapshots
        if (Schema::hasTable('property_verification_applications')) {
            $apps = DB::table('property_verification_applications')
                ->whereNotNull('proposed_property_data')
                ->orWhereNotNull('baseline_snapshot')
                ->get(['id', 'proposed_property_data', 'baseline_snapshot']);

            foreach ($apps as $app) {
                $needsUpdate = false;
                $updatePayload = [];

                if (is_string($app->proposed_property_data)) {
                    $decoded = json_decode($app->proposed_property_data, true);
                    if (is_array($decoded) && isset($decoded['property_category_id'])) {
                        if (in_array((int) $decoded['property_category_id'], $legacyHostelIds, true)) {
                            $decoded['property_category_id'] = $hostelsPgId;
                            $decoded['category_name'] = 'Hostels/PG';
                            $updatePayload['proposed_property_data'] = json_encode($decoded, JSON_THROW_ON_ERROR);
                            $needsUpdate = true;
                        } elseif (in_array((int) $decoded['property_category_id'], $legacyHomestayIds, true)) {
                            $decoded['property_category_id'] = $homestaysId;
                            $decoded['category_name'] = 'Homestays';
                            $updatePayload['proposed_property_data'] = json_encode($decoded, JSON_THROW_ON_ERROR);
                            $needsUpdate = true;
                        }
                    }
                }

                if (is_string($app->baseline_snapshot)) {
                    $decoded = json_decode($app->baseline_snapshot, true);
                    if (is_array($decoded) && isset($decoded['property_category_id'])) {
                        if (in_array((int) $decoded['property_category_id'], $legacyHostelIds, true)) {
                            $decoded['property_category_id'] = $hostelsPgId;
                            $decoded['category_name'] = 'Hostels/PG';
                            $updatePayload['baseline_snapshot'] = json_encode($decoded, JSON_THROW_ON_ERROR);
                            $needsUpdate = true;
                        } elseif (in_array((int) $decoded['property_category_id'], $legacyHomestayIds, true)) {
                            $decoded['property_category_id'] = $homestaysId;
                            $decoded['category_name'] = 'Homestays';
                            $updatePayload['baseline_snapshot'] = json_encode($decoded, JSON_THROW_ON_ERROR);
                            $needsUpdate = true;
                        }
                    }
                }

                if ($needsUpdate) {
                    DB::table('property_verification_applications')
                        ->where('id', $app->id)
                        ->update($updatePayload);
                }
            }
        }

        // 6. Delete all non-canonical categories
        DB::table('property_categories')
            ->whereNotIn('id', [$hostelsPgId, $homestaysId, $coLivingId])
            ->delete();
    }

    /**
     * Reverse the migrations (forward-only consolidation preserves canonical taxonomy).
     */
    public function down(): void
    {
        // Forward-only architecture.
    }
};
