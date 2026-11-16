<?php

declare(strict_types=1);

namespace App\Enums;

enum OwnerVerificationDocumentType: string
{
    case IdentityProof = 'identity_proof';
    case BusinessRegistrationProof = 'business_registration_proof';
    case OperatingAuthorityProof = 'operating_authority_proof';
    case BusinessAddressProof = 'business_address_proof';
    case TaxRegistrationProof = 'tax_registration_proof';
    case OtherSupportingDocument = 'other_supporting_document';

    public function label(): string
    {
        return match ($this) {
            self::IdentityProof => 'Identity Proof',
            self::BusinessRegistrationProof => 'Business Registration Proof',
            self::OperatingAuthorityProof => 'Authorisation / Operating Authority Proof',
            self::BusinessAddressProof => 'Business Address Proof',
            self::TaxRegistrationProof => 'Tax Registration Proof (Optional)',
            self::OtherSupportingDocument => 'Other Supporting Document',
        };
    }

    public function guidance(): string
    {
        return match ($this) {
            self::IdentityProof => 'Any official photo identity document belonging to the primary contact or operator (for example, passport, driving licence, or equivalent ID). No document ID number is requested in text.',
            self::BusinessRegistrationProof => 'Certificate of incorporation, partnership deed, LLP agreement, or trade registration confirming entity existence.',
            self::OperatingAuthorityProof => 'Letter of authorisation, board resolution, proprietor declaration, or signatory mandate confirming authority to onboard properties on TIJUM.',
            self::BusinessAddressProof => 'Recent utility bill, municipal correspondence, rental/lease correspondence, or office address document matching your correspondence address.',
            self::TaxRegistrationProof => 'Optional tax registration certificate, provided only where applicable to your business entity.',
            self::OtherSupportingDocument => 'Optional supporting documentation that helps explain your operator structure or verification response.',
        };
    }

    public function acceptedFormatsLabel(): string
    {
        return 'PDF, JPG, JPEG, PNG (max 10 MB)';
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
