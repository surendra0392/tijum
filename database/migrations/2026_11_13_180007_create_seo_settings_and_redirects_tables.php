<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_name')->default('TIJUM');
            $table->string('title_template')->default('%s | TIJUM');
            $table->text('default_meta_description')->nullable();
            $table->string('default_og_image')->nullable();
            $table->string('default_robots', 64)->default('index, follow');
            $table->string('google_site_verification')->nullable();
            $table->string('bing_site_verification')->nullable();
            $table->foreignId('updated_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('seo_redirects', function (Blueprint $table) {
            $table->id();
            $table->string('source_path')->unique();
            $table->string('destination_url');
            $table->unsignedSmallInteger('http_status')->default(301);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('hits_count')->default(0);
            $table->timestamp('last_hit_at')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_active', 'source_path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_redirects');
        Schema::dropIfExists('seo_settings');
    }
};
