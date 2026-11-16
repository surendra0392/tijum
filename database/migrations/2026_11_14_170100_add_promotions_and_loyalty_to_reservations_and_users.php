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
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('referred_by_user_id')
                ->nullable()
                ->after('terms_accepted_at')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('reservations', function (Blueprint $table): void {
            $table->unsignedBigInteger('original_amount_minor')->nullable()->after('total_amount_minor');
            $table->foreignId('coupon_code_id')->nullable()->after('original_amount_minor')->constrained('coupon_codes')->nullOnDelete();
            $table->string('coupon_code')->nullable()->after('coupon_code_id');
            $table->unsignedBigInteger('coupon_discount_minor')->default(0)->after('coupon_code');
            $table->string('coupon_funding_source')->nullable()->after('coupon_discount_minor');
            $table->unsignedBigInteger('coupon_property_share_minor')->default(0)->after('coupon_funding_source');
            $table->unsignedInteger('points_redeemed')->default(0)->after('coupon_property_share_minor');
            $table->unsignedBigInteger('points_discount_minor')->default(0)->after('points_redeemed');
            $table->unsignedInteger('points_awarded_potential')->default(0)->after('points_discount_minor');
            $table->unsignedInteger('points_awarded_credited')->default(0)->after('points_awarded_potential');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropForeign(['coupon_code_id']);
            $table->dropColumn([
                'original_amount_minor',
                'coupon_code_id',
                'coupon_code',
                'coupon_discount_minor',
                'coupon_funding_source',
                'coupon_property_share_minor',
                'points_redeemed',
                'points_discount_minor',
                'points_awarded_potential',
                'points_awarded_credited',
            ]);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['referred_by_user_id']);
            $table->dropColumn(['referred_by_user_id']);
        });
    }
};
