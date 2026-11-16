<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentStatus: string
{
    case Created = 'created';
    case Pending = 'pending';
    case Authorized = 'authorized';
    case Captured = 'captured';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case RefundPending = 'refund_pending';
    case PartiallyRefunded = 'partially_refunded';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Created',
            self::Pending => 'Pending',
            self::Authorized => 'Authorized',
            self::Captured => 'Captured',
            self::Failed => 'Failed',
            self::Cancelled => 'Cancelled',
            self::RefundPending => 'Refund Pending',
            self::PartiallyRefunded => 'Partially Refunded',
            self::Refunded => 'Refunded',
        };
    }

    public function semantic(): string
    {
        return match ($this) {
            self::Created, self::Pending => 'pending',
            self::Authorized => 'info',
            self::Captured => 'verified',
            self::Failed, self::Cancelled => 'rejected',
            self::RefundPending => 'warning',
            self::PartiallyRefunded, self::Refunded => 'neutral',
        };
    }

    public function isSuccess(): bool
    {
        return in_array($this, [self::Captured, self::RefundPending, self::PartiallyRefunded, self::Refunded], true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Failed, self::Cancelled, self::Refunded], true);
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
