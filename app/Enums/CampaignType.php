<?php

declare(strict_types=1);

namespace App\Enums;

enum CampaignType: string
{
    case Standard = 'standard';
    case OccasionFestival = 'occasion_festival';
    case Referral = 'referral';
    case PropertySpecific = 'property_specific';
    case NewCustomerWelcome = 'new_customer_welcome';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Standard Promotion',
            self::OccasionFestival => 'Festival / Occasion',
            self::Referral => 'Referral Promotion',
            self::PropertySpecific => 'Property Specific',
            self::NewCustomerWelcome => 'New Customer Welcome',
        };
    }
}
