<?php

declare(strict_types=1);

namespace App\Enums;

enum RelocationStatus: string
{
    case Draft = 'draft';
    case Offered = 'offered';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Expired = 'expired';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Offered => 'Alternative Offered',
            self::Accepted => 'Alternative Accepted',
            self::Declined => 'Offer Declined',
            self::Expired => 'Offer Expired',
            self::Cancelled => 'Cancelled',
        };
    }

    public function isActionable(): bool
    {
        return $this === self::Offered;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
