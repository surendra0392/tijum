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
        Schema::create('support_tickets', function (Blueprint $table): void {
            $table->id();
            $table->string('ticket_reference', 48)->unique();
            $table->string('ticket_type', 32)->index(); // 'customer' or 'partner'
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->foreignId('property_id')->nullable()->constrained('properties')->nullOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->string('subject', 255);
            $table->string('category', 64)->index();
            $table->string('status', 32)->default('open')->index();
            $table->string('priority', 32)->default('standard')->index();
            $table->text('message');
            $table->foreignId('assigned_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamp('sla_due_at')->nullable()->index();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_summary')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('last_reply_at')->nullable();
            $table->string('last_reply_by_type', 32)->nullable();
            $table->timestamps();

            $table->index(['ticket_type', 'status', 'created_at'], 'sup_type_status_created_idx');
            $table->index(['ticket_type', 'owner_id', 'status'], 'sup_type_owner_status_idx');
            $table->index(['ticket_type', 'user_id', 'status'], 'sup_type_user_status_idx');
        });

        Schema::create('support_ticket_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->string('sender_type', 32); // 'customer', 'partner', 'admin'
            $table->unsignedBigInteger('sender_id');
            $table->string('sender_name', 255);
            $table->text('message');
            $table->string('attachment_path', 500)->nullable();
            $table->string('attachment_name', 255)->nullable();
            $table->string('attachment_mime', 128)->nullable();
            $table->boolean('is_internal_note')->default(false);
            $table->timestamps();

            $table->index(['support_ticket_id', 'created_at'], 'sup_msg_ticket_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
    }
};
