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
        Schema::create('property_review_revisions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_review_id')->constrained('property_reviews')->cascadeOnDelete();
            $table->string('previous_title', 150)->nullable();
            $table->text('previous_content')->nullable();
            $table->unsignedTinyInteger('previous_overall_rating');
            $table->unsignedTinyInteger('previous_cleanliness_rating')->nullable();
            $table->unsignedTinyInteger('previous_food_quality_rating')->nullable();
            $table->unsignedTinyInteger('previous_communication_rating')->nullable();
            $table->unsignedTinyInteger('previous_value_rating')->nullable();
            $table->foreignId('edited_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_review_revisions');
    }
};
