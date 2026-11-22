<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;

class InitiatePaymentOrder
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /**
     * @return array{
     *     key: string,
     *     key_id: string,
     *     payment_id: int,
     *     order_id: string,
     *     gateway_order_id: string,
     *     amount: int,
     *     amount_minor: int,
     *     currency: string,
     *     name: string,
     *     description: string,
     *     booking_reference: string,
     *     prefill: array{name: string, email: string, contact: string},
     *     notes: array<string, string>,
     *     theme: array{color: string},
     * }
     */
    public function execute(Reservation $reservation, User $user, ?string $idempotencyKey = null): array
    {
        $this->assertOwner($reservation, $user);

        if ($reservation->total_amount_minor < 100) {
            throw new InvalidArgumentException('Minimum Razorpay order amount is 100 paise.');
        }

        if (DB::transactionLevel() !== 0) {
            throw new RuntimeException('Payment initiation requires its own transaction so the order attempt can be committed before dispatch.');
        }

        [$locked, $payment, $dispatch] = $this->claimOrder($reservation, $user, $idempotencyKey);
        $receipt = $this->orderReceipt($locked, $payment);
        $temporary = str_starts_with($payment->gateway_order_id, 'temp_');

        try {
            $order = match (true) {
                $dispatch => $this->gateway->createOrder($locked, $payment),
                $temporary => $this->gateway->fetchOrderByReceipt($receipt),
                default => $this->gateway->fetchOrder($payment->gateway_order_id),
            };
        } catch (ConnectionException $e) {
            throw new RuntimeException('The payment gateway is unavailable. Retry to check the existing order.', previous: $e);
        } catch (RuntimeException $e) {
            if ($dispatch && $e->getCode() === 401) {
                ReservationPayment::query()->whereKey($payment->id)
                    ->where('status', PaymentStatus::Created)
                    ->where('gateway_order_id', $payment->gateway_order_id)
                    ->update(['status' => PaymentStatus::Failed, 'failure_code' => 'ORDER_AUTH_REJECTED']);
            }

            throw $e;
        }

        if ($order === null) {
            throw ValidationException::withMessages([
                'payment' => 'The existing payment order is awaiting confirmation from the provider. Please try again shortly.',
            ]);
        }

        $orderId = $this->verifiedOrderId($order, $payment, $receipt);
        [$locked, $payment] = DB::transaction(function () use ($locked, $user, $payment, $order, $orderId): array {
            $current = Reservation::query()->whereKey($locked->id)->lockForUpdate()->firstOrFail();
            $attempt = $current->payments()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            $this->assertOwner($current, $user);

            if ($attempt->gateway_order_id === $payment->gateway_order_id
                && str_starts_with($attempt->gateway_order_id, 'temp_')) {
                // Link a confirmed provider identifier even if checkout expired in flight, so a later capture can be recovered.
                $attempt->forceFill([
                    'gateway_order_id' => $orderId,
                    'status' => $attempt->status === PaymentStatus::Created ? PaymentStatus::Pending : $attempt->status,
                    'gateway_order_created_at' => CarbonImmutable::now(),
                    'metadata' => array_merge($order, (array) $attempt->metadata),
                ])->save();
            } elseif ($attempt->gateway_order_id !== $orderId) {
                throw ValidationException::withMessages(['payment' => 'The provider order does not match this payment attempt.']);
            }

            return [$current, $attempt];
        }, 3);

        $this->assertCheckoutAvailable($locked);
        $this->assertOrderMatchesReservation($payment, $locked, $user);

        if (! in_array($order['status'] ?? null, ['created', 'attempted'], true)
            || ($order['amount_paid'] ?? null) !== 0
            || in_array($payment->status, [PaymentStatus::Authorized, PaymentStatus::Cancelled], true)) {
            throw ValidationException::withMessages([
                'payment' => 'This order is no longer available for checkout. Check the existing payment before trying again.',
            ]);
        }

        return [
            'key' => $this->gateway->getPublicKey(),
            'key_id' => $this->gateway->getPublicKey(),
            'payment_id' => $payment->id,
            'order_id' => $payment->gateway_order_id,
            'gateway_order_id' => $payment->gateway_order_id,
            'amount' => $payment->amount_minor,
            'amount_minor' => $payment->amount_minor,
            'currency' => $payment->currency,
            'name' => 'TIJUM',
            'description' => "Stay at {$locked->snapshot_property_name} ({$locked->booking_reference})",
            'booking_reference' => $locked->booking_reference,
            'prefill' => [
                'name' => $locked->contact_name,
                'email' => $locked->contact_email,
                'contact' => $locked->contact_phone,
            ],
            'notes' => [
                'booking_reference' => $locked->booking_reference,
                'reservation_id' => (string) $locked->id,
            ],
            'theme' => [
                'color' => '#FF7A67',
            ],
        ];
    }

    /** @return array{Reservation, ReservationPayment, bool} */
    private function claimOrder(Reservation $reservation, User $user, ?string $idempotencyKey): array
    {
        if ($idempotencyKey !== null && ! preg_match('/^[a-zA-Z0-9_.:\/-]{1,64}$/D', $idempotencyKey)) {
            throw ValidationException::withMessages(['payment' => 'The payment request identifier is invalid.']);
        }

        return DB::transaction(function () use ($reservation, $user, $idempotencyKey): array {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();
            $this->assertOwner($locked, $user);
            $this->assertCheckoutAvailable($locked);

            if ($locked->total_amount_minor < 100) {
                throw new InvalidArgumentException('Minimum Razorpay order amount is 100 paise.');
            }

            $keyed = $idempotencyKey === null
                ? null
                : ReservationPayment::query()->where('idempotency_key', $idempotencyKey)->first();

            // A failed payment does not close its Razorpay order. Repay through that order when the provider still permits checkout.
            $attempts = $locked->payments()
                ->whereIn('status', [PaymentStatus::Created, PaymentStatus::Pending, PaymentStatus::Authorized, PaymentStatus::Failed])
                ->where(fn ($query) => $query->whereNull('failure_code')->orWhere('failure_code', '!=', 'ORDER_AUTH_REJECTED'))
                ->lockForUpdate()
                ->limit(2)
                ->get();

            if ($attempts->count() > 1) {
                throw ValidationException::withMessages([
                    'payment' => 'This reservation has more than one unresolved payment order. Reconcile them before continuing checkout.',
                ]);
            }

            $payment = $attempts->first();

            if ($keyed !== null && $keyed->id !== $payment?->id) {
                throw ValidationException::withMessages(['payment' => 'This payment request identifier has already been used.']);
            }

            if ($payment !== null) {
                $this->assertOrderMatchesReservation($payment, $locked, $user);

                return [$locked, $payment, false];
            }

            $receipt = 'tijum_'.str_replace('-', '', (string) Str::uuid());
            $payment = $locked->payments()->create([
                'user_id' => $user->id,
                'gateway' => 'razorpay',
                'gateway_order_id' => 'temp_'.$receipt,
                'idempotency_key' => $idempotencyKey ?? (string) Str::uuid(),
                'amount_minor' => $locked->total_amount_minor,
                'currency' => $locked->currency_code,
                'status' => PaymentStatus::Created,
                'metadata' => ['gateway_order_receipt' => $receipt],
            ]);

            return [$locked, $payment, true];
        }, 3);
    }

    private function assertOwner(Reservation $reservation, User $user): void
    {
        if ($reservation->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'reservation' => 'You are not authorised to pay for this reservation.',
            ]);
        }
    }

    private function assertCheckoutAvailable(Reservation $reservation): void
    {
        if ($reservation->status !== ReservationStatus::AwaitingPayment) {
            throw ValidationException::withMessages([
                'reservation' => $reservation->status === ReservationStatus::Confirmed
                    ? 'This reservation is already confirmed and paid.'
                    : 'Payment cannot be initiated for this reservation at its current status.',
            ]);
        }

        if ($reservation->payment_deadline_at !== null && ! $reservation->payment_deadline_at->isFuture()) {
            throw ValidationException::withMessages([
                'reservation' => 'The payment window for this reservation has expired.',
            ]);
        }

        if ($reservation->payments()->whereIn('status', [
            PaymentStatus::Captured,
            PaymentStatus::RefundPending,
            PaymentStatus::PartiallyRefunded,
            PaymentStatus::Refunded,
        ])->exists()) {
            throw ValidationException::withMessages([
                'reservation' => 'A successful payment has already been recorded for this reservation.',
            ]);
        }
    }

    private function orderReceipt(Reservation $reservation, ReservationPayment $payment): string
    {
        $receipt = $payment->metadata['gateway_order_receipt'] ?? null;

        return is_string($receipt) ? $receipt : $reservation->booking_reference;
    }

    private function assertOrderMatchesReservation(ReservationPayment $payment, Reservation $reservation, User $user): void
    {
        if ($payment->gateway !== 'razorpay' || $payment->user_id !== $user->id
            || $payment->amount_minor !== $reservation->total_amount_minor || $payment->currency !== $reservation->currency_code) {
            throw ValidationException::withMessages([
                'payment' => 'The existing payment order does not match the current reservation. Reconcile it before starting a new order.',
            ]);
        }
    }

    /** @param array<string, mixed> $order */
    private function verifiedOrderId(array $order, ReservationPayment $payment, string $receipt): string
    {
        $id = $order['id'] ?? null;

        if (! is_string($id) || ! preg_match('/^order_[a-zA-Z0-9_]{1,94}$/D', $id)
            || ($order['receipt'] ?? null) !== $receipt
            || ($order['amount'] ?? null) !== $payment->amount_minor
            || ($order['currency'] ?? null) !== $payment->currency
            || (! str_starts_with($payment->gateway_order_id, 'temp_') && $id !== $payment->gateway_order_id)) {
            throw ValidationException::withMessages([
                'payment' => 'The provider order does not match this payment attempt.',
            ]);
        }

        return $id;
    }
}
