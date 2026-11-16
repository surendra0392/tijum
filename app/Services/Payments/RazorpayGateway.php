<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class RazorpayGateway implements PaymentGateway
{
    private const BASE_URL = 'https://api.razorpay.com/v1';

    public function __construct(
        private readonly string $keyId,
        private readonly string $keySecret,
        private readonly string $webhookSecret,
        private readonly bool $liveEnabled = false,
    ) {
        if (! $this->liveEnabled && str_starts_with($this->keyId, 'rzp_live_')) {
            throw new RuntimeException('CRITICAL SAFETY SAFEGUARD: Live Razorpay credentials cannot be used while live payments are disabled.');
        }
    }

    public function createOrder(Reservation $reservation, ReservationPayment $payment): array
    {
        $payload = [
            'amount' => $payment->amount_minor,
            'currency' => $payment->currency,
            'receipt' => $reservation->booking_reference,
            'notes' => [
                'reservation_id' => (string) $reservation->id,
                'booking_reference' => $reservation->booking_reference,
                'property_id' => (string) $reservation->property_id,
                'user_id' => (string) $payment->user_id,
            ],
        ];

        $response = $this->client()
            ->post(self::BASE_URL.'/orders', $payload);

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to create Razorpay order.';
            throw new RuntimeException("Gateway Order Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    public function verifyCheckoutSignature(string $orderId, string $paymentId, string $signature): bool
    {
        if ($orderId === '' || $paymentId === '' || $signature === '') {
            return false;
        }

        $generated = hash_hmac('sha256', "{$orderId}|{$paymentId}", $this->keySecret);

        return hash_equals($generated, $signature);
    }

    public function verifyWebhookSignature(string $rawPayload, string $signature): bool
    {
        if ($rawPayload === '' || $signature === '' || $this->webhookSecret === '') {
            return false;
        }

        $generated = hash_hmac('sha256', $rawPayload, $this->webhookSecret);

        return hash_equals($generated, $signature);
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchPayment(string $paymentId): array
    {
        if ($paymentId === '') {
            throw new InvalidArgumentException('Payment ID cannot be empty.');
        }

        $response = $this->client()
            ->get(self::BASE_URL."/payments/{$paymentId}");

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch payment details.';
            throw new RuntimeException("Gateway Payment Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchOrder(string $orderId): array
    {
        if ($orderId === '') {
            throw new InvalidArgumentException('Order ID cannot be empty.');
        }

        $response = $this->client()
            ->get(self::BASE_URL."/orders/{$orderId}");

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch order details.';
            throw new RuntimeException("Gateway Order Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fetchOrderPayments(string $orderId): array
    {
        if ($orderId === '') {
            return [];
        }

        $response = $this->client()
            ->get(self::BASE_URL."/orders/{$orderId}/payments");

        if (! $response->successful()) {
            return [];
        }

        /** @var list<array<string, mixed>> $items */
        $items = (array) ($response->json('items') ?? []);

        return $items;
    }

    /**
     * @return array<string, mixed>
     */
    public function createRefund(
        ReservationPayment $payment,
        int $amountMinor,
        string $reason,
        string $idempotencyKey,
    ): array {
        if (! $payment->gateway_payment_id) {
            throw new InvalidArgumentException('Cannot refund a payment without a gateway_payment_id.');
        }

        $payload = [
            'amount' => $amountMinor,
            'speed' => 'normal',
            'notes' => [
                'reason' => Str::limit($reason, 255),
                'payment_id' => (string) $payment->id,
                'reservation_id' => (string) $payment->reservation_id,
            ],
            'receipt' => 'rfnd_'.Str::limit($payment->reservation->booking_reference ?? 'ref', 30),
        ];

        $response = $this->client()
            ->withHeaders(['X-Razorpay-Idempotency-Key' => $idempotencyKey])
            ->post(self::BASE_URL."/payments/{$payment->gateway_payment_id}/refund", $payload);

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to process refund.';
            throw new RuntimeException("Gateway Refund Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchRefund(string $refundId): array
    {
        if ($refundId === '') {
            throw new InvalidArgumentException('Refund ID cannot be empty.');
        }

        $response = $this->client()
            ->get(self::BASE_URL."/refunds/{$refundId}");

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch refund details.';
            throw new RuntimeException("Gateway Refund Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    public function getPublicKey(): string
    {
        return $this->keyId;
    }

    private function client(): PendingRequest
    {
        if (! $this->liveEnabled && str_starts_with($this->keyId, 'rzp_live_')) {
            throw new RuntimeException('CRITICAL SAFETY SAFEGUARD: Live Razorpay credentials cannot be used while live payments are disabled.');
        }

        return Http::withBasicAuth($this->keyId, $this->keySecret)
            ->timeout(15)
            ->retry(2, 200, throw: false);
    }
}
