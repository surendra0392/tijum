<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\PartnerSettlement;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ApprovePartnerSettlement
{
    public function __construct(
        private readonly FinancialLedgerService $ledgerService,
    ) {}

    public function execute(PartnerSettlement $settlement, Admin $admin): PartnerSettlement
    {
        if (! in_array($settlement->status, [SettlementStatus::Draft, SettlementStatus::PendingApproval], true)) {
            throw ValidationException::withMessages([
                'settlement' => 'Only draft or pending-approval settlements can be approved.',
            ]);
        }

        $approved = DB::transaction(function () use ($settlement, $admin): PartnerSettlement {
            /** @var PartnerSettlement $locked */
            $locked = PartnerSettlement::query()->whereKey($settlement->id)->lockForUpdate()->firstOrFail();

            $now = CarbonImmutable::now();

            $locked->forceFill([
                'status' => SettlementStatus::Approved,
                'approved_by_admin_id' => $admin->id,
                'approved_at' => $now,
            ])->save();

            // Post balanced journal entries
            $this->ledgerService->recordSettlementApproved($locked);

            return $locked;
        });

        try {
            $approved->loadMissing('owner');
            if ($approved->owner !== null) {
                app(NotificationDispatcher::class)->dispatch(
                    eventType: 'partner.settlement_available',
                    recipients: $approved->owner,
                    variables: [
                        'owner_name' => $approved->owner->name,
                        'settlement_reference' => $approved->settlement_reference,
                        'amount' => '₹'.number_format($approved->net_settlement_amount_minor / 100, 2),
                        'period_start' => $approved->period_start->format('d M Y'),
                        'period_end' => $approved->period_end->format('d M Y'),
                        'action_url' => url("/owner/settlements/{$approved->id}"),
                    ],
                    related: $approved,
                    relatedReference: $approved->settlement_reference,
                    idempotencySeed: 'settlement_available_'.$approved->id
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch partner.settlement_available notification: '.$e->getMessage(), [
                'settlement_id' => $approved->id,
            ]);
        }

        return $approved;
    }
}
