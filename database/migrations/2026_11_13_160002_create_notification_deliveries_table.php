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
        Schema::create('notification_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('event_id', 64)->index();
            $table->string('idempotency_key', 100)->unique();
            $table->morphs('notifiable');
            $table->string('channel', 32)->index();
            $table->string('category', 32)->index();
            $table->string('template_code', 64)->index();
            $table->string('template_version', 16)->default('1.0');
            $table->string('recipient_destination', 120)->nullable();
            $table->string('status', 32)->index()->default('queued');
            $table->string('provider', 64)->nullable()->index();
            $table->string('provider_message_id', 120)->nullable()->index();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->string('subject', 255)->nullable();
            $table->json('payload')->nullable();
            $table->string('error_code', 64)->nullable();
            $table->text('error_description')->nullable();
            $table->nullableMorphs('related');
            $table->string('related_reference', 64)->nullable()->index();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['created_at', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_deliveries');
    }
};
