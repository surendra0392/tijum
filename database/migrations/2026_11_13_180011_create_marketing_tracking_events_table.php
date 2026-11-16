<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_tracking_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 64);
            $table->string('event_key', 128)->nullable();
            $table->string('page_url');
            $table->string('utm_source', 64)->nullable();
            $table->string('utm_medium', 64)->nullable();
            $table->string('utm_campaign', 64)->nullable();
            $table->string('utm_content', 64)->nullable();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->string('ip_hash', 64)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['event_type', 'created_at']);
            $table->index(['utm_campaign', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_tracking_events');
    }
};
