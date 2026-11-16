<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->string('cancellation_policy_version', 32)->nullable()->after('currency_code');
            $table->json('cancellation_policy_snapshot')->nullable()->after('cancellation_policy_version');
            $table->boolean('is_relocated_replacement')->default(false)->after('requires_refund_review');
            $table->foreignId('original_reservation_id')->nullable()->after('is_relocated_replacement')->constrained('reservations')->nullOnDelete();

            $table->index(['original_reservation_id']);
            $table->index(['is_relocated_replacement']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropForeign(['original_reservation_id']);
            $table->dropColumn([
                'cancellation_policy_version',
                'cancellation_policy_snapshot',
                'is_relocated_replacement',
                'original_reservation_id',
            ]);
        });
    }
};
