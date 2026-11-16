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
        Schema::create('property_room_types', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'prt_property_id_fk')
                ->cascadeOnDelete();
            $table->foreignId('amendment_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'prt_amendment_app_fk')
                ->nullOnDelete();
            $table->foreignId('pending_changes_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'prt_pending_changes_app_fk')
                ->nullOnDelete();
            $table->string('name', 150);
            $table->string('slug', 180);
            $table->string('accommodation_mode', 32);
            $table->unsignedTinyInteger('sharing_capacity')->nullable();
            $table->unsignedTinyInteger('max_guests_per_room');
            $table->boolean('is_air_conditioned')->default(false);
            $table->string('gender_policy', 32);
            $table->json('guest_composition_policy');
            $table->boolean('early_check_in_enabled')->default(false);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true)->index('prt_is_active_idx');
            $table->boolean('is_approved_version')->default(false);
            $table->json('pending_amendment_data')->nullable();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->unsignedBigInteger('daily_rate_minor')->nullable();
            $table->unsignedBigInteger('weekly_rate_minor')->nullable();
            $table->unsignedBigInteger('monthly_rate_minor')->nullable();
            $table->timestamps();

            $table->unique(['property_id', 'id'], 'prt_property_id_id_unique');
            $table->unique(['property_id', 'name'], 'prt_property_name_unique');
            $table->unique(['property_id', 'slug'], 'prt_property_slug_unique');
            $table->index(['property_id', 'accommodation_mode', 'is_air_conditioned'], 'prt_prop_mode_ac_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_room_types');
    }
};
