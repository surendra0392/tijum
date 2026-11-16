<?php

declare(strict_types=1);

namespace App\Enums;

enum CaseStatus: string
{
    case Open = 'open';
    case Acknowledged = 'acknowledged';
    case UnderReview = 'under_review';
    case AwaitingCustomer = 'awaiting_customer';
    case AwaitingOwner = 'awaiting_owner';
    case RelocationOffered = 'relocation_offered';
    case RefundReview = 'refund_review';
    case Resolved = 'resolved';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Case Submitted',
            self::Acknowledged => 'Acknowledged by TIJUM',
            self::UnderReview => 'Under Investigation',
            self::AwaitingCustomer => 'Awaiting Customer Response',
            self::AwaitingOwner => 'Awaiting Host Information',
            self::RelocationOffered => 'Alternative Stay Offered',
            self::RefundReview => 'Refund Under Review',
            self::Resolved => 'Resolved',
            self::Closed => 'Case Closed',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Resolved, self::Closed], true);
    }

    public function badgeVariant(): string
    {
        return match ($this) {
            self::Open => 'secondary',
            self::Acknowledged, self::UnderReview => 'info',
            self::AwaitingCustomer, self::AwaitingOwner => 'warning',
            self::RelocationOffered, self::RefundReview => 'purple',
            self::Resolved, self::Closed => 'success',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
