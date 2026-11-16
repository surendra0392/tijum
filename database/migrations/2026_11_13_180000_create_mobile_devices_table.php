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
        Schema::create('mobile_devices', function (Blueprint $table): void {
            $table->id();
            $table->string('device_installation_id');
            $table->string('notifiable_type');
            $table->unsignedBigInteger('notifiable_id');
            $table->string('platform', 20); // 'android' or 'ios'
            $table->text('push_token')->nullable();
            $table->string('push_token_hash', 64)->nullable()->index();
            $table->string('app_version', 50)->nullable();
            $table->string('device_name', 100)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id'], 'mobile_devices_notifiable_idx');
            $table->index(['device_installation_id', 'notifiable_type', 'notifiable_id'], 'mobile_devices_lookup_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mobile_devices');
    }
};
