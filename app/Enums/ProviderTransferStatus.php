<?php

declare(strict_types=1);

namespace App\Enums;

enum ProviderTransferStatus: string
{
    case Pending = 'pending';
    case Processed = 'processed';
    case Failed = 'failed';
    case Reversed = 'reversed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending Dispatch',
            self::Processed => 'Processed by Provider',
            self::Failed => 'Provider Failed',
            self::Reversed => 'Reversed',
        };
    }
}
