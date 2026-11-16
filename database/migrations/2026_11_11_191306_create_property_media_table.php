<?php

declare(strict_types=1);

use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
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
        Schema::create('property_media', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('property_id')
                ->constrained('properties', indexName: 'pm_property_id_fk')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('property_room_type_id')->nullable();
            $table->unsignedBigInteger('property_room_id')->nullable();
            $table->foreignId('property_verification_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'pm_application_id_fk')
                ->nullOnDelete();
            $table->foreignId('replaces_media_id')
                ->nullable()
                ->constrained('property_media', indexName: 'pm_replaces_media_fk')
                ->nullOnDelete();
            $table->foreignId('pending_removal_in_application_id')
                ->nullable()
                ->constrained('property_verification_applications', indexName: 'pm_pending_removal_app_fk')
                ->nullOnDelete();
            $table->string('media_type', 48)->index('pm_media_type_idx');
            $table->string('original_filename', 255);
            $table->string('storage_path', 255)->unique('pm_storage_path_unique');
            $table->string('optimized_private_path', 255)->unique('pm_opt_priv_path_unique');
            $table->string('thumbnail_path', 255)->unique('pm_thumb_priv_path_unique');
            $table->string('public_optimized_path', 255)->nullable()->unique('pm_pub_opt_path_unique');
            $table->string('public_thumbnail_path', 255)->nullable()->unique('pm_pub_thumb_path_unique');
            $table->string('mime_type', 64);
            $table->unsignedBigInteger('file_size');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->string('alt_text', 255);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_cover')->default(false);
            $table->string('moderation_status', 32)
                ->default(PropertyMediaModerationStatus::Pending->value)
                ->index('pm_moderation_status_idx');
            $table->text('moderation_note')->nullable();
            $table->foreignId('moderated_by_admin_id')
                ->nullable()
                ->constrained('admins', indexName: 'pm_moderated_by_admin_fk')
                ->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->string('publication_status', 32)
                ->default(PropertyMediaPublicationStatus::Private->value)
                ->index('pm_publication_status_idx');
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_archived')->default(false)->index('pm_is_archived_idx');
            $table->timestamps();

            $table->index(['property_id', 'sort_order'], 'pm_prop_sort_idx');
            $table->index(['property_id', 'property_room_type_id'], 'pm_prop_room_type_idx');
            $table->index(['property_id', 'property_room_id'], 'pm_prop_room_idx');

            $table->foreign(['property_id', 'property_room_type_id'], 'pm_property_room_type_fk')
                ->references(['property_id', 'id'])
                ->on('property_room_types');
            $table->foreign(['property_id', 'property_room_id'], 'pm_property_room_fk')
                ->references(['property_id', 'id'])
                ->on('property_rooms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_media');
    }
};
