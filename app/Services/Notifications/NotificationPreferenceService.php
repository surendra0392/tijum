<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\ConsentAction;
use App\Enums\ConsentStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Models\NotificationConsentRecord;
use App\Models\NotificationPreference;
use Illuminate\Database\Eloquent\Model;

class NotificationPreferenceService
{
    /**
     * Determine if a channel is eligible and enabled for a recipient and category.
     */
    public function isChannelEnabledForRecipient(
        Model $recipient,
        NotificationChannel $channel,
        NotificationCategory $category
    ): bool {
        // 1. Global kill switch
        if (! (bool) config('tijum.notifications.enabled', true)) {
            return false;
        }

        // 2. Channel config switch
        $channelConfigKey = "tijum.notifications.channels.{$channel->value}.enabled";
        if (! (bool) config($channelConfigKey, false)) {
            // Channel is disabled by config
            return false;
        }

        // 3. Marketing is strictly blocked in Phase 18
        if ($category === NotificationCategory::Marketing) {
            return false;
        }

        // 4. In-App and Push are enabled for essential & operational by default
        if ($channel === NotificationChannel::InApp || $channel === NotificationChannel::Push) {
            return true;
        }

        // 5. WhatsApp requires explicit prior opt-in
        if ($channel === NotificationChannel::WhatsApp) {
            if (! $this->hasWhatsAppOptIn($recipient)) {
                return false;
            }
        }

        // 6. Essential transactional notices on Email & SMS cannot be opted out of
        if ($category === NotificationCategory::EssentialTransactional) {
            return true;
        }

        // 7. Check user-defined preference table for operational updates
        /** @var NotificationPreference|null $pref */
        $pref = NotificationPreference::query()
            ->where('notifiable_type', $recipient->getMorphClass())
            ->where('notifiable_id', $recipient->getKey())
            ->where('channel', $channel->value)
            ->where('category', $category->value)
            ->first();

        return $pref !== null ? (bool) $pref->enabled : true;
    }

    /**
     * Check if a recipient has recorded explicit WhatsApp opt-in.
     */
    public function hasWhatsAppOptIn(Model $recipient): bool
    {
        /** @var NotificationConsentRecord|null $latest */
        $latest = NotificationConsentRecord::query()
            ->where('notifiable_type', $recipient->getMorphClass())
            ->where('notifiable_id', $recipient->getKey())
            ->where('channel', NotificationChannel::WhatsApp->value)
            ->orderByDesc('id')
            ->first();

        return $latest !== null && $latest->consent_status === ConsentStatus::OptedIn;
    }

    /**
     * Record an append-only consent action and sync current preference state.
     */
    public function recordConsent(
        Model $recipient,
        NotificationChannel $channel,
        NotificationCategory $category,
        ConsentStatus $status,
        ConsentAction $action,
        string $source,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?string $notes = null
    ): NotificationConsentRecord {
        // Record immutable audit history
        $record = NotificationConsentRecord::query()->create([
            'notifiable_type' => $recipient->getMorphClass(),
            'notifiable_id' => $recipient->getKey(),
            'channel' => $channel->value,
            'category' => $category->value,
            'consent_status' => $status->value,
            'consent_action' => $action->value,
            'source' => $source,
            'policy_version' => '2026.1',
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'notes' => $notes,
            'created_at' => now(),
        ]);

        // Sync mutable current state
        NotificationPreference::query()->updateOrCreate(
            [
                'notifiable_type' => $recipient->getMorphClass(),
                'notifiable_id' => $recipient->getKey(),
                'channel' => $channel->value,
                'category' => $category->value,
            ],
            [
                'enabled' => $status === ConsentStatus::OptedIn,
            ]
        );

        return $record;
    }

    /**
     * Get structured preferences for customer or owner UI.
     *
     * @return array<string, mixed>
     */
    public function getPreferences(Model $recipient): array
    {
        $prefs = NotificationPreference::query()
            ->where('notifiable_type', $recipient->getMorphClass())
            ->where('notifiable_id', $recipient->getKey())
            ->get()
            ->keyBy(fn (NotificationPreference $p) => "{$p->channel->value}_{$p->category->value}");

        $whatsappOptedIn = $this->hasWhatsAppOptIn($recipient);

        return [
            'in_app_operational' => $prefs->get('in_app_operational_update')?->enabled ?? true,
            'email_operational' => $prefs->get('email_operational_update')?->enabled ?? true,
            'sms_operational' => $prefs->get('sms_operational_update')?->enabled ?? true,
            'whatsapp_opted_in' => $whatsappOptedIn,
            'channels_available' => [
                'in_app' => (bool) config('tijum.notifications.channels.in_app.enabled', true),
                'email' => (bool) config('tijum.notifications.channels.email.enabled', false),
                'sms' => (bool) config('tijum.notifications.channels.sms.enabled', false),
                'whatsapp' => (bool) config('tijum.notifications.channels.whatsapp.enabled', false),
            ],
        ];
    }

    /**
     * Update recipient preferences from web form.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePreferences(
        Model $recipient,
        array $data,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): void {
        // Operational preferences
        $channels = [
            'in_app' => NotificationChannel::InApp,
            'email' => NotificationChannel::Email,
            'sms' => NotificationChannel::Sms,
        ];

        foreach ($channels as $key => $ch) {
            if (array_key_exists("{$key}_operational", $data)) {
                $enabled = (bool) $data["{$key}_operational"];
                NotificationPreference::query()->updateOrCreate(
                    [
                        'notifiable_type' => $recipient->getMorphClass(),
                        'notifiable_id' => $recipient->getKey(),
                        'channel' => $ch->value,
                        'category' => NotificationCategory::OperationalUpdate->value,
                    ],
                    [
                        'enabled' => $enabled,
                    ]
                );
            }
        }

        // WhatsApp opt-in toggle
        if (array_key_exists('whatsapp_opted_in', $data)) {
            $newStatus = (bool) $data['whatsapp_opted_in'] ? ConsentStatus::OptedIn : ConsentStatus::OptedOut;
            $currentStatus = $this->hasWhatsAppOptIn($recipient) ? ConsentStatus::OptedIn : ConsentStatus::OptedOut;

            if ($newStatus !== $currentStatus) {
                $this->recordConsent(
                    $recipient,
                    NotificationChannel::WhatsApp,
                    NotificationCategory::EssentialTransactional,
                    $newStatus,
                    $newStatus === ConsentStatus::OptedIn ? ConsentAction::Granted : ConsentAction::Withdrawn,
                    'web_ui_preferences',
                    $ipAddress,
                    $userAgent,
                    'User updated WhatsApp communication preference in portal settings'
                );
            }
        }
    }
}
