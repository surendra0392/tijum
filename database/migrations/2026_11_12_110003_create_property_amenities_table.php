<?php

declare(strict_types=1);

use App\Enums\AmenityVerificationStatus;
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
        Schema::create('property_amenities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'pa_property_fk')
                ->cascadeOnDelete();
            $table->foreignId('amenity_id')
                ->constrained('amenities', indexName: 'pa_amenity_fk')
                ->restrictOnDelete();
            $table->char('assignment_group_id', 26)->index('pa_assignment_group_idx');
            $table->foreignId('parent_property_amenity_id')
                ->nullable()
                ->constrained('property_amenities', indexName: 'pa_parent_fk')
                ->nullOnDelete();
            $table->foreignId('superseded_by_property_amenity_id')
                ->nullable()
                ->constrained('property_amenities', indexName: 'pa_superseded_by_fk')
                ->nullOnDelete();
            $table->string('assignment_reference', 32)->unique('pa_reference_unique');
            $table->string('availability', 24)->index('pa_availability_idx');
            $table->string('status', 32)
                ->default(AmenityVerificationStatus::Draft->value)
                ->index('pa_status_idx');
            $table->unsignedSmallInteger('revision_number')->default(1);
            $table->boolean('is_current')->default(true)->index('pa_is_current_idx');
            $table->boolean('is_customer_visible')->default(true)->index('pa_is_customer_visible_idx');
            $table->text('details')->nullable();
            $table->string('declaration_version', 20)->nullable();
            $table->timestamp('declaration_accepted_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('under_review_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('assigned_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'pa_assigned_admin_fk')
                ->nullOnDelete();
            $table->foreignId('reviewed_by_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'pa_reviewed_by_admin_fk')
                ->nullOnDelete();
            $table->text('requested_information')->nullable();
            $table->text('decision_reason')->nullable();
            $table->text('internal_reviewer_notes')->nullable();
            $table->json('approved_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['property_id', 'id'], 'pa_property_id_id_unique');
            $table->unique(['assignment_group_id', 'revision_number'], 'pa_group_revision_unique');
            $table->index(['property_id', 'amenity_id', 'is_current'], 'pa_property_amenity_current_idx');
            $table->index(['property_id', 'status'], 'pa_property_status_idx');
            $table->index(['property_id', 'is_current', 'status'], 'pa_property_current_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_amenities');
    }
};
