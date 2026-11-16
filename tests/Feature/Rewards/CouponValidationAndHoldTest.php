<?php

declare(strict_types=1);

namespace Tests\Feature\Rewards;

use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Models\CouponCode;
use App\Models\CouponHold;
use App\Models\CouponRedemption;
use App\Models\PromotionalCampaign;
use App\Models\Reservation;
use App\Services\Promotions\CouponRedemptionService;
use App\Services\Promotions\CouponValidationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class CouponValidationAndHoldTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_validates_fixed_discount_coupon_correctly(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $user = $this->createCustomerUser();

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-TEST-01',
            'name' => 'Fixed Discount Test',
            'slug' => 'fixed-discount-test',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        $coupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'SAVE300',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 30000, // ₹300
            'funding_source' => CouponFundingSource::Platform,
            'min_booking_amount_minor' => 100000, // ₹1,000
            'is_active' => true,
        ]);

        $service = app(CouponValidationService::class);

        // Subtotal below minimum
        $resultFail = $service->validate('SAVE300', $user, $property, 50000);
        $this->assertFalse($resultFail['is_valid']);
        $this->assertStringContainsString('minimum booking amount', (string) $resultFail['error']);

        // Subtotal above minimum
        $resultSuccess = $service->validate('SAVE300', $user, $property, 200000);
        $this->assertTrue($resultSuccess['is_valid']);
        $this->assertSame(30000, $resultSuccess['discount_amount_minor']);
        $this->assertSame(30000, $resultSuccess['platform_funded_amount_minor']);
        $this->assertSame(0, $resultSuccess['property_funded_amount_minor']);
    }

    public function test_validates_percentage_coupon_with_cap(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $user = $this->createCustomerUser();

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-TEST-02',
            'name' => 'Percentage Test',
            'slug' => 'percentage-test',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        $coupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'PERCENT20',
            'offer_type' => CouponOfferType::Percentage,
            'discount_percentage' => 20.0,
            'max_discount_amount_minor' => 50000, // max ₹500 cap
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
        ]);

        $service = app(CouponValidationService::class);

        // ₹1,000 subtotal (100,000 minor) -> 20% = ₹200 (20,000 minor)
        $res1 = $service->validate('PERCENT20', $user, $property, 100000);
        $this->assertTrue($res1['is_valid']);
        $this->assertSame(20000, $res1['discount_amount_minor']);

        // ₹5,000 subtotal (500,000 minor) -> 20% = ₹1,000, but capped at ₹500 (50,000 minor)
        $res2 = $service->validate('PERCENT20', $user, $property, 500000);
        $this->assertTrue($res2['is_valid']);
        $this->assertSame(50000, $res2['discount_amount_minor']);
    }

    public function test_enforces_per_user_and_global_usage_limits(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $user = $this->createCustomerUser();

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-TEST-03',
            'name' => 'Limit Test',
            'slug' => 'limit-test',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        $coupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'ONCEONLY',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 10000,
            'funding_source' => CouponFundingSource::Platform,
            'per_user_limit' => 1,
            'total_usage_limit' => 2,
            'total_used_count' => 0,
            'is_active' => true,
        ]);

        $validation = app(CouponValidationService::class);
        $redemptionService = app(CouponRedemptionService::class);

        // 1. First validation succeeds
        $this->assertTrue($validation->validate('ONCEONLY', $user, $property, 100000)['is_valid']);

        // 2. Create hold for user
        $hold = $redemptionService->createHold($coupon, $user, 10000);
        $this->assertInstanceOf(CouponHold::class, $hold);
        $this->assertSame('active', $hold->status);

        // 3. Second validation for same user fails because active hold consumes the per-user limit
        $resUserLimit = $validation->validate('ONCEONLY', $user, $property, 100000);
        $this->assertFalse($resUserLimit['is_valid']);
        $this->assertStringContainsString('maximum usage limit', (string) $resUserLimit['error']);

        // 4. Release hold -> validation succeeds again
        $redemptionService->releaseHold($hold);
        $this->assertTrue($validation->validate('ONCEONLY', $user, $property, 100000)['is_valid']);

        // 5. Simulate global limit reached
        $coupon->update(['total_used_count' => 2]);
        $resGlobal = $validation->validate('ONCEONLY', $user, $property, 100000);
        $this->assertFalse($resGlobal['is_valid']);
        $this->assertStringContainsString('maximum redemption limit', (string) $resGlobal['error']);
    }

    public function test_coupon_hold_is_created_on_reservation_submission_and_committed_on_payment(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000); // ₹1,000/day
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-TEST-04',
            'name' => 'Checkout Hold Test',
            'slug' => 'checkout-hold-test',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        $coupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'DISC200',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 20000, // ₹200 discount
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2); // 2 days = ₹2,000
        $payload['coupon_code'] = 'DISC200';

        $action = app(CreateReservation::class);
        $reservation = $action->execute($user, $payload);

        // Verification of reservation attributes
        $this->assertSame(200000, $reservation->original_amount_minor); // ₹2,000 subtotal
        $this->assertSame(180000, $reservation->total_amount_minor); // ₹1,800 payable after ₹200 discount
        $this->assertSame('DISC200', $reservation->coupon_code);
        $this->assertSame(20000, $reservation->coupon_discount_minor);

        // Verify active hold exists
        $hold = CouponHold::query()->where('reservation_id', $reservation->id)->firstOrFail();
        $this->assertSame('active', $hold->status);
        $this->assertSame(20000, $hold->discount_amount_minor);

        // Confirm payment
        $lifecycle = app(ReservationLifecycle::class);
        $lifecycle->confirmPaid($reservation);

        // Hold should be committed and redemption record created
        $hold->refresh();
        $this->assertSame('committed', $hold->status);

        $redemption = CouponRedemption::query()->where('reservation_id', $reservation->id)->firstOrFail();
        $this->assertSame(20000, $redemption->discount_amount_minor);
        $this->assertSame(20000, $redemption->platform_funded_amount_minor);
        $this->assertFalse($redemption->is_reverted);

        $coupon->refresh();
        $this->assertSame(1, $coupon->total_used_count);
    }
}
