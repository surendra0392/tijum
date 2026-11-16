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
        Schema::create('amenities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('amenity_category_id')
                ->constrained('amenity_categories', indexName: 'amenities_category_fk')
                ->restrictOnDelete();
            $table->string('code', 80)->unique('amenities_code_unique');
            $table->string('name', 150);
            $table->string('slug', 180)->unique('amenities_slug_unique');
            $table->text('description')->nullable();
            $table->string('applicability_scope', 24)->index('amenities_applicability_scope_idx');
            $table->string('icon_key', 80)->nullable()->index('amenities_icon_key_idx');
            $table->boolean('is_customer_visible')->default(true)->index('amenities_is_customer_visible_idx');
            $table->boolean('requires_review')->default(true)->index('amenities_requires_review_idx');
            $table->unsignedSmallInteger('display_order')->default(0)->index('amenities_display_order_idx');
            $table->boolean('is_active')->default(true)->index('amenities_is_active_idx');
            $table->timestamps();

            $table->index(['amenity_category_id', 'is_active', 'display_order'], 'amenities_category_active_order_idx');
            $table->index(['applicability_scope', 'is_active'], 'amenities_scope_active_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('amenities');
    }
};
