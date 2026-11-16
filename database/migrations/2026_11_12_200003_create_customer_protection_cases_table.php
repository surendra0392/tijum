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
        Schema::create('customer_protection_cases', function (Blueprint $table): void {
            $table->id();
            $table->string('case_reference', 48)->unique();
            $table->foreignId('reservation_id')->constrained('reservations')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('property_id')->constrained('properties')->restrictOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->restrictOnDelete();
            $table->string('category', 64);
            $table->string('status', 32)->default('open');
            $table->string('priority', 32)->default('standard');
            $table->text('description');
            $table->foreignId('assigned_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('sla_due_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->string('resolution_type', 64)->nullable();
            $table->text('resolution_summary')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['owner_id', 'status']);
            $table->index(['reservation_id']);
            $table->index(['status', 'priority', 'sla_due_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_protection_cases');
    }
};
