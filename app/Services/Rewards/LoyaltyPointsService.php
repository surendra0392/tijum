<?php

declare(strict_types=1);

namespace App\Services\Rewards;

use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Models\Admin;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\PointsReservationHold;
use App\Models\Reservation;
use App\Models\RewardsSetting;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class LoyaltyPointsService
{
    /**
     * Get or create the customer's points wallet.
     */
    public function getOrCreateWallet(User $user): CustomerPointsWallet
    {
        /** @var CustomerPointsWallet $wallet */
        $wallet = CustomerPointsWallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'available_points' => 0,
                'pending_points' => 0,
                'reserved_points' => 0,
                'redeemed_points' => 0,
                'expired_points' => 0,
                'total_points_earned' => 0,
            ]
        );

        return $wallet;
    }

    /**
     * 1 Point = 100 paise = ₹1.00.
     */
    public function convertPointsToInrMinor(int $points): int
    {
        $ratePaise = (int) RewardsSetting::get('points_redemption_rate_paise', 100);

        return $points * $ratePaise;
    }

    /**
     * Convert INR minor to Points.
     */
    public function convertInrMinorToPoints(int $amountMinor): int
    {
        $ratePaise = (int) RewardsSetting::get('points_redemption_rate_paise', 100);
        if ($ratePaise <= 0) {
            $ratePaise = 100;
        }

        return intdiv($amountMinor, $ratePaise);
    }

    /**
     * Calculate points that will be earned on a booking upon stay completion.
     * Default: 500 bps = 5% of booking gross. E.g. ₹1000 = 50 points.
     */
    public function calculatePointsEarnedForBooking(int $bookingGrossMinor): int
    {
        $earningBps = (int) RewardsSetting::get('points_earning_rate_bps', 500);

        return intdiv($bookingGrossMinor * $earningBps, 1_000_000);
    }

    /**
     * Get the maximum points a customer can redeem for a given payable subtotal.
     */
    public function getMaxRedeemablePoints(User $user, int $payableSubtotalMinor): int
    {
        $wallet = $this->getOrCreateWallet($user);
        $available = $wallet->available_points;

        $minBalance = (int) RewardsSetting::get('points_redemption_min_balance', 100);
        if ($available < $minBalance) {
            return 0;
        }

        $maxPercentage = (int) RewardsSetting::get('points_redemption_max_percentage', 50);
        $maxInrDiscountMinor = intdiv($payableSubtotalMinor * $maxPercentage, 100);

        $maxPointsByPrice = $this->convertInrMinorToPoints($maxInrDiscountMinor);

        return min($available, $maxPointsByPrice);
    }

    /**
     * Create a 15-minute checkout hold for points.
     */
    public function createHold(
        User $user,
        int $pointsToRedeem,
        ?Reservation $reservation = null,
    ): PointsReservationHold {
        if ($pointsToRedeem <= 0) {
            throw new RuntimeException('Points to redeem must be greater than zero.');
        }

        return DB::transaction(function () use ($user, $pointsToRedeem, $reservation): PointsReservationHold {
            /** @var CustomerPointsWallet $wallet */
            $wallet = CustomerPointsWallet::query()
                ->lockForUpdate()
                ->firstOrCreate(['user_id' => $user->id]);

            if ($wallet->available_points < $pointsToRedeem) {
                throw new RuntimeException('Insufficient available points balance.');
            }

            // Release any existing active hold for this user
            $existingHolds = PointsReservationHold::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->get();

            foreach ($existingHolds as $existing) {
                $wallet->increment('available_points', $existing->points_held);
                $wallet->decrement('reserved_points', $existing->points_held);
                $existing->update(['status' => 'released']);
            }

            // Move points from available to reserved
            $wallet->decrement('available_points', $pointsToRedeem);
            $wallet->increment('reserved_points', $pointsToRedeem);

            $inrDiscount = $this->convertPointsToInrMinor($pointsToRedeem);
            $holdDuration = (int) RewardsSetting::get('hold_duration_minutes', 15);
            $holdRef = 'HLD-PTS-'.strtoupper(Str::random(10));

            return PointsReservationHold::create([
                'user_id' => $user->id,
                'reservation_id' => $reservation?->id,
                'hold_reference' => $holdRef,
                'points_held' => $pointsToRedeem,
                'inr_discount_minor' => $inrDiscount,
                'expires_at' => CarbonImmutable::now()->addMinutes($holdDuration),
                'status' => 'active',
            ]);
        });
    }

    /**
     * Release an active hold (e.g. on checkout abandonment or expiration).
     */
    public function releaseHold(PointsReservationHold|int $hold): void
    {
        $id = $hold instanceof PointsReservationHold ? $hold->id : $hold;

        DB::transaction(function () use ($id): void {
            /** @var PointsReservationHold|null $lockedHold */
            $lockedHold = PointsReservationHold::query()->lockForUpdate()->find($id);

            if ($lockedHold !== null && $lockedHold->status === 'active') {
                $wallet = CustomerPointsWallet::query()->lockForUpdate()->where('user_id', $lockedHold->user_id)->first();

                if ($wallet !== null) {
                    $pointsToReturn = min($lockedHold->points_held, $wallet->reserved_points);
                    $wallet->decrement('reserved_points', $pointsToReturn);
                    $wallet->increment('available_points', $pointsToReturn);
                }

                $lockedHold->update(['status' => 'released']);
            }
        });
    }

    /**
     * Commit the points hold upon payment capture and burn from ledger using FEFO.
     */
    public function commitHold(PointsReservationHold $hold, Reservation $reservation): CustomerPointsLedger
    {
        return DB::transaction(function () use ($hold, $reservation): CustomerPointsLedger {
            /** @var PointsReservationHold $lockedHold */
            $lockedHold = PointsReservationHold::query()->lockForUpdate()->findOrFail($hold->id);

            if ($lockedHold->status === 'committed') {
                /** @var CustomerPointsLedger $existing */
                $existing = CustomerPointsLedger::query()
                    ->where('user_id', $lockedHold->user_id)
                    ->where('reference_type', Reservation::class)
                    ->where('reference_id', $reservation->id)
                    ->where('transaction_type', PointsTransactionType::BookingRedeemed)
                    ->firstOrFail();

                return $existing;
            }

            /** @var CustomerPointsWallet $wallet */
            $wallet = CustomerPointsWallet::query()->lockForUpdate()->where('user_id', $lockedHold->user_id)->firstOrFail();

            $pointsToBurn = $lockedHold->points_held;

            // Decrement reserved and increment redeemed
            $wallet->decrement('reserved_points', min($pointsToBurn, $wallet->reserved_points));
            $wallet->increment('redeemed_points', $pointsToBurn);

            // Burn points from active credit entries via FEFO (First-Expiring-First-Out)
            $consumedFrom = $this->consumeCreditsFefo($lockedHold->user_id, $pointsToBurn);

            $idempKey = 'RED-'.$reservation->id.'-'.Str::random(8);

            $ledgerEntry = CustomerPointsLedger::create([
                'user_id' => $lockedHold->user_id,
                'transaction_type' => PointsTransactionType::BookingRedeemed,
                'status' => PointsTransactionStatus::Redeemed,
                'points' => -$pointsToBurn,
                'inr_equivalent_minor' => $lockedHold->inr_discount_minor,
                'running_balance_after' => $wallet->available_points,
                'reference_type' => Reservation::class,
                'reference_id' => $reservation->id,
                'idempotency_key' => $idempKey,
                'consumed_from_entry_ids' => $consumedFrom,
                'notes' => "Redeemed for booking #{$reservation->booking_reference}",
            ]);

            $lockedHold->update([
                'status' => 'committed',
                'reservation_id' => $reservation->id,
            ]);

            return $ledgerEntry;
        });
    }

    /**
     * Credit available points to customer wallet and append ledger entry.
     */
    public function creditPoints(
        User $user,
        int $points,
        PointsTransactionType $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $idempotencyKey = null,
        ?string $notes = null,
        ?Admin $admin = null,
        ?CarbonImmutable $expiresAt = null,
    ): CustomerPointsLedger {
        return DB::transaction(function () use ($user, $points, $type, $referenceType, $referenceId, $idempotencyKey, $notes, $admin, $expiresAt): CustomerPointsLedger {
            $key = $idempotencyKey ?? 'PTS-'.Str::random(16);

            $existing = CustomerPointsLedger::query()->where('idempotency_key', $key)->first();
            if ($existing !== null) {
                return $existing;
            }

            /** @var CustomerPointsWallet $wallet */
            $wallet = CustomerPointsWallet::query()
                ->lockForUpdate()
                ->firstOrCreate(['user_id' => $user->id]);

            $wallet->increment('available_points', $points);
            $wallet->increment('total_points_earned', $points);

            $expiryDays = (int) RewardsSetting::get('points_expiry_days', 365);
            $calculatedExpiry = $expiresAt ?? CarbonImmutable::now()->addDays($expiryDays);

            return CustomerPointsLedger::create([
                'user_id' => $user->id,
                'transaction_type' => $type,
                'status' => PointsTransactionStatus::Available,
                'points' => $points,
                'inr_equivalent_minor' => $this->convertPointsToInrMinor($points),
                'running_balance_after' => $wallet->available_points,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => $key,
                'expires_at' => $calculatedExpiry,
                'points_remaining' => $points,
                'admin_id' => $admin?->id,
                'notes' => $notes,
            ]);
        });
    }

    /**
     * Record pending booking points to be credited upon stay completion.
     */
    public function recordPendingBookingPoints(User $user, Reservation $reservation, int $points): CustomerPointsLedger
    {
        return DB::transaction(function () use ($user, $reservation, $points): CustomerPointsLedger {
            $key = 'PND-BK-'.$reservation->id;

            $existing = CustomerPointsLedger::query()->where('idempotency_key', $key)->first();
            if ($existing !== null) {
                return $existing;
            }

            /** @var CustomerPointsWallet $wallet */
            $wallet = CustomerPointsWallet::query()
                ->lockForUpdate()
                ->firstOrCreate(['user_id' => $user->id]);

            $wallet->increment('pending_points', $points);

            return CustomerPointsLedger::create([
                'user_id' => $user->id,
                'transaction_type' => PointsTransactionType::BookingEarned,
                'status' => PointsTransactionStatus::Pending,
                'points' => $points,
                'inr_equivalent_minor' => $this->convertPointsToInrMinor($points),
                'running_balance_after' => $wallet->available_points,
                'reference_type' => Reservation::class,
                'reference_id' => $reservation->id,
                'idempotency_key' => $key,
                'points_remaining' => $points,
                'notes' => "Pending reward for booking #{$reservation->booking_reference}",
            ]);
        });
    }

    /**
     * Activate pending points once reservation stay is completed.
     */
    public function activatePendingPoints(Reservation $reservation): ?CustomerPointsLedger
    {
        /** @var int|null $newAvailableBalance */
        $newAvailableBalance = null;

        $ledgerEntry = DB::transaction(function () use ($reservation, &$newAvailableBalance): ?CustomerPointsLedger {
            /** @var CustomerPointsLedger|null $pendingEntry */
            $pendingEntry = CustomerPointsLedger::query()
                ->lockForUpdate()
                ->where('reference_type', Reservation::class)
                ->where('reference_id', $reservation->id)
                ->where('status', PointsTransactionStatus::Pending)
                ->first();

            if ($pendingEntry === null) {
                return null;
            }

            /** @var CustomerPointsWallet $wallet */
            $wallet = CustomerPointsWallet::query()
                ->lockForUpdate()
                ->where('user_id', $pendingEntry->user_id)
                ->firstOrFail();

            $points = $pendingEntry->points;

            $wallet->decrement('pending_points', min($points, $wallet->pending_points));
            $wallet->increment('available_points', $points);
            $wallet->increment('total_points_earned', $points);

            $expiryDays = (int) RewardsSetting::get('points_expiry_days', 365);

            $pendingEntry->update([
                'status' => PointsTransactionStatus::Available,
                'running_balance_after' => $wallet->available_points,
                'expires_at' => CarbonImmutable::now()->addDays($expiryDays),
                'points_remaining' => $points,
                'notes' => "Credited for completed stay #{$reservation->booking_reference}",
            ]);

            $reservation->update(['points_awarded_credited' => $points]);
            $freshWallet = $wallet->fresh();
            $newAvailableBalance = $freshWallet !== null ? $freshWallet->available_points : ($wallet->available_points + $points);

            return $pendingEntry;
        });

        if ($ledgerEntry !== null) {
            try {
                $reservation->loadMissing(['user', 'property']);
                if ($reservation->user !== null) {
                    app(NotificationDispatcher::class)->dispatch(
                        eventType: 'rewards.points_credited',
                        recipients: $reservation->user,
                        variables: [
                            'customer_name' => $reservation->user->name,
                            'property_name' => $reservation->snapshot_property_name ?: $reservation->property->name,
                            'booking_reference' => $reservation->booking_reference,
                            'points_credited' => number_format($ledgerEntry->points),
                            'points_balance' => number_format($newAvailableBalance),
                            'action_url' => url('/rewards'),
                        ],
                        related: $reservation,
                        relatedReference: $reservation->booking_reference,
                        idempotencySeed: 'points_credited_'.$reservation->id.'_'.$ledgerEntry->id
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch rewards.points_credited notification: '.$e->getMessage(), [
                    'reservation_id' => $reservation->id,
                ]);
            }
        }

        return $ledgerEntry;
    }

    /**
     * Reverse pending points on reservation cancellation.
     */
    public function reversePendingPoints(Reservation $reservation, string $reason): void
    {
        DB::transaction(function () use ($reservation, $reason): void {
            /** @var CustomerPointsLedger|null $pendingEntry */
            $pendingEntry = CustomerPointsLedger::query()
                ->lockForUpdate()
                ->where('reference_type', Reservation::class)
                ->where('reference_id', $reservation->id)
                ->where('status', PointsTransactionStatus::Pending)
                ->first();

            if ($pendingEntry !== null) {
                $wallet = CustomerPointsWallet::query()
                    ->lockForUpdate()
                    ->where('user_id', $pendingEntry->user_id)
                    ->first();

                if ($wallet !== null) {
                    $wallet->decrement('pending_points', min($pendingEntry->points, $wallet->pending_points));
                }

                $pendingEntry->update([
                    'status' => PointsTransactionStatus::Reversed,
                    'notes' => "Reversed due to cancellation: {$reason}",
                ]);
            }
        });
    }

    /**
     * Refund redeemed points back to customer wallet on reservation cancellation.
     */
    public function refundRedeemedPoints(Reservation $reservation, string $reason): void
    {
        DB::transaction(function () use ($reservation, $reason): void {
            /** @var CustomerPointsLedger|null $redeemedEntry */
            $redeemedEntry = CustomerPointsLedger::query()
                ->lockForUpdate()
                ->where('reference_type', Reservation::class)
                ->where('reference_id', $reservation->id)
                ->where('transaction_type', PointsTransactionType::BookingRedeemed)
                ->first();

            if ($redeemedEntry === null) {
                return;
            }

            $pointsToRefund = abs($redeemedEntry->points);

            /** @var User $user */
            $user = User::query()->findOrFail($redeemedEntry->user_id);

            $this->creditPoints(
                user: $user,
                points: $pointsToRefund,
                type: PointsTransactionType::PointsReversed,
                referenceType: Reservation::class,
                referenceId: $reservation->id,
                idempotencyKey: 'RFD-PTS-'.$reservation->id,
                notes: "Refund of redeemed points for cancelled booking #{$reservation->booking_reference}: {$reason}",
            );
        });
    }

    /**
     * Manual adjustment of points by Admin with audit trail.
     */
    public function adjustPoints(
        User $user,
        int $pointsDelta,
        string $reason,
        Admin $admin,
    ): CustomerPointsLedger {
        return DB::transaction(function () use ($user, $pointsDelta, $reason, $admin): CustomerPointsLedger {
            /** @var CustomerPointsWallet $wallet */
            $wallet = CustomerPointsWallet::query()
                ->lockForUpdate()
                ->firstOrCreate(['user_id' => $user->id]);

            if ($pointsDelta < 0 && $wallet->available_points < abs($pointsDelta)) {
                throw new RuntimeException('Cannot deduct more points than the user available balance.');
            }

            if ($pointsDelta >= 0) {
                $wallet->increment('available_points', $pointsDelta);
                $wallet->increment('total_points_earned', $pointsDelta);
                $remaining = $pointsDelta;
                $expiry = CarbonImmutable::now()->addDays((int) RewardsSetting::get('points_expiry_days', 365));
            } else {
                $wallet->decrement('available_points', abs($pointsDelta));
                $this->consumeCreditsFefo($user->id, abs($pointsDelta));
                $remaining = 0;
                $expiry = null;
            }

            $idempKey = 'ADJ-'.Str::random(12);

            return CustomerPointsLedger::create([
                'user_id' => $user->id,
                'transaction_type' => PointsTransactionType::AdminAdjustment,
                'status' => PointsTransactionStatus::Available,
                'points' => $pointsDelta,
                'inr_equivalent_minor' => $this->convertPointsToInrMinor(abs($pointsDelta)),
                'running_balance_after' => $wallet->available_points,
                'reference_type' => Admin::class,
                'reference_id' => $admin->id,
                'idempotency_key' => $idempKey,
                'expires_at' => $expiry,
                'points_remaining' => $remaining,
                'admin_id' => $admin->id,
                'notes' => "Admin Adjustment: {$reason}",
            ]);
        });
    }

    /**
     * Burn points from active credit entries via FEFO (First-Expiring-First-Out).
     *
     * @return list<array{entry_id: int, points_consumed: int}>
     */
    private function consumeCreditsFefo(int $userId, int $pointsNeeded): array
    {
        $consumed = [];
        $remainingToDeduct = $pointsNeeded;

        /** @var Collection<int, CustomerPointsLedger> $credits */
        $credits = CustomerPointsLedger::query()
            ->lockForUpdate()
            ->where('user_id', $userId)
            ->where('status', PointsTransactionStatus::Available)
            ->where('points_remaining', '>', 0)
            ->orderBy('expires_at', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        foreach ($credits as $credit) {
            if ($remainingToDeduct <= 0) {
                break;
            }

            $availableInEntry = $credit->points_remaining;
            $deduct = min($availableInEntry, $remainingToDeduct);

            $credit->decrement('points_remaining', $deduct);
            $remainingToDeduct -= $deduct;

            $consumed[] = [
                'entry_id' => $credit->id,
                'points_consumed' => $deduct,
            ];
        }

        return $consumed;
    }
}
