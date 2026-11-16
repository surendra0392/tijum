<?php

declare(strict_types=1);

namespace App\Enums;

enum OwnerEntityType: string
{
    case Individual = 'individual';
    case SoleProprietorship = 'sole_proprietorship';
    case Partnership = 'partnership';
    case LimitedLiabilityPartnership = 'limited_liability_partnership';
    case PrivateLimitedCompany = 'private_limited_company';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Individual => 'Individual Operator',
            self::SoleProprietorship => 'Sole Proprietorship',
            self::Partnership => 'Partnership Firm',
            self::LimitedLiabilityPartnership => 'Limited Liability Partnership (LLP)',
            self::PrivateLimitedCompany => 'Private Limited Company',
            self::Other => 'Other Entity Structure',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Individual => 'Operating a PG, hostel, or homestay directly in an individual capacity without a formal corporate registration.',
            self::SoleProprietorship => 'Single-owner business trading under a proprietor firm name.',
            self::Partnership => 'Accommodation business operated by two or more partners under a partnership deed.',
            self::LimitedLiabilityPartnership => 'Registered LLP operating hospitality or PG facilities.',
            self::PrivateLimitedCompany => 'Incorporated company operating independent hostels, PGs, or homestays.',
            self::Other => 'Trust, society, association, or other recognised accommodation operator structure.',
        };
    }

    public function requiresLegalBusinessName(): bool
    {
        return $this !== self::Individual;
    }

    /**
     * @return list<OwnerVerificationDocumentType>
     */
    public function requiredDocumentTypes(): array
    {
        return match ($this) {
            self::Individual => [
                OwnerVerificationDocumentType::IdentityProof,
                OwnerVerificationDocumentType::BusinessAddressProof,
            ],
            self::SoleProprietorship,
            self::Other => [
                OwnerVerificationDocumentType::IdentityProof,
                OwnerVerificationDocumentType::OperatingAuthorityProof,
                OwnerVerificationDocumentType::BusinessAddressProof,
            ],
            self::Partnership,
            self::LimitedLiabilityPartnership,
            self::PrivateLimitedCompany => [
                OwnerVerificationDocumentType::IdentityProof,
                OwnerVerificationDocumentType::BusinessRegistrationProof,
                OwnerVerificationDocumentType::OperatingAuthorityProof,
                OwnerVerificationDocumentType::BusinessAddressProof,
            ],
        };
    }

    public function requiresDocumentType(OwnerVerificationDocumentType $documentType): bool
    {
        return in_array($documentType, $this->requiredDocumentTypes(), true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $type): string => $type->value,
            self::cases(),
        );
    }
}
