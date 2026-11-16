<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('objective', 64)->default('awareness');
            $table->string('utm_source', 64)->default('tijum_marketing');
            $table->string('utm_medium', 64)->default('onsite');
            $table->string('utm_campaign', 64);
            $table->string('utm_content', 64)->nullable();
            $table->string('target_landing_url')->default('/');
            $table->string('status', 32)->default('draft');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'starts_at', 'ends_at']);
        });

        Schema::create('marketing_banners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->string('name');
            $table->string('headline');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('cta_text');
            $table->string('cta_url');
            $table->string('placement', 64)->default('homepage_strip');
            $table->integer('display_order')->default(0);
            $table->string('status', 32)->default('draft');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedBigInteger('impression_count')->default(0);
            $table->unsignedBigInteger('click_count')->default(0);
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['placement', 'status', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_banners');
        Schema::dropIfExists('marketing_campaigns');
    }
};
