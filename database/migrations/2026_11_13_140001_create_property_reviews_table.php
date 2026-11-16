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
        Schema::create('property_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reservation_id')->unique()->constrained('reservations')->restrictOnDelete();
            $table->foreignId('property_id')->constrained('properties')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('property_room_type_id')->nullable()->constrained('property_room_types')->nullOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->restrictOnDelete();

            $table->unsignedTinyInteger('overall_rating');
            $table->unsignedTinyInteger('cleanliness_rating')->nullable();
            $table->unsignedTinyInteger('food_quality_rating')->nullable();
            $table->unsignedTinyInteger('communication_rating')->nullable();
            $table->unsignedTinyInteger('value_rating')->nullable();

            $table->string('title', 150)->nullable();
            $table->text('content')->nullable();
            $table->string('status', 32)->default('pending_moderation')->index();
            $table->boolean('verified_booking')->default(true);
            $table->string('customer_display_name', 100);

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('moderated_at')->nullable();
            $table->foreignId('moderated_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->text('moderation_reason')->nullable();
            $table->text('moderation_internal_notes')->nullable();

            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index(['property_id', 'status', 'published_at']);
            $table->index(['user_id', 'status']);
            $table->index(['owner_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_reviews');
    }
};
