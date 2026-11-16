<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Jobs\SendNotificationDeliveryJob;
use App\Mail\TijumTransactionalMail;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Notifications\Admin\ResetPasswordNotification as AdminResetPasswordNotification;
use App\Notifications\Customer\ResetPasswordNotification as CustomerResetPasswordNotification;
use App\Notifications\Customer\VerifyEmailNotification as CustomerVerifyEmailNotification;
use App\Notifications\Owner\ResetPasswordNotification as OwnerResetPasswordNotification;
use App\Notifications\Owner\VerifyEmailNotification as OwnerVerifyEmailNotification;
use App\Services\Notifications\Channels\EmailNotificationChannel;
use App\Services\Notifications\Email\SmtpConnectionVerifier;
use App\Services\Notifications\NotificationEventCatalogue;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class ServerSmtpEmailSystemTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.email.enabled', true);
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.host', 'mail.tijum.com');
        Config::set('mail.mailers.smtp.port', 465);
        Config::set('mail.mailers.smtp.scheme', 'smtps');
        Config::set('mail.mailers.smtp.username', 'no-reply@tijum.com');
        Config::set('mail.from.address', 'no-reply@tijum.com');
        Config::set('mail.from.name', 'TIJUM');
    }

    public function test_smtp_mailer_configuration_is_properly_resolved(): void
    {
        $this->assertSame('smtp', config('mail.default'));
        $this->assertSame('mail.tijum.com', config('mail.mailers.smtp.host'));
        $this->assertSame(465, config('mail.mailers.smtp.port'));
        $this->assertSame('smtps', config('mail.mailers.smtp.scheme'));
        $this->assertSame('no-reply@tijum.com', config('mail.from.address'));
        $this->assertSame('TIJUM', config('mail.from.name'));

        $mailboxes = config('tijum.notifications.channels.email.mailboxes');
        $this->assertIsArray($mailboxes);
        $this->assertSame('no-reply@tijum.com', $mailboxes['default']);
        $this->assertSame('bookings@tijum.com', $mailboxes['bookings']);
        $this->assertSame('support@tijum.com', $mailboxes['support']);
        $this->assertSame('grievance@tijum.com', $mailboxes['grievance']);
        $this->assertSame('admin@tijum.com', $mailboxes['admin']);
    }

    public function test_smtp_connection_verifier_health_status_baseline(): void
    {
        $verifier = app(SmtpConnectionVerifier::class);
        $status = $verifier->getHealthStatus();

        $this->assertIsArray($status);
        $this->assertSame('mail.tijum.com', $status['host']);
        $this->assertSame(465, $status['port']);
        $this->assertSame('no-reply@tijum.com', $status['sender_identity']);
    }

    public function test_smtp_connection_verifier_sanitizes_errors(): void
    {
        $verifier = app(SmtpConnectionVerifier::class);

        $result = $verifier->checkConnection(
            host: 'invalid-host-which-does-not-exist.tijum-test.local',
            port: 465,
            password: 'secret_password_123'
        );

        $this->assertSame('failed', $result['status']);
        $this->assertStringNotContainsString('secret_password_123', (string) $result['sanitized_error']);
        $this->assertSame('failed', $result['checks']['dns_resolution']['status']);
    }

    public function test_smtp_connection_verifier_test_email_validation(): void
    {
        $verifier = app(SmtpConnectionVerifier::class);

        $invalid = $verifier->sendTestEmail('invalid-email-address');
        $this->assertFalse($invalid['success']);
        $this->assertSame('INVALID_RECIPIENT_EMAIL', $invalid['error']);
    }

    public function test_email_notification_channel_delivers_and_updates_status(): void
    {
        Mail::fake();

        $delivery = NotificationDelivery::query()->create([
            'event_id' => (string) Str::uuid(),
            'idempotency_key' => hash('sha256', 'test_key_1'),
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => 1,
            'channel' => NotificationChannel::Email,
            'category' => NotificationCategory::EssentialTransactional,
            'recipient_destination' => 'testguest@example.com',
            'status' => NotificationDeliveryStatus::Queued,
            'template_code' => 'customer.reservation.confirmed.email',
            'payload' => [
                'customer_name' => 'Aditi Rao',
                'booking_reference' => 'TIJ-TEST-1234',
                'property_name' => 'Sri Sai Nilayam',
                'check_in_date' => '25 Nov 2026',
                'checkout_date' => '30 Nov 2026',
                'amount' => '3500.00',
                'action_url' => 'https://tijum.com/reservations/123',
            ],
        ]);

        $channel = app(EmailNotificationChannel::class);
        $channel->send($delivery, [
            'title' => 'Your Stay is Confirmed — TIJ-TEST-1234',
            'body' => 'Your booking is confirmed.',
            'subject' => 'Booking Confirmed: TIJ-TEST-1234 | TIJUM',
            'safe_variables' => [],
        ]);

        $delivery->refresh();
        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->status);
        $this->assertSame('smtp', $delivery->provider);
        $this->assertNotNull($delivery->delivered_at);

        Mail::assertSent(TijumTransactionalMail::class, function (TijumTransactionalMail $mail) {
            return $mail->hasTo('testguest@example.com')
                && $mail->mailSubject === 'Booking Confirmed: TIJ-TEST-1234 | TIJUM';
        });
    }

    public function test_email_notification_channel_handles_invalid_recipient_gracefully(): void
    {
        Mail::fake();

        $delivery = NotificationDelivery::query()->create([
            'event_id' => (string) Str::uuid(),
            'idempotency_key' => hash('sha256', 'test_key_2'),
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => 1,
            'channel' => NotificationChannel::Email,
            'category' => NotificationCategory::EssentialTransactional,
            'recipient_destination' => 'not-an-email',
            'status' => NotificationDeliveryStatus::Queued,
            'template_code' => 'customer.reservation.confirmed.email',
            'payload' => [],
        ]);

        $channel = app(EmailNotificationChannel::class);
        $channel->send($delivery, [
            'title' => 'Test',
            'body' => 'Body',
            'subject' => 'Subject',
            'safe_variables' => [],
        ]);

        $delivery->refresh();
        $this->assertSame(NotificationDeliveryStatus::Failed, $delivery->status);
        $this->assertSame('INVALID_EMAIL', $delivery->error_code);
        $this->assertNotNull($delivery->failed_at);

        Mail::assertNothingSent();
    }

    public function test_send_notification_delivery_job_handles_priority_queue(): void
    {
        $deliveryHigh = NotificationDelivery::query()->create([
            'event_id' => (string) Str::uuid(),
            'idempotency_key' => hash('sha256', 'test_key_3'),
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => 1,
            'channel' => NotificationChannel::Email,
            'category' => NotificationCategory::EssentialTransactional,
            'recipient_destination' => 'user@example.com',
            'status' => NotificationDeliveryStatus::Queued,
            'template_code' => 'customer.auth.login_otp.email',
            'payload' => ['otp_code' => '123456'],
        ]);

        $jobHigh = new SendNotificationDeliveryJob($deliveryHigh);
        $this->assertSame(config('tijum.notifications.high_priority_queue', 'notifications_high'), $jobHigh->queue);

        $this->assertSame([10, 60, 300], $jobHigh->backoff());
        $this->assertSame(3, $jobHigh->tries);
    }

    public function test_admin_notification_provider_controller_endpoints(): void
    {
        $admin = $this->createAdminUser();

        // 1. Providers index page
        $response = $this->actingAs($admin, 'admin')->get('/admin/notifications/providers');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('admin/notifications/providers')
            ->has('providers.email')
            ->has('webhookStats')
        );

        // 2. Email verify endpoint
        $verifyRes = $this->actingAs($admin, 'admin')->postJson('/admin/notifications/providers/email/verify');
        $verifyRes->assertOk();
        $verifyRes->assertJsonStructure(['status', 'data', 'message']);

        // 3. Test email dispatch validation
        $testResInvalid = $this->actingAs($admin, 'admin')->postJson('/admin/notifications/providers/email/test-send', [
            'recipient_email' => 'invalid-email',
        ]);
        $testResInvalid->assertStatus(422);

        // 4. Test email dispatch with Mail fake
        Mail::fake();
        $testRes = $this->actingAs($admin, 'admin')->postJson('/admin/notifications/providers/email/test-send', [
            'recipient_email' => 'admin@tijum.com',
        ]);
        $testRes->assertOk();
        $testRes->assertJsonFragment(['success' => true]);
        Mail::assertSent(TijumTransactionalMail::class);
    }

    public function test_transactional_email_layout_and_branding(): void
    {
        $mailable = new TijumTransactionalMail(
            mailSubject: 'Booking Confirmed | TIJUM',
            title: 'Booking Confirmed — TIJ-HYD-001',
            bodyText: 'Your food-inclusive accommodation is confirmed.',
            actionUrl: 'https://tijum.com/reservations/1',
            actionText: 'View on TIJUM',
            details: [
                'Booking Reference' => 'TIJ-HYD-001',
                'Property' => 'HITEC City Residency',
                'Amount' => '₹4,500.00',
            ],
            unsubscribeUrl: 'https://tijum.com/account/notifications/preferences'
        );

        $html = $mailable->render();

        // Brand Palette Verification
        $this->assertStringContainsString('#442F41', $html); // Deep Plum
        $this->assertStringContainsString('#FF7A67', $html); // Coral
        $this->assertStringContainsString('#FFF4EE', $html); // Cream
        $this->assertStringContainsString('#E6E0DB', $html); // Neutral Surface
        $this->assertStringContainsString('#8B6B82', $html); // Muted Lavender

        // Typography & Logo Coloration Verification
        $this->assertStringContainsString('Montserrat', $html);
        $this->assertStringContainsString('Nunito', $html);
        $this->assertStringContainsString('Tiju<span class="logo-accent">m</span>', $html);
        $this->assertStringContainsString('Stay easy. Eat well. Spend less.', $html);

        // Content Verification
        $this->assertStringContainsString('Booking Confirmed — TIJ-HYD-001', $html);
        $this->assertStringContainsString('HITEC City Residency', $html);
        $this->assertStringContainsString('₹4,500.00', $html);
        $this->assertStringContainsString('https://tijum.com/reservations/1', $html);
        $this->assertStringContainsString('View on TIJUM', $html);
        $this->assertStringContainsString('grievance@tijum.com', $html);
        $this->assertStringContainsString('support@tijum.com', $html);
    }

    public function test_all_catalogue_events_have_valid_email_templates(): void
    {
        $catalogue = app(NotificationEventCatalogue::class);
        $registry = app(NotificationTemplateRegistry::class);

        $events = $catalogue->all();
        $emailEventsTested = 0;

        foreach ($events as $eventKey => $eventDef) {
            if (in_array(NotificationChannel::Email, $eventDef['channels'], true)) {
                $template = $registry->findForEventAndChannel($eventKey, NotificationChannel::Email);
                $this->assertNotNull($template, "Missing email template for catalogue event '{$eventKey}'");
                $this->assertSame(NotificationChannel::Email, $template->channel);
                $this->assertNotEmpty($template->title);
                $this->assertNotEmpty($template->bodyTemplate);
                $this->assertNotEmpty($template->subjectTemplate);
                $this->assertStringContainsString('TIJUM', (string) $template->subjectTemplate);
                $emailEventsTested++;
            }
        }

        $this->assertGreaterThanOrEqual(25, $emailEventsTested);
    }

    public function test_customer_user_and_owner_and_admin_auth_notifications_render_branded_views(): void
    {
        $user = User::factory()->create([
            'name' => 'Kavita Patel',
            'email' => 'kavita@example.com',
        ]);

        // Customer Verify Email
        $customerVerify = new CustomerVerifyEmailNotification;
        $customerVerifyMail = $customerVerify->toMail($user);
        $this->assertSame('emails.transactional', is_array($customerVerifyMail->view) ? $customerVerifyMail->view['html'] : $customerVerifyMail->view);
        $this->assertSame('Verify your TIJUM email address', $customerVerifyMail->subject);

        // Customer Reset Password
        $customerReset = new CustomerResetPasswordNotification('test-token-123');
        $customerResetMail = $customerReset->toMail($user);
        $this->assertSame('emails.transactional', is_array($customerResetMail->view) ? $customerResetMail->view['html'] : $customerResetMail->view);
        $this->assertSame('Reset your TIJUM account password', $customerResetMail->subject);

        // Owner Verify Email
        $owner = $this->createPartner();
        $ownerVerify = new OwnerVerifyEmailNotification;
        $ownerVerifyMail = $ownerVerify->toMail($owner);
        $this->assertSame('emails.transactional', is_array($ownerVerifyMail->view) ? $ownerVerifyMail->view['html'] : $ownerVerifyMail->view);

        // Owner Reset Password
        $ownerReset = new OwnerResetPasswordNotification('test-owner-token');
        $ownerResetMail = $ownerReset->toMail($owner);
        $this->assertSame('emails.transactional', is_array($ownerResetMail->view) ? $ownerResetMail->view['html'] : $ownerResetMail->view);

        // Admin Reset Password
        $admin = $this->createAdminUser();
        $adminReset = new AdminResetPasswordNotification('test-admin-token');
        $adminResetMail = $adminReset->toMail($admin);
        $this->assertSame('emails.transactional', is_array($adminResetMail->view) ? $adminResetMail->view['html'] : $adminResetMail->view);
    }
}
