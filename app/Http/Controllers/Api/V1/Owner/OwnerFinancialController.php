<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerFinancialController extends ApiController
{
    public function summary(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $totalSettled = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->where('status', 'settled')
            ->sum('net_settlement_amount_minor');

        $pendingSettlements = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->whereIn('status', ['pending_approval', 'approved', 'transfer_initiated'])
            ->sum('net_settlement_amount_minor');

        $statementsCount = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->count();

        return $this->success([
            'currency' => 'INR',
            'lifetime_settled_paise' => (int) $totalSettled,
            'total_settled_paise' => (int) $totalSettled,
            'pending_settlement_paise' => (int) $pendingSettlements,
            'pending_payout_paise' => (int) $pendingSettlements,
            'total_statements_count' => $statementsCount,
            'settlement_hold_hours' => (int) config('tijum.settlements.hold_interval_hours', 24),
            'note' => 'Marketplace settlements are processed automatically to your verified bank account following stay fulfilment.',
        ]);
    }

    public function settlements(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $settlements = PartnerSettlement::query()
            ->where('owner_id', $owner->id)
            ->latest('period_end')
            ->paginate(15);

        return $this->success(
            $settlements->items(),
            'Partner settlement statements retrieved',
            200,
            [
                'current_page' => $settlements->currentPage(),
                'last_page' => $settlements->lastPage(),
                'total' => $settlements->total(),
            ]
        );
    }
}
