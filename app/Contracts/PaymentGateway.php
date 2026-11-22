<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Reservation;
use App\Models\ReservationPayment;

interface PaymentGateway
{
    /**
     * @return array<string, mixed>
     */
    public function createOrder(Reservation $reservation, ReservationPayment $payment): array;

    public function verifyCheckoutSignature(string $orderId, string $paymentId, string $signature): bool;

    public function verifyWebhookSignature(string $rawPayload, string $signature): bool;

    /**
     * @return array<string, mixed>
     */
    public function fetchPayment(string $paymentId): array;

    /**
     * @return array<string, mixed>
     */
    public function fetchOrder(string $orderId): array;

    /**
     * @return array<string, mixed>|null
     */
    public function fetchOrderByReceipt(string $receipt): ?array;

    /**
     * @return list<array<string, mixed>>
     */
    public function fetchOrderPayments(string $orderId): array;

    /**
     * @return array<string, mixed>
     */
    public function createRefund(
        ReservationPayment $payment,
        int $amountMinor,
        string $reason,
        string $idempotencyKey,
    ): array;

    /**
     * @return array<string, mixed>
     */
    public function fetchRefund(string $refundId): array;

    /** @return array<string, mixed>|null */
    public function fetchRefundByReceipt(string $paymentId, string $receipt): ?array;

    public function getPublicKey(): string;
}
