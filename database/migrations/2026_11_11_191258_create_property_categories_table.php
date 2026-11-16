<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('property_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 120)->unique('pc_slug_unique');
            $table->string('code', 64)->unique('pc_code_unique');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true)->index('pc_is_active_idx');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();

        DB::table('property_categories')->insert([
            [
                'name' => 'Independent Hostel',
                'slug' => 'independent-hostel',
                'code' => 'hostel',
                'description' => 'Student and working-professional shared/private accommodation offering regular home-style meals and structured house rules.',
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'PG Accommodation',
                'slug' => 'pg-accommodation',
                'code' => 'pg',
                'description' => 'Paying guest stays providing managed shared or single-occupancy rooms with mandatory daily food packages.',
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Homestay',
                'slug' => 'homestay',
                'code' => 'homestay',
                'description' => 'Warm host-managed residential accommodation with authentic regional dining included for short, weekly, and monthly guests.',
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_categories');
    }
};
