<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyAvailabilityBlockType: string
{
    case Closure = 'closure';
    case Maintenance = 'maintenance';
    case StopSell = 'stop_sell';

    public function label(): string
    {
        return match ($this) {
            self::Closure => 'Closure',
            self::Maintenance => 'Maintenance',
            self::StopSell => 'Stop Sell',
        };
    }
}
