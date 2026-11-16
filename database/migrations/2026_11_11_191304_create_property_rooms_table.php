<?php

declare(strict_types=1);

use App\Enums\PropertyRoomStatus;
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
        Schema::create('property_rooms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'pr_property_id_fk')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('property_room_type_id');
            $table->foreignId('amendment_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'pr_amendment_app_fk')
                ->nullOnDelete();
            $table->boolean('is_approved_version')->default(false);
            $table->string('room_number', 64);
            $table->string('floor_number', 32)->nullable();
            $table->string('wing_name', 80)->nullable();
            $table->string('building_name', 120)->nullable();
            $table->text('description')->nullable();
            $table->string('operational_status', 32)
                ->default(PropertyRoomStatus::Active->value)
                ->index('pr_operational_status_idx');
            $table->timestamps();

            $table->unique(['property_id', 'id'], 'pr_property_id_id_unique');
            $table->unique(['property_id', 'room_number'], 'pr_property_room_number_unique');
            $table->index(['property_id', 'property_room_type_id'], 'pr_prop_room_type_idx');

            $table->foreign(['property_id', 'property_room_type_id'], 'pr_property_room_type_fk')
                ->references(['property_id', 'id'])
                ->on('property_room_types');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_rooms');
    }
};
