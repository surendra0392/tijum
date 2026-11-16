<?php

declare(strict_types=1);

namespace App\Enums;

enum NotificationCategory: string
{
    case EssentialTransactional = 'essential_transactional';
    case OperationalUpdate = 'operational_update';
    case Marketing = 'marketing';

    public function label(): string
    {
        return match ($this) {
            self::EssentialTransactional => 'Essential Transactional',
            self::OperationalUpdate => 'Operational Updates',
            self::Marketing => 'Marketing & Promotional',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::EssentialTransactional => 'Critical notices regarding bookings, payments, refunds, security, and dispute resolution.',
            self::OperationalUpdate => 'Reminders, review invitations, and non-urgent property or account status alerts.',
            self::Marketing => 'Promotional offers, partner highlights, and platform recommendations (disabled by policy).',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $c): string => $c->value, self::cases());
    }
}
