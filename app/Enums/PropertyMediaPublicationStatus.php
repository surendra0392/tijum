<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyMediaPublicationStatus: string
{
    case Private = 'private';
    case Publishing = 'publishing';
    case Published = 'published';
    case Unpublished = 'unpublished';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Private => 'Private (Unpublished)',
            self::Publishing => 'Publishing',
            self::Published => 'Published to Public Media',
            self::Unpublished => 'Unpublished',
            self::Failed => 'Publication Retry Queued',
        };
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
