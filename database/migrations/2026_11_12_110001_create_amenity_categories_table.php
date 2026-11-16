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
        Schema::create('amenity_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 64)->unique('amenity_categories_code_unique');
            $table->string('name', 120);
            $table->string('slug', 140)->unique('amenity_categories_slug_unique');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('display_order')->default(0)->index('amenity_categories_display_order_idx');
            $table->boolean('is_active')->default(true)->index('amenity_categories_is_active_idx');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('amenity_categories');
    }
};
