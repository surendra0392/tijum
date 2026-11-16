<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Notifications\Channels\ExpoReceiptService;
use Illuminate\Console\Command;

class PollExpoPushReceiptsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tijum:poll-push-receipts {--limit=100 : Maximum number of pending tickets to poll}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Poll Expo Push API receipts to verify device-level delivery and handle invalid device tokens';

    public function handle(ExpoReceiptService $receiptService): int
    {
        $limit = (int) $this->option('limit');
        $this->info("Polling Expo push receipts for up to {$limit} pending deliveries...");

        $updated = $receiptService->pollReceipts($limit);

        $this->info("Updated {$updated} push delivery records.");

        return Command::SUCCESS;
    }
}
