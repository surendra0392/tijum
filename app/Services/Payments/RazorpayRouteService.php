<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class RazorpayRouteService
{
    private const BASE_URL = 'https://api.razorpay.com/v1';

    public function __construct(
        private readonly string $keyId,
        private readonly string $keySecret,
        private readonly bool $routeEnabled,
    ) {}

    public function isRouteEnabled(): bool
    {
        return $this->routeEnabled;
    }

    /**
     * @return array<string, mixed>
     */
    public function createLinkedAccount(Owner $owner, OwnerFinancialProfile $profile): array
    {
        if (! $this->routeEnabled || blank($this->keyId) || str_contains($this->keyId, 'placeholder')) {
            $mockId = 'acc_mock_'.strtolower(Str::random(14));

            return [
                'id' => $mockId,
                'status' => 'created',
                'email' => $owner->email,
                'business_name' => $profile->legal_business_name ?? $owner->name,
                'type' => 'route',
            ];
        }

        $payload = [
            'name' => $owner->name,
            'email' => $owner->email,
            'phone' => $owner->phone,
            'legal_business_name' => $profile->legal_business_name ?: $owner->name,
            'business_type' => $profile->business_constitution ?: 'individual',
            'contact_name' => $owner->name,
            'profile' => [
                'category' => 'accommodation',
                'description' => 'TIJUM food-inclusive accommodation partner',
            ],
            'notes' => [
                'owner_id' => (string) $owner->id,
            ],
        ];

        $response = $this->client()->post(self::BASE_URL.'/accounts', $payload);

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to create Razorpay linked account.';
            throw new RuntimeException("Razorpay Route Account Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchLinkedAccount(string $accountId): array
    {
        if (! $this->routeEnabled || blank($this->keyId) || str_contains($this->keyId, 'placeholder')) {
            return [
                'id' => $accountId,
                'status' => 'activated',
                'type' => 'route',
            ];
        }

        $response = $this->client()->get(self::BASE_URL."/accounts/{$accountId}");

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch linked account details.';
            throw new RuntimeException("Razorpay Route Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    /**
     * @param  array<string, string>  $notes
     * @return array<string, mixed>
     */
    public function createTransferFromPayment(
        string $paymentId,
        string $linkedAccountId,
        int $amountMinor,
        string $idempotencyKey,
        array $notes = [],
    ): array {
        if (! $this->routeEnabled || blank($this->keyId) || str_contains($this->keyId, 'placeholder')) {
            $mockTransferId = 'trf_mock_'.strtolower(Str::random(14));

            return [
                'id' => $mockTransferId,
                'entity' => 'transfer',
                'status' => 'processed',
                'amount' => $amountMinor,
                'currency' => 'INR',
                'recipient' => $linkedAccountId,
                'payment_id' => $paymentId,
                'settlement_status' => 'pending',
            ];
        }

        $payload = [
            'transfers' => [
                [
                    'account' => $linkedAccountId,
                    'amount' => $amountMinor,
                    'currency' => 'INR',
                    'notes' => $notes,
                ],
            ],
        ];

        $response = $this->client()
            ->withHeaders(['X-Razorpay-Idempotency-Key' => $idempotencyKey])
            ->post(self::BASE_URL."/payments/{$paymentId}/transfers", $payload);

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to initiate Route transfer.';
            throw new RuntimeException("Razorpay Route Transfer Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        // Response contains list of transfers; return the first transfer object
        if (isset($data['items']) && is_array($data['items']) && count($data['items']) > 0) {
            /** @var array<string, mixed> $first */
            $first = $data['items'][0];

            return $first;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchTransfer(string $transferId): array
    {
        if (! $this->routeEnabled || blank($this->keyId) || str_contains($this->keyId, 'placeholder')) {
            return [
                'id' => $transferId,
                'status' => 'processed',
                'currency' => 'INR',
            ];
        }

        $response = $this->client()->get(self::BASE_URL."/transfers/{$transferId}");

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to fetch transfer details.';
            throw new RuntimeException("Razorpay Route Transfer Fetch Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    /**
     * @param  array<string, string>  $notes
     * @return array<string, mixed>
     */
    public function createReversal(string $transferId, int $amountMinor, array $notes = []): array
    {
        if (! $this->routeEnabled || blank($this->keyId) || str_contains($this->keyId, 'placeholder')) {
            $mockRevId = 'rev_mock_'.strtolower(Str::random(14));

            return [
                'id' => $mockRevId,
                'entity' => 'reversal',
                'status' => 'processed',
                'amount' => $amountMinor,
                'currency' => 'INR',
                'transfer_id' => $transferId,
            ];
        }

        $payload = [
            'amount' => $amountMinor,
            'currency' => 'INR',
            'notes' => $notes,
        ];

        $response = $this->client()->post(self::BASE_URL."/transfers/{$transferId}/reversals", $payload);

        if (! $response->successful()) {
            $error = $response->json('error.description') ?? 'Failed to create Route reversal.';
            throw new RuntimeException("Razorpay Route Reversal Error: {$error}");
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    private function client(): PendingRequest
    {
        return Http::withBasicAuth($this->keyId, $this->keySecret)
            ->timeout(15)
            ->retry(2, 200, throw: false);
    }
}
