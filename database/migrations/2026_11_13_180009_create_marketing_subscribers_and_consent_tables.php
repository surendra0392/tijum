<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name')->nullable();
            $table->string('status', 32)->default('pending_confirmation');
            $table->string('confirmation_token', 64)->nullable()->unique();
            $table->timestamp('confirmed_at')->nullable();
            $table->string('unsubscribe_token', 64)->unique();
            $table->timestamp('unsubscribed_at')->nullable();
            $table->string('source', 64)->default('footer_newsletter');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::create('marketing_consent_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketing_subscriber_id')->constrained('marketing_subscribers')->cascadeOnDelete();
            $table->string('action', 32);
            $table->string('channel', 32)->default('email');
            $table->string('source', 64);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['marketing_subscriber_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_consent_records');
        Schema::dropIfExists('marketing_subscribers');
    }
};
