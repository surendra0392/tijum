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
        Schema::table('platform_settings', function (Blueprint $table): void {
            $table->boolean('is_secret')->default(false)->after('group');
            $table->boolean('is_public')->default(false)->after('is_secret');
            $table->string('data_type', 32)->default('string')->after('is_public');
        });

        Schema::create('platform_setting_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 128)->index();
            $table->string('group', 64)->index();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_setting_audit_logs');

        Schema::table('platform_settings', function (Blueprint $table): void {
            $table->dropColumn(['is_secret', 'is_public', 'data_type']);
        });
    }
};
