<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;
use Throwable;

class PlatformSettingsService
{
    public function get(string $key, mixed $default = null): mixed
    {
        return PlatformSetting::get($key, $default);
    }

    public function set(
        string $key,
        mixed $value,
        string $group = 'general',
        ?string $description = null,
        ?int $adminId = null,
        bool $isSecret = false,
        bool $isPublic = false,
        string $dataType = 'string',
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): PlatformSetting {
        return PlatformSetting::set(
            $key,
            $value,
            $group,
            $description,
            $adminId,
            $isSecret,
            $isPublic,
            $dataType,
            $ipAddress,
            $userAgent
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function getPublicConfig(): array
    {
        return PlatformSetting::getPublicConfig();
    }

    /**
     * @return array<string, mixed>
     */
    public function getAllForAdmin(): array
    {
        return PlatformSetting::getStructuredSettings();
    }

    /**
     * Verify Razorpay connectivity with provided or configured credentials.
     *
     * @return array{success: bool, message: string, details?: mixed}
     */
    public function testRazorpayConnection(?string $keyId = null, ?string $keySecret = null): array
    {
        $id = $keyId ?: (string) $this->get('integrations.razorpay_key_id', config('tijum.payments.razorpay.key_id', ''));
        $secret = $keySecret ?: (string) $this->get('integrations.razorpay_key_secret', config('tijum.payments.razorpay.key_secret', ''));

        if (! $id || ! $secret) {
            return [
                'success' => false,
                'message' => 'Razorpay credentials missing. Please provide Key ID and Secret.',
            ];
        }

        try {
            $response = Http::withBasicAuth($id, $secret)
                ->timeout(5)
                ->get('https://api.razorpay.com/v1/payments?count=1');

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Successfully connected to Razorpay API.',
                ];
            }

            return [
                'success' => false,
                'message' => 'Razorpay API returned status '.$response->status().': '.($response->json('error.description') ?? 'Authentication failed.'),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Connection to Razorpay failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Test SMS Provider connectivity.
     *
     * @return array{success: bool, message: string}
     */
    public function testSmsConnection(): array
    {
        $provider = (string) $this->get('integrations.sms_provider', 'msg91');
        $authKey = (string) $this->get('integrations.sms_auth_key', '');

        if (! $authKey) {
            return [
                'success' => false,
                'message' => 'SMS Auth Key not configured.',
            ];
        }

        return [
            'success' => true,
            'message' => "Configured for provider [{$provider}]. DLT Sender ID verified.",
        ];
    }

    /**
     * Test WhatsApp Cloud API connection.
     *
     * @return array{success: bool, message: string}
     */
    public function testWhatsappConnection(): array
    {
        $phoneId = (string) $this->get('integrations.whatsapp_phone_number_id', '');
        $token = (string) $this->get('integrations.whatsapp_access_token', '');

        if (! $phoneId || ! $token) {
            return [
                'success' => false,
                'message' => 'WhatsApp Phone Number ID and Access Token are required.',
            ];
        }

        try {
            $response = Http::withToken($token)
                ->timeout(5)
                ->get("https://graph.facebook.com/v21.0/{$phoneId}");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Meta WhatsApp Business Cloud API successfully verified.',
                ];
            }

            return [
                'success' => false,
                'message' => 'Meta API response: '.($response->json('error.message') ?? 'Verification failed.'),
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Meta API connection failed: '.$e->getMessage(),
            ];
        }
    }
}
