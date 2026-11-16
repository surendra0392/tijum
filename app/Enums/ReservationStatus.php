<?php

declare(strict_types=1);

namespace App\Enums;

enum ReservationStatus: string
{
    case AwaitingPayment = 'awaiting_payment';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::AwaitingPayment => 'Awaiting Payment',
            self::Confirmed => 'Confirmed',
            self::Cancelled => 'Cancelled',
            self::Expired => 'Expired',
        };
    }

    public function semantic(): string
    {
        return match ($this) {
            self::AwaitingPayment => 'pending',
            self::Confirmed => 'verified',
            self::Cancelled => 'cancelled',
            self::Expired => 'cancelled',
        };
    }

    public function consumesCapacity(): bool
    {
        return in_array($this, [self::AwaitingPayment, self::Confirmed], true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Cancelled, self::Expired], true);
    }

    public function canBePaid(): bool
    {
        return $this === self::AwaitingPayment;
    }

    public function canBeCancelled(): bool
    {
        return in_array($this, [self::AwaitingPayment, self::Confirmed], true);
    }

    public function isCancellableByCustomer(): bool
    {
        return $this->canBeCancelled();
    }

    /**
     * Whether a transition from the current status to $to is explicitly allowed.
     */
    public function canTransitionTo(self $to): bool
    {
        return match ($this) {
            self::AwaitingPayment => in_array($to, [self::Confirmed, self::Cancelled, self::Expired], true),
            self::Confirmed => $to === self::Cancelled,
            self::Cancelled => false,
            self::Expired => false,
        };
    }

    /**
     * @return list<string>
     */
    public static function consumableValues(): array
    {
        return [
            self::AwaitingPayment->value,
            self::Confirmed->value,
        ];
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
