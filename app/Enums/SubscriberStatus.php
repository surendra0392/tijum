<?php

declare(strict_types=1);

namespace App\Enums;

enum SubscriberStatus: string
{
    case PendingConfirmation = 'pending_confirmation';
    case Subscribed = 'subscribed';
    case Unsubscribed = 'unsubscribed';
    case Bounced = 'bounced';

    public function label(): string
    {
        return match ($this) {
            self::PendingConfirmation => 'Pending Confirmation',
            self::Subscribed => 'Subscribed',
            self::Unsubscribed => 'Unsubscribed',
            self::Bounced => 'Bounced',
        };
    }

    public function isEligibleForMarketing(): bool
    {
        return $this === self::Subscribed;
    }
}
