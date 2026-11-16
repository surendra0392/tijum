<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Payments\ReconcileExpiredReservations;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class ExpireUnpaidReservationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tijum:expire-reservations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reconcile and expire unpaid reservations whose checkout deadline has passed.';

    /**
     * Execute the console command.
     */
    public function handle(ReconcileExpiredReservations $reconciler): int
    {
        $start = microtime(true);
        $results = $reconciler->execute();
        $durationMs = (int) round((microtime(true) - $start) * 1000);

        Cache::put('tijum:heartbeat:expire-reservations', [
            'last_run_at' => CarbonImmutable::now('Asia/Kolkata')->toIso8601String(),
            'status' => 'success',
            'duration_ms' => $durationMs,
            'details' => $results,
        ], now()->addDays(7));

        $this->info("Expired: {$results['expired']}, Confirmed: {$results['confirmed']}, Errors: {$results['errors']}");

        return self::SUCCESS;
    }
}
