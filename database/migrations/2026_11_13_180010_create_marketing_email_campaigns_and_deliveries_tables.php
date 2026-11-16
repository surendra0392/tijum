<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_email_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->string('title');
            $table->string('subject');
            $table->string('preview_text')->nullable();
            $table->longText('content_html');
            $table->longText('content_text')->nullable();
            $table->string('target_segment', 64)->default('all_confirmed');
            $table->string('status', 32)->default('draft');
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->unsignedInteger('total_recipients')->default(0);
            $table->unsignedInteger('delivered_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'scheduled_for']);
        });

        Schema::create('marketing_campaign_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_campaign_id')->constrained('marketing_email_campaigns')->cascadeOnDelete();
            $table->foreignId('subscriber_id')->constrained('marketing_subscribers')->cascadeOnDelete();
            $table->string('email');
            $table->string('status', 32)->default('queued');
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(['email_campaign_id', 'subscriber_id'], 'campaign_subscriber_unique');
            $table->index(['email_campaign_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaign_deliveries');
        Schema::dropIfExists('marketing_email_campaigns');
    }
};
