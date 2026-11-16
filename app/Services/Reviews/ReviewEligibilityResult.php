<?php

declare(strict_types=1);

namespace App\Services\Reviews;

use Carbon\CarbonImmutable;

readonly class ReviewEligibilityResult
{
    public function __construct(
        public bool $isEligible,
        public string $reason,
        public ?CarbonImmutable $checkoutDateTime = null,
        public ?CarbonImmutable $windowDeadline = null,
        public ?int $daysRemaining = null,
    ) {}

    public static function eligible(
        CarbonImmutable $checkoutDateTime,
        CarbonImmutable $windowDeadline,
        int $daysRemaining,
    ): self {
        return new self(
            isEligible: true,
            reason: 'Reservation is eligible for verified customer review.',
            checkoutDateTime: $checkoutDateTime,
            windowDeadline: $windowDeadline,
            daysRemaining: $daysRemaining,
        );
    }

    public static function ineligible(string $reason, ?CarbonImmutable $checkoutDateTime = null): self
    {
        return new self(
            isEligible: false,
            reason: $reason,
            checkoutDateTime: $checkoutDateTime,
        );
    }
}
