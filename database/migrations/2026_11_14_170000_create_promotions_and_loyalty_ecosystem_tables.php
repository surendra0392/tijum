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
        // 1. Rewards & Promotion Global Settings
        Schema::create('rewards_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // 2. Promotional Campaigns
        Schema::create('promotional_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->string('campaign_reference')->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('type');
            $table->string('status')->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedBigInteger('budget_minor')->nullable();
            $table->unsignedBigInteger('spent_minor')->default(0);
            $table->foreignId('created_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 3. Coupon Codes
        Schema::create('coupon_codes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campaign_id')->constrained('promotional_campaigns')->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('description')->nullable();
            $table->string('offer_type');
            $table->unsignedBigInteger('discount_amount_minor')->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->unsignedBigInteger('max_discount_amount_minor')->nullable();
            $table->unsignedInteger('bonus_points')->default(0);
            $table->string('funding_source')->default('platform');
            $table->decimal('property_funding_percentage', 5, 2)->default(0);
            $table->unsignedBigInteger('min_booking_amount_minor')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->unsignedInteger('total_usage_limit')->nullable();
            $table->unsignedInteger('per_user_limit')->default(1);
            $table->unsignedInteger('total_used_count')->default(0);
            $table->json('applies_to_category_ids')->nullable();
            $table->json('applies_to_city_ids')->nullable();
            $table->json('applies_to_property_ids')->nullable();
            $table->boolean('first_booking_only')->default(false);
            $table->unsignedInteger('min_stay_days')->default(1);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // 4. Coupon Holds (15-Minute Row-Locked Checkout Reservation Holds)
        Schema::create('coupon_holds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('coupon_code_id')->constrained('coupon_codes')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->string('hold_reference')->unique();
            $table->unsignedBigInteger('discount_amount_minor');
            $table->timestamp('expires_at')->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        // 5. Coupon Redemptions (Committed on Payment Capture)
        Schema::create('coupon_redemptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('coupon_code_id')->constrained('coupon_codes')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->unsignedBigInteger('discount_amount_minor');
            $table->unsignedBigInteger('platform_funded_amount_minor')->default(0);
            $table->unsignedBigInteger('property_funded_amount_minor')->default(0);
            $table->unsignedInteger('bonus_points_awarded')->default(0);
            $table->timestamp('redeemed_at');
            $table->boolean('is_reverted')->default(false);
            $table->timestamp('reverted_at')->nullable();
            $table->string('reversion_reason')->nullable();
            $table->timestamps();
        });

        // 6. Customer Referral Profiles
        Schema::create('customer_referral_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('referral_code')->unique();
            $table->unsignedInteger('total_referrals_count')->default(0);
            $table->unsignedInteger('successful_referrals_count')->default(0);
            $table->unsignedInteger('total_points_earned')->default(0);
            $table->boolean('is_blocked')->default(false);
            $table->timestamps();
        });

        // 7. Customer Referrals Attribution & Qualification
        Schema::create('customer_referrals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('referrer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('referred_user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('referral_code_used');
            $table->string('status')->default('registered')->index();
            $table->foreignId('qualifying_reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->string('attribution_ip')->nullable();
            $table->text('attribution_user_agent')->nullable();
            $table->string('attribution_device_fingerprint')->nullable();
            $table->unsignedInteger('referrer_reward_points')->default(0);
            $table->unsignedInteger('referred_reward_points')->default(0);
            $table->timestamp('reward_points_credited_at')->nullable();
            $table->string('disqualification_reason')->nullable();
            $table->timestamps();
        });

        // 8. Customer Loyalty Points Wallet (Aggregate Balances)
        Schema::create('customer_points_wallets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('available_points')->default(0);
            $table->unsignedInteger('pending_points')->default(0);
            $table->unsignedInteger('reserved_points')->default(0);
            $table->unsignedInteger('redeemed_points')->default(0);
            $table->unsignedInteger('expired_points')->default(0);
            $table->unsignedInteger('total_points_earned')->default(0);
            $table->timestamps();
        });

        // 9. Customer Loyalty Points Ledger (Append-Only Audit Trail with FEFO Tracking)
        Schema::create('customer_points_ledger', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('transaction_type')->index();
            $table->string('status')->index();
            $table->integer('points');
            $table->unsignedBigInteger('inr_equivalent_minor')->default(0);
            $table->unsignedInteger('running_balance_after');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('idempotency_key')->unique();
            $table->timestamp('expires_at')->nullable()->index();
            $table->unsignedInteger('points_remaining')->default(0);
            $table->json('consumed_from_entry_ids')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('notes')->nullable();
            $table->timestamps();
        });

        // 10. Points Reservation Holds (15-Minute Checkout Hold)
        Schema::create('points_reservation_holds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->string('hold_reference')->unique();
            $table->unsignedInteger('points_held');
            $table->unsignedBigInteger('inr_discount_minor');
            $table->timestamp('expires_at')->index();
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('points_reservation_holds');
        Schema::dropIfExists('customer_points_ledger');
        Schema::dropIfExists('customer_points_wallets');
        Schema::dropIfExists('customer_referrals');
        Schema::dropIfExists('customer_referral_profiles');
        Schema::dropIfExists('coupon_redemptions');
        Schema::dropIfExists('coupon_holds');
        Schema::dropIfExists('coupon_codes');
        Schema::dropIfExists('promotional_campaigns');
        Schema::dropIfExists('rewards_settings');
    }
};
