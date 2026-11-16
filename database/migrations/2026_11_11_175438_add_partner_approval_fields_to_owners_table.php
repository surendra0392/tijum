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
        Schema::table('owners', function (Blueprint $table): void {
            $table->foreignId('approved_by_admin_id')
                ->nullable()
                ->after('status')
                ->constrained('admins')
                ->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by_admin_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('owners', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('approved_by_admin_id');
            $table->dropColumn('approved_at');
        });
    }
};
