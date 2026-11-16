<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Mail\TijumTransactionalMail;
use App\Services\Notifications\Channels\EmailNotificationChannel;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class EmailNotificationTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.email.enabled', true);
    }

    public function test_email_mailable_renders_html_and_text_with_brand_palette(): void
    {
        $mailable = new TijumTransactionalMail(
            mailSubject: 'Booking Confirmed: TIJ-HYD-1234',
            title: 'Your Reservation is Confirmed',
            bodyText: "Your booking for Green Valley PG is confirmed.\nCheck-in time is 09:00 AM.",
            actionUrl: 'https://tijum.com/reservations/TIJ-HYD-1234',
            actionText: 'View Reservation'
        );

        $renderedHtml = $mailable->render();

        $this->assertStringContainsString('Your Reservation is Confirmed', $renderedHtml);
        $this->assertStringContainsString('TIJ-HYD-1234', $renderedHtml);
        $this->assertStringContainsString('#FFF4EE', $renderedHtml); // Cream
        $this->assertStringContainsString('#442F41', $renderedHtml); // Deep Plum
        $this->assertStringContainsString('#FF7A67', $renderedHtml); // Coral
    }

    public function test_email_sanitizes_html_injection_in_variables(): void
    {
        $mailable = new TijumTransactionalMail(
            mailSubject: 'Test',
            title: 'Welcome',
            bodyText: 'Hello <script>alert("xss")</script> <b>World</b>'
        );

        $renderedHtml = $mailable->render();

        $this->assertStringNotContainsString('<script>', $renderedHtml);
    }

    public function test_email_channel_sends_via_mail_facade(): void
    {
        Mail::fake();

        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-MAIL-1'],
            idempotencyKey: 'mail_send_test'
        );

        $delivery = collect($deliveries)->firstWhere('channel', NotificationChannel::Email);
        $this->assertNotNull($delivery);

        // Run the channel send
        app(EmailNotificationChannel::class)->send($delivery, [
            'title' => 'Reservation Submitted',
            'body' => 'Your reservation TIJ-MAIL-1 was submitted.',
            'subject' => 'Reservation Submitted: TIJ-MAIL-1',
        ]);

        Mail::assertSent(TijumTransactionalMail::class, function (TijumTransactionalMail $mail) use ($customer) {
            return $mail->hasTo($customer->email);
        });

        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
    }
}
