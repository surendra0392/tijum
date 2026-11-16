<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owner_financial_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->unique()->constrained('owners')->cascadeOnDelete();
            $table->string('legal_business_name')->nullable();
            $table->string('business_constitution', 32)->default('individual');
            $table->string('pan_number', 16)->nullable();
            $table->timestamp('pan_verified_at')->nullable();
            $table->boolean('gst_registered')->default(false);
            $table->string('gstin', 20)->nullable();
            $table->string('supplier_legal_classification', 32)->default('unregistered');
            $table->string('razorpay_account_id', 64)->nullable()->unique();
            $table->string('linked_account_status', 32)->default('uncreated');
            $table->string('bank_beneficiary_name')->nullable();
            $table->string('bank_account_number_masked', 32)->nullable();
            $table->string('bank_ifsc', 16)->nullable();
            $table->string('bank_name')->nullable();
            $table->timestamp('beneficiary_verified_at')->nullable();
            $table->string('onboarding_status', 32)->default('not_started');
            $table->foreignId('verified_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['onboarding_status', 'linked_account_status'], 'ofp_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owner_financial_profiles');
    }
};
