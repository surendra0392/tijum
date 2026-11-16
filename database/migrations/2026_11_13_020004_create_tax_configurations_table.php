<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_configurations', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name', 128);
            $table->string('legal_reference', 255);
            $table->string('supplier_type', 64)->default('all');
            $table->unsignedInteger('rate_bps')->default(0);
            $table->string('calculation_base', 64)->default('gross_amount');
            $table->unsignedBigInteger('threshold_minor')->default(0);
            $table->boolean('is_exempt')->default(false);
            $table->date('effective_from');
            $table->date('effective_until')->nullable();
            $table->boolean('is_approved')->default(false);
            $table->foreignId('approved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('ca_approval_reference', 128)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['code', 'is_approved', 'effective_from'], 'tax_cfg_code_approved_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_configurations');
    }
};
