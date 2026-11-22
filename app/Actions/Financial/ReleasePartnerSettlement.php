<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\ReservationPayment;
use App\Services\Payments\RazorpayRouteService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use LogicException;
use Throwable;

class ReleasePartnerSettlement
{
    public function __construct(
        private readonly RazorpayRouteService $routeService,
        private readonly ReconcilePartnerTransfer $reconcileTransfer,
        private readonly UpdatePartnerSettlementTransferStatus $updateTransferStatus,
    ) {}

    public function execute(PartnerSettlement $settlement, Admin $admin): PartnerSettlement
    {
        abort_unless($admin->hasPermission('settlements.release'), 403);

        if (DB::transactionLevel() !== 0) {
            throw new LogicException('Settlement release requires an independent transaction for its durable transfer claim.');
        }

        $retryableIds = array_values($settlement->providerTransfers()->where('status', ProviderTransferStatus::Failed)
            ->get(['id'])->map(fn (ProviderTransfer $transfer): int => $transfer->id)->all());

        while ($transfer = $this->claimNextTransfer($settlement, $retryableIds)) {
            try {
                $response = $this->routeService->createTransferFromPayment(
                    paymentId: (string) $transfer->gateway_payment_id,
                    linkedAccountId: $transfer->destination_account_id,
                    amountMinor: $transfer->amount_minor,
                    notes: [
                        'settlement_reference' => $settlement->settlement_reference,
                        'tijum_transfer_reference' => $transfer->transfer_reference,
                    ],
                );
                $transfer = $this->reconcileTransfer->apply($transfer, $response);
            } catch (Throwable $exception) {
                Log::warning('Partner transfer requires reconciliation after dispatch.', [
                    'transfer_reference' => $transfer->transfer_reference,
                    'exception' => $exception::class,
                ]);

                throw ValidationException::withMessages([
                    'settlement' => "Transfer {$transfer->transfer_reference} has an uncertain outcome and requires provider reconciliation.",
                ]);
            }

            if ($transfer->status === ProviderTransferStatus::Failed) {
                break;
            }
        }

        return $settlement->refresh();
    }

