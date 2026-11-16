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
        Schema::create('notification_preferences', function (Blueprint $table): void {
            $table->id();
            $table->morphs('notifiable');
            $table->string('channel', 32);
            $table->string('category', 32);
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(
                ['notifiable_type', 'notifiable_id', 'channel', 'category'],
                'notif_pref_user_channel_cat_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
