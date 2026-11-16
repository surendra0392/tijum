<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('amenities', 'supports_additional_charge')) {
            Schema::table('amenities', function (Blueprint $table): void {
                $table->dropColumn('supports_additional_charge');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('amenities', 'supports_additional_charge')) {
            Schema::table('amenities', function (Blueprint $table): void {
                $table->boolean('supports_additional_charge')->default(false)->after('icon_key');
            });
        }
    }
};
