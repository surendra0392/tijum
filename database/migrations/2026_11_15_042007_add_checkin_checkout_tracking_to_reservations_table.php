<?php

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
        Schema::table('reservations', function (Blueprint $table) {
            $table->timestamp('checked_in_at')->nullable()->index();
            $table->string('checked_in_by_type', 32)->nullable();
            $table->unsignedBigInteger('checked_in_by_id')->nullable();
            $table->text('check_in_notes')->nullable();

            $table->timestamp('checked_out_at')->nullable()->index();
            $table->string('checked_out_by_type', 32)->nullable();
            $table->unsignedBigInteger('checked_out_by_id')->nullable();
            $table->text('checkout_notes')->nullable();

            $table->index(['check_in_date', 'checked_in_at'], 'res_checkin_tracking_idx');
            $table->index(['checkout_date', 'checked_out_at'], 'res_checkout_tracking_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('res_checkin_tracking_idx');
            $table->dropIndex('res_checkout_tracking_idx');
            $table->dropIndex(['checked_in_at']);
            $table->dropIndex(['checked_out_at']);
            $table->dropColumn([
                'checked_in_at',
                'checked_in_by_type',
                'checked_in_by_id',
                'check_in_notes',
                'checked_out_at',
                'checked_out_by_type',
                'checked_out_by_id',
                'checkout_notes',
            ]);
        });
    }
};
