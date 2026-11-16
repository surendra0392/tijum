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
        Schema::table('partner_settlement_items', function (Blueprint $table): void {
            $table->unsignedBigInteger('refund_deduction_minor')
                ->default(0)
                ->after('tax_deduction_minor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('partner_settlement_items', function (Blueprint $table): void {
            $table->dropColumn('refund_deduction_minor');
        });
    }
};
