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
        Schema::create('customer_protection_case_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_protection_case_id')
                ->constrained('customer_protection_cases', 'id', 'cpc_messages_case_id_fk')
                ->cascadeOnDelete();
            $table->string('sender_type', 32); // 'customer', 'owner', 'admin'
            $table->unsignedBigInteger('sender_id');
            $table->string('sender_name', 255);
            $table->text('message');
            $table->string('attachment_path', 500)->nullable();
            $table->string('attachment_name', 255)->nullable();
            $table->string('attachment_mime', 128)->nullable();
            $table->boolean('is_internal_note')->default(false);
            $table->timestamps();

            $table->index(['customer_protection_case_id', 'created_at'], 'cpc_msg_case_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_protection_case_messages');
    }
};
