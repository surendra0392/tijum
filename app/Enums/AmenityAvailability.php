<?php

declare(strict_types=1);

namespace App\Enums;

enum AmenityAvailability: string
{
    case Included = 'included';
    case NotAvailable = 'not_available';

    public function label(): string
    {
        return match ($this) {
            self::Included => 'Included',
            self::NotAvailable => 'Not available',
        };
    }

    public function isCustomerPresentable(): bool
    {
        return $this !== self::NotAvailable;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $case): string => $case->value,
            self::cases(),
        );
    }
}
