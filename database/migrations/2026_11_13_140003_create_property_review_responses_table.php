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
        Schema::create('property_review_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_review_id')->unique()->constrained('property_reviews')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->restrictOnDelete();
            $table->text('response_text');
            $table->string('status', 32)->default('pending_moderation')->index();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('moderated_at')->nullable();
            $table->foreignId('moderated_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->text('moderation_reason')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_review_responses');
    }
};
