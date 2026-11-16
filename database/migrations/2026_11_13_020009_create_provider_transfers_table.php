<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_transfers', function (Blueprint $table): void {
            $table->id();
            $table->string('transfer_reference', 64)->unique();
            $table->foreignId('partner_settlement_id')->nullable()->constrained('partner_settlements')->nullOnDelete();
            $table->foreignId('reservation_payment_id')->constrained('reservation_payments')->cascadeOnDelete();
            $table->string('gateway', 32)->default('razorpay');
            $table->string('gateway_transfer_id', 64)->nullable()->unique();
            $table->string('destination_account_id', 64);
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('INR');
            $table->string('idempotency_key', 128)->unique();
            $table->string('status', 32)->default('pending');
            $table->timestamp('processed_at')->nullable();
            $table->string('error_code', 64)->nullable();
            $table->text('error_description')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamps();

            $table->index(['partner_settlement_id', 'status'], 'pt_settlement_status_idx');
            $table->index(['destination_account_id', 'status'], 'pt_dest_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_transfers');
    }
};
