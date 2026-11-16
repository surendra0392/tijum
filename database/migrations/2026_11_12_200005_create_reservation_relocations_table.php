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
        Schema::create('reservation_relocations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_protection_case_id')
                ->nullable()
                ->constrained('customer_protection_cases', 'id', 'res_reloc_case_id_fk')
                ->nullOnDelete();
            $table->foreignId('source_reservation_id')
                ->constrained('reservations', 'id', 'res_reloc_src_res_id_fk')
                ->restrictOnDelete();
            $table->foreignId('destination_property_id')
                ->constrained('properties', 'id', 'res_reloc_dst_prop_id_fk')
                ->restrictOnDelete();
            $table->foreignId('destination_room_type_id')
                ->constrained('property_room_types', 'id', 'res_reloc_dst_rt_id_fk')
                ->restrictOnDelete();
            $table->foreignId('destination_owner_id')
                ->constrained('owners', 'id', 'res_reloc_dst_owner_id_fk')
                ->restrictOnDelete();
            $table->foreignId('replacement_reservation_id')
                ->nullable()
                ->constrained('reservations', 'id', 'res_reloc_rep_res_id_fk')
                ->nullOnDelete();
            $table->string('status', 32)->default('draft'); // draft, offered, accepted, declined, expired, cancelled
            $table->unsignedInteger('offered_quantity');
            $table->date('offered_check_in_date');
            $table->date('offered_checkout_date');
            $table->unsignedBigInteger('original_amount_minor');
            $table->unsignedBigInteger('alternative_amount_minor');
            $table->bigInteger('price_difference_minor')->default(0); // If positive, refund due to customer
            $table->foreignId('difference_refund_id')
                ->nullable()
                ->constrained('reservation_refunds', 'id', 'res_reloc_diff_rfnd_id_fk')
                ->nullOnDelete();
            $table->timestamp('destination_owner_accepted_at')->nullable();
            $table->timestamp('customer_decision_at')->nullable();
            $table->string('customer_decision', 32)->nullable(); // accepted, declined
            $table->timestamp('offer_expires_at');
            $table->foreignId('created_by_admin_id')
                ->constrained('admins', 'id', 'res_reloc_admin_id_fk')
                ->restrictOnDelete();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->index(['source_reservation_id', 'status'], 'res_reloc_src_status_idx');
            $table->index(['destination_property_id', 'status'], 'res_reloc_dst_prop_status_idx');
            $table->index(['destination_owner_id', 'status'], 'res_reloc_dst_owner_status_idx');
            $table->index(['customer_protection_case_id'], 'res_reloc_case_id_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservation_relocations');
    }
};
