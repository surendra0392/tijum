<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Property;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordCapturedPayment
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ReservationLifecycle $lifecycle,
    ) {}

    /** @param array<string, mixed> $providerPayment */
    public function execute(ReservationPayment $payment, array $providerPayment, ?string $expectedPaymentId = null): Reservation
    {
        return $this->apply($payment, $providerPayment, $expectedPaymentId);
    }

    /** @param array<string, mixed> $providerPayment */
    public function executeRecoveredOrder(ReservationPayment $payment, array $providerPayment, string $receipt, string $orderId): Reservation
    {
        $expectedPaymentId = is_string($providerPayment['id'] ?? null) ? $providerPayment['id'] : null;

        return $this->apply($payment, $providerPayment, $expectedPaymentId, $receipt, $orderId);
    }

    /** @param array<string, mixed> $entity */
    public function fromWebhook(string $orderId, string $paymentId, array $entity): ?Reservation
    {
        if (! preg_match('/^order_[A-Za-z0-9_]+$/D', $orderId) || $paymentId === '') {
            return null;
        }

        $payment = ReservationPayment::query()->where('gateway', 'razorpay')->where('gateway_order_id', $orderId)->first();

        if ($payment instanceof ReservationPayment) {
            return $this->execute($payment, $entity, $paymentId);
        }

        if (! ReservationPayment::query()->where('gateway', 'razorpay')->where('gateway_order_id', 'like', 'temp_tijum_%')->exists()) {
            return null;
        }

        $order = $this->gateway->fetchOrder($orderId);
        $receipt = $order['receipt'] ?? null;
        if (($order['id'] ?? null) !== $orderId || ! is_string($receipt) || ! preg_match('/^tijum_[a-f0-9]{32}$/D', $receipt)) {
            return null;
        }

        $payment = ReservationPayment::query()->where('gateway', 'razorpay')->where('gateway_order_id', 'temp_'.$receipt)->first();
        if (! $payment instanceof ReservationPayment
            || ($payment->metadata['gateway_order_receipt'] ?? null) !== $receipt
            || ($order['amount'] ?? null) !== $payment->amount_minor
            || ($order['currency'] ?? null) !== $payment->currency) {
            return null;
        }

        return $this->apply($payment, $entity, $paymentId, $receipt, $orderId);
    }

    /** @param array<string, mixed> $providerPayment */
    private function apply(ReservationPayment $payment, array $providerPayment, ?string $expectedPaymentId, ?string $receipt = null, ?string $expectedOrderId = null): Reservation
    {
        $propertyId = $payment->reservation->property_id;

        return DB::transaction(function () use ($payment, $providerPayment, $expectedPaymentId, $receipt, $expectedOrderId, $propertyId): Reservation {
            Property::query()->whereKey($propertyId)->lockForUpdate()->firstOrFail();
            $reservation = Reservation::query()->whereKey($payment->reservation_id)->lockForUpdate()->firstOrFail();
            $lockedPayment = $reservation->payments()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            $paymentId = $providerPayment['id'] ?? null;
            $orderId = $providerPayment['order_id'] ?? null;
            if (! is_string($paymentId) || ! preg_match('/^pay_[A-Za-z0-9_]+$/D', $paymentId)
                || ($expectedPaymentId !== null && $paymentId !== $expectedPaymentId)) {
                throw ValidationException::withMessages(['payment' => 'Gateway payment reference does not match the capture.']);
            }

            $recoveringOrder = $receipt !== null
                && $lockedPayment->gateway_order_id === 'temp_'.$receipt
                && ($lockedPayment->metadata['gateway_order_receipt'] ?? null) === $receipt;
            if ($lockedPayment->gateway !== 'razorpay'
                || $lockedPayment->user_id !== $reservation->user_id
                || ! is_string($orderId) || ! preg_match('/^order_[A-Za-z0-9_]+$/D', $orderId)
                || ($expectedOrderId !== null && $orderId !== $expectedOrderId)
                || (! $recoveringOrder && $orderId !== $lockedPayment->gateway_order_id)) {
                throw ValidationException::withMessages(['payment' => 'Gateway order reference does not match checkout attempt.']);
            }

            if (($providerPayment['amount'] ?? null) !== $lockedPayment->amount_minor
                || $lockedPayment->amount_minor !== $reservation->total_amount_minor) {
                throw ValidationException::withMessages(['amount' => 'Payment amount mismatch between gateway and reservation.']);
            }

            $currency = $providerPayment['currency'] ?? null;
            if (! is_string($currency) || strtoupper($currency) !== strtoupper($lockedPayment->currency)
                || strtoupper($lockedPayment->currency) !== strtoupper($reservation->currency_code)) {
                throw ValidationException::withMessages(['currency' => 'Payment currency mismatch.']);
            }

            $status = $providerPayment['status'] ?? null;
            if ($status !== 'captured') {
                throw ValidationException::withMessages(['status' => 'The gateway payment has not been captured.']);
            }

            if ($lockedPayment->isCaptured() && $lockedPayment->gateway_payment_id !== null) {
                if ($lockedPayment->gateway_payment_id !== $paymentId) {
                    throw ValidationException::withMessages(['payment' => 'A different captured payment is already recorded for this order.']);
                }

                if ($lockedPayment->status === PaymentStatus::Captured && $reservation->isAwaitingPayment()) {
                    return $this->lifecycle->confirmPaid($reservation, $lockedPayment);
                }

                return $reservation;
            }

            $lockedPayment->forceFill([
                'gateway_order_id' => $orderId,
                'gateway_payment_id' => $paymentId,
                'status' => $lockedPayment->isCaptured() ? $lockedPayment->status : PaymentStatus::Captured,
                'captured_at' => $lockedPayment->captured_at ?? CarbonImmutable::now(),
                'failure_code' => null,
                'failure_description' => null,
                'metadata' => array_merge((array) $lockedPayment->metadata, [
                    'gateway_payment' => $providerPayment,
                    'method' => $providerPayment['method'] ?? null,
                ]),
            ])->save();

            return $lockedPayment->status === PaymentStatus::Captured
                ? $this->lifecycle->confirmPaid($reservation, $lockedPayment)
                : $reservation;
        }, 3);
    }
}
