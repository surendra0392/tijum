<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('internal_name');
            $table->text('summary')->nullable();
            $table->json('content_blocks')->nullable();
            $table->string('featured_image')->nullable();
            $table->string('status', 32)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_for')->nullable();
            $table->foreignId('author_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('canonical_override')->nullable();
            $table->string('robots_directive', 64)->default('index, follow');
            $table->string('og_image')->nullable();
            $table->unsignedBigInteger('view_count')->default(0);
            $table->timestamps();

            $table->index(['status', 'published_at']);
        });

        Schema::create('content_page_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_page_id')->constrained('content_pages')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->unsignedInteger('version');
            $table->string('title');
            $table->json('content_blocks')->nullable();
            $table->json('seo_payload')->nullable();
            $table->string('change_notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['content_page_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_page_revisions');
        Schema::dropIfExists('content_pages');
    }
};
