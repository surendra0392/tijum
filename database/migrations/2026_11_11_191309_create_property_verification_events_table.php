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
        Schema::create('property_verification_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'pve_property_id_fk')
                ->cascadeOnDelete();
            $table->foreignId('verification_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'pve_application_id_fk')
                ->nullOnDelete();
            $table->string('event_type', 64)->index('pve_event_type_idx');
            $table->string('previous_status', 32)->nullable();
            $table->string('new_status', 32)->nullable();
            $table->string('actor_type', 32);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('actor_name', 150)->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at');

            $table->index(['property_id', 'created_at'], 'pve_prop_created_idx');
            $table->index(['verification_application_id', 'created_at'], 'pve_app_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_verification_events');
    }
};
