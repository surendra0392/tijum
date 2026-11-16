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
        Schema::create('notification_consent_records', function (Blueprint $table): void {
            $table->id();
            $table->morphs('notifiable');
            $table->string('channel', 32)->index();
            $table->string('category', 32)->index();
            $table->string('consent_status', 32)->index();
            $table->string('consent_action', 32);
            $table->string('source', 64);
            $table->string('policy_version', 16)->default('2026.1');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_consent_records');
    }
};
