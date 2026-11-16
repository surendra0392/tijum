<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyOperationalStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case TemporarilyClosed = 'temporarily_closed';
    case Suspended = 'suspended';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::TemporarilyClosed => 'Temporarily Closed',
            self::Suspended => 'Suspended',
            self::Archived => 'Archived',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Draft => 'Property setup is being completed before submission for TIJUM verification.',
            self::Active => 'Property is approved and operationally active within the TIJUM Partner Portal.',
            self::TemporarilyClosed => 'Partner has temporarily paused offering this property without losing approval history.',
            self::Suspended => 'Property has been suspended by TIJUM administration and is withheld from public listing.',
            self::Archived => 'Property has been permanently withdrawn from active partner inventory.',
        };
    }

    public function allowsPublicVisibility(): bool
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
