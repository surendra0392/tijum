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
        Schema::table('financial_ledger_entries', function (Blueprint $table): void {
            $table->string('idempotency_key', 128)->nullable()->after('journal_reference');
            $table->unsignedSmallInteger('line_number')->nullable()->after('idempotency_key');
            $table->timestamp('effective_at')->nullable()->after('posted_at');
            $table->boolean('is_corrective')->default(false)->after('effective_at');

            $table->unique(['idempotency_key', 'line_number'], 'fle_idempotency_line_unique');
            $table->index(['entity_type', 'entity_id', 'entry_category'], 'fle_entity_category_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('financial_ledger_entries', function (Blueprint $table): void {
            $table->dropUnique('fle_idempotency_line_unique');
            $table->dropIndex('fle_entity_category_idx');
            $table->dropColumn([
                'idempotency_key',
                'line_number',
                'effective_at',
                'is_corrective',
            ]);
        });
    }
};
