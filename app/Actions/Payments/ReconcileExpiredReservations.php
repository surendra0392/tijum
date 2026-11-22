<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Property;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReconcileExpiredReservations
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ReservationLifecycle $lifecycle,
        private readonly RecordCapturedPayment $capture,
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
                $result = $this->reconcile($candidate);

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

    private function reconcile(Reservation $candidate): string
    {
        $reservation = Reservation::query()->find($candidate->id);
        if ($reservation === null || ! $reservation->isAwaitingPayment() || ! $reservation->isPaymentDeadlineExpired()) {
            return 'skipped';
        }

        $payments = $reservation->payments()->orderBy('id')->get();
        if ($payments->contains(fn (ReservationPayment $payment): bool => $payment->isCaptured())) {
            return $this->confirmCapturedInTransaction($reservation);
        }

        /** @var array<int, string> $paymentSnapshot */
        $paymentSnapshot = $payments->mapWithKeys(
            fn (ReservationPayment $payment): array => [$payment->id => $payment->gateway_order_id]
        )->all();

        foreach ($payments as $payment) {
            $result = $this->reconcileOrder($payment);
            if ($result !== null) {
                return $result;
            }
        }

        return DB::transaction(function () use ($reservation, $paymentSnapshot): string {
            Property::query()->whereKey($reservation->property_id)->lockForUpdate()->firstOrFail();
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isAwaitingPayment() || ! $locked->isPaymentDeadlineExpired()) {
                return 'skipped';
            }

            $currentPayments = $locked->payments()->orderBy('id')->lockForUpdate()->get();
            if ($currentPayments->contains(fn (ReservationPayment $payment): bool => $payment->isCaptured())) {
                $captured = $currentPayments->first(fn (ReservationPayment $payment): bool => $payment->status === PaymentStatus::Captured
                    && $payment->gateway_payment_id !== null);

                return $captured !== null ? $this->lifecycle->confirmPaid($locked, $captured)->status->value : 'unresolved';
            }

            $currentSnapshot = $currentPayments->mapWithKeys(
                fn (ReservationPayment $payment): array => [$payment->id => $payment->gateway_order_id]
            )->all();
            if ($currentSnapshot !== $paymentSnapshot) {
                return 'unresolved';
            }

            return $this->lifecycle->expire($locked)->status->value;
        }, 3);
    }

    private function confirmCapturedInTransaction(Reservation $reservation): string
    {
        return DB::transaction(function () use ($reservation): string {
            Property::query()->whereKey($reservation->property_id)->lockForUpdate()->firstOrFail();
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isAwaitingPayment() || ! $locked->isPaymentDeadlineExpired()) {
                return 'skipped';
            }

            $captured = $locked->payments()->orderBy('id')->lockForUpdate()->get()
                ->first(fn (ReservationPayment $payment): bool => $payment->status === PaymentStatus::Captured
                    && $payment->gateway_payment_id !== null);

            return $captured !== null ? $this->lifecycle->confirmPaid($locked, $captured)->status->value : 'unresolved';
        }, 3);
    }

    private function reconcileOrder(ReservationPayment $payment): ?string
    {
        if ($payment->gateway !== 'razorpay') {
            return 'unresolved';
        }

        $temporary = str_starts_with($payment->gateway_order_id, 'temp_');
        $receipt = null;
        if ($temporary) {
            $receipt = $payment->metadata['gateway_order_receipt'] ?? null;
            if (! is_string($receipt) || preg_match('/^tijum_[a-f0-9]{32}$/D', $receipt) !== 1 || $payment->gateway_order_id !== 'temp_'.$receipt) {
                return 'unresolved';
            }

            $order = $this->gateway->fetchOrderByReceipt($receipt);
            if ($order === null) {
                return null;
            }
        } else {
            $order = $this->gateway->fetchOrder($payment->gateway_order_id);
        }

        $orderId = $order['id'] ?? null;
        if (! is_string($orderId) || ! preg_match('/^order_[A-Za-z0-9_]+$/D', $orderId)
            || (! $temporary && $orderId !== $payment->gateway_order_id)
            || ($order['amount'] ?? null) !== $payment->amount_minor
            || ($order['currency'] ?? null) !== $payment->currency) {
            return 'unresolved';
        }

        $status = $order['status'] ?? null;
        if (! in_array($status, ['created', 'attempted', 'paid'], true)) {
            return 'unresolved';
        }

        if ($status !== 'paid' && (int) ($order['amount_paid'] ?? 0) === 0) {
            return null;
        }

        $capturedPayments = array_values(array_filter(
            $this->gateway->fetchOrderPayments($orderId),
            fn (array $item): bool => ($item['status'] ?? null) === 'captured',
        ));
        if (count($capturedPayments) !== 1) {
            return 'unresolved';
        }

        $captured = $capturedPayments[0];
        if ($receipt !== null) {
            return $this->capture->executeRecoveredOrder($payment, $captured, $receipt, $orderId)->status->value;
        }

        return $this->capture->execute($payment, $captured)->status->value;
    }
}
