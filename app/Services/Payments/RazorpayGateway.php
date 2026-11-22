<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

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
        if ($payment->amount_minor < 100) {
            throw new InvalidArgumentException('Minimum Razorpay order amount is 100 paise.');
        }

        if ($this->keyId === '' || $this->keySecret === '') {
            throw new RuntimeException('Razorpay API credentials are not configured.', 401);
        }

        $payload = [
            'amount' => $payment->amount_minor,
            'currency' => $payment->currency,
            'receipt' => $payment->metadata['gateway_order_receipt'] ?? $reservation->booking_reference,
            'notes' => [
                'reservation_id' => (string) $reservation->id,
                'booking_reference' => $reservation->booking_reference,
                'property_id' => (string) $reservation->property_id,
                'user_id' => (string) $payment->user_id,
            ],
        ];

        $response = $this->client(retry: false)
            ->withoutRedirecting()
            ->post(self::BASE_URL.'/orders', $payload);

        if ($response->status() === 401) {
            $error = $response->json('error.description') ?? 'Razorpay authentication failed.';
            throw new RuntimeException("Gateway Auth Error: {$error}", 401);
        }

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to create Razorpay order.';
            throw new RuntimeException("Gateway Order Error: {$error}", 500);
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    public function verifyCheckoutSignature(string $orderId, string $paymentId, string $signature): bool
    {
        if ($orderId === '' || $paymentId === '' || $signature === '' || $this->keySecret === '') {
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

        $response = $this->configuredClient()
            ->get(self::BASE_URL.'/payments/'.rawurlencode($paymentId));

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

        $response = $this->configuredClient()
            ->get(self::BASE_URL.'/orders/'.rawurlencode($orderId));

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch order details.';
            throw new RuntimeException("Gateway Order Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    public function fetchOrderByReceipt(string $receipt): ?array
    {
        $response = $this->configuredClient()
            ->get(self::BASE_URL.'/orders', ['receipt' => $receipt]);

        $items = $response->json('items');
        if (! $response->successful() || ! is_array($items) || ! array_is_list($items)) {
            throw new RuntimeException('Razorpay order lookup returned an invalid response.');
        }

        $match = null;
        foreach ($items as $item) {
            if (! is_array($item) || ! is_string($item['receipt'] ?? null)) {
                throw new RuntimeException('Razorpay returned an invalid order record.');
            }

            if ($item['receipt'] === $receipt) {
                if ($match !== null) {
                    throw new RuntimeException('Razorpay returned multiple orders with the same receipt.');
                }

                $match = $item;
            }
        }

        return $match;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fetchOrderPayments(string $orderId): array
    {
        if ($orderId === '') {
            throw new InvalidArgumentException('Order ID cannot be empty.');
        }

        $response = $this->configuredClient()
            ->get(self::BASE_URL.'/orders/'.rawurlencode($orderId).'/payments');

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch order payments.';
            throw new RuntimeException("Gateway Order Payments Error: {$error}");
        }

        $items = $response->json('items');
        if (! is_array($items) || ! array_is_list($items)) {
            throw new RuntimeException('Razorpay returned an invalid order payments collection.');
        }

        /** @var list<array<string, mixed>> $items */
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
            'receipt' => ReservationRefund::receiptFor($idempotencyKey),
        ];

        $response = $this->refundClient(retry: false)
            ->withHeaders(['X-Refund-Idempotency' => $idempotencyKey])
            ->post(self::BASE_URL.'/payments/'.rawurlencode($payment->gateway_payment_id).'/refund', $payload);

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

        $response = $this->refundClient()
            ->get(self::BASE_URL.'/refunds/'.rawurlencode($refundId));

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch refund details.';
            throw new RuntimeException("Gateway Refund Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    public function fetchRefundByReceipt(string $paymentId, string $receipt): ?array
    {
        $match = null;
        $pageSize = 100;
        $maxPages = 50;

        for ($page = 0, $skip = 0; $page < $maxPages; $page++, $skip += $pageSize) {
            $response = $this->refundClient()->get(
                self::BASE_URL.'/payments/'.rawurlencode($paymentId).'/refunds',
                ['count' => $pageSize, 'skip' => $skip],
            );
            $items = $response->json('items');
            if (! $response->successful() || ! is_array($items) || ! array_is_list($items) || count($items) > $pageSize) {
                throw new RuntimeException('Razorpay refund lookup returned an invalid response.');
            }

            foreach ($items as $refund) {
                if (! is_array($refund)) {
                    throw new RuntimeException('Razorpay returned an invalid refund record.');
                }

                if (($refund['receipt'] ?? null) === $receipt) {
                    if ($match !== null) {
                        throw new RuntimeException('Razorpay returned more than one refund for the request receipt.');
                    }

                    $match = $refund;
                }
            }

            if (count($items) < $pageSize) {
                return $match;
            }
        }

        throw new RuntimeException('Razorpay refund lookup exceeded the pagination safety limit.');
    }

    public function getPublicKey(): string
    {
        return $this->keyId;
    }

    private function refundClient(bool $retry = true): PendingRequest
    {
        return $this->configuredClient($retry);
    }

    private function configuredClient(bool $retry = true): PendingRequest
    {
        if ($this->keyId === '' || $this->keySecret === '') {
            throw new RuntimeException('Razorpay API credentials are not configured.', 401);
        }

        return $this->client($retry)->withoutRedirecting();
    }

    private function client(bool $retry = true): PendingRequest
    {
        if (! $this->liveEnabled && str_starts_with($this->keyId, 'rzp_live_')) {
            throw new RuntimeException('CRITICAL SAFETY SAFEGUARD: Live Razorpay credentials cannot be used while live payments are disabled.');
        }

        $request = Http::withBasicAuth($this->keyId, $this->keySecret)->timeout(15);

        return $retry
            ? $request->retry(
                2,
                200,
                static fn (Throwable $exception): bool => $exception instanceof ConnectionException
                    || ($exception instanceof RequestException && $exception->response->serverError()),
                throw: false,
            )
            : $request;
    }
}
