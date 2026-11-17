<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\CommissionSnapshotStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\PartnerSettlement;
use App\Models\ProviderTransfer;
use App\Models\ReservationPayment;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Payments\RazorpayRouteService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReleasePartnerSettlement
{
    public function __construct(
        private readonly RazorpayRouteService $routeService,
        private readonly FinancialLedgerService $ledgerService,
    ) {}

    public function execute(PartnerSettlement $settlement, Admin $admin): PartnerSettlement
    {
        if ($settlement->status === SettlementStatus::Settled) {
            return $settlement;
        }

        if ($settlement->status !== SettlementStatus::Approved && $settlement->status !== SettlementStatus::Failed) {
            throw ValidationException::withMessages([
                'settlement' => 'Only approved or retriable failed settlements can be released for provider transfer.',
            ]);
        }

        $profile = $settlement->financialProfile;
        if ($profile === null || ! $profile->isSettlementEligible()) {
            throw ValidationException::withMessages([
                'settlement' => 'Partner does not have an active, verified linked account for fund transfer.',
            ]);
        }

        $settlementsEnabled = (bool) config('tijum.settlements.enabled', false);
        $routeEnabled = (bool) config('tijum.settlements.route_enabled', false);

        /** @var list<ProviderTransfer> $processedTransfers */
        $processedTransfers = [];

        try {
            $settled = DB::transaction(function () use ($settlement, $profile, &$processedTransfers): PartnerSettlement {
                /** @var PartnerSettlement $lockedSettlement */
                $lockedSettlement = PartnerSettlement::query()
                    ->whereKey($settlement->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($lockedSettlement->status === SettlementStatus::Settled) {
                    return $lockedSettlement;
                }

                if ($lockedSettlement->status !== SettlementStatus::Approved && $lockedSettlement->status !== SettlementStatus::Failed) {
                    throw ValidationException::withMessages([
                        'settlement' => 'Settlement is no longer in an approved or retriable status.',
                    ]);
                }

                $now = CarbonImmutable::now();
                $items = $lockedSettlement->items()->with(['payment'])->get();

                $totalTransferred = 0;

                foreach ($items as $item) {
                    if ($item->payment === null || $item->net_payable_minor <= 0) {
                        continue;
                    }

                    /** @var ReservationPayment $lockedPayment */
                    $lockedPayment = ReservationPayment::query()
                        ->whereKey($item->payment->id)
                        ->lockForUpdate()
                        ->firstOrFail();

                    if (! in_array($lockedPayment->status, [
                        PaymentStatus::Captured,
                        PaymentStatus::PartiallyRefunded,
                    ], true)) {
                        throw ValidationException::withMessages([
                            'settlement' => "Payment for reservation {$item->reservation_id} is not captured or partially refunded.",
                        ]);
                    }

                    // Check if this item already has a completed/pending transfer from a prior attempt
                    $existingTransfer = ProviderTransfer::query()
                        ->where('partner_settlement_id', $lockedSettlement->id)
                        ->where('reservation_payment_id', $lockedPayment->id)
                        ->whereIn('status', [ProviderTransferStatus::Processed->value, ProviderTransferStatus::Pending->value])
                        ->first();

                    if ($existingTransfer !== null) {
                        $totalTransferred += $existingTransfer->amount_minor;

                        continue;
                    }

                    // Double-transfer check: verify available captured funds
                    $priorTransfers = (int) ProviderTransfer::query()
                        ->where('reservation_payment_id', $lockedPayment->id)
                        ->whereIn('status', [ProviderTransferStatus::Processed->value, ProviderTransferStatus::Pending->value])
                        ->sum('amount_minor');

                    $refunds = (int) $lockedPayment->refunds()
                        ->whereNotIn('status', ['failed', 'cancelled'])
                        ->sum('amount_minor');

                    $remainingAvailable = $lockedPayment->amount_minor - $priorTransfers - $refunds;

                    if ($item->net_payable_minor > $remainingAvailable) {
                        throw ValidationException::withMessages([
                            'settlement' => "Insufficient remaining balance on payment {$lockedPayment->id} to fund net payable {$item->net_payable_minor}.",
                        ]);
                    }

                    $ulid = strtoupper(Str::ulid()->toBase32());
                    $idempKey = "trns_idemp_{$lockedSettlement->id}_{$lockedPayment->id}_{$item->id}";
                    $trnRef = "TRN-{$now->format('Y')}-{$ulid}";

                    try {
                        $routeResponse = $this->routeService->createTransferFromPayment(
                            paymentId: (string) ($lockedPayment->gateway_payment_id ?: $lockedPayment->id),
                            linkedAccountId: (string) $profile->razorpay_account_id,
                            amountMinor: $item->net_payable_minor,
                            idempotencyKey: $idempKey,
                            notes: [
                                'settlement_reference' => $lockedSettlement->settlement_reference,
                                'reservation_id' => (string) $item->reservation_id,
                            ],
                        );

                        $transferStatus = ($routeResponse['status'] ?? 'pending') === 'processed'
                            ? ProviderTransferStatus::Processed
                            : ProviderTransferStatus::Pending;

                        /** @var ProviderTransfer $transfer */
                        $transfer = ProviderTransfer::create([
                            'transfer_reference' => $trnRef,
                            'partner_settlement_id' => $lockedSettlement->id,
                            'reservation_payment_id' => $lockedPayment->id,
                            'gateway' => 'razorpay',
                            'gateway_transfer_id' => $routeResponse['id'] ?? null,
                            'destination_account_id' => (string) $profile->razorpay_account_id,
                            'amount_minor' => $item->net_payable_minor,
                            'currency' => 'INR',
                            'idempotency_key' => $idempKey,
                            'status' => $transferStatus->value,
                            'processed_at' => $transferStatus === ProviderTransferStatus::Processed ? $now : null,
                            'raw_response' => $routeResponse,
                        ]);

                        $totalTransferred += $item->net_payable_minor;

                        if ($transferStatus === ProviderTransferStatus::Processed) {
                            $this->ledgerService->recordTransferCompleted($transfer);
                            $processedTransfers[] = $transfer;
                        }
                    } catch (\Throwable $e) {
                        $lockedSettlement->forceFill([
                            'status' => SettlementStatus::Failed,
                            'failure_reason' => $e->getMessage(),
                        ])->save();

                        throw ValidationException::withMessages([
                            'settlement' => 'Provider transfer failed: '.$e->getMessage(),
                        ]);
                    }
                }

                $lockedSettlement->forceFill([
                    'status' => SettlementStatus::Settled,
                    'transfer_initiated_at' => $now,
                    'settled_at' => $now,
                    'provider_status' => 'processed',
                ])->save();

                // Mark included reservations as settled
                $lockedSettlement->items()->with('reservation')->get()->each(function ($item): void {
                    $item->reservation?->forceFill(['commission_status' => CommissionSnapshotStatus::Settled])->save();
                });

                return $lockedSettlement;
            });
        } catch (ValidationException $e) {
            $settlementError = (string) ($e->errors()['settlement'][0] ?? '');
            if (str_starts_with($settlementError, 'Provider transfer failed: ')) {
                $transferFailureReason = Str::after($settlementError, 'Provider transfer failed: ');
                try {
                    $settlement->loadMissing('owner');
                    if ($settlement->owner !== null) {
                        app(NotificationDispatcher::class)->dispatch(
                            eventType: 'partner.transfer_failed',
                            recipients: $settlement->owner,
                            variables: [
                                'owner_name' => $settlement->owner->name,
                                'amount' => '₹'.number_format($settlement->net_settlement_amount_minor / 100, 2),
                                'settlement_reference' => $settlement->settlement_reference,
                                'failure_reason' => Str::limit($transferFailureReason, 180),
                                'action_url' => url("/owner/settlements/{$settlement->id}"),
                            ],
                            related: $settlement,
                            relatedReference: $settlement->settlement_reference,
                            idempotencySeed: 'settlement_transfer_failed_'.$settlement->id.'_'.md5($transferFailureReason)
                        );
                    }
                } catch (\Throwable $notifyError) {
                    Log::warning('Failed to dispatch partner.transfer_failed notification: '.$notifyError->getMessage());
                }
            }

            throw $e;
        }

        if ($processedTransfers !== []) {
            try {
                $settled->loadMissing('owner');
                if ($settled->owner !== null) {
                    $dispatcher = app(NotificationDispatcher::class);
                    foreach ($processedTransfers as $transfer) {
                        $dispatcher->dispatch(
                            eventType: 'partner.transfer_completed',
                            recipients: $settled->owner,
                            variables: [
                                'owner_name' => $settled->owner->name,
                                'amount' => '₹'.number_format($transfer->amount_minor / 100, 2),
                                'settlement_reference' => $settled->settlement_reference,
                                'transfer_reference' => $transfer->gateway_transfer_id ?: $transfer->transfer_reference,
                                'completed_at' => ($transfer->processed_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                                'action_url' => url("/owner/settlements/{$settled->id}"),
                            ],
                            related: $settled,
                            relatedReference: $settled->settlement_reference,
                            idempotencySeed: 'transfer_processed_'.$transfer->id
                        );
                    }
                }
            } catch (\Throwable $notifyError) {
                Log::warning('Failed to dispatch partner.transfer_completed notification: '.$notifyError->getMessage());
            }
        }

        return $settled;
    }
}
