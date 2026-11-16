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
        Schema::create('owner_verification_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('verification_application_id')
                ->constrained('owner_verification_applications', indexName: 'ove_application_id_fk')
                ->cascadeOnDelete();
            $table->string('event_type', 64)->index();
            $table->string('previous_status', 32)->nullable();
            $table->string('new_status', 32)->nullable();
            $table->string('actor_type', 32);
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('actor_name', 150)->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at');

            $table->index(['verification_application_id', 'created_at'], 'ove_app_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('owner_verification_events');
    }
};
