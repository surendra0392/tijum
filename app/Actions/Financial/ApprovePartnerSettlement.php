<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
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
        abort_unless($admin->hasPermission('settlements.manage'), 403);

        $approved = DB::transaction(function () use ($settlement, $admin): PartnerSettlement {
            /** @var PartnerSettlement $locked */
            $locked = PartnerSettlement::query()->whereKey($settlement->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, [SettlementStatus::Draft, SettlementStatus::PendingApproval], true)) {
                throw ValidationException::withMessages([
                    'settlement' => 'Only draft or pending-approval settlements can be approved.',
                ]);
            }

            $items = $locked->items()->lockForUpdate()->get();
            if ($items->isEmpty() && $locked->net_settlement_amount_minor > 0) {
                throw ValidationException::withMessages([
                    'settlement' => 'Settlement has no items matching its net payable amount.',
                ]);
            }

            if ($items->contains(fn (PartnerSettlementItem $item): bool => $item->net_payable_minor < 0)) {
                throw ValidationException::withMessages([
                    'settlement' => 'Settlement contains negative line balances and requires manual Finance adjustment before approval.',
                ]);
            }

            $payableItems = $items->filter(fn (PartnerSettlementItem $item): bool => $item->net_payable_minor > 0)->values();
            if ((int) $payableItems->sum('net_payable_minor') !== $locked->net_settlement_amount_minor) {
                throw ValidationException::withMessages([
                    'settlement' => 'Sum of payable settlement items differs from the net settlement amount.',
                ]);
            }

            if ($payableItems->contains('reservation_payment_id', null)
                || $payableItems->pluck('reservation_payment_id')->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'settlement' => 'Each payable settlement item must reference a distinct captured reservation payment.',
                ]);
            }

            $reservations = Reservation::query()
                ->whereKey($payableItems->pluck('reservation_id')->filter()->unique()->all())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($payableItems as $item) {
                $reservation = $reservations->get($item->reservation_id);
                if ($reservation === null
                    || $reservation->status !== ReservationStatus::Confirmed
                    || $reservation->requires_refund_review
                    || $reservation->cases()
                        ->whereNotIn('status', [CaseStatus::Resolved->value, CaseStatus::Closed->value])
                        ->lockForUpdate()
                        ->exists()
                    || $reservation->refunds()
                        ->where(function ($q): void {
                            $q->whereIn('status', [
                                RefundStatus::Requested->value,
                                RefundStatus::Approved->value,
                                RefundStatus::Pending->value,
                                RefundStatus::Uncertain->value,
                                RefundStatus::Processing->value,
                            ])->orWhere(function ($legacyFailed): void {
                                $legacyFailed->where('status', RefundStatus::Failed->value)
                                    ->whereNull('gateway_refund_id');
                            });
                        })
                        ->lockForUpdate()
                        ->exists()) {
                    throw ValidationException::withMessages([
                        'settlement' => "Reservation {$item->reservation_id} has an unresolved customer protection case, refund review, or non-confirmed status and cannot be approved for payout.",
                    ]);
                }

                $payment = ReservationPayment::query()
                    ->whereKey($item->reservation_payment_id)
                    ->lockForUpdate()
                    ->first();

                if ($payment === null
                    || ! in_array($payment->status, [PaymentStatus::Captured, PaymentStatus::PartiallyRefunded], true)
                    || strtoupper((string) $payment->currency) !== strtoupper((string) $locked->currency)) {
                    throw ValidationException::withMessages([
                        'settlement' => "Payment for reservation {$item->reservation_id} is not an eligible captured payment in {$locked->currency}.",
                    ]);
                }

                $priorTransfers = (int) ProviderTransfer::query()
                    ->where('reservation_payment_id', $payment->id)
                    ->whereIn('status', [
                        ProviderTransferStatus::Processed,
                        ProviderTransferStatus::Pending,
                        ProviderTransferStatus::Uncertain,
                    ])
                    ->lockForUpdate()
                    ->sum('amount_minor');

                $refunds = (int) $payment->refunds()
                    ->whereNotIn('status', ['failed', 'cancelled'])
                    ->lockForUpdate()
                    ->sum('amount_minor');

                if ($item->net_payable_minor > $payment->amount_minor - $priorTransfers - $refunds) {
                    throw ValidationException::withMessages([
                        'settlement' => "Insufficient captured payment funds on payment {$payment->id} to cover net payable {$item->net_payable_minor} (platform discount or refund shortfall requires Finance funding resolution).",
                    ]);
                }
            }

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
                        'action_url' => route('owner.settlements.show', $approved),
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
