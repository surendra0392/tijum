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
        Schema::create('payment_webhook_events', function (Blueprint $table): void {
            $table->id();

            $table->string('gateway', 32)->default('razorpay');
            $table->string('event_id', 120)->unique('pwe_event_id_unique');
            $table->string('event_type', 100)->index('pwe_event_type_idx');

            $table->string('gateway_order_id', 100)->nullable()->index('pwe_order_id_idx');
            $table->string('gateway_payment_id', 100)->nullable()->index('pwe_payment_id_idx');
            $table->string('gateway_refund_id', 100)->nullable()->index('pwe_refund_id_idx');

            $table->json('payload');
            $table->string('status', 32)->default('received')->index('pwe_status_idx');

            $table->timestamp('processed_at')->nullable();
            $table->text('error_message')->nullable();

            $table->timestamps();

            $table->index(['gateway', 'event_type'], 'pwe_gateway_event_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_events');
    }
};
