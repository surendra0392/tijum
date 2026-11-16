<?php

declare(strict_types=1);

namespace App\Enums;

enum OwnerVerificationDocumentStatus: string
{
    case Uploaded = 'uploaded';
    case Reviewed = 'reviewed';
    case Rejected = 'rejected';
    case Replaced = 'replaced';

    public function label(): string
    {
        return match ($this) {
            self::Uploaded => 'Uploaded',
            self::Reviewed => 'Reviewed',
            self::Rejected => 'Needs Replacement',
            self::Replaced => 'Replaced',
        };
    }

    public function isActiveDocument(): bool
    {
        return $this !== self::Replaced;
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
