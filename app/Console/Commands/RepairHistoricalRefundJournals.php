<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Payments\AuditAndRepairRefundJournals;
use Illuminate\Console\Command;

class RepairHistoricalRefundJournals extends Command
{
    protected $signature = 'tijum:audit-refund-journals
                            {--apply : Persist corrective refund completion journals and quarantine ineligible refunds}
                            {--refund-id= : Audit or repair a single refund ID}';

    protected $description = 'Audit processed refunds for missing or inconsistent journals and optionally post verified corrective entries.';

    public function handle(AuditAndRepairRefundJournals $audit): int
    {
        $apply = (bool) $this->option('apply');
        $rawRefundId = $this->option('refund-id');
        $refundId = null;

        if ($rawRefundId !== null && $rawRefundId !== '') {
            if (! is_numeric($rawRefundId) || (int) $rawRefundId <= 0) {
                $this->error('Option --refund-id must be a positive integer.');

                return self::FAILURE;
            }

            $refundId = (int) $rawRefundId;
        }

        $report = $audit->execute(apply: $apply, refundId: $refundId);

        $this->info(sprintf(
            '[%s] Inspected: %d | Complete: %d | Repairable: %d | Repaired: %d | Quarantined: %d',
            $apply ? 'APPLY' : 'DRY-RUN',
            $report['inspected'],
            $report['complete'],
            $report['repairable'],
            $report['repaired'],
            $report['quarantined'],
        ));

        foreach ($report['items'] as $item) {
            if (($item['status'] ?? null) !== 'quarantined') {
                continue;
            }

            $this->warn(sprintf(
                'Quarantined refund #%d (reservation #%d, reason=%s): %s',
                (int) $item['refund_id'],
                (int) $item['reservation_id'],
                (string) ($item['reason'] ?? 'unknown'),
                (string) ($item['details'] ?? ''),
            ));
        }

        return self::SUCCESS;
    }
}
