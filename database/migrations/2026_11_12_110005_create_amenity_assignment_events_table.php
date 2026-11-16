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
        Schema::create('amenity_assignment_events', function (Blueprint $table): void {
            $table->id();
            $table->string('assignable_type', 32)->index('aae_assignable_type_idx');
            $table->unsignedBigInteger('assignable_id')->index('aae_assignable_id_idx');
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'aae_property_fk')
                ->cascadeOnDelete();
            $table->foreignId('property_room_type_id')
                ->nullable()
                ->constrained('property_room_types', indexName: 'aae_room_type_fk')
                ->nullOnDelete();
            $table->foreignId('amenity_id')
                ->constrained('amenities', indexName: 'aae_amenity_fk')
                ->restrictOnDelete();
            $table->string('event_type', 48)->index('aae_event_type_idx');
            $table->string('previous_status', 32)->nullable();
            $table->string('new_status', 32)->nullable();
            $table->string('actor_type', 24);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('actor_name', 150)->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable()->index('aae_created_at_idx');

            $table->index(['assignable_type', 'assignable_id'], 'aae_assignable_idx');
            $table->index(['property_id', 'created_at'], 'aae_property_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('amenity_assignment_events');
    }
};
