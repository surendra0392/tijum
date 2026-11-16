<?php

declare(strict_types=1);

use App\Enums\PropertyOperationalStatus;
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
        Schema::create('properties', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')
                ->constrained('owners', indexName: 'prop_owner_id_fk')
                ->cascadeOnDelete();
            $table->foreignId('property_category_id')
                ->constrained('property_categories', indexName: 'prop_category_id_fk');
            $table->foreignId('city_id')
                ->constrained('cities', indexName: 'prop_city_id_fk');
            $table->string('property_reference', 32)->unique('prop_reference_unique');
            $table->string('name', 180);
            $table->string('slug', 220)->unique('prop_slug_unique');
            $table->text('description');
            $table->string('contact_person_name', 150);
            $table->string('contact_phone', 32);
            $table->string('contact_email', 255)->nullable();
            $table->string('address_line_1', 255);
            $table->string('address_line_2', 255)->nullable();
            $table->string('locality', 120);
            $table->string('landmark', 160)->nullable();
            $table->string('postal_code', 20);
            $table->string('state', 120);
            $table->string('country_code', 4)->default('IN');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('food_provided')->default(false)->index('prop_food_provided_idx');
            $table->boolean('breakfast_included')->default(false);
            $table->boolean('lunch_included')->default(false);
            $table->boolean('dinner_included')->default(false);
            $table->string('status', 32)
                ->default(PropertyOperationalStatus::Draft->value)
                ->index('prop_status_idx');
            $table->boolean('is_verified')->default(false)->index('prop_is_verified_idx');
            $table->boolean('booking_eligible')->default(false)->index('prop_booking_eligible_idx');
            $table->foreignId('approved_by_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'prop_approved_by_admin_fk')
                ->nullOnDelete();
            $table->unsignedBigInteger('latest_approved_application_id')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->json('approved_snapshot')->nullable();
            $table->text('suspended_reason')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'status'], 'prop_owner_status_idx');
            $table->index(['city_id', 'property_category_id'], 'prop_city_category_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
