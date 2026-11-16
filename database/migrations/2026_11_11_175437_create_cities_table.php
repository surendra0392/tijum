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
        Schema::create('cities', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 120)->unique();
            $table->string('state', 120);
            $table->string('state_code', 16)->nullable();
            $table->string('country_code', 4)->default('IN');
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();

        DB::table('cities')->insert([
            [
                'name' => 'Hyderabad',
                'slug' => 'hyderabad',
                'state' => 'Telangana',
                'state_code' => 'TG',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Guntur',
                'slug' => 'guntur',
                'state' => 'Andhra Pradesh',
                'state_code' => 'AP',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Vijayawada',
                'slug' => 'vijayawada',
                'state' => 'Andhra Pradesh',
                'state_code' => 'AP',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Visakhapatnam',
                'slug' => 'visakhapatnam',
                'state' => 'Andhra Pradesh',
                'state_code' => 'AP',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 4,
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
        Schema::dropIfExists('cities');
    }
};
