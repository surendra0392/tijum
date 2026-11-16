<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyVerificationDocumentType: string
{
    case PropertyAddressProof = 'property_address_proof';
    case OwnershipOrLeaseProof = 'ownership_or_lease_proof';
    case PropertyLicenceProof = 'property_licence_proof';
    case OtherSupportingDocument = 'other_supporting_document';

    public function label(): string
    {
        return match ($this) {
            self::PropertyAddressProof => 'Property Address Proof',
            self::OwnershipOrLeaseProof => 'Ownership, Lease or Operating Authority Proof',
            self::PropertyLicenceProof => 'Applicable Property Licence / Registration (Optional)',
            self::OtherSupportingDocument => 'Additional Property Evidence (Optional)',
        };
    }

    public function guidance(): string
    {
        return match ($this) {
            self::PropertyAddressProof => 'Recent utility bill, municipal property assessment, or postal document matching the property street address and locality.',
            self::OwnershipOrLeaseProof => 'Sale/ownership deed, registered lease/rental agreement with sub-letting permission, or written owner authorisation matching your operator arrangement.',
            self::PropertyLicenceProof => 'Trade licence, hostel/homestay registration, or safety certificate where applicable to your property category and local regulations.',
            self::OtherSupportingDocument => 'Supporting property clarification, floor layout confirmation, or additional evidence requested by TIJUM reviewers.',
        };
    }

    public function acceptedFormatsLabel(): string
    {
        return 'PDF, JPG, JPEG, PNG (max 10 MB)';
    }

    public function isUniversallyRequired(): bool
    {
        return in_array($this, [
            self::PropertyAddressProof,
            self::OwnershipOrLeaseProof,
        ], true);
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
