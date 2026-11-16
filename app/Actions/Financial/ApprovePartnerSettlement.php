<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\PartnerSettlement;
use App\Services\Financial\FinancialLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
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

        return DB::transaction(function () use ($settlement, $admin): PartnerSettlement {
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
    }
}
