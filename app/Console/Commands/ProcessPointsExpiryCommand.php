<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
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
            DB::transaction(function () use ($userId, $entries, &$totalExpired): void {
                /** @var CustomerPointsWallet|null $wallet */
                $wallet = CustomerPointsWallet::query()
                    ->lockForUpdate()
                    ->where('user_id', $userId)
                    ->first();

                if ($wallet === null) {
                    return;
                }

                $userExpiredPoints = 0;
                $consumedIds = [];

                foreach ($entries as $entry) {
                    /** @var CustomerPointsLedger|null $lockedEntry */
                    $lockedEntry = CustomerPointsLedger::query()->lockForUpdate()->find($entry->id);
                    if ($lockedEntry !== null && $lockedEntry->points_remaining > 0) {
                        $pts = $lockedEntry->points_remaining;
                        $userExpiredPoints += $pts;
                        $consumedIds[] = ['entry_id' => $lockedEntry->id, 'points_expired' => $pts];
                        $lockedEntry->update(['points_remaining' => 0]);
                    }
                }

                if ($userExpiredPoints > 0) {
                    $deduct = min($userExpiredPoints, $wallet->available_points);
                    $wallet->decrement('available_points', $deduct);
                    $wallet->increment('expired_points', $userExpiredPoints);

                    $ratePaise = 100;

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
