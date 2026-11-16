<?php

declare(strict_types=1);

namespace App\Enums;

enum SettlementItemType: string
{
    case BookingPayable = 'booking_payable';
    case RefundDeduction = 'refund_deduction';
    case RelocationAdjustment = 'relocation_adjustment';
    case StatutoryWithholding = 'statutory_withholding';

    public function label(): string
    {
        return match ($this) {
            self::BookingPayable => 'Booking Accommodation Payable',
            self::RefundDeduction => 'Customer Refund Deduction',
            self::RelocationAdjustment => 'Relocation Adjustment',
            self::StatutoryWithholding => 'Statutory Tax Withholding',
        };
    }
}
