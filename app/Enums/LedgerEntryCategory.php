<?php

declare(strict_types=1);

namespace App\Enums;

enum LedgerEntryCategory: string
{
    case PaymentCaptured = 'payment_captured';
    case PartnerPayable = 'partner_payable';
    case CommissionRevenue = 'commission_revenue';
    case CommissionGst = 'commission_gst';
    case TdsWithheld = 'tds_withheld';
    case TcsLiability = 'tcs_liability';
    case Section95Liability = 'section_9_5_liability';
    case RefundLiability = 'refund_liability';
    case RefundCompleted = 'refund_completed';
    case TransferPending = 'transfer_pending';
    case TransferCompleted = 'transfer_completed';
    case GatewayFee = 'gateway_fee';
    case TransferFee = 'transfer_fee';
    case RelocationSubsidy = 'relocation_subsidy';
    case TransferReversal = 'transfer_reversal';

    public function label(): string
    {
        return match ($this) {
            self::PaymentCaptured => 'Customer Payment Captured',
            self::PartnerPayable => 'Partner Accommodation Payable',
            self::CommissionRevenue => 'TIJUM Commission Revenue',
            self::CommissionGst => 'GST on Commission',
            self::TdsWithheld => 'TDS Withheld (Income Tax)',
            self::TcsLiability => 'GST TCS Liability',
            self::Section95Liability => 'Section 9(5) Tax Liability',
            self::RefundLiability => 'Customer Refund Liability',
            self::RefundCompleted => 'Customer Refund Completed',
            self::TransferPending => 'Partner Transfer Dispatched',
            self::TransferCompleted => 'Partner Transfer Completed',
            self::GatewayFee => 'Payment Gateway Fee',
            self::TransferFee => 'Provider Transfer Fee',
            self::RelocationSubsidy => 'Platform Relocation Subsidy',
            self::TransferReversal => 'Provider Transfer Reversal',
        };
    }
}
