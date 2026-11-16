<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Models\PlatformSetting;
use App\Services\Notifications\NotificationPreferenceService;
use App\Services\Notifications\Templates\TemplateDefinition;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class WhatsAppCloudApiChannel
{
    public function __construct(
        private readonly NotificationPreferenceService $preferenceService
    ) {}

    /**
     * @param  array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}  $rendered
     */
    public function send(NotificationDelivery $delivery, TemplateDefinition $template, array $rendered): void
    {
        $recipient = $delivery->notifiable;
        if ($recipient === null) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_description' => 'Notifiable recipient not found.',
                'failed_at' => now(),
            ]);

            return;
        }

        // 1. Explicit Opt-in Check
        if (! $this->preferenceService->hasWhatsAppOptIn($recipient)) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Suppressed,
                'error_code' => 'NO_WHATSAPP_OPT_IN',
                'error_description' => 'Recipient has not provided explicit WhatsApp opt-in consent.',
            ]);

            return;
        }

        // 2. Validate template mapping
        if (empty($template->metaTemplateName)) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'META_TEMPLATE_MISSING',
                'error_description' => 'No approved Meta WhatsApp message template mapped for this notification.',
                'failed_at' => now(),
            ]);

            return;
        }

        // 3. Format destination phone
        $phone = $delivery->recipient_destination;
        if (! is_string($phone) || trim($phone) === '') {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'INVALID_PHONE_DESTINATION',
                'error_description' => 'Recipient WhatsApp destination number is missing.',
                'failed_at' => now(),
            ]);

            return;
        }

        $formattedPhone = $this->formatWhatsAppPhone($phone);
        $mode = (string) config('tijum.notifications.channels.whatsapp.mode', 'test');
        $token = (string) (PlatformSetting::get('integrations.whatsapp_access_token') ?: config('tijum.notifications.channels.whatsapp.access_token', ''));
        $phoneId = (string) (PlatformSetting::get('integrations.whatsapp_phone_number_id') ?: config('tijum.notifications.channels.whatsapp.phone_number_id', ''));

        // 4. Test or simulated mode
        if ($mode === 'test' || empty($token) || empty($phoneId)) {
            $fakeWamid = 'wamid.'.strtoupper(bin2hex(random_bytes(16)));
            $delivery->update([
                'status' => NotificationDeliveryStatus::Accepted,
                'provider' => 'meta_cloud_api_simulated',
                'provider_message_id' => $fakeWamid,
                'submitted_at' => now(),
            ]);

            return;
        }

        // 5. Live Meta Cloud API Call
        try {
            $version = (string) config('tijum.notifications.channels.whatsapp.graph_version', 'v21.0');
            $url = "https://graph.facebook.com/{$version}/{$phoneId}/messages";

            $parameters = [];
            foreach ($template->approvedVariables as $varName) {
                if (isset($rendered['safe_variables'][$varName])) {
                    $parameters[] = [
                        'type' => 'text',
                        'text' => $rendered['safe_variables'][$varName],
                    ];
                }
            }

            $response = Http::withToken($token)
                ->timeout(10)
                ->post($url, [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $formattedPhone,
                    'type' => 'template',
                    'template' => [
                        'name' => $template->metaTemplateName,
                        'language' => ['code' => 'en'],
                        'components' => [
                            [
                                'type' => 'body',
                                'parameters' => $parameters,
                            ],
                        ],
                    ],
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $msgId = $data['messages'][0]['id'] ?? 'wamid.'.Str::random(16);

                $delivery->update([
                    'status' => NotificationDeliveryStatus::Accepted,
                    'provider' => 'meta_cloud_api',
                    'provider_message_id' => (string) $msgId,
                    'submitted_at' => now(),
                ]);
            } else {
                $body = $response->json();
                $errCode = $body['error']['code'] ?? $response->status();
                $errMsg = $body['error']['message'] ?? $response->body();

                $delivery->update([
                    'status' => NotificationDeliveryStatus::Failed,
                    'error_code' => 'META_API_ERR_'.$errCode,
                    'error_description' => substr((string) $errMsg, 0, 500),
                    'failed_at' => now(),
                ]);
            }
        } catch (Throwable $e) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'WHATSAPP_EXCEPTION',
                'error_description' => substr($e->getMessage(), 0, 500),
                'failed_at' => now(),
            ]);
        }
    }

    private function formatWhatsAppPhone(string $phone): string
    {
        $clean = preg_replace('/[^\d]/', '', $phone) ?? '';
        if (str_starts_with($clean, '91') && strlen($clean) === 12) {
            return $clean;
        }

        return '91'.$clean;
    }
}
