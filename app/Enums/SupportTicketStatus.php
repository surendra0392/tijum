<?php

declare(strict_types=1);

namespace App\Enums;

enum SupportTicketStatus: string
{
    case Open = 'open';
    case InProgress = 'in_progress';
    case WaitingUser = 'waiting_user';
    case Resolved = 'resolved';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open',
            self::InProgress => 'In Progress',
            self::WaitingUser => 'Waiting for Reply',
            self::Resolved => 'Resolved',
            self::Closed => 'Closed',
        };
    }

    public function badgeVariant(): string
    {
        return match ($this) {
            self::Open => 'outline',
            self::InProgress => 'default',
            self::WaitingUser => 'secondary',
            self::Resolved => 'secondary',
            self::Closed => 'outline',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Resolved, self::Closed], true);
    }
}
