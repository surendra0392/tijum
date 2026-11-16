<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Models\PlatformSetting;
use App\Services\Notifications\Templates\TemplateDefinition;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class SmsGatewayManager
{
    /**
     * @param  array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}  $rendered
     */
    public function send(NotificationDelivery $delivery, TemplateDefinition $template, array $rendered): void
    {
        // 1. DLT Template Check
        if (empty($template->dltTemplateId)) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'DLT_TEMPLATE_MISSING',
                'error_description' => 'SMS sending blocked: no registered DLT Content Template ID mapped for this notification.',
                'failed_at' => now(),
            ]);

            return;
        }

        // 2. Validate Indian phone destination
        $phone = $delivery->recipient_destination;
        if (! is_string($phone) || ! $this->isValidIndianPhone($phone)) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'INVALID_PHONE_DESTINATION',
                'error_description' => 'Recipient phone number is invalid or not in valid Indian format.',
                'failed_at' => now(),
            ]);

            return;
        }

        $formattedPhone = $this->formatIndianPhone($phone);
        $mode = (string) config('tijum.notifications.channels.sms.mode', 'test');
        $authKey = (string) (PlatformSetting::get('integrations.sms_auth_key') ?: config('tijum.notifications.channels.sms.auth_key', ''));

        // 3. Test or simulated mode
        if ($mode === 'test' || empty($authKey)) {
            $providerMsgId = 'msg91_req_'.strtolower(Str::random(16));
            $delivery->update([
                'status' => NotificationDeliveryStatus::Accepted,
                'provider' => 'msg91_simulated',
                'provider_message_id' => $providerMsgId,
                'submitted_at' => now(),
            ]);

            return;
        }

        // 4. Live MSG91 Flow API call
        try {
            $senderId = (string) (PlatformSetting::get('integrations.sms_sender_id') ?: config('tijum.notifications.channels.sms.sender_id', 'TIJUMS'));
            $response = Http::withHeaders([
                'authkey' => $authKey,
                'content-type' => 'application/json',
            ])->timeout(10)->post('https://control.msg91.com/api/v5/flow/', [
                'template_id' => $template->dltTemplateId,
                'sender' => $senderId,
                'short_url' => 0,
                'mobiles' => $formattedPhone,
                'var' => $rendered['safe_variables'],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $requestId = $data['message'] ?? 'msg91_'.Str::random(12);

                $delivery->update([
                    'status' => NotificationDeliveryStatus::Accepted,
                    'provider' => 'msg91',
                    'provider_message_id' => (string) $requestId,
                    'submitted_at' => now(),
                ]);
            } else {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Failed,
                    'error_code' => 'GATEWAY_HTTP_'.$response->status(),
                    'error_description' => substr($response->body(), 0, 500),
                    'failed_at' => now(),
                ]);
            }
        } catch (Throwable $e) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'SMS_GATEWAY_EXCEPTION',
                'error_description' => substr($e->getMessage(), 0, 500),
                'failed_at' => now(),
            ]);
        }
    }

    private function isValidIndianPhone(string $phone): bool
    {
        $clean = preg_replace('/[^\d]/', '', $phone) ?? '';
        if (str_starts_with($clean, '91') && strlen($clean) === 12) {
            return true;
        }

        return strlen($clean) === 10;
    }

    private function formatIndianPhone(string $phone): string
    {
        $clean = preg_replace('/[^\d]/', '', $phone) ?? '';
        if (str_starts_with($clean, '91') && strlen($clean) === 12) {
            return $clean;
        }

        return '91'.$clean;
    }
}
