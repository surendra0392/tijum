<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\OwnerEntityType;
use App\Enums\OwnerStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerFinancialProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class OwnerSeeder extends Seeder
{
    /**
     * Seed verified active property owners and pending applicants.
     */
    public function run(): void
    {
        $hyderabad = City::query()->where('slug', 'hyderabad')->first();
        $vijayawada = City::query()->where('slug', 'vijayawada')->first();
        $guntur = City::query()->where('slug', 'guntur')->first();
        $visakhapatnam = City::query()->where('slug', 'visakhapatnam')->first();

        $ownersData = [
            [
                'name' => 'Kalyan Chakravarthy',
                'email' => 'owner@tijum.com',
                'phone' => '+919848099888',
                'password' => 'Password123!',
                'status' => OwnerStatus::Active,
                'business' => [
                    'entity_type' => OwnerEntityType::PrivateLimitedCompany,
                    'legal_business_name' => 'Sri Sai Balaji Hospitality Private Limited',
                    'display_business_name' => 'Sri Sai Balaji Stays',
                    'primary_contact_name' => 'Kalyan Chakravarthy',
                    'primary_contact_designation' => 'Managing Director',
                    'business_email' => 'contact@balajistays.com',
                    'business_address_line_1' => 'Plot 42, Hitech City Main Road',
                    'locality' => 'Madhapur',
                    'city' => 'Hyderabad',
                    'state' => 'Telangana',
                    'postal_code' => '500081',
                    'country_code' => 'IN',
                    'website_url' => 'https://balajistays.test',
                    'description' => 'Premium student, executive, and flexible long-term stays with verified food arrangements in Hyderabad.',
                ],
                'financial' => [
                    'legal_business_name' => 'Sri Sai Balaji Hospitality Private Limited',
                    'business_constitution' => 'Private Limited Company',
                    'pan_number' => 'ABCDE1234F',
                    'gst_registered' => true,
                    'gstin' => '36ABCDE1234F1Z5',
                    'supplier_legal_classification' => 'hospitality_service_provider',
                    'razorpay_account_id' => 'acc_BalajiHosp1234',
                    'linked_account_status' => LinkedAccountStatus::Active,
                    'bank_beneficiary_name' => 'Sri Sai Balaji Hospitality Pvt Ltd',
                    'bank_account_number_masked' => 'XXXXXX4892',
                    'bank_ifsc' => 'HDFC0001234',
                    'bank_name' => 'HDFC Bank Ltd',
                    'onboarding_status' => FinancialOnboardingStatus::Active,
                ],
                'cities' => array_filter([$hyderabad?->id, $vijayawada?->id, $guntur?->id]),
            ],
            [
                'name' => 'Anitha Reddy',
                'email' => 'anitha.reddy@tijum.com',
                'phone' => '+919849122334',
                'password' => 'Password123!',
                'status' => OwnerStatus::Active,
                'business' => [
                    'entity_type' => OwnerEntityType::LimitedLiabilityPartnership,
                    'legal_business_name' => 'Sannidhi Women Stays LLP',
                    'display_business_name' => 'Sannidhi Women Stays',
                    'primary_contact_name' => 'Anitha Reddy',
                    'primary_contact_designation' => 'Partner',
                    'business_email' => 'anitha@sannidhistays.com',
                    'business_address_line_1' => 'Street 7, IT Corridor, Financial District',
                    'locality' => 'Gachibowli',
                    'city' => 'Hyderabad',
                    'state' => 'Telangana',
                    'postal_code' => '500032',
                    'country_code' => 'IN',
                    'website_url' => 'https://sannidhistays.test',
                    'description' => 'Dedicated high-security women hostels, PGs, and residential suites with hygienic home-cooked meals.',
                ],
                'financial' => [
                    'legal_business_name' => 'Sannidhi Women Stays LLP',
                    'business_constitution' => 'Limited Liability Partnership',
                    'pan_number' => 'BCDEF2345G',
                    'gst_registered' => true,
                    'gstin' => '36BCDEF2345G1Z8',
                    'supplier_legal_classification' => 'hospitality_service_provider',
                    'razorpay_account_id' => 'acc_SannidhiStays234',
                    'linked_account_status' => LinkedAccountStatus::Active,
                    'bank_beneficiary_name' => 'Sannidhi Women Stays LLP',
                    'bank_account_number_masked' => 'XXXXXX8912',
                    'bank_ifsc' => 'ICIC0000234',
                    'bank_name' => 'ICICI Bank Ltd',
                    'onboarding_status' => FinancialOnboardingStatus::Active,
                ],
                'cities' => array_filter([$hyderabad?->id, $visakhapatnam?->id]),
            ],
            [
                'name' => 'Praveen Varma',
                'email' => 'praveen.varma@tijum.com',
                'phone' => '+919866054321',
                'password' => 'Password123!',
                'status' => OwnerStatus::Active,
                'business' => [
                    'entity_type' => OwnerEntityType::PrivateLimitedCompany,
                    'legal_business_name' => 'Urban Nest Living Private Limited',
                    'display_business_name' => 'Urban Nest Co-Living',
                    'primary_contact_name' => 'Praveen Varma',
                    'primary_contact_designation' => 'Chief Executive Officer',
                    'business_email' => 'praveen@urbannest.in',
                    'business_address_line_1' => 'Tower B, Hill 3, IT Park Road',
                    'locality' => 'Madhurawada IT SEZ',
                    'city' => 'Visakhapatnam',
                    'state' => 'Andhra Pradesh',
                    'postal_code' => '530048',
                    'country_code' => 'IN',
                    'website_url' => 'https://urbannest.test',
                    'description' => 'Curated modern co-living communities with shared workspaces, gyms, and flexible daily & monthly packages.',
                ],
                'financial' => [
                    'legal_business_name' => 'Urban Nest Living Private Limited',
                    'business_constitution' => 'Private Limited Company',
                    'pan_number' => 'CDEFG3456H',
                    'gst_registered' => true,
                    'gstin' => '37CDEFG3456H1Z1',
                    'supplier_legal_classification' => 'hospitality_service_provider',
                    'razorpay_account_id' => 'acc_UrbanNest345',
                    'linked_account_status' => LinkedAccountStatus::Active,
                    'bank_beneficiary_name' => 'Urban Nest Living Pvt Ltd',
                    'bank_account_number_masked' => 'XXXXXX1234',
                    'bank_ifsc' => 'SBIN0001234',
                    'bank_name' => 'State Bank of India',
                    'onboarding_status' => FinancialOnboardingStatus::Active,
                ],
                'cities' => array_filter([$visakhapatnam?->id, $hyderabad?->id]),
            ],
            [
                'name' => 'Lakshmi Narayana',
                'email' => 'lakshmi.narayana@tijum.com',
                'phone' => '+919908012345',
                'password' => 'Password123!',
                'status' => OwnerStatus::Active,
                'business' => [
                    'entity_type' => OwnerEntityType::Individual,
                    'legal_business_name' => 'Godavari Riverside Homestays',
                    'display_business_name' => 'Godavari Heritage Stays',
                    'primary_contact_name' => 'Lakshmi Narayana',
                    'primary_contact_designation' => 'Proprietor',
                    'business_email' => 'lakshmi@godavaristays.com',
                    'business_address_line_1' => 'Door 12-4-8, Krishna Riverfront Promenade',
                    'locality' => 'Bhavanipuram',
                    'city' => 'Vijayawada',
                    'state' => 'Andhra Pradesh',
                    'postal_code' => '520012',
                    'country_code' => 'IN',
                    'website_url' => 'https://godavarihomestay.test',
                    'description' => 'Family-hosted heritage homestay offering authentic Andhra cuisine and peaceful riverbank stays.',
                ],
                'financial' => [
                    'legal_business_name' => 'Godavari Riverside Homestays',
                    'business_constitution' => 'Sole Proprietorship',
                    'pan_number' => 'DEFGH4567J',
                    'gst_registered' => false,
                    'supplier_legal_classification' => 'individual_proprietor',
                    'razorpay_account_id' => 'acc_Godavari456',
                    'linked_account_status' => LinkedAccountStatus::Active,
                    'bank_beneficiary_name' => 'Lakshmi Narayana',
                    'bank_account_number_masked' => 'XXXXXX6789',
                    'bank_ifsc' => 'KKBK0000456',
                    'bank_name' => 'Kotak Mahindra Bank',
                    'onboarding_status' => FinancialOnboardingStatus::Active,
                ],
                'cities' => array_filter([$vijayawada?->id, $guntur?->id]),
            ],
            [
                'name' => 'Srinivasa Rao',
                'email' => 'srinivasa.rao@tijum.com',
                'phone' => '+919848123456',
                'password' => 'Password123!',
                'status' => OwnerStatus::Active,
                'business' => [
                    'entity_type' => OwnerEntityType::Partnership,
                    'legal_business_name' => 'Amaravathi Executive Hospitality Services',
                    'display_business_name' => 'Amaravathi Accommodations',
                    'primary_contact_name' => 'Srinivasa Rao',
                    'primary_contact_designation' => 'Managing Partner',
                    'business_email' => 'contact@amaravathi-stays.com',
                    'business_address_line_1' => '4th Lane, Main Road, Brodipet',
                    'locality' => 'Brodipet',
                    'city' => 'Guntur',
                    'state' => 'Andhra Pradesh',
                    'postal_code' => '522002',
                    'country_code' => 'IN',
                    'website_url' => 'https://amaravathi-stays.test',
                    'description' => 'Modern student and corporate housing adjacent to coaching institutes and commercial districts.',
                ],
                'financial' => [
                    'legal_business_name' => 'Amaravathi Executive Hospitality Services',
                    'business_constitution' => 'Partnership Firm',
                    'pan_number' => 'EFGHI5678K',
                    'gst_registered' => true,
                    'gstin' => '37EFGHI5678K1Z3',
                    'supplier_legal_classification' => 'hospitality_service_provider',
                    'razorpay_account_id' => 'acc_Amaravathi567',
                    'linked_account_status' => LinkedAccountStatus::Active,
                    'bank_beneficiary_name' => 'Amaravathi Executive Hospitality',
                    'bank_account_number_masked' => 'XXXXXX9012',
                    'bank_ifsc' => 'UTIB0000567',
                    'bank_name' => 'Axis Bank Ltd',
                    'onboarding_status' => FinancialOnboardingStatus::Active,
                ],
                'cities' => array_filter([$guntur?->id, $vijayawada?->id]),
            ],
            [
                'name' => 'Suresh Kumar',
                'email' => 'new.partner@tijum.com',
                'phone' => '+919949011223',
                'password' => 'Password123!',
                'status' => OwnerStatus::PendingVerification,
                'business' => [
                    'entity_type' => OwnerEntityType::Individual,
                    'legal_business_name' => 'Coastal Gateway Residency',
                    'display_business_name' => 'Coastal Gateway Stays',
                    'primary_contact_name' => 'Suresh Kumar',
                    'primary_contact_designation' => 'Proprietor',
                    'business_email' => 'suresh@coastalgateway.test',
                    'business_address_line_1' => 'VIP Road, CBM Compound',
                    'locality' => 'Siripuram',
                    'city' => 'Visakhapatnam',
                    'state' => 'Andhra Pradesh',
                    'postal_code' => '530003',
                    'country_code' => 'IN',
                    'description' => 'New coastal boutique guest house applying for partner onboarding and physical verification.',
                ],
                'financial' => [
                    'legal_business_name' => 'Coastal Gateway Residency',
                    'business_constitution' => 'Sole Proprietorship',
                    'pan_number' => 'FGHIJ6789L',
                    'gst_registered' => false,
                    'supplier_legal_classification' => 'individual_proprietor',
                    'bank_beneficiary_name' => 'Suresh Kumar',
                    'bank_account_number_masked' => 'XXXXXX3456',
                    'bank_ifsc' => 'HDFC0000789',
                    'bank_name' => 'HDFC Bank Ltd',
                    'onboarding_status' => FinancialOnboardingStatus::Submitted,
                    'linked_account_status' => LinkedAccountStatus::UnderReview,
                ],
                'cities' => array_filter([$visakhapatnam?->id]),
            ],
        ];

        foreach ($ownersData as $data) {
            /** @var Owner $owner */
            $owner = Owner::query()
                ->where('email', $data['email'])
                ->orWhere('phone', $data['phone'])
                ->first();

            $ownerAttributes = [
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => Hash::make($data['password']),
                'status' => $data['status'],
                'email_verified_at' => now(),
                'approved_at' => $data['status'] === OwnerStatus::Active ? now() : null,
            ];

            if ($owner) {
                $owner->update($ownerAttributes);
            } else {
                $owner = Owner::query()->create($ownerAttributes);
            }

            // Business Profile
            OwnerBusinessProfile::query()->updateOrCreate(
                ['owner_id' => $owner->id],
                $data['business']
            );

            // Financial Profile
            OwnerFinancialProfile::query()->updateOrCreate(
                ['owner_id' => $owner->id],
                [
                    ...$data['financial'],
                    'pan_verified_at' => $data['status'] === OwnerStatus::Active ? now() : null,
                    'beneficiary_verified_at' => $data['status'] === OwnerStatus::Active ? now() : null,
                    'verified_at' => $data['status'] === OwnerStatus::Active ? now() : null,
                ]
            );

            // Operating Cities
            if (! empty($data['cities'])) {
                $owner->operatingCities()->sync($data['cities']);
            }
        }
    }
}
