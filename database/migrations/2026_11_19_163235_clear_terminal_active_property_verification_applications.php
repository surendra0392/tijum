<?php

declare(strict_types=1);

use App\Enums\PropertyVerificationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('property_verification_applications')
            ->whereNotNull('active_property_id')
            ->whereIn('status', [
                PropertyVerificationStatus::Approved->value,
                PropertyVerificationStatus::Rejected->value,
                PropertyVerificationStatus::Withdrawn->value,
            ])
            ->update(['active_property_id' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible data cleanup of stale terminal active_property_id pointers.
    }
};
