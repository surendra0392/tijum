<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt');
            $table->longText('content');
            $table->string('featured_image')->nullable();
            $table->foreignId('author_id')->nullable()->constrained('content_authors')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('blog_categories')->nullOnDelete();
            $table->unsignedSmallInteger('reading_time_minutes')->default(5);
            $table->string('status', 32)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_for')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('canonical_override')->nullable();
            $table->string('og_image')->nullable();
            $table->unsignedBigInteger('view_count')->default(0);
            $table->timestamps();

            $table->index(['status', 'published_at']);
            $table->index('category_id');
            $table->index('author_id');
        });

        Schema::create('blog_article_tag', function (Blueprint $table) {
            $table->foreignId('blog_article_id')->constrained('blog_articles')->cascadeOnDelete();
            $table->foreignId('blog_tag_id')->constrained('blog_tags')->cascadeOnDelete();
            $table->primary(['blog_article_id', 'blog_tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_article_tag');
        Schema::dropIfExists('blog_articles');
    }
};
