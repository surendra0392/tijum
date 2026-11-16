<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyRoomStatus: string
{
    case Active = 'active';
    case Maintenance = 'maintenance';
    case Blocked = 'blocked';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Maintenance => 'Maintenance',
            self::Blocked => 'Blocked',
            self::Inactive => 'Inactive',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Active => 'Operational room contributing occupancy capacity to future booking inventory.',
            self::Maintenance => 'Temporarily offline for maintenance or repair; does not revoke property approval.',
            self::Blocked => 'Manually blocked by the partner or administration; does not trigger re-verification.',
            self::Inactive => 'Decommissioned from active operational inventory while retaining audit history.',
        };
    }

    public function countsTowardActiveCapacity(): bool
    {
        return $this === self::Active;
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
