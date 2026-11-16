<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_ledger_entries', function (Blueprint $table): void {
            $table->id();
            $table->string('entry_reference', 64)->unique();
            $table->string('journal_reference', 64);
            $table->string('entry_category', 64);
            $table->unsignedBigInteger('debit_minor')->default(0);
            $table->unsignedBigInteger('credit_minor')->default(0);
            $table->string('currency', 3)->default('INR');
            $table->string('entity_type', 128);
            $table->unsignedBigInteger('entity_id');
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('posted_at');
            $table->timestamps();

            $table->index('journal_reference', 'fle_journal_ref_idx');
            $table->index('entry_category', 'fle_entry_category_idx');
            $table->index(['entity_type', 'entity_id'], 'fle_entity_idx');
            $table->index(['owner_id', 'posted_at'], 'fle_owner_posted_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_ledger_entries');
    }
};
