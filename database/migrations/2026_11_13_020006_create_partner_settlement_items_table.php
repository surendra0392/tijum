<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_settlement_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('partner_settlement_id')->constrained('partner_settlements')->cascadeOnDelete();
            $table->foreignId('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->foreignId('reservation_payment_id')->nullable()->constrained('reservation_payments')->nullOnDelete();
            $table->string('item_type', 32)->default('booking_payable');
            $table->bigInteger('gross_amount_minor')->default(0);
            $table->bigInteger('commission_amount_minor')->default(0);
            $table->bigInteger('commission_tax_amount_minor')->default(0);
            $table->bigInteger('tax_deduction_minor')->default(0);
            $table->bigInteger('net_payable_minor')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['partner_settlement_id', 'reservation_id', 'item_type'], 'settlement_item_unique');
            $table->index(['reservation_id', 'item_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_settlement_items');
    }
};
