<?php

declare(strict_types=1);

namespace App\Enums;

enum RefundStatus: string
{
    case Requested = 'requested';
    case Approved = 'approved';
    case Pending = 'pending';
    case Uncertain = 'uncertain';
    case Processing = 'processing';
    case Processed = 'processed';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Requested => 'Refund Requested',
            self::Approved => 'Refund Approved',
            self::Pending => 'Gateway Request Pending',
            self::Uncertain => 'Gateway Outcome Uncertain',
            self::Processing => 'Gateway Processing',
            self::Processed => 'Refund Processed',
            self::Failed => 'Refund Failed',
        };
    }

    public function semantic(): string
    {
        return match ($this) {
            self::Requested, self::Approved, self::Pending, self::Uncertain, self::Processing => 'pending',
            self::Processed => 'verified',
            self::Failed => 'rejected',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $status): string => $status->value,
            self::cases(),
        );
    }
}
