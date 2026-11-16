<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReconcileExpiredReservations
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ReservationLifecycle $lifecycle,
    ) {}

    /**
     * @return array{expired: int, confirmed: int, errors: int}
     */
    public function execute(): array
    {
        $now = CarbonImmutable::now();

        $candidates = Reservation::query()
            ->where('status', ReservationStatus::AwaitingPayment->value)
            ->where('payment_deadline_at', '<', $now)
            ->get();

        $expired = 0;
        $confirmed = 0;
        $errors = 0;

        foreach ($candidates as $candidate) {
            try {
                $result = DB::transaction(function () use ($candidate): string {
                    $locked = Reservation::query()->whereKey($candidate->id)->lockForUpdate()->firstOrFail();

                    if ($locked->status !== ReservationStatus::AwaitingPayment) {
                        return 'skipped';
                    }

                    // Check all payment attempts for this reservation
                    $payments = $locked->payments()->lockForUpdate()->get();

                    $capturedFound = false;

                    foreach ($payments as $payment) {
                        if ($payment->isCaptured()) {
                            $capturedFound = true;
                            break;
                        }

                        // Reconcile with gateway if order was created
                        if ($payment->gateway_order_id && ! str_starts_with($payment->gateway_order_id, 'temp_')) {
                            try {
                                $orderData = $this->gateway->fetchOrder($payment->gateway_order_id);
                                $orderStatus = (string) ($orderData['status'] ?? '');
                                $amountPaid = (int) ($orderData['amount_paid'] ?? 0);

                                if ($orderStatus === 'paid' || $amountPaid >= $payment->amount_minor) {
                                    $orderPayments = $this->gateway->fetchOrderPayments($payment->gateway_order_id);
                                    $capturedPayment = collect($orderPayments)->first(fn ($p) => ($p['status'] ?? '') === 'captured');
                                    $capturedPaymentId = $capturedPayment['id'] ?? null;

                                    $payment->forceFill([
                                        'status' => PaymentStatus::Captured->value,
                                        'gateway_payment_id' => $capturedPaymentId ?? $payment->gateway_payment_id,
                                        'captured_at' => CarbonImmutable::now(),
                                    ])->save();
                                    $capturedFound = true;
                                    break;
                                }
                            } catch (\Throwable $gatewayException) {
                                Log::warning("Could not reconcile payment {$payment->id} during expiry check: {$gatewayException->getMessage()}");

                                // Gateway unavailable: do NOT expire prematurely
                                return 'unresolved';
                            }
                        }
                    }

                    if ($capturedFound) {
                        $this->lifecycle->confirmPaid($locked, $payment ?? null);

                        return 'confirmed';
                    }

                    // No captured payment exists; safe to expire
                    $this->lifecycle->expire($locked);

                    return 'expired';
                }, 3);

                if ($result === 'expired') {
                    $expired++;
                } elseif ($result === 'confirmed') {
                    $confirmed++;
                }
            } catch (\Throwable $e) {
                $errors++;
                Log::error("Failed to reconcile expired reservation {$candidate->id}: {$e->getMessage()}");
            }
        }

        return [
            'expired' => $expired,
            'confirmed' => $confirmed,
            'errors' => $errors,
        ];
    }
}
