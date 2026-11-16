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
        Schema::create('reservation_payments', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('reservation_id')
                ->constrained('reservations', indexName: 'res_pay_reservation_fk')
                ->restrictOnDelete();
            $table->foreignId('user_id')
                ->constrained('users', indexName: 'res_pay_user_fk')
                ->restrictOnDelete();

            $table->string('gateway', 32)->default('razorpay');
            $table->string('gateway_order_id', 100)->unique('res_pay_order_id_unique');
            $table->string('gateway_payment_id', 100)->nullable()->unique('res_pay_payment_id_unique');
            $table->string('idempotency_key', 64)->unique('res_pay_idempotency_unique');

            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 8)->default('INR');
            $table->string('status', 32)->index('res_pay_status_idx');

            $table->string('failure_code', 64)->nullable();
            $table->text('failure_description')->nullable();

            $table->timestamp('gateway_order_created_at')->nullable();
            $table->timestamp('captured_at')->nullable()->index('res_pay_captured_at_idx');
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['reservation_id', 'status'], 'res_pay_reservation_status_idx');
            $table->index(['user_id', 'status'], 'res_pay_user_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservation_payments');
    }
};
