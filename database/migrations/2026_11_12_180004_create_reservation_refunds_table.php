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
        Schema::create('reservation_refunds', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('reservation_payment_id')
                ->constrained('reservation_payments', indexName: 'res_ref_payment_fk')
                ->restrictOnDelete();
            $table->foreignId('reservation_id')
                ->constrained('reservations', indexName: 'res_ref_reservation_fk')
                ->restrictOnDelete();
            $table->foreignId('initiated_by_admin_id')
                ->constrained('admins', indexName: 'res_ref_admin_fk')
                ->restrictOnDelete();

            $table->string('gateway_refund_id', 100)->nullable()->unique('res_ref_gateway_refund_unique');
            $table->string('idempotency_key', 64)->unique('res_ref_idempotency_unique');

            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 8)->default('INR');
            $table->string('status', 32)->index('res_ref_status_idx');

            $table->text('reason');
            $table->timestamp('gateway_processed_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['reservation_id', 'status'], 'res_ref_reservation_status_idx');
            $table->index(['reservation_payment_id', 'status'], 'res_ref_payment_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservation_refunds');
    }
};
