<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class VerifyCheckoutPayment
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly RecordCapturedPayment $capture,
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

        if (! preg_match('/^order_[A-Za-z0-9_]+$/D', $orderId)) {
            throw ValidationException::withMessages(['order_id' => 'Invalid payment order reference format.']);
        }

        // 1. Verify checkout signature
        $validSignature = $this->gateway->verifyCheckoutSignature($orderId, $paymentId, $signature);
        if (! $validSignature) {
            throw ValidationException::withMessages([
                'signature' => 'Payment signature verification failed.',
            ]);
        }

        /** @var ReservationPayment|null $payment */
        $payment = $reservation->payments()->where('gateway', 'razorpay')->where('gateway_order_id', $orderId)->first();
        if ($payment === null) {
            throw ValidationException::withMessages(['order_id' => 'Invalid payment order reference for this reservation.']);
        }

        if (! preg_match('/^pay_[A-Za-z0-9_]+$/D', $paymentId)) {
            throw ValidationException::withMessages(['payment' => 'Invalid gateway payment reference.']);
        }

        if ($payment->isCaptured() && $payment->gateway_payment_id === $paymentId
            && ($payment->status !== PaymentStatus::Captured || ! $reservation->isAwaitingPayment())) {
            return $reservation->fresh() ?? $reservation;
        }

        return $this->capture->execute($payment, $this->gateway->fetchPayment($paymentId), $paymentId);
    }
}
