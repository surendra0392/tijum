<?php

declare(strict_types=1);

namespace Tests\Feature\Rewards;

use App\Actions\Protection\CreateProtectionCase;
use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Console\Commands\QualifyPendingRewardsCommand;
use App\Enums\CaseCategory;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Enums\ReferralStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerReferral;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class Phase4RewardsQualificationAndIntegrityTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_passed_checkout_date_without_verified_checkin_and_checkout_does_not_grant_points_or_referral_rewards(): void
    {
        $referrer = $this->createCustomerUser(['phone' => '9876543210']);
        $friend = $this->createCustomerUser(['phone' => '9123456789']);
        $referralService = app(ReferralService::class);
        $pointsService = app(LoyaltyPointsService::class);

        $profile = $referralService->getOrCreateProfile($referrer);
        $referral = $referralService->attributeReferral($friend, $profile->referral_code);
        $this->assertNotNull($referral);

        $reservation = $this->createPaidConfirmedStay($friend, dailyRateMinor: 100000, durationDays: 2);
        $pointsService->recordPendingBookingPoints($friend, $reservation, 200);

        // Move scheduled dates to the past, but DO NOT mark checked in or checked out
        $reservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
            'checked_in_at' => null,
            'checked_out_at' => null,
        ])->save();

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();
        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));

        // Only checked in (no check-out) must also NOT qualify
        $reservation->forceFill([
            'checked_in_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(5),
            'checked_out_at' => null,
        ])->save();

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();
        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));

        // Only checked out without check-in must also NOT qualify
        $reservation->forceFill([
            'checked_in_at' => null,
            'checked_out_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(2),
        ])->save();

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();
        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));

        $this->assertSame(ReferralStatus::Registered, $referral->fresh()->status);
        $this->assertSame(0, $pointsService->getOrCreateWallet($referrer)->fresh()->available_points);
        $this->assertSame(100, $pointsService->getOrCreateWallet($friend)->fresh()->pending_points);

        // Once both check-in and check-out are verified, qualification succeeds exactly once
        $reservation->forceFill([
            'checked_in_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(5),
            'checked_out_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(2),
        ])->save();

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();

        $this->assertSame(ReferralStatus::RewardCredited, $referral->fresh()->status);
        $this->assertSame(500, $pointsService->getOrCreateWallet($referrer)->fresh()->available_points);
        $this->assertSame(0, $pointsService->getOrCreateWallet($friend)->fresh()->pending_points);
        $this->assertSame(100, $reservation->fresh()->points_awarded_credited);
    }

    public function test_cancelled_expired_unpaid_fully_refunded_or_disputed_reservations_cannot_qualify_for_rewards(): void
    {
        $referrer = $this->createCustomerUser(['phone' => '9811111111']);
        $friend = $this->createCustomerUser(['phone' => '9822222222']);
        $referralService = app(ReferralService::class);
        $pointsService = app(LoyaltyPointsService::class);

        $profile = $referralService->getOrCreateProfile($referrer);
        $referral = $referralService->attributeReferral($friend, $profile->referral_code);
        $this->assertNotNull($referral);

        $reservation = $this->createPaidConfirmedStay($friend, dailyRateMinor: 100000, durationDays: 2);
        $pointsService->recordPendingBookingPoints($friend, $reservation, 150);

        $reservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
            'checked_in_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(5),
            'checked_out_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(2),
        ])->save();

        // 1. Disputed reservation (open CustomerProtectionCase) cannot qualify
        $case = app(CreateProtectionCase::class)->execute($reservation, $friend, [
            'category' => CaseCategory::FoodNotProvided->value,
            'description' => 'Disputed stay.',
        ]);

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();
        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));
        $this->assertSame(ReferralStatus::Registered, $referral->fresh()->status);

        // Close the case, but flag requires_refund_review = true -> still blocked
        $case->forceFill(['status' => CaseStatus::Resolved, 'resolved_at' => now()])->save();
        $reservation->forceFill(['requires_refund_review' => true])->save();

        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));

        // Clear requires_refund_review, but add a full refund -> still blocked
        $reservation->forceFill(['requires_refund_review' => false])->save();
        $payment = $reservation->payments()->firstOrFail();
        $admin = Admin::factory()->create();
        $refund = ReservationRefund::forceCreate([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_full_reward_block',
            'idempotency_key' => 'idemp_full_reward_block',
            'amount_minor' => $payment->amount_minor,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Full refund',
            'gateway_processed_at' => now(),
        ]);

        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));

        // Remove refund, but mark payment Failed (unpaid) -> still blocked
        $refund->delete();
        $payment->forceFill(['status' => PaymentStatus::Failed])->save();

        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));

        // Restore captured payment, but mark reservation Cancelled -> still blocked
        $payment->forceFill(['status' => PaymentStatus::Captured])->save();
        $reservation->forceFill(['status' => ReservationStatus::Cancelled])->save();

        $this->assertNull($pointsService->activatePendingPoints($reservation->fresh()));
        $this->assertNull($referralService->qualifyReferralOnCompletedStay($reservation->fresh()));
        $this->assertSame(ReferralStatus::Registered, $referral->fresh()->status);
    }

    public function test_prevent_self_referral_across_email_casing_and_phone_formatting_variants(): void
    {
        $referrer = $this->createCustomerUser([
            'email' => 'rahul.sharma@example.com',
            'phone' => '9876543210',
        ]);
        $referralService = app(ReferralService::class);
        $profile = $referralService->getOrCreateProfile($referrer);

        // Phone formatting variant (+91 98765-43210) must be blocked as self-referral
        $phoneVariantUser = $this->createCustomerUser([
            'email' => 'other.email@example.com',
            'phone' => '+91 98765-43210',
        ]);
        $this->assertNull($referralService->attributeReferral($phoneVariantUser, $profile->referral_code));

        // Duplicate attribution on the same user must return null without double-crediting
        $validFriend = $this->createCustomerUser([
            'email' => 'friend@example.com',
            'phone' => '9123456780',
        ]);
        $first = $referralService->attributeReferral($validFriend, $profile->referral_code);
        $second = $referralService->attributeReferral($validFriend, $profile->referral_code);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertSame(
            1,
            CustomerReferral::query()->where('referred_user_id', $validFriend->id)->count(),
        );
        $this->assertSame(
            1,
            CustomerPointsLedger::query()
                ->where('user_id', $validFriend->id)
                ->where('transaction_type', PointsTransactionType::ReferralBonusReferred)
                ->count(),
        );
    }

    public function test_repeated_rewards_are_prevented_after_status_or_checkout_changes_and_retries(): void
    {
        $referrer = $this->createCustomerUser(['phone' => '9833333333']);
        $friend = $this->createCustomerUser(['phone' => '9844444444']);
        $referralService = app(ReferralService::class);
        $pointsService = app(LoyaltyPointsService::class);

        $profile = $referralService->getOrCreateProfile($referrer);
        $referralService->attributeReferral($friend, $profile->referral_code);

        $reservation = $this->createPaidConfirmedStay($friend, dailyRateMinor: 100000, durationDays: 2);
        $pointsService->recordPendingBookingPoints($friend, $reservation, 200);
        // Retry recording pending points with same reservation -> idempotent
        $pointsService->recordPendingBookingPoints($friend, $reservation, 200);

        $this->assertSame(
            1,
            CustomerPointsLedger::query()
                ->where('user_id', $friend->id)
                ->where('transaction_type', PointsTransactionType::BookingEarned)
                ->count(),
        );

        $reservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
            'checked_in_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(5),
            'checked_out_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(2),
        ])->save();

        // First qualification run
        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();

        // Simulate undoCheckOut() followed by markCheckedOut() again and command retry
        $reservation->undoCheckOut();
        $reservation->markCheckedOut('admin', 1, 'Re-confirmed checkout');

        $this->artisan(QualifyPendingRewardsCommand::class)->assertSuccessful();
        $pointsService->activatePendingPoints($reservation->fresh());
        $referralService->qualifyReferralOnCompletedStay($reservation->fresh());

        // Second stay by the same referred friend must NOT grant a second referral award
        $secondReservation = $this->createPaidConfirmedStay($friend, dailyRateMinor: 100000, durationDays: 2);
        $secondReservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(4)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(1)->toDateString(),
            'checked_in_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(4),
            'checked_out_at' => CarbonImmutable::now('Asia/Kolkata')->subDays(1),
        ])->save();

        $this->assertNull($referralService->qualifyReferralOnCompletedStay($secondReservation));

        // Verify referrer received 500 points total (never duplicated)
        $this->assertSame(500, $pointsService->getOrCreateWallet($referrer)->fresh()->available_points);
        $this->assertSame(
            1,
            CustomerPointsLedger::query()
                ->where('user_id', $referrer->id)
                ->where('transaction_type', PointsTransactionType::ReferralBonusReferrer)
                ->count(),
        );

        // Verify friend received 250 welcome points + 100 booking points = 350 points (never duplicated)
        $this->assertSame(350, $pointsService->getOrCreateWallet($friend)->fresh()->available_points);
        $this->assertSame(
            1,
            CustomerPointsLedger::query()
                ->where('user_id', $friend->id)
                ->where('reference_type', Reservation::class)
                ->where('reference_id', $reservation->id)
                ->where('status', PointsTransactionStatus::Available)
                ->count(),
        );
    }

    private function createPaidConfirmedStay($user, int $dailyRateMinor, int $durationDays): Reservation
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: $dailyRateMinor);
        $this->createActiveRoom($property, $roomType);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: $durationDays);

        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_rewards_'.$reservation->id,
            'gateway_payment_id' => 'pay_rewards_'.$reservation->id,
            'idempotency_key' => 'idemp_rewards_'.$reservation->id,
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now(),
        ]);

        return app(ReservationLifecycle::class)->confirmPaid($reservation, $payment);
    }
}
