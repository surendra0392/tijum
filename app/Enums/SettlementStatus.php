<?php

declare(strict_types=1);

namespace App\Enums;

enum SettlementStatus: string
{
    case Draft = 'draft';
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case TransferPending = 'transfer_pending';
    case Settled = 'settled';
    case Failed = 'failed';
    case OnHold = 'on_hold';
    case Reversed = 'reversed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft Calculation',
            self::PendingApproval => 'Pending Finance Approval',
            self::Approved => 'Approved for Transfer',
            self::TransferPending => 'Transfer In Progress',
            self::Settled => 'Successfully Settled',
            self::Failed => 'Transfer Failed',
            self::OnHold => 'On Financial Hold',
            self::Reversed => 'Transfer Reversed',
            self::Cancelled => 'Cancelled',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Settled, self::Reversed, self::Cancelled], true);
    }
}
