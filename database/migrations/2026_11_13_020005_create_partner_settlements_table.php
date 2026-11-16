<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_settlements', function (Blueprint $table): void {
            $table->id();
            $table->string('settlement_reference', 64)->unique();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->foreignId('owner_financial_profile_id')->constrained('owner_financial_profiles')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->string('currency', 3)->default('INR');
            $table->unsignedBigInteger('gross_booking_value_minor')->default(0);
            $table->unsignedBigInteger('commission_amount_minor')->default(0);
            $table->unsignedBigInteger('commission_tax_amount_minor')->default(0);
            $table->unsignedBigInteger('statutory_deductions_minor')->default(0);
            $table->unsignedBigInteger('refund_adjustments_minor')->default(0);
            $table->unsignedBigInteger('relocation_adjustments_minor')->default(0);
            $table->unsignedBigInteger('other_adjustments_minor')->default(0);
            $table->unsignedBigInteger('net_settlement_amount_minor')->default(0);
            $table->string('status', 32)->default('draft');
            $table->foreignId('approved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('transfer_initiated_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->string('provider_transfer_id', 64)->nullable();
            $table->string('provider_status', 32)->nullable();
            $table->text('failure_reason')->nullable();
            $table->text('admin_notes')->nullable();
            $table->timestamp('reconciled_at')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'status'], 'ps_owner_status_idx');
            $table->index(['status', 'created_at'], 'ps_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_settlements');
    }
};
