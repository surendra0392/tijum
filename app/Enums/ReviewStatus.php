<?php

declare(strict_types=1);

namespace App\Enums;

enum ReviewStatus: string
{
    case PendingModeration = 'pending_moderation';
    case Published = 'published';
    case RequiresChanges = 'requires_changes';
    case Rejected = 'rejected';
    case Hidden = 'hidden';

    public function label(): string
    {
        return match ($this) {
            self::PendingModeration => 'Submitted for Review',
            self::Published => 'Published',
            self::RequiresChanges => 'Requires Changes',
            self::Rejected => 'Not Published',
            self::Hidden => 'Removed Following Review Policy Decision',
        };
    }

    public function isPublic(): bool
    {
        return $this === self::Published;
    }

    public function isEditable(): bool
    {
        return in_array($this, [self::PendingModeration, self::Published, self::RequiresChanges], true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
