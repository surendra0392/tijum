<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\NotificationWebhookEvent;
use App\Services\Notifications\Email\SmtpConnectionVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminNotificationProviderController extends Controller
{
    public function index(Request $request, SmtpConnectionVerifier $smtpVerifier): Response
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $whatsappToken = (string) config('tijum.notifications.channels.whatsapp.access_token', '');
        $whatsappPhoneId = (string) config('tijum.notifications.channels.whatsapp.phone_number_id', '');
        $whatsappWabaId = (string) config('tijum.notifications.channels.whatsapp.business_account_id', '');
        $whatsappWebhookSecret = (string) config('tijum.notifications.channels.whatsapp.webhook_app_secret', '');

        $smsAuthKey = (string) config('tijum.notifications.channels.sms.auth_key', '');
        $smsSenderId = (string) config('tijum.notifications.channels.sms.sender_id', 'TIJUMS');
        $smsEntityId = (string) config('tijum.notifications.channels.sms.dlt_entity_id', '');

        $smtpHealth = $smtpVerifier->getHealthStatus();
        $lastTestEmail = $smtpVerifier->getLastTestDetails();
        $isEmailEnabled = (bool) config('tijum.notifications.channels.email.enabled', false);

        $providers = [
            'in_app' => [
                'name' => 'In-App Database Notifications',
                'channel' => 'in_app',
                'is_enabled' => (bool) config('tijum.notifications.channels.in_app.enabled', true),
                'driver' => 'database',
                'status' => 'operational',
                'description' => 'Real-time database-backed notifications delivered instantly to Customer, Partner, and Admin portals.',
                'features' => [
                    'Cross-portal isolation',
                    'Unread badges & live polling endpoint',
                    'Mark as read & batch read operations',
                    'Zero external network dependencies',
                ],
            ],
            'email' => [
                'name' => 'Authenticated Domain SMTP Mail',
                'channel' => 'email',
                'is_enabled' => $isEmailEnabled,
                'driver' => config('mail.default', 'smtp'),
                'host' => (string) config('mail.mailers.smtp.host', 'mail.tijum.com'),
                'port' => (int) config('mail.mailers.smtp.port', 465),
                'scheme' => (string) config('mail.mailers.smtp.scheme', 'smtps'),
                'from_address' => config('mail.from.address', 'no-reply@tijum.com'),
                'from_name' => config('mail.from.name', 'TIJUM'),
                'status' => ! $isEmailEnabled
                    ? 'disabled_by_config'
                    : ($smtpHealth['status'] ?? 'untested'),
                'latency_ms' => $smtpHealth['latency_ms'] ?? null,
                'last_connection_at' => $smtpHealth['checked_at'] ?? null,
                'last_test_email' => $lastTestEmail,
                'checks' => $smtpHealth['checks'] ?? [],
                'sanitized_error' => $smtpHealth['sanitized_error'] ?? null,
                'description' => 'Domain SMTP transport (mail.tijum.com:465) with SSL/TLS encryption, authenticating as no-reply@tijum.com.',
                'features' => [
                    'Native Symfony SMTP Transport via port 465 (SSL) / 587 (TLS)',
                    'Branded TIJUM HTML + plain-text responsive templates',
                    'Queued asynchronous delivery with exponential retry backoff',
                    'RFC 8058 one-click list unsubscribe header support',
                    'Transactional isolation: mail failure never rolls back DB transactions',
                ],
            ],
            'sms' => [
                'name' => 'Indian Transactional SMS (DLT)',
                'channel' => 'sms',
                'is_enabled' => (bool) config('tijum.notifications.channels.sms.enabled', false),
                'driver' => config('tijum.notifications.channels.sms.provider', 'msg91'),
                'sender_id' => $smsSenderId,
                'is_simulation' => (bool) config('tijum.notifications.channels.sms.simulation', true),
                'has_credentials' => $smsAuthKey !== '',
                'has_dlt_entity' => $smsEntityId !== '',
                'status' => (bool) config('tijum.notifications.channels.sms.enabled', false)
                    ? ((bool) config('tijum.notifications.channels.sms.simulation', true) ? 'simulation' : 'operational')
                    : 'disabled_by_config',
                'description' => 'TRAI / Telecom DLT compliant service SMS with mandatory Entity ID and registered 6-character header.',
                'features' => [
                    'Strict Indian (+91) 10-digit mobile validation',
                    'DLT Template ID mandatory enforcement',
                    'Header ID (TIJUMS) registration verified',
                    'Delivery receipt webhook tracking',
                ],
            ],
            'whatsapp' => [
                'name' => 'Meta WhatsApp Business Cloud API',
                'channel' => 'whatsapp',
                'is_enabled' => (bool) config('tijum.notifications.channels.whatsapp.enabled', false),
                'driver' => 'meta_graph_api',
                'phone_number_id' => $whatsappPhoneId !== '' ? substr($whatsappPhoneId, 0, 4).'***'.substr($whatsappPhoneId, -4) : 'Not configured',
                'business_account_id' => $whatsappWabaId !== '' ? substr($whatsappWabaId, 0, 4).'***'.substr($whatsappWabaId, -4) : 'Not configured',
                'is_simulation' => (bool) config('tijum.notifications.channels.whatsapp.simulation', true),
                'has_access_token' => $whatsappToken !== '',
                'has_webhook_secret' => $whatsappWebhookSecret !== '',
                'status' => (bool) config('tijum.notifications.channels.whatsapp.enabled', false)
                    ? ((bool) config('tijum.notifications.channels.whatsapp.simulation', true) ? 'simulation' : 'operational')
                    : 'disabled_by_config',
                'description' => 'Official Meta WhatsApp Business Cloud API with pre-approved Meta Utility templates.',
                'features' => [
                    'Prior explicit opt-in enforcement (Strict)',
                    'Approved Meta Utility templates only',
                    '24-Hour customer service window check',
                    'Inbound STOP / Opt-out automated revocation',
                    'Delivery status reconciliation via signed webhooks',
                ],
            ],
        ];

        $recentWebhooks = NotificationWebhookEvent::query()
            ->latest('id')
            ->limit(15)
            ->get()
            ->map(fn (NotificationWebhookEvent $w): array => [
                'id' => $w->id,
                'channel' => $w->provider === 'msg91' ? 'sms' : $w->provider,
                'event_type' => $w->event_type,
                'provider_message_id' => $w->provider_message_id ?? '—',
                'status' => $w->error_message !== null ? 'failed' : ($w->processed ? 'processed' : 'received'),
                'error_message' => $w->error_message,
                'created_at' => $w->created_at?->toISOString(),
                'created_at_human' => $w->created_at?->diffForHumans(),
            ]);

        $webhookStats = [
            'total_24h' => NotificationWebhookEvent::query()->where('created_at', '>=', now()->subDay())->count(),
            'whatsapp_24h' => NotificationWebhookEvent::query()->where('provider', 'whatsapp')->where('created_at', '>=', now()->subDay())->count(),
            'sms_24h' => NotificationWebhookEvent::query()->whereIn('provider', ['sms', 'msg91'])->where('created_at', '>=', now()->subDay())->count(),
            'failed_24h' => NotificationWebhookEvent::query()->whereNotNull('error_message')->where('created_at', '>=', now()->subDay())->count(),
        ];

        return Inertia::render('admin/notifications/providers', [
            'providers' => $providers,
            'recentWebhooks' => $recentWebhooks,
            'webhookStats' => $webhookStats,
            'globalEnabled' => (bool) config('tijum.notifications.enabled', true),
        ]);
    }

    /**
     * Run real-time SMTP socket & authentication verification.
     */
    public function verifyEmailConnection(Request $request, SmtpConnectionVerifier $smtpVerifier): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $result = $smtpVerifier->checkConnection();

        return response()->json([
            'status' => $result['status'],
            'data' => $result,
            'message' => $result['status'] === 'operational'
                ? "SMTP server {$result['host']}:{$result['port']} verified and authenticated successfully ({$result['latency_ms']}ms)."
                : "SMTP verification failed: {$result['sanitized_error']}",
        ]);
    }

    /**
     * Dispatch an authenticated live test email to an explicitly authorized recipient.
     */
    public function sendTestEmail(Request $request, SmtpConnectionVerifier $smtpVerifier): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 403);

        $validated = $request->validate([
            'recipient_email' => ['required', 'string', 'email:rfc,dns', 'max:255'],
        ], [
            'recipient_email.required' => 'Please provide an authorized test recipient email address.',
            'recipient_email.email' => 'Please provide a valid recipient email address format.',
        ]);

        $result = $smtpVerifier->sendTestEmail(
            recipientEmail: (string) $validated['recipient_email'],
            triggeredBy: "Admin: {$admin->name} ({$admin->email})"
        );

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
                'error' => $result['error'] ?? 'UNKNOWN_ERROR',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'recipient' => $result['recipient'],
            'sent_at' => $result['sent_at'],
        ]);
    }
}
