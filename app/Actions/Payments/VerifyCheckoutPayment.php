<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerifyCheckoutPayment
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ReservationLifecycle $lifecycle,
    ) {}

    public function execute(
        Reservation $reservation,
        User $user,
        string $orderId,
        string $paymentId,
        string $signature,
    ): Reservation {
        if ($reservation->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'reservation' => 'You are not authorised to verify payment for this reservation.',
            ]);
        }

        // 1. Verify checkout signature
        $validSignature = $this->gateway->verifyCheckoutSignature($orderId, $paymentId, $signature);
        if (! $validSignature) {
            throw ValidationException::withMessages([
                'signature' => 'Payment signature verification failed.',
            ]);
        }

        return DB::transaction(function () use ($reservation, $orderId, $paymentId): Reservation {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            /** @var ReservationPayment|null $payment */
            $payment = $locked->payments()
                ->where('gateway_order_id', $orderId)
                ->lockForUpdate()
                ->first();

            if ($payment === null) {
                throw ValidationException::withMessages([
                    'order_id' => 'Invalid payment order reference for this reservation.',
                ]);
            }

            // 2. Fetch authoritative payment status from gateway
            $gatewayPayment = $this->gateway->fetchPayment($paymentId);

            $gatewayAmount = (int) ($gatewayPayment['amount'] ?? 0);
            $gatewayCurrency = (string) ($gatewayPayment['currency'] ?? '');
            $gatewayStatus = (string) ($gatewayPayment['status'] ?? '');
            $gatewayOrderId = (string) ($gatewayPayment['order_id'] ?? '');

            if ($gatewayOrderId !== $orderId) {
                throw ValidationException::withMessages([
                    'payment' => 'Gateway order reference does not match checkout attempt.',
                ]);
            }

            if ($gatewayAmount !== $payment->amount_minor) {
                throw ValidationException::withMessages([
                    'amount' => 'Payment amount mismatch between gateway and reservation.',
                ]);
            }

            if (strtoupper($gatewayCurrency) !== strtoupper($payment->currency)) {
                throw ValidationException::withMessages([
                    'currency' => 'Payment currency mismatch.',
                ]);
            }

            if ($gatewayStatus !== 'captured') {
                throw ValidationException::withMessages([
                    'status' => "Payment is in '{$gatewayStatus}' state and has not been captured yet.",
                ]);
            }

            // Update payment record
            $payment->forceFill([
                'gateway_payment_id' => $paymentId,
                'status' => PaymentStatus::Captured->value,
                'captured_at' => $payment->captured_at ?: CarbonImmutable::now(),
                'metadata' => array_merge((array) $payment->metadata, [
                    'gateway_payment' => $gatewayPayment,
                    'method' => $gatewayPayment['method'] ?? null,
                ]),
            ])->save();

            // Transition reservation to Confirmed
            $updated = $this->lifecycle->confirmPaid($locked, $payment);

            return $updated->fresh() ?? $updated;
        }, 3);
    }
}
