<?php

declare(strict_types=1);

namespace App\Enums;

enum CommissionBaseType: string
{
    case GrossBooking = 'gross_booking_amount';
    case NetAccommodation = 'net_accommodation_amount';

    public function label(): string
    {
        return match ($this) {
            self::GrossBooking => 'Gross Booking Amount',
            self::NetAccommodation => 'Net Accommodation Amount',
        };
    }
}
