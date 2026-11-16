<?php

declare(strict_types=1);

namespace Tests\Feature\Rewards;

use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Console\Commands\QualifyPendingRewardsCommand;
use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Enums\ReferralStatus;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerReferral;
use App\Models\CustomerReferralProfile;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReferralAttributionAndQualificationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_generates_unique_referral_code_for_customer(): void
    {
        $user = $this->createCustomerUser();
        $service = app(ReferralService::class);

        $profile = $service->getOrCreateProfile($user);

        $this->assertInstanceOf(CustomerReferralProfile::class, $profile);
        $this->assertNotEmpty($profile->referral_code);
        $this->assertSame(0, $profile->total_referrals_count);
        $this->assertSame(0, $profile->successful_referrals_count);
    }

    public function test_referral_redirect_endpoint_sets_cookie_and_redirects(): void
    {
        $referrer = $this->createCustomerUser();
        $profile = app(ReferralService::class)->getOrCreateProfile($referrer);

        $response = $this->get("/r/{$profile->referral_code}");

        $response->assertRedirect(route('register'));
        $response->assertCookie('tijum_referral_code', $profile->referral_code);
    }

    public function test_attributes_referral_and_enforces_anti_self_referral_safeguards(): void
    {
        $referrer = $this->createCustomerUser(['phone' => '9876543210']);
        $service = app(ReferralService::class);
        $profile = $service->getOrCreateProfile($referrer);
        $code = $profile->referral_code;

        // 1. Self-referral attempt fails
        $selfAttr = $service->attributeReferral($referrer, $code);
        $this->assertNull($selfAttr);

        // 2. Matching phone attempt fails
        $samePhoneUser = $this->createCustomerUser(['phone' => '9876543210']);
        $phoneAttr = $service->attributeReferral($samePhoneUser, $code);
        $this->assertNull($phoneAttr);

        // 3. Valid friend referral succeeds
        $friend = $this->createCustomerUser(['phone' => '9123456789']);
        $validAttr = $service->attributeReferral($friend, $code, '127.0.0.1', 'PHPUnit Test Agent');

        $this->assertInstanceOf(CustomerReferral::class, $validAttr);
        $this->assertSame($referrer->id, $validAttr->referrer_user_id);
        $this->assertSame($friend->id, $validAttr->referred_user_id);
        $this->assertSame(ReferralStatus::Registered, $validAttr->status);
        $this->assertSame(500, $validAttr->referrer_reward_points);
        $this->assertSame(250, $validAttr->referred_reward_points);

        // 4. Duplicate attribution attempt for already-referred friend fails
        $duplicateAttr = $service->attributeReferral($friend, $code);
        $this->assertNull($duplicateAttr);
    }

    public function test_qualifies_referral_and_credits_dual_rewards_upon_completed_stay(): void
    {
        $referrer = $this->createCustomerUser();
        $friend = $this->createCustomerUser();
        $service = app(ReferralService::class);

        $profile = $service->getOrCreateProfile($referrer);
        $referral = $service->attributeReferral($friend, $profile->referral_code);
        $this->assertNotNull($referral);

        // Friend creates booking of ₹2,000 (200,000 minor)
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);

        $reservation = app(CreateReservation::class)->execute($friend, $payload);
        app(ReservationLifecycle::class)->confirmPaid($reservation);

        // Simulate checkout completed in past
        $reservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        // Run qualification command
        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();

        // 1. Referral record marked qualified
        $referral->refresh();
        $this->assertSame(ReferralStatus::RewardCredited, $referral->status);
        $this->assertSame($reservation->id, $referral->qualifying_reservation_id);
        $this->assertNotNull($referral->reward_points_credited_at);

        // 2. Referrer received 500 points in ledger & wallet
        $referrerWallet = app(LoyaltyPointsService::class)->getOrCreateWallet($referrer);
        $this->assertSame(500, $referrerWallet->available_points);

        $referrerLedger = CustomerPointsLedger::query()
            ->where('user_id', $referrer->id)
            ->where('transaction_type', PointsTransactionType::ReferralBonusReferrer)
            ->firstOrFail();
        $this->assertSame(500, $referrerLedger->points);
        $this->assertSame(PointsTransactionStatus::Available, $referrerLedger->status);

        // 3. Referred friend received 250 welcome points
        $friendWallet = app(LoyaltyPointsService::class)->getOrCreateWallet($friend);
        $this->assertGreaterThanOrEqual(250, $friendWallet->available_points);

        $friendLedger = CustomerPointsLedger::query()
            ->where('user_id', $friend->id)
            ->where('transaction_type', PointsTransactionType::ReferralBonusReferred)
            ->firstOrFail();
        $this->assertSame(250, $friendLedger->points);

        // 4. Referrer profile stats updated
        $profile->refresh();
        $this->assertSame(1, $profile->successful_referrals_count);
        $this->assertSame(500, $profile->total_points_earned);
    }

    public function test_live_ajax_referral_code_validation_endpoint(): void
    {
        $referrer = $this->createCustomerUser(['name' => 'Kavya Reddy']);
        $profile = app(ReferralService::class)->getOrCreateProfile($referrer);

        // 1. Valid code
        $resValid = $this->getJson("/api/referrals/validate?code={$profile->referral_code}");
        $resValid->assertOk()
            ->assertJson([
                'valid' => true,
                'code' => $profile->referral_code,
                'referrer_name' => 'Kavya Reddy',
                'reward_points' => 250,
            ]);

        // 2. Non-existent code
        $resInvalid = $this->getJson('/api/referrals/validate?code=FAKEREF999');
        $resInvalid->assertOk()
            ->assertJson([
                'valid' => false,
            ]);

        // 3. Blocked profile code
        $profile->update(['is_blocked' => true]);
        $resBlocked = $this->getJson("/api/referrals/validate?code={$profile->referral_code}");
        $resBlocked->assertOk()
            ->assertJson([
                'valid' => false,
                'message' => 'This referral code is inactive.',
            ]);

        // 4. Self referral when logged in
        $profile->update(['is_blocked' => false]);
        $resSelf = $this->actingAs($referrer)->getJson("/api/referrals/validate?code={$profile->referral_code}");
        $resSelf->assertOk()
            ->assertJson([
                'valid' => false,
                'message' => 'You cannot use your own referral code.',
            ]);
    }

    public function test_enforces_max_5_referral_earnings_cap_for_referrer(): void
    {
        $referrer = $this->createCustomerUser();
        $profile = app(ReferralService::class)->getOrCreateProfile($referrer);
        // Set existing successful referrals to the cap (5)
        $profile->update([
            'successful_referrals_count' => 5,
            'total_points_earned' => 2500,
        ]);

        $friend = $this->createCustomerUser();
        $service = app(ReferralService::class);
        $referral = $service->attributeReferral($friend, $profile->referral_code);
        $this->assertNotNull($referral);

        // Friend creates booking of ₹2,000 (200,000 minor) and completes stay
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);

        $reservation = app(CreateReservation::class)->execute($friend, $payload);
        app(ReservationLifecycle::class)->confirmPaid($reservation);

        $reservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();

        $referral->refresh();
        $this->assertSame(ReferralStatus::RewardCredited, $referral->status);

        // Referrer wallet points should NOT increase beyond prior earnings because cap is reached
        $referrerWallet = app(LoyaltyPointsService::class)->getOrCreateWallet($referrer);
        $this->assertSame(0, $referrerWallet->available_points);

        // Profile points should still be 2,500 (no extra points credited)
        $profile->refresh();
        $this->assertSame(2500, $profile->total_points_earned);
        $this->assertSame(6, $profile->successful_referrals_count);
    }
}
