<?php

declare(strict_types=1);

namespace App\Enums;

enum CommissionSnapshotStatus: string
{
    case Unassigned = 'unassigned';
    case Snapshotted = 'snapshotted';
    case SettlementPending = 'settlement_pending';
    case Settled = 'settled';
    case Waived = 'waived';

    public function label(): string
    {
        return match ($this) {
            self::Unassigned => 'Legacy / Unassigned',
            self::Snapshotted => 'Commission Snapshotted',
            self::SettlementPending => 'Settlement Pending',
            self::Settled => 'Settled',
            self::Waived => 'Waived / Unfulfilled',
        };
    }
}
