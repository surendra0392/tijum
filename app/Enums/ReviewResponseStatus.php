<?php

declare(strict_types=1);

namespace App\Enums;

enum ReviewResponseStatus: string
{
    case PendingModeration = 'pending_moderation';
    case Published = 'published';
    case Rejected = 'rejected';
    case Hidden = 'hidden';

    public function label(): string
    {
        return match ($this) {
            self::PendingModeration => 'Response Pending Moderation',
            self::Published => 'Response Published',
            self::Rejected => 'Response Not Published',
            self::Hidden => 'Response Hidden',
        };
    }

    public function isPublic(): bool
    {
        return $this === self::Published;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
