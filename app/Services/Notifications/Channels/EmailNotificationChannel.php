<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\AdminRole;
use App\Enums\NotificationCategory;
use App\Enums\NotificationDeliveryStatus;
use App\Mail\TijumTransactionalMail;
use App\Models\NotificationDelivery;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EmailNotificationChannel
{
    private static bool $dispatchingFailureAlert = false;

    /**
     * @param  array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}  $rendered
     */
    public function send(NotificationDelivery $delivery, array $rendered): void
    {
        $destination = $delivery->recipient_destination;
        if (! is_string($destination) || ! filter_var($destination, FILTER_VALIDATE_EMAIL)) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'INVALID_EMAIL',
                'error_description' => 'Recipient destination is not a valid email address.',
                'failed_at' => now(),
            ]);

            return;
        }

        $subject = $rendered['subject'] ?? $rendered['title'];
        $actionUrl = $delivery->payload['action_url'] ?? null;
        $actionText = $delivery->payload['action_text'] ?? ($actionUrl !== null ? 'View on TIJUM' : null);

        $replyTo = $this->resolveReplyTo($delivery);

        // Include List-Unsubscribe for operational update emails
        $unsubscribeUrl = null;
        if ($delivery->category === NotificationCategory::OperationalUpdate && $delivery->notifiable_id) {
            $unsubscribeUrl = url('/account/notifications/preferences');
        }

        $mailable = new TijumTransactionalMail(
            mailSubject: $subject,
            title: $rendered['title'],
            bodyText: $rendered['body'],
            actionUrl: $actionUrl,
            actionText: $actionText,
            details: $this->buildDetailsList($delivery),
            replyToEmail: $replyTo['email'],
            replyToName: $replyTo['name'],
            unsubscribeUrl: $unsubscribeUrl,
        );

        try {
            Mail::to($destination)->send($mailable);

            $delivery->update([
                'status' => NotificationDeliveryStatus::Delivered,
                'provider' => config('mail.default', 'smtp'),
                'provider_message_id' => 'mail_'.substr(md5($delivery->idempotency_key), 0, 16),
                'delivered_at' => now(),
            ]);

            Log::info("EmailNotificationChannel: successfully delivered delivery #{$delivery->id} to {$destination}");
        } catch (Throwable $e) {
            $sanitizedError = $this->sanitizeErrorMessage(
                $e->getMessage(),
                (string) config('mail.mailers.smtp.password', '')
            );

            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'MAIL_TRANSPORT_ERROR',
                'error_description' => $sanitizedError,
                'failed_at' => now(),
            ]);

            Log::error("EmailNotificationChannel delivery #{$delivery->id} failed: {$sanitizedError}");

            if (! str_starts_with((string) $delivery->template_code, 'admin.notification_provider_failure')
                && ! self::$dispatchingFailureAlert) {
                $this->notifyAdminsOfProviderFailure($delivery, $sanitizedError);
            }
        }
    }

    private function notifyAdminsOfProviderFailure(NotificationDelivery $delivery, string $sanitizedError): void
    {
        self::$dispatchingFailureAlert = true;

        try {
            app(NotificationDispatcher::class)->dispatchToAdmins(
                eventType: 'admin.notification_provider_failure',
                variables: [
                    'channel' => 'email',
                    'provider' => (string) config('mail.default', 'smtp'),
                    'error_description' => $sanitizedError,
                    'delivery_reference' => (string) ($delivery->event_id ?: $delivery->id),
                    'created_at' => now('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'action_url' => url('/admin/notifications/providers'),
                ],
                related: $delivery,
                relatedReference: (string) $delivery->id,
                requiredRole: AdminRole::SuperAdmin,
                idempotencySeed: 'email_provider_failure_'.now()->format('YmdH'),
            );
        } catch (Throwable) {
            // Do not cascade failure if fallback dispatch fails
        } finally {
            self::$dispatchingFailureAlert = false;
        }
    }

    /**
     * Resolve the functional department email for Reply-To based on notification context.
     *
     * @return array{email: string, name: string}
     */
    private function resolveReplyTo(NotificationDelivery $delivery): array
    {
        $code = $delivery->template_code ?? '';
        $mailboxes = config('tijum.notifications.channels.email.mailboxes', []);

        if (str_contains($code, 'grievance') || str_contains($code, 'protection')) {
            return [
                'email' => $mailboxes['grievance'] ?? 'grievance@tijum.com',
                'name' => 'TIJUM Grievance Redressal Cell',
            ];
        }

        if (str_contains($code, 'reservation') || str_contains($code, 'booking')) {
            return [
                'email' => $mailboxes['bookings'] ?? 'bookings@tijum.com',
                'name' => 'TIJUM Bookings Desk',
            ];
        }

        if (str_contains($code, 'admin') || str_contains($code, 'security')) {
            return [
                'email' => $mailboxes['admin'] ?? 'admin@tijum.com',
                'name' => 'TIJUM Security & Administration',
            ];
        }

        return [
            'email' => $mailboxes['support'] ?? 'support@tijum.com',
            'name' => 'TIJUM Customer Support',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function buildDetailsList(NotificationDelivery $delivery): array
    {
        $payload = $delivery->payload ?? [];
        $details = [];

        if (! empty($payload['otp_code'])) {
            $details['Verification Code'] = (string) $payload['otp_code'];
        }
        if (! empty($payload['booking_reference'])) {
            $details['Booking Reference'] = (string) $payload['booking_reference'];
        }
        if (! empty($payload['property_name'])) {
            $details['Property'] = (string) $payload['property_name'];
        }
        if (! empty($payload['property_address'])) {
            $details['Property Address'] = (string) $payload['property_address'];
        }
        if (! empty($payload['room_type'])) {
            $details['Room Type'] = (string) $payload['room_type'];
        }
        if (! empty($payload['guest_count'])) {
            $details['Guests'] = (string) $payload['guest_count'];
        }
        if (! empty($payload['check_in_date'])) {
            $details['Check-in Date'] = (string) $payload['check_in_date'];
        }
        if (! empty($payload['check_in_time'])) {
            $details['Check-in Time'] = (string) $payload['check_in_time'];
        }
        if (! empty($payload['checkout_date'])) {
            $details['Checkout Date'] = (string) $payload['checkout_date'];
        }
        if (! empty($payload['checkout_time'])) {
            $details['Checkout Time'] = (string) $payload['checkout_time'];
        }
        if (! empty($payload['amount'])) {
            $amountStr = (string) $payload['amount'];
            $details['Amount'] = is_numeric($payload['amount'])
                ? '₹'.number_format((float) $payload['amount'], 2)
                : (str_starts_with($amountStr, '₹') || str_starts_with($amountStr, 'INR') ? $amountStr : 'INR '.$amountStr);
        }
        if (! empty($payload['payment_reference'])) {
            $details['Payment Reference'] = (string) $payload['payment_reference'];
        }
        if (! empty($payload['payment_method'])) {
            $details['Payment Method'] = ucfirst((string) $payload['payment_method']);
        }
        if (! empty($payload['captured_at'])) {
            $details['Captured At'] = (string) $payload['captured_at'];
        }
        if (! empty($payload['payment_deadline'])) {
            $details['Payment Deadline'] = (string) $payload['payment_deadline'];
        }
        if (! empty($payload['cancelled_at'])) {
            $details['Cancelled At'] = (string) $payload['cancelled_at'];
        }
        if (! empty($payload['cancellation_reason'])) {
            $details['Cancellation Reason'] = (string) $payload['cancellation_reason'];
        }
        if (! empty($payload['refund_reference'])) {
            $details['Refund Reference'] = (string) $payload['refund_reference'];
        }
        if (! empty($payload['refund_status'])) {
            $details['Refund Status'] = (string) $payload['refund_status'];
        }
        if (! empty($payload['initiated_at'])) {
            $details['Initiated At'] = (string) $payload['initiated_at'];
        }
        if (! empty($payload['completed_at'])) {
            $details['Completed At'] = (string) $payload['completed_at'];
        }
        if (! empty($payload['case_reference'])) {
            $details['Case Reference'] = (string) $payload['case_reference'];
        }
        if (! empty($payload['case_status'])) {
            $details['Grievance Status'] = ucfirst(str_replace('_', ' ', (string) $payload['case_status']));
        }
        if (! empty($payload['ticket_reference'])) {
            $details['Ticket Reference'] = (string) $payload['ticket_reference'];
        }
        if (! empty($payload['ticket_status'])) {
            $details['Ticket Status'] = ucfirst(str_replace('_', ' ', (string) $payload['ticket_status']));
        }
        if (! empty($payload['coupon_code'])) {
            $details['Coupon Code'] = (string) $payload['coupon_code'];
        }
        if (! empty($payload['submission_reference'])) {
            $details['Submission Reference'] = (string) $payload['submission_reference'];
        }
        if (! empty($payload['settlement_reference'])) {
            $details['Settlement Reference'] = (string) $payload['settlement_reference'];
        }
        if (! empty($payload['transfer_reference'])) {
            $details['Transfer Reference'] = (string) $payload['transfer_reference'];
        }
        if (! empty($payload['points_credited'])) {
            $details['Points Credited'] = (string) $payload['points_credited'].' pts';
        }
        if (! empty($payload['points_redeemed'])) {
            $details['Points Redeemed'] = (string) $payload['points_redeemed'].' pts';
        }
        if (! empty($payload['monetary_value'])) {
            $details['Discount Value'] = (string) $payload['monetary_value'];
        }
        if (! empty($payload['expiring_points'])) {
            $details['Expiring Points'] = (string) $payload['expiring_points'].' pts';
        }
        if (! empty($payload['points_balance'])) {
            $details['Available Points'] = (string) $payload['points_balance'].' pts';
        }
        if (! empty($payload['referral_code'])) {
            $details['Referral Code'] = (string) $payload['referral_code'];
        }
        if (! empty($payload['expires_at'])) {
            $details['Expires At'] = (string) $payload['expires_at'];
        }

        return $details;
    }

    private function sanitizeErrorMessage(string $message, string $password): string
    {
        if ($password !== '') {
            $message = str_replace($password, '********', $message);
        }

        $sanitized = (string) preg_replace('/password=[^\s&]+/i', 'password=********', $message);
        $sanitized = (string) preg_replace('/([a-zA-Z0-9_\-\.]+):([^\s@]+)@/i', '$1:********@', $sanitized);

        return substr($sanitized, 0, 500);
    }
}
