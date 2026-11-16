<?php

declare(strict_types=1);

use App\Enums\PropertyVerificationDocumentStatus;
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
        Schema::create('property_verification_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')
                ->constrained('property_verification_applications', indexName: 'pvd_application_id_fk')
                ->cascadeOnDelete();
            $table->string('document_type', 64)->index('pvd_document_type_idx');
            $table->string('original_filename', 255);
            $table->string('storage_path', 255)->unique('pvd_storage_path_unique');
            $table->string('mime_type', 128);
            $table->unsignedBigInteger('file_size');
            $table->string('checksum', 64);
            $table->string('status', 32)
                ->default(PropertyVerificationDocumentStatus::Uploaded->value)
                ->index('pvd_status_idx');
            $table->text('reviewer_note')->nullable();
            $table->foreignId('reviewed_by_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'pvd_reviewed_by_admin_fk')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['application_id', 'document_type', 'status'], 'pvd_app_type_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_verification_documents');
    }
};