    /** @param list<int> $retryableIds */
    private function claimNextTransfer(PartnerSettlement $settlement, array $retryableIds): ?ProviderTransfer
    {
        return DB::transaction(function () use ($settlement, $retryableIds): ?ProviderTransfer {
            $lockedSettlement = PartnerSettlement::query()->lockForUpdate()->findOrFail($settlement->id);

            if ($lockedSettlement->status === SettlementStatus::Settled) {
                return null;
            }

            if (! in_array($lockedSettlement->status, [SettlementStatus::Approved, SettlementStatus::Failed, SettlementStatus::TransferPending], true)) {
                throw ValidationException::withMessages(['settlement' => 'Only approved, pending or retriable failed settlements can be released.']);
            }

            $allItems = $lockedSettlement->items()->orderBy('reservation_payment_id')->lockForUpdate()->get();

            if ($allItems->isEmpty()) {
                throw ValidationException::withMessages(['settlement' => 'Settlement contains no items to settle.']);
            }

            if ($allItems->contains(fn (PartnerSettlementItem $item): bool => $item->net_payable_minor < 0)) {
                throw ValidationException::withMessages([
                    'settlement' => 'Settlement contains negative item balances and cannot be released until adjusted by Finance.',
                ]);
            }

            $items = $allItems->filter(fn (PartnerSettlementItem $item): bool => $item->net_payable_minor > 0)->values();

            if ($lockedSettlement->currency !== 'INR' || (int) $items->sum('net_payable_minor') !== $lockedSettlement->net_settlement_amount_minor) {
                throw ValidationException::withMessages([
                    'settlement' => 'The transfer total differs from the approved INR settlement amount. Finance must review the batch before release.',
                ]);
            }

            if ($items->contains('reservation_payment_id', null) || $items->pluck('reservation_payment_id')->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages(['settlement' => 'Each payable settlement item must identify a distinct payment.']);
            }

            $mode = $this->routeService->credentialMode();
            $profile = $lockedSettlement->financialProfile;
            $accountId = (string) $profile?->razorpay_account_id;
            $attempts = $lockedSettlement->providerTransfers()->latest('id')->lockForUpdate()->get()->groupBy('reservation_payment_id');
            $paymentIds = $items->pluck('reservation_payment_id');

            if ($attempts->keys()->diff($paymentIds)->isNotEmpty()) {
                throw ValidationException::withMessages(['settlement' => 'Existing transfers no longer match the approved settlement items.']);
            }

            if ($lockedSettlement->net_settlement_amount_minor === 0 && $items->isEmpty() && $attempts->isEmpty()) {
                $this->updateTransferStatus->execute(
                    $lockedSettlement,
                    CarbonImmutable::now(),
                    $mode ?? (string) config('tijum.payments.razorpay.mode', 'test'),
                );

                return null;
            }

            $unsent = $items->filter(function (PartnerSettlementItem $item) use ($attempts, $mode, $accountId, $retryableIds): bool {
                $paymentAttempts = $attempts->get($item->reservation_payment_id);
                $latest = $paymentAttempts?->first();

                if ($latest === null) {
                    return true;
                }

                foreach ($paymentAttempts as $attempt) {
                    if (! $attempt->hasRouteProvenance($mode)
                        || ! ProviderTransfer::isRazorpayTransferId($attempt->gateway_transfer_id)
                        || $attempt->status === ProviderTransferStatus::Uncertain
                        || $attempt->status === ProviderTransferStatus::Reversed
                        || $attempt->destination_account_id !== $accountId
                        || $attempt->amount_minor !== $item->net_payable_minor
                        || $attempt->currency !== 'INR'
                        || ($attempt->id !== $latest->id && $attempt->status !== ProviderTransferStatus::Failed)) {
                        throw ValidationException::withMessages(['settlement' => 'An existing transfer is uncertain or does not match the approved batch. Reconciliation is required.']);
                    }
                }

                return $latest->status === ProviderTransferStatus::Failed && in_array($latest->id, $retryableIds, true);
            });

            $newFailure = $attempts->contains(fn ($paymentAttempts): bool => $paymentAttempts->first()?->status === ProviderTransferStatus::Failed
                && ! in_array($paymentAttempts->first()->id, $retryableIds, true));

            if ($attempts->isNotEmpty() && ($unsent->isEmpty() || $newFailure)) {
                return null;
            }

            if (! config('tijum.settlements.enabled', false) || ! $this->routeService->canTransfer() || $mode === null) {
                throw ValidationException::withMessages(['settlement' => 'Partner payouts require enabled settlements and Razorpay Route with valid credentials for the current mode.']);
            }

            if ($profile === null || ! $profile->isSettlementEligible() || str_starts_with($accountId, 'acc_mock_')) {
                throw ValidationException::withMessages(['settlement' => 'Partner must have an active Razorpay linked account to receive a payout.']);
            }

            $next = $unsent->first();

            if ($next === null) {
                $this->updateTransferStatus->execute($lockedSettlement, CarbonImmutable::now(), $mode);

                return null;
            }

            $payments = ReservationPayment::query()
                ->whereKey($unsent->pluck('reservation_payment_id')->all())
                ->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            foreach ($unsent as $item) {
                $payment = $payments->get($item->reservation_payment_id);
                if ($payment === null || $payment->gateway !== 'razorpay' || $payment->currency !== 'INR' || blank($payment->gateway_payment_id)) {
                    throw ValidationException::withMessages(['settlement' => "Payment for reservation {$item->reservation_id} is missing an eligible INR Razorpay payment reference."]);
                }

                if (! in_array($payment->status, [PaymentStatus::Captured, PaymentStatus::PartiallyRefunded], true)) {
                    throw ValidationException::withMessages(['settlement' => "Payment for reservation {$item->reservation_id} is not captured or partially refunded."]);
                }

                $priorTransfers = ProviderTransfer::query()->where('reservation_payment_id', $payment->id)
                    ->whereIn('status', [ProviderTransferStatus::Processed, ProviderTransferStatus::Pending, ProviderTransferStatus::Uncertain])
                    ->lockForUpdate()->pluck('amount_minor')->sum();
                $refunds = $payment->refunds()->whereNotIn('status', ['failed', 'cancelled'])
                    ->lockForUpdate()->pluck('amount_minor')->sum();

                if ($item->net_payable_minor > $payment->amount_minor - $priorTransfers - $refunds) {
                    throw ValidationException::withMessages(['settlement' => "Insufficient remaining balance on payment {$payment->id} to fund net payable {$item->net_payable_minor}."]);
                }
            }

            $now = CarbonImmutable::now();
            $reference = "TRN-{$now->format('Y')}-".Str::ulid()->toBase32();
            $transfer = $lockedSettlement->providerTransfers()->create([
                'transfer_reference' => $reference,
                'reservation_payment_id' => $next->reservation_payment_id,
                'gateway' => 'razorpay',
                'gateway_mode' => $mode,
                'gateway_payment_id' => $payments->get($next->reservation_payment_id)?->gateway_payment_id,
                'destination_account_id' => $accountId,
                'amount_minor' => $next->net_payable_minor,
                'currency' => 'INR',
                'idempotency_key' => $reference,
                'status' => ProviderTransferStatus::Uncertain,
            ]);

            $this->updateTransferStatus->execute($lockedSettlement, $now, $mode);

            return $transfer;
        }, 3);
    }
}
