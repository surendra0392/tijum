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
        Schema::create('property_room_type_amenities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'prta_property_fk')
                ->cascadeOnDelete();
            $table->foreignId('property_room_type_id')
                ->constrained('property_room_types', indexName: 'prta_room_type_fk')
                ->cascadeOnDelete();
            $table->foreignId('amenity_id')
                ->constrained('amenities', indexName: 'prta_amenity_fk')
                ->restrictOnDelete();
            $table->char('assignment_group_id', 26)->index('prta_assignment_group_idx');
            $table->foreignId('parent_property_room_type_amenity_id')
                ->nullable()
                ->constrained('property_room_type_amenities', indexName: 'prta_parent_fk')
                ->nullOnDelete();
            $table->foreignId('superseded_by_property_room_type_amenity_id')
                ->nullable()
                ->constrained('property_room_type_amenities', indexName: 'prta_superseded_by_fk')
                ->nullOnDelete();
            $table->string('assignment_reference', 32)->unique('prta_reference_unique');
            $table->string('availability', 24)->index('prta_availability_idx');
            $table->string('status', 32)
                ->default(AmenityVerificationStatus::Draft->value)
                ->index('prta_status_idx');
            $table->unsignedSmallInteger('revision_number')->default(1);
            $table->boolean('is_current')->default(true)->index('prta_is_current_idx');
            $table->boolean('is_customer_visible')->default(true)->index('prta_is_customer_visible_idx');
            $table->text('details')->nullable();
            $table->string('declaration_version', 20)->nullable();
            $table->timestamp('declaration_accepted_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('under_review_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('assigned_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'prta_assigned_admin_fk')
                ->nullOnDelete();
            $table->foreignId('reviewed_by_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'prta_reviewed_by_admin_fk')
                ->nullOnDelete();
            $table->text('requested_information')->nullable();
            $table->text('decision_reason')->nullable();
            $table->text('internal_reviewer_notes')->nullable();
            $table->json('approved_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['property_id', 'property_room_type_id', 'id'], 'prta_property_room_type_id_unique');
            $table->unique(['assignment_group_id', 'revision_number'], 'prta_group_revision_unique');
            $table->index(['property_room_type_id', 'amenity_id', 'is_current'], 'prta_room_type_amenity_current_idx');
            $table->index(['property_id', 'status'], 'prta_property_status_idx');
            $table->index(['property_room_type_id', 'is_current', 'status'], 'prta_room_type_current_status_idx');

            $table->foreign(['property_id', 'property_room_type_id'], 'prta_property_room_type_fk')
                ->references(['property_id', 'id'])
                ->on('property_room_types')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_room_type_amenities');
    }
};
