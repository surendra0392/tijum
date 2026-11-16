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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InitiatePaymentOrder
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /**
     * @return array{
     *     key: string,
     *     order_id: string,
     *     amount: int,
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
        if ($reservation->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'reservation' => 'You are not authorised to pay for this reservation.',
            ]);
        }

        return DB::transaction(function () use ($user, $reservation, $idempotencyKey): array {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== ReservationStatus::AwaitingPayment) {
                if ($locked->status === ReservationStatus::Confirmed) {
                    throw ValidationException::withMessages([
                        'reservation' => 'This reservation is already confirmed and paid.',
                    ]);
                }

                throw ValidationException::withMessages([
                    'reservation' => 'Payment cannot be initiated for this reservation at its current status.',
                ]);
            }

            if ($locked->payment_deadline_at !== null && $locked->payment_deadline_at->isPast()) {
                throw ValidationException::withMessages([
                    'reservation' => 'The payment window for this reservation has expired.',
                ]);
            }

            // Verify no captured payment exists
            $alreadyCaptured = $locked->payments()
                ->whereIn('status', [
                    PaymentStatus::Captured->value,
                    PaymentStatus::RefundPending->value,
                    PaymentStatus::PartiallyRefunded->value,
                    PaymentStatus::Refunded->value,
                ])
                ->exists();

            if ($alreadyCaptured) {
                throw ValidationException::withMessages([
                    'reservation' => 'A successful payment has already been recorded for this reservation.',
                ]);
            }

            // Check if there is an existing pending payment order that is still fresh
            /** @var ReservationPayment|null $payment */
            $payment = $locked->payments()
                ->whereIn('status', [PaymentStatus::Created->value, PaymentStatus::Pending->value])
                ->whereNotNull('gateway_order_id')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            $idempotency = $idempotencyKey ?? (string) Str::uuid();

            if ($payment === null) {
                $payment = new ReservationPayment;
                $payment->forceFill([
                    'reservation_id' => $locked->id,
                    'user_id' => $user->id,
                    'gateway' => 'razorpay',
                    'gateway_order_id' => 'temp_'.Str::random(24),
                    'idempotency_key' => $idempotency,
                    'amount_minor' => $locked->total_amount_minor,
                    'currency' => $locked->currency_code,
                    'status' => PaymentStatus::Created->value,
                ]);
                $payment->save();

                // Call Gateway Order API
                $orderData = $this->gateway->createOrder($locked, $payment);
                $gatewayOrderId = (string) $orderData['id'];

                $payment->forceFill([
                    'gateway_order_id' => $gatewayOrderId,
                    'status' => PaymentStatus::Pending->value,
                    'gateway_order_created_at' => CarbonImmutable::now(),
                    'metadata' => $orderData,
                ])->save();
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
        }, 3);
    }
}
