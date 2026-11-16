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
            $table->timestamp('payment_deadline_at')->nullable()->index('res_payment_deadline_idx')->after('submitted_at');
            $table->timestamp('expired_at')->nullable()->after('cancelled_at');
            $table->boolean('requires_refund_review')->default(false)->after('cancellation_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropIndex('res_payment_deadline_idx');
            $table->dropColumn([
                'payment_deadline_at',
                'expired_at',
                'requires_refund_review',
            ]);
        });
    }
};
