<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Contracts\PaymentGateway;
use App\Enums\AmenityApplicabilityScope;
use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\OwnerStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\ReferralStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Enums\SettlementStatus;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\CouponCode;
use App\Models\CustomerReferral;
use App\Models\MobileDevice;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PlatformSetting;
use App\Models\PromotionalCampaign;
use App\Models\PropertyAmenity;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use App\Models\Reservation;
use App\Models\ReservationRoomAllocation;
use App\Models\RewardsSetting;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MobileProductionParityApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_public_property_amenity_filter_and_detail_exclude_unapproved_or_hidden_amenities(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $cat = AmenityCategory::query()->create([
            'name' => 'Utilities',
            'code' => 'utilities_'.Str::random(4),
            'slug' => 'utilities-'.Str::random(4),
            'is_active' => true,
            'display_order' => 1,
        ]);

        $approvedAmenity = Amenity::query()->create([
            'amenity_category_id' => $cat->id,
            'name' => 'High-Speed WiFi',
            'slug' => 'wifi-'.Str::random(4),
            'code' => 'wifi_'.Str::random(4),
            'icon_key' => 'Wifi',
            'applicability_scope' => AmenityApplicabilityScope::Property,
            'is_active' => true,
            'display_order' => 1,
        ]);
        $draftAmenity = Amenity::query()->create([
            'amenity_category_id' => $cat->id,
            'name' => 'Secret Pool',
            'slug' => 'pool-'.Str::random(4),
            'code' => 'pool_'.Str::random(4),
            'icon_key' => 'Waves',
            'applicability_scope' => AmenityApplicabilityScope::Property,
            'is_active' => true,
            'display_order' => 2,
        ]);
        $hiddenAmenity = Amenity::query()->create([
            'amenity_category_id' => $cat->id,
            'name' => 'Hidden Gym',
            'slug' => 'gym-'.Str::random(4),
            'code' => 'gym_'.Str::random(4),
            'icon_key' => 'Dumbbell',
            'applicability_scope' => AmenityApplicabilityScope::Property,
            'is_active' => true,
            'display_order' => 3,
        ]);

        PropertyAmenity::query()->create([
            'property_id' => $property->id,
            'amenity_id' => $approvedAmenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'PA-'.Str::upper(Str::random(8)),
            'availability' => AmenityAvailability::Included,
            'status' => AmenityVerificationStatus::Approved,
            'is_current' => true,
            'is_customer_visible' => true,
        ]);
        PropertyAmenity::query()->create([
            'property_id' => $property->id,
            'amenity_id' => $draftAmenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'PA-'.Str::upper(Str::random(8)),
            'availability' => AmenityAvailability::Included,
            'status' => AmenityVerificationStatus::Draft,
            'is_current' => true,
            'is_customer_visible' => true,
        ]);
        PropertyAmenity::query()->create([
            'property_id' => $property->id,
            'amenity_id' => $hiddenAmenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'PA-'.Str::upper(Str::random(8)),
            'availability' => AmenityAvailability::NotAvailable,
            'status' => AmenityVerificationStatus::Approved,
            'is_current' => true,
            'is_customer_visible' => false,
        ]);

        $customer = $this->createCustomerUser();
        $reservation = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
        ]);
        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $property->id,
            'user_id' => $customer->id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'customer_display_name' => 'Priya K.',
            'title' => 'Great food and WiFi',
            'content' => 'Clean hostel with reliable WiFi and home-style meals.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'published_at' => now(),
        ]);
        PropertyReviewResponse::query()->create([
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => 'Thank you for staying with us!',
            'status' => ReviewResponseStatus::Published,
            'published_at' => now(),
        ]);

        // Filter by approved amenity & all_genders alias
        $this->getJson("/api/v1/public/properties?amenities={$approvedAmenity->id}&gender=all_genders")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $property->id);

        // Draft amenity must NOT match
        $this->getJson("/api/v1/public/properties?amenities={$draftAmenity->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Detail endpoint returns only approved visible included amenity + owner_reply
        $this->getJson("/api/v1/public/properties/{$property->slug}")
            ->assertOk()
            ->assertJsonCount(1, 'data.amenities')
            ->assertJsonPath('data.amenities.0.name', 'High-Speed WiFi')
            ->assertJsonPath('data.reviews.0.owner_reply', 'Thank you for staying with us!');
    }

    public function test_owner_and_customer_reservation_responses_hydrate_allocations_and_isolate_commission_fields(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType, 'A-204');
        $customer = $this->createCustomerUser();

        $reservation = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'total_amount_minor' => 500000,
            'commission_amount_minor' => 50000,
            'commission_tax_amount_minor' => 9000,
            'net_partner_payable_minor' => 441000,
            'checkout_date' => now()->addDays(2)->toDateString(),
        ]);
        ReservationRoomAllocation::query()->create([
            'reservation_id' => $reservation->id,
            'property_room_id' => $room->id,
            'allocated_quantity' => 1,
        ]);

        $ownerToken = $owner->createToken('partner')->plainTextToken;
        $customerToken = $customer->createToken('customer')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson("/api/v1/owner/reservations/{$reservation->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.is_allocated', true)
            ->assertJsonPath('data.primary_room_number', 'A-204')
            ->assertJsonPath('data.allocations.0.room_number', 'A-204')
            ->assertJsonPath('data.commission_amount_paise', 50000)
            ->assertJsonPath('data.owner_payable_paise', 441000);

        $this->app['auth']->forgetGuards();
        $customerRes = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson("/api/v1/customer/reservations/{$reservation->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.is_allocated', true)
            ->assertJsonPath('data.primary_room_number', 'A-204');

        $this->assertArrayNotHasKey('commission_amount_paise', $customerRes->json('data'));
        $this->assertArrayNotHasKey('owner_payable_paise', $customerRes->json('data'));
    }

    public function test_razorpay_live_enabled_cannot_be_bypassed_by_platform_setting_when_env_is_disabled(): void
    {
        config()->set('tijum.payments.live_enabled', false);
        config()->set('tijum.payments.razorpay.mode', 'test');

        PlatformSetting::set('integrations.razorpay_mode', 'live', 'integrations');
        PlatformSetting::set('integrations.razorpay_key_id', 'rzp_live_forbidden_key_999', 'integrations');
        PlatformSetting::set('integrations.razorpay_key_secret', 'forbidden_secret', 'integrations', isSecret: true, dataType: 'encrypted');

        app()->forgetInstance(PaymentGateway::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('CRITICAL SAFETY SAFEGUARD');

        app(PaymentGateway::class);
    }

    public function test_notification_preference_respects_push_and_in_app_opt_out_for_operational_only(): void
    {
        config()->set('tijum.notifications.enabled', true);
        config()->set('tijum.notifications.channels.in_app.enabled', true);
        config()->set('tijum.notifications.channels.push.enabled', true);

        $user = $this->createCustomerUser();
        $prefs = app(NotificationPreferenceService::class);

        $prefs->updatePreferences($user, [
            'in_app_operational' => false,
            'push_operational' => false,
        ]);

        $this->assertFalse($prefs->isChannelEnabledForRecipient($user, NotificationChannel::Push, NotificationCategory::OperationalUpdate));
        $this->assertFalse($prefs->isChannelEnabledForRecipient($user, NotificationChannel::InApp, NotificationCategory::OperationalUpdate));
        $this->assertTrue($prefs->isChannelEnabledForRecipient($user, NotificationChannel::Push, NotificationCategory::EssentialTransactional));
        $this->assertTrue($prefs->isChannelEnabledForRecipient($user, NotificationChannel::InApp, NotificationCategory::EssentialTransactional));
    }

    public function test_owner_amenity_destroy_enforces_verification_and_auth_handles_phone_case_and_device_isolation(): void
    {
        $unverifiedOwner = Owner::factory()->create([
            'status' => OwnerStatus::PendingVerification,
            'email_verified_at' => null,
        ]);
        $property = $this->createProperty($unverifiedOwner);
        $cat = AmenityCategory::query()->create(['name' => 'Safety', 'code' => 'safety_'.Str::random(4), 'slug' => 'safety', 'is_active' => true]);
        $amenity = Amenity::query()->create(['amenity_category_id' => $cat->id, 'name' => 'CCTV', 'slug' => 'cctv', 'code' => 'cctv', 'icon_key' => 'Shield', 'applicability_scope' => AmenityApplicabilityScope::Property, 'is_active' => true]);
        $pa = PropertyAmenity::query()->create([
            'property_id' => $property->id,
            'amenity_id' => $amenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'PA-UNVERIFIED',
            'availability' => AmenityAvailability::Included,
            'status' => AmenityVerificationStatus::Draft,
            'is_current' => true,
            'is_customer_visible' => true,
        ]);

        $unverifiedToken = $unverifiedOwner->createToken('partner')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$unverifiedToken)
            ->deleteJson("/api/v1/owner/properties/{$property->id}/amenities/{$pa->id}")
            ->assertForbidden();

        // Owner phone normalization & mixed-case email update
        $activeOwner = Owner::factory()->create([
            'phone' => '9876543211',
            'password' => Hash::make('OwnerPass123!'),
            'status' => OwnerStatus::Active,
            'email_verified_at' => now(),
        ]);

        $loginRes = $this->postJson('/api/v1/auth/owner/login', [
            'email' => '+91 98765-43211',
            'password' => 'OwnerPass123!',
        ])->assertOk();
        $ownerToken = (string) $loginRes->json('data.token');

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->putJson('/api/v1/owner/profile', [
                'name' => $activeOwner->name,
                'email' => 'UPPER.OWNER@EXAMPLE.TEST',
            ])
            ->assertOk()
            ->assertJsonPath('data.email', 'upper.owner@example.test');

        // Device transfer across accounts revokes prior account's registration
        $customer = $this->createCustomerUser();
        $customerToken = $customer->createToken('customer')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->postJson('/api/v1/customer/devices/register', [
                'device_installation_id' => 'shared-device-install-1',
                'push_token' => 'ExponentPushToken[shared-token-1]',
                'platform' => 'android',
            ])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson('/api/v1/owner/devices/register', [
                'device_installation_id' => 'shared-device-install-1',
                'push_token' => 'ExponentPushToken[shared-token-1]',
                'platform' => 'android',
            ])->assertOk();

        $this->assertFalse((bool) MobileDevice::query()->where('notifiable_id', $customer->id)->where('notifiable_type', $customer->getMorphClass())->value('is_active'));
        $this->assertTrue((bool) MobileDevice::query()->where('notifiable_id', $activeOwner->id)->where('notifiable_type', $activeOwner->getMorphClass())->value('is_active'));
    }

    public function test_rewards_handles_pending_referral_dynamic_rate_coupon_scope_and_offer_type(): void
    {
        RewardsSetting::set('points_redemption_rate_paise', '50', 'points');
        RewardsSetting::set('referral_referrer_reward_points', '750', 'referral');

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $customer = $this->createCustomerUser();
        $referredUser = $this->createCustomerUser(['name' => 'Invited Friend']);
        $token = $customer->createToken('customer')->plainTextToken;

        CustomerReferral::query()->create([
            'referrer_user_id' => $customer->id,
            'referred_user_id' => $referredUser->id,
            'referral_code_used' => 'TJMREF123',
            'status' => ReferralStatus::PendingRegistration,
            'referrer_reward_points' => 750,
            'referred_reward_points' => 250,
        ]);

        $campaign = PromotionalCampaign::query()->create([
            'campaign_reference' => 'CAMP-'.Str::upper(Str::random(6)),
            'name' => 'Spring Promo',
            'slug' => 'spring-promo-'.Str::random(4),
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);
        CouponCode::query()->create([
            'campaign_id' => $campaign->id,
            'code' => 'PCT20STAY',
            'description' => '20% off',
            'offer_type' => 'percentage',
            'discount_amount_minor' => 0,
            'discount_percentage' => 20,
            'max_discount_amount_minor' => 50000,
            'bonus_points' => 0,
            'funding_source' => 'platform',
            'min_booking_amount_minor' => 100000,
            'is_active' => true,
            'per_user_limit' => 2,
            'applies_to_property_ids' => [$property->id],
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/rewards/referrals')
            ->assertOk()
            ->assertJsonPath('data.referrals.0.referred_customer_name', 'Invited Friend')
            ->assertJsonPath('data.profile.referrer_reward_points', 750);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/rewards/points')
            ->assertOk()
            ->assertJsonPath('data.wallet.point_to_inr_rate', 0.5);

        // Property-scoped coupon without property_id must NOT guess Property::first()
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/coupons/validate', [
                'code' => 'PCT20STAY',
                'subtotal_paise' => 200000,
            ])
            ->assertOk()
            ->assertJsonPath('data.valid', false);

        // Quote promotions returns real offer_type ('percentage'), not funding source ('platform')
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/checkout/quote-promotions', [
                'property_id' => $property->id,
                'subtotal_paise' => 200000,
                'coupon_code' => 'PCT20STAY',
            ])
            ->assertOk()
            ->assertJsonPath('data.coupon_applied.offer_type', 'percentage');
    }

    public function test_owner_financial_summary_and_property_verification_documents_and_availability_block(): void
    {
        Storage::fake('property_verification');
        config()->set('tijum.property_verification.disk', 'property_verification');

        $owner = $this->createActiveOwner();
        $property = $this->createProperty($owner);
        $token = $owner->createToken('partner')->plainTextToken;

        $financialProfile = OwnerFinancialProfile::query()->create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Guntur Partner Stays',
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Guntur Partner Stays',
            'bank_account_number_masked' => '•••• 1234',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'linked_account_status' => LinkedAccountStatus::Active,
        ]);

        PartnerSettlement::query()->create([
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $financialProfile->id,
            'settlement_reference' => 'SET-TP-001',
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->subDay()->toDateString(),
            'currency' => 'INR',
            'gross_booking_value_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'net_settlement_amount_minor' => 88200,
            'status' => SettlementStatus::TransferPending,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/settlements/summary')
            ->assertOk()
            ->assertJsonPath('data.pending_settlement_paise', 88200);

        $upload = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/properties/{$property->id}/documents", [
                'document_type' => PropertyVerificationDocumentType::PropertyAddressProof->value,
                'document' => UploadedFile::fake()->image('electricity-bill.png', 200, 200),
            ]);
        $upload->assertCreated()
            ->assertJsonPath('data.document_type', PropertyVerificationDocumentType::PropertyAddressProof->value);

        $docId = (int) $upload->json('data.id');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/owner/properties/{$property->id}/documents")
            ->assertOk()
            ->assertJsonPath('data.checklist.0.fulfilled', true);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/v1/owner/properties/{$property->id}/documents/{$docId}")
            ->assertOk();

        // Availability block store returns full parity fields
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/properties/{$property->id}/availability-blocks", [
                'scope' => PropertyAvailabilityBlockScope::Property->value,
                'block_type' => PropertyAvailabilityBlockType::Maintenance->value,
                'start_date' => now()->addDays(2)->toDateString(),
                'end_date' => now()->addDays(4)->toDateString(),
                'reason' => 'Annual plumbing check',
            ])
            ->assertCreated()
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.is_admin_restriction', false)
            ->assertJsonStructure(['data' => ['status_label', 'created_at']]);
    }
}
