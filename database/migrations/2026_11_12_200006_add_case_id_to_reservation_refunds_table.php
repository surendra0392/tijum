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
        Schema::table('reservation_refunds', function (Blueprint $table): void {
            $table->foreignId('customer_protection_case_id')
                ->nullable()
                ->after('reservation_id')
                ->constrained('customer_protection_cases', 'id', 'res_refunds_case_id_fk')
                ->nullOnDelete();

            $table->index(['customer_protection_case_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservation_refunds', function (Blueprint $table): void {
            $table->dropForeign('res_refunds_case_id_fk');
            $table->dropColumn('customer_protection_case_id');
        });
    }
};
