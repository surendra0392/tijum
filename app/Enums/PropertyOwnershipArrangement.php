<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyOwnershipArrangement: string
{
    case OwnerOperator = 'owner_operator';
    case LeasedOperator = 'leased_operator';
    case AuthorisedManager = 'authorised_manager';

    public function label(): string
    {
        return match ($this) {
            self::OwnerOperator => 'Direct Property Owner & Operator',
            self::LeasedOperator => 'Leased / Rented Accommodation Operator',
            self::AuthorisedManager => 'Authorised Property Manager / Operating Partner',
        };
    }

    public function ownershipDocumentGuidance(): string
    {
        return match ($this) {
            self::OwnerOperator => 'Provide property ownership deed, tax/mutation receipt, or title extract confirming ownership without exposing sensitive personal tax numbers.',
            self::LeasedOperator => 'Provide valid signed lease/rental agreement or landlord sub-lease consent authorising hostel, PG, or homestay operations.',
            self::AuthorisedManager => 'Provide formal property management agreement or written owner authorisation letter empowering listing on TIJUM.',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $arrangement): string => $arrangement->value,
            self::cases(),
        );
    }
}
