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
        Schema::create('property_review_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_review_id')->constrained('property_reviews')->cascadeOnDelete();
            $table->string('reporter_type', 32); // 'user' or 'owner'
            $table->unsignedBigInteger('reporter_id');
            $table->string('reason_category', 64);
            $table->text('explanation')->nullable();
            $table->string('status', 32)->default('submitted')->index();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->text('resolution_reason')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['property_review_id', 'status']);
            $table->index(['reporter_type', 'reporter_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_review_reports');
    }
};
