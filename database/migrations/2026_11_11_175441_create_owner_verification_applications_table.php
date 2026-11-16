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
        Schema::create('owner_verification_applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')
                ->constrained('owners')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('active_owner_id')->nullable()->unique('ova_active_owner_unique');
            $table->string('application_number', 32)->unique('ova_application_number_unique');
            $table->string('status', 32)->default('draft')->index();
            $table->unsignedInteger('revision_number')->default(1);
            $table->string('declaration_version', 32)->nullable();
            $table->timestamp('declaration_accepted_at')->nullable();
            $table->timestamp('submitted_at')->nullable()->index();
            $table->foreignId('assigned_admin_id')
                ->nullable()
                ->constrained('admins')
                ->nullOnDelete();
            $table->foreignId('reviewed_by_admin_id')
                ->nullable()
                ->constrained('admins')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('requested_information')->nullable();
            $table->json('requested_changes')->nullable();
            $table->text('decision_reason')->nullable();
            $table->text('internal_reviewer_notes')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'status'], 'ova_owner_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('owner_verification_applications');
    }
};
