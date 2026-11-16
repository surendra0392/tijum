<?php

declare(strict_types=1);

namespace App\Enums;

enum CouponFundingSource: string
{
    case Platform = 'platform';
    case Property = 'property';
    case Split = 'split';

    public function label(): string
    {
        return match ($this) {
            self::Platform => '100% Platform Funded',
            self::Property => '100% Property Funded',
            self::Split => 'Co-funded (Platform + Property Split)',
        };
    }
}
