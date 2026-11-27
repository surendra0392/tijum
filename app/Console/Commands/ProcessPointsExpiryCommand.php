<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\RewardsSetting;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProcessPointsExpiryCommand extends Command
{
    protected $signature = 'tijum:rewards:process-expiry';

    protected $description = 'Process expired loyalty points via FEFO schedule and deduct from wallets';

    public function handle(): int
    {
        $now = CarbonImmutable::now();
        $ratePaise = max(1, (int) RewardsSetting::get('points_redemption_rate_paise', 100));

        $expiredEntries = CustomerPointsLedger::query()
            ->where('status', PointsTransactionStatus::Available)
            ->where('points_remaining', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->get();

        if ($expiredEntries->isEmpty()) {
            $this->info('No expired points found.');

            return self::SUCCESS;
        }

        $byUser = $expiredEntries->groupBy('user_id');
        $totalExpired = 0;

        foreach ($byUser as $userId => $entries) {
            DB::transaction(function () use ($userId, $entries, $ratePaise, &$totalExpired): void {
                /** @var CustomerPointsWallet|null $wallet */
                $wallet = CustomerPointsWallet::query()
                    ->lockForUpdate()
                    ->where('user_id', $userId)
                    ->first();

                if ($wallet === null || $wallet->available_points <= 0) {
                    return;
                }

                // Never expire points that are currently backing active reserved checkout holds.
                $remainingCap = $wallet->available_points;
                $userExpiredPoints = 0;
                $consumedIds = [];

                foreach ($entries as $entry) {
                    if ($remainingCap <= 0) {
                        break;
                    }

                    /** @var CustomerPointsLedger|null $lockedEntry */
                    $lockedEntry = CustomerPointsLedger::query()->lockForUpdate()->find($entry->id);
                    if ($lockedEntry !== null && $lockedEntry->points_remaining > 0) {
                        $pts = min($lockedEntry->points_remaining, $remainingCap);
                        $userExpiredPoints += $pts;
                        $remainingCap -= $pts;
                        $consumedIds[] = ['entry_id' => $lockedEntry->id, 'points_expired' => $pts];
                        $lockedEntry->decrement('points_remaining', $pts);
                    }
                }

                if ($userExpiredPoints > 0) {
                    $wallet->decrement('available_points', $userExpiredPoints);
                    $wallet->increment('expired_points', $userExpiredPoints);
                    $wallet->refresh();

                    CustomerPointsLedger::create([
                        'user_id' => $userId,
                        'transaction_type' => PointsTransactionType::PointsExpired,
                        'status' => PointsTransactionStatus::Expired,
                        'points' => -$userExpiredPoints,
                        'inr_equivalent_minor' => (int) ($userExpiredPoints * $ratePaise),
                        'running_balance_after' => $wallet->available_points,
                        'idempotency_key' => 'EXP-'.Str::random(16),
                        'consumed_from_entry_ids' => $consumedIds,
                        'notes' => "Expired {$userExpiredPoints} loyalty points past validity period.",
                    ]);

                    $totalExpired += $userExpiredPoints;
                }
            });
        }

        $this->info("Processed expiry for {$expiredEntries->count()} entries across {$byUser->count()} users (Total {$totalExpired} points expired).");

        return self::SUCCESS;
    }
}
