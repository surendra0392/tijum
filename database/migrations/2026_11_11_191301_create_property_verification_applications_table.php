<?php

declare(strict_types=1);

use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationStatus;
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
        Schema::create('property_verification_applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'pva_property_id_fk')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('active_property_id')
                ->nullable()
                ->unique('pva_active_property_unique');
            $table->string('application_number', 32)->unique('pva_application_number_unique');
            $table->string('status', 32)
                ->default(PropertyVerificationStatus::Draft->value)
                ->index('pva_status_idx');
            $table->unsignedInteger('revision_number')->default(1);
            $table->boolean('is_amendment')->default(false);
            $table->foreignId('parent_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'pva_parent_app_fk')
                ->nullOnDelete();
            $table->string('ownership_arrangement', 64)
                ->default(PropertyOwnershipArrangement::OwnerOperator->value);
            $table->json('proposed_property_data')->nullable();
            $table->json('baseline_snapshot')->nullable();
            $table->json('approved_snapshot')->nullable();
            $table->string('declaration_version', 32)->nullable();
            $table->timestamp('declaration_accepted_at')->nullable();
            $table->timestamp('submitted_at')->nullable()->index('pva_submitted_at_idx');
            $table->foreignId('assigned_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'pva_assigned_admin_fk')
                ->nullOnDelete();
            $table->foreignId('reviewed_by_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'pva_reviewed_by_admin_fk')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('requested_information')->nullable();
            $table->json('requested_changes')->nullable();
            $table->text('decision_reason')->nullable();
            $table->text('internal_reviewer_notes')->nullable();
            $table->timestamps();

            $table->index(['property_id', 'status'], 'pva_prop_status_idx');
        });

        Schema::table('properties', function (Blueprint $table): void {
            $table->foreign('latest_approved_application_id', 'prop_latest_approved_app_fk')
                ->references('id')
                ->on('property_verification_applications')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table): void {
            $table->dropForeign('prop_latest_approved_app_fk');
        });

        Schema::dropIfExists('property_verification_applications');
    }
};
