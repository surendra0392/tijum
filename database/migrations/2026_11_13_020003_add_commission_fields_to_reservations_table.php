<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->foreignId('commission_agreement_id')->nullable()->after('payment_deadline_at')
                ->constrained('partner_commission_agreements')->nullOnDelete();
            $table->string('commission_agreement_version', 32)->nullable()->after('commission_agreement_id');
            $table->unsignedInteger('commission_rate_bps')->nullable()->after('commission_agreement_version');
            $table->string('commission_base_type', 32)->nullable()->after('commission_rate_bps');
            $table->unsignedBigInteger('commissionable_base_minor')->nullable()->after('commission_base_type');
            $table->unsignedBigInteger('commission_amount_minor')->nullable()->after('commissionable_base_minor');
            $table->unsignedBigInteger('commission_tax_amount_minor')->nullable()->after('commission_amount_minor');
            $table->unsignedBigInteger('net_partner_payable_minor')->nullable()->after('commission_tax_amount_minor');
            $table->string('commission_currency', 3)->default('INR')->after('net_partner_payable_minor');
            $table->string('commission_status', 32)->default('unassigned')->after('commission_currency');

            $table->index(['commission_status', 'checkout_date'], 'res_commission_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropForeign(['commission_agreement_id']);
            $table->dropIndex('res_commission_status_idx');
            $table->dropColumn([
                'commission_agreement_id',
                'commission_agreement_version',
                'commission_rate_bps',
                'commission_base_type',
                'commissionable_base_minor',
                'commission_amount_minor',
                'commission_tax_amount_minor',
                'net_partner_payable_minor',
                'commission_currency',
                'commission_status',
            ]);
        });
    }
};
