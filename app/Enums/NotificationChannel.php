<?php

declare(strict_types=1);

namespace App\Enums;

enum NotificationChannel: string
{
    case InApp = 'in_app';
    case Email = 'email';
    case Sms = 'sms';
    case WhatsApp = 'whatsapp';
    case Push = 'push';

    public function label(): string
    {
        return match ($this) {
            self::InApp => 'In-App Portal',
            self::Email => 'Email',
            self::Sms => 'SMS',
            self::WhatsApp => 'WhatsApp',
            self::Push => 'Mobile Push',
        };
    }

    public function iconKey(): string
    {
        return match ($this) {
            self::InApp => 'bell',
            self::Email => 'mail',
            self::Sms => 'message-square',
            self::WhatsApp => 'phone',
            self::Push => 'smartphone',
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
