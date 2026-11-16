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
        Schema::create('owner_business_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')
                ->unique()
                ->constrained('owners')
                ->cascadeOnDelete();
            $table->string('entity_type', 48);
            $table->string('legal_business_name', 180)->nullable();
            $table->string('display_business_name', 180);
            $table->string('primary_contact_name', 150);
            $table->string('primary_contact_designation', 120)->nullable();
            $table->string('business_email', 255)->nullable();
            $table->string('business_address_line_1', 255);
            $table->string('business_address_line_2', 255)->nullable();
            $table->string('locality', 120)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->string('city', 120);
            $table->string('state', 120);
            $table->string('country_code', 4)->default('IN');
            $table->string('website_url', 255)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('owner_business_profiles');
    }
};
