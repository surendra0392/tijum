<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_transfer_reversals', function (Blueprint $table): void {
            $table->id();
            $table->string('reversal_reference', 64)->unique();
            $table->foreignId('provider_transfer_id')->constrained('provider_transfers')->cascadeOnDelete();
            $table->foreignId('reservation_refund_id')->nullable()->constrained('reservation_refunds')->nullOnDelete();
            $table->string('gateway_reversal_id', 64)->nullable()->unique();
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('INR');
            $table->string('status', 32)->default('pending');
            $table->text('reason')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['provider_transfer_id', 'status'], 'ptr_transfer_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_transfer_reversals');
    }
};
