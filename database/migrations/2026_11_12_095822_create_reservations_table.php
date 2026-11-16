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
        Schema::create('reservations', function (Blueprint $table): void {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users', indexName: 'res_user_id_fk')
                ->restrictOnDelete();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'res_property_id_fk')
                ->restrictOnDelete();
            $table->unsignedBigInteger('property_room_type_id');

            $table->string('booking_reference', 64)->unique();
            $table->uuid('submission_token')->unique();

            $table->date('check_in_date')->index('res_check_in_date_idx');
            $table->date('checkout_date')->index('res_checkout_date_idx');

            $table->string('duration_type', 32);
            $table->unsignedTinyInteger('duration_quantity');
            $table->unsignedSmallInteger('total_stay_days');

            $table->unsignedSmallInteger('quantity');
            $table->unsignedSmallInteger('guest_count');
            $table->string('quantity_basis', 32);
            $table->string('guest_gender', 32);
            $table->string('guest_composition', 32);

            $table->string('contact_name', 100);
            $table->string('contact_email', 150);
            $table->string('contact_phone', 50);

            $table->boolean('early_check_in_requested')->default(false);
            $table->time('requested_arrival_time')->nullable();

            $table->string('snapshot_property_name', 150);
            $table->string('snapshot_property_locality', 100)->nullable();
            $table->string('snapshot_property_city', 100)->nullable();
            $table->string('snapshot_property_state', 100)->nullable();
            $table->string('snapshot_property_country_code', 8)->nullable();
            $table->string('snapshot_category_name', 100)->nullable();
            $table->string('snapshot_room_type_name', 150);
            $table->boolean('snapshot_is_air_conditioned')->default(false);
            $table->string('snapshot_sharing_mode', 32)->nullable();
            $table->unsignedSmallInteger('snapshot_max_capacity')->nullable();
            $table->boolean('snapshot_food_provided')->default(false);
            $table->boolean('snapshot_breakfast_included')->default(false);
            $table->boolean('snapshot_lunch_included')->default(false);
            $table->boolean('snapshot_dinner_included')->default(false);

            $table->string('currency_code', 8)->default('INR');
            $table->unsignedBigInteger('unit_rate_minor');
            $table->string('rate_unit', 32);
            $table->unsignedBigInteger('total_amount_minor');

            $table->string('status', 32);
            $table->timestamp('submitted_at')->index('res_submitted_at_idx');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->foreignId('cancelled_by_user_id')
                ->nullable()
                ->constrained('users', indexName: 'res_cancelled_by_user_fk')
                ->restrictOnDelete();
            $table->foreignId('cancelled_by_owner_id')
                ->nullable()
                ->constrained('owners', indexName: 'res_cancelled_by_owner_fk')
                ->restrictOnDelete();
            $table->text('cancellation_reason')->nullable();

            $table->timestamps();

            $table->index(['property_id', 'property_room_type_id'], 'res_property_room_type_idx');

            $table->foreign(['property_id', 'property_room_type_id'], 'res_property_room_type_fk')
                ->references(['property_id', 'id'])
                ->on('property_room_types')
                ->restrictOnDelete();

            $table->index(['user_id', 'status', 'check_in_date'], 'res_user_status_date_idx');
            $table->index(['property_id', 'status', 'check_in_date'], 'res_property_status_date_idx');
            $table->index(['property_room_type_id', 'status', 'check_in_date', 'checkout_date'], 'res_room_type_status_dates_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
