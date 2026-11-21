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
        private readonly bool $liveEnabled = false,
    ) {}

    public function isRouteEnabled(): bool
    {
        return $this->routeEnabled;
    }

    public function canTransfer(): bool
    {
        return $this->isRouteEnabled() && $this->credentialMode() !== null;
    }

    public function credentialMode(): ?string
    {
        $mode = $this->liveEnabled ? 'live' : 'test';

        if (blank($this->keySecret)
            || ! str_starts_with($this->keyId, "rzp_{$mode}_")
            || strlen($this->keyId) <= strlen("rzp_{$mode}_")
            || str_contains(strtolower($this->keyId), 'placeholder')
            || str_contains(strtolower($this->keySecret), 'placeholder')
            || (! $this->liveEnabled && app()->isProduction())) {
            return null;
        }

        return $mode;
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
        array $notes = [],
    ): array {
        if (! $this->canTransfer()) {
            throw new RuntimeException('Razorpay Route is unavailable for transfers with the current configuration.');
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

        // Transfer creation from a payment has no documented idempotent replay.
        $response = Http::withBasicAuth($this->keyId, $this->keySecret)
            ->withoutRedirecting()
            ->timeout(15)
            ->post(self::BASE_URL.'/payments/'.rawurlencode($paymentId).'/transfers', $payload);

        if (! $response->successful()) {
            throw new RuntimeException("Razorpay Route returned HTTP {$response->status()} for transfer creation.");
        }

        $items = $response->json('items');

        if (! is_array($items) || count($items) !== 1 || ! is_array($items[0] ?? null)) {
            throw new RuntimeException('Razorpay did not return exactly one transfer for the request.');
        }

        return $items[0];
    }

    /**
     * @return array<string, mixed>
     */
    public function fetchTransfer(string $transferId): array
    {
        return $this->fetchTransferData('/transfers/'.rawurlencode($transferId));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function fetchPaymentTransfers(string $paymentId): array
    {
        $data = $this->fetchTransferData('/payments/'.rawurlencode($paymentId).'/transfers');
        $items = $data['items'] ?? null;

        if (! is_array($items) || ! array_is_list($items) || array_filter($items, 'is_array') !== $items) {
            throw new RuntimeException('Razorpay did not return a transfer collection.');
        }

        return $items;
    }

    /** @return array<string, mixed> */
    private function fetchTransferData(string $path): array
    {
        if ($this->credentialMode() === null) {
            throw new RuntimeException('Razorpay Route credentials are unavailable for reconciliation.');
        }

        $response = $this->client()->withoutRedirecting()->get(self::BASE_URL.$path);
        $data = $response->json();

        if (! $response->successful() || ! is_array($data)) {
            throw new RuntimeException("Razorpay Route lookup failed with HTTP {$response->status()}.");
        }

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
        if (! $this->credentialsModeIsAllowed()) {
            throw new RuntimeException('Live Razorpay credentials cannot be used while live payments are disabled.');
        }

        return Http::withBasicAuth($this->keyId, $this->keySecret)
            ->timeout(15)
            ->retry(2, 200, throw: false);
    }

    private function credentialsModeIsAllowed(): bool
    {
        return $this->liveEnabled || ! str_starts_with($this->keyId, 'rzp_live_');
    }
}
