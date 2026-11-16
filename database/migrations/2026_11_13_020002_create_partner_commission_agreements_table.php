<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_commission_agreements', function (Blueprint $table): void {
            $table->id();
            $table->string('agreement_reference', 64)->unique();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->foreignId('property_id')->nullable()->constrained('properties')->nullOnDelete();
            $table->unsignedInteger('commission_rate_bps');
            $table->string('commission_base_type', 32)->default('gross_booking_amount');
            $table->string('commission_gst_type', 32)->default('exclusive');
            $table->string('terms_version', 32)->default('1.0');
            $table->string('status', 32)->default('draft');
            $table->date('effective_from');
            $table->date('effective_until')->nullable();
            $table->string('terms_hash', 64)->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('created_by_admin_id')->constrained('admins');
            $table->foreignId('approved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->foreignId('accepted_by_owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'status'], 'pca_owner_status_idx');
            $table->index(['status', 'effective_from', 'effective_until'], 'pca_status_dates_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_commission_agreements');
    }
};
