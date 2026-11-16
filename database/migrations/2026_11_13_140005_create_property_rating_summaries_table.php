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
        Schema::create('property_rating_summaries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')->unique()->constrained('properties')->cascadeOnDelete();
            $table->unsignedInteger('published_review_count')->default(0);
            $table->decimal('average_rating', 3, 2)->default(0.00);
            $table->decimal('cleanliness_average', 3, 2)->nullable();
            $table->decimal('food_average', 3, 2)->nullable();
            $table->decimal('communication_average', 3, 2)->nullable();
            $table->decimal('value_average', 3, 2)->nullable();
            $table->unsignedInteger('star_1_count')->default(0);
            $table->unsignedInteger('star_2_count')->default(0);
            $table->unsignedInteger('star_3_count')->default(0);
            $table->unsignedInteger('star_4_count')->default(0);
            $table->unsignedInteger('star_5_count')->default(0);
            $table->timestamp('last_recalculated_at')->nullable();
            $table->timestamps();

            $table->index(['average_rating', 'published_review_count'], 'prop_rating_summary_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_rating_summaries');
    }
};
