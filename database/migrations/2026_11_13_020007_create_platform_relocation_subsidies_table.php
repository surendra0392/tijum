<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_relocation_subsidies', function (Blueprint $table): void {
            $table->id();
            $table->string('subsidy_reference', 64)->unique();
            $table->foreignId('source_reservation_id')->constrained('reservations', indexName: 'prs_src_res_fk')->cascadeOnDelete();
            $table->foreignId('replacement_reservation_id')->constrained('reservations', indexName: 'prs_rep_res_fk')->cascadeOnDelete();
            $table->foreignId('customer_protection_case_id')->nullable()->constrained('customer_protection_cases', indexName: 'prs_case_fk')->nullOnDelete();
            $table->unsignedBigInteger('source_amount_minor');
            $table->unsignedBigInteger('destination_amount_minor');
            $table->unsignedBigInteger('subsidy_amount_minor');
            $table->string('currency', 3)->default('INR');
            $table->string('status', 32)->default('calculated');
            $table->foreignId('approved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('funding_reference', 128)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['source_reservation_id', 'replacement_reservation_id'], 'subsidy_pair_unique');
            $table->index(['status', 'created_at'], 'prs_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_relocation_subsidies');
    }
};
