<?php

declare(strict_types=1);

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
        Schema::create('notification_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 64)->index();
            $table->string('provider_event_id', 120)->nullable();
            $table->string('provider_message_id', 120)->nullable()->index();
            $table->string('event_type', 64)->index();
            $table->json('payload');
            $table->boolean('processed')->default(false)->index();
            $table->timestamp('processed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['provider', 'provider_event_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_webhook_events');
    }
};
