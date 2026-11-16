<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_availability_block_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_availability_block_id')->constrained('property_availability_blocks', indexName: 'pabe_block_fk')->cascadeOnDelete();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->string('event_type', 64);
            $table->string('actor_type', 32);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('actor_name')->nullable();
            $table->json('previous_snapshot')->nullable();
            $table->json('new_snapshot')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable()->index();

            $table->index(['property_id', 'created_at'], 'pabe_property_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_availability_block_events');
    }
};
