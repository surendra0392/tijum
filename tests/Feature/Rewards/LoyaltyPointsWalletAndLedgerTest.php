<?php

declare(strict_types=1);

namespace Tests\Feature\Rewards;

use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Console\Commands\ProcessPointsExpiryCommand;
use App\Enums\AdminRole;
use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Models\Admin;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\PointsReservationHold;
use App\Services\Rewards\LoyaltyPointsService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class LoyaltyPointsWalletAndLedgerTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_initializes_wallet_with_zero_balances(): void
    {
        $user = $this->createCustomerUser();
        $service = app(LoyaltyPointsService::class);

        $wallet = $service->getOrCreateWallet($user);

        $this->assertInstanceOf(CustomerPointsWallet::class, $wallet);
        $this->assertSame(0, $wallet->available_points);
        $this->assertSame(0, $wallet->pending_points);
        $this->assertSame(0, $wallet->reserved_points);
        $this->assertSame(0, $wallet->redeemed_points);
        $this->assertSame(0, $wallet->expired_points);
    }

    public function test_credits_points_with_fefo_expiry_tracking(): void
    {
        $user = $this->createCustomerUser();
        $service = app(LoyaltyPointsService::class);

        // Credit 500 points expiring in 30 days
        $expiry1 = CarbonImmutable::now()->addDays(30);
        $entry1 = $service->creditPoints(
            user: $user,
            points: 500,
            type: PointsTransactionType::PromotionalBonus,
            notes: 'Batch 1 Promo',
            expiresAt: $expiry1,
        );

        $this->assertSame(500, $entry1->points);
        $this->assertSame(500, $entry1->points_remaining);
        $this->assertSame(PointsTransactionStatus::Available, $entry1->status);

        $wallet = $service->getOrCreateWallet($user);
        $this->assertSame(500, $wallet->available_points);
        $this->assertSame(500, $wallet->total_points_earned);

        // Credit 300 points expiring in 60 days
        $expiry2 = CarbonImmutable::now()->addDays(60);
        $entry2 = $service->creditPoints(
            user: $user,
            points: 300,
            type: PointsTransactionType::PromotionalBonus,
            notes: 'Batch 2 Promo',
            expiresAt: $expiry2,
        );

        $wallet->refresh();
        $this->assertSame(800, $wallet->available_points);
        $this->assertSame(800, $wallet->total_points_earned);
    }

    public function test_points_checkout_hold_and_fefo_redemption_burn(): void
    {
        $user = $this->createCustomerUser();
        $service = app(LoyaltyPointsService::class);

        // Setup 2 credit batches: Batch 1 (200 pts, expires in 10 days), Batch 2 (300 pts, expires in 50 days)
        $service->creditPoints(
            user: $user,
            points: 200,
            type: PointsTransactionType::PromotionalBonus,
            expiresAt: CarbonImmutable::now()->addDays(10),
        );
        $service->creditPoints(
            user: $user,
            points: 300,
            type: PointsTransactionType::PromotionalBonus,
            expiresAt: CarbonImmutable::now()->addDays(50),
        );

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000); // ₹1,000/day
        $this->createActiveRoom($property, $roomType);

        // 1. Create reservation redeeming 350 points (₹350 discount)
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $payload['points_to_redeem'] = 350;

        $reservation = app(CreateReservation::class)->execute($user, $payload);

        // Verify reservation values
        $this->assertSame(200000, $reservation->original_amount_minor);
        $this->assertSame(165000, $reservation->total_amount_minor); // ₹2,000 - ₹350 = ₹1,650
        $this->assertSame(350, $reservation->points_redeemed);
        $this->assertSame(35000, $reservation->points_discount_minor);

        // Verify wallet hold: 350 points moved from available to reserved
        $wallet = $service->getOrCreateWallet($user);
        $this->assertSame(150, $wallet->available_points); // 500 - 350
        $this->assertSame(350, $wallet->reserved_points);

        $hold = PointsReservationHold::query()->where('reservation_id', $reservation->id)->firstOrFail();
        $this->assertSame('active', $hold->status);
        $this->assertSame(350, $hold->points_held);

        // 2. Confirm payment
        app(ReservationLifecycle::class)->confirmPaid($reservation);

        // Hold should be committed and points burned via FEFO
        $hold->refresh();
        $this->assertSame('committed', $hold->status);

        $wallet->refresh();
        $this->assertSame(150, $wallet->available_points);
        $this->assertSame(0, $wallet->reserved_points);
        $this->assertSame(350, $wallet->redeemed_points);

        // Check FEFO consumption on available credit entries:
        // Batch 1 (200 pts) should have 0 remaining.
        // Batch 2 (300 pts) should have 150 remaining (300 - 150).
        $credits = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->where('status', PointsTransactionStatus::Available)
            ->where('points', '>', 0)
            ->orderBy('expires_at', 'asc')
            ->get();

        $this->assertSame(0, $credits[0]->points_remaining);
        $this->assertSame(150, $credits[1]->points_remaining);

        // Check debit redemption ledger entry
        $debitEntry = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', PointsTransactionType::BookingRedeemed)
            ->firstOrFail();

        $this->assertSame(-350, $debitEntry->points);
        $this->assertCount(2, $debitEntry->consumed_from_entry_ids);
    }

    public function test_admin_manual_adjustment_with_audit_trail(): void
    {
        $user = $this->createCustomerUser();
        $admin = Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
        ]);

        $service = app(LoyaltyPointsService::class);

        // Credit 150 points manually
        $entry = $service->adjustPoints(
            user: $user,
            pointsDelta: 150,
            reason: 'Goodwill compensation for issue',
            admin: $admin,
        );

        $this->assertSame(150, $entry->points);
        $this->assertSame(PointsTransactionType::AdminAdjustment, $entry->transaction_type);
        $this->assertSame($admin->id, $entry->admin_id);
        $this->assertStringContainsString('Goodwill compensation', (string) $entry->notes);

        $wallet = $service->getOrCreateWallet($user);
        $this->assertSame(150, $wallet->available_points);
    }

    public function test_process_points_expiry_command_expires_points_via_fefo(): void
    {
        $user = $this->createCustomerUser();
        $service = app(LoyaltyPointsService::class);

        // Credit 100 points that expired yesterday
        $service->creditPoints(
            user: $user,
            points: 100,
            type: PointsTransactionType::PromotionalBonus,
            expiresAt: CarbonImmutable::now()->subDay(),
        );

        // Credit 200 points that expire in 30 days
        $service->creditPoints(
            user: $user,
            points: 200,
            type: PointsTransactionType::PromotionalBonus,
            expiresAt: CarbonImmutable::now()->addDays(30),
        );

        $wallet = $service->getOrCreateWallet($user);
        $this->assertSame(300, $wallet->available_points);

        // Run expiry command
        $this->artisan(ProcessPointsExpiryCommand::class)->assertSuccessful();

        $wallet->refresh();
        $this->assertSame(200, $wallet->available_points);
        $this->assertSame(100, $wallet->expired_points);

        // Verify expiry ledger entry
        $expiryEntry = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', PointsTransactionType::PointsExpired)
            ->firstOrFail();

        $this->assertSame(-100, $expiryEntry->points);
        $this->assertSame(PointsTransactionStatus::Expired, $expiryEntry->status);
    }
}
