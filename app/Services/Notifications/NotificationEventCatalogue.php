<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;

class NotificationEventCatalogue
{
    /**
     * @return array<string, array{
     *     name: string,
     *     recipient_role: string,
     *     category: NotificationCategory,
     *     channels: list<NotificationChannel>,
     *     description: string,
     *     requires_consent: bool
     * }>
     */
    public function all(): array
    {
        return [
            // ==========================================
            // Customer Authentication & Security
            // ==========================================
            'auth.account_verification' => [
                'name' => 'Email Account Verification',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::Email],
                'description' => 'Dispatched upon registration or email update with secure verification action link.',
                'requires_consent' => false,
            ],
            'auth.registration_otp' => [
                'name' => 'Customer Registration OTP',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::Email, NotificationChannel::Sms],
                'description' => 'Dispatched during registration flow with 6-digit one-time verification passcode.',
                'requires_consent' => false,
            ],
            'auth.login_otp' => [
                'name' => 'Customer Login OTP',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::Email, NotificationChannel::Sms],
                'description' => 'Dispatched during passwordless or two-factor login verification.',
                'requires_consent' => false,
            ],
            'auth.password_reset' => [
                'name' => 'Password Reset Request',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::Email],
                'description' => 'Dispatched with time-limited secure link to reset account credentials.',
                'requires_consent' => false,
            ],
            'auth.security_alert' => [
                'name' => 'Account Security Alert',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched upon suspicious access, password changes, or MFA modifications.',
                'requires_consent' => false,
            ],

            // ==========================================
            // Customer Reservations & Payments
            // ==========================================
            'reservation.submitted' => [
                'name' => 'Reservation Request Submitted',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms, NotificationChannel::WhatsApp],
                'description' => 'Dispatched when customer submits a new accommodation reservation request.',
                'requires_consent' => false,
            ],
            'reservation.payment_required' => [
                'name' => 'Payment Required',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms, NotificationChannel::WhatsApp],
                'description' => 'Dispatched with 15-minute checkout deadline and payment action link.',
                'requires_consent' => false,
            ],
            'reservation.payment_deadline_reminder' => [
                'name' => 'Payment Deadline Reminder',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms, NotificationChannel::WhatsApp],
                'description' => 'Sent approximately 5 minutes before the 15-minute checkout window closes.',
                'requires_consent' => false,
            ],
            'reservation.payment_expired' => [
                'name' => 'Payment Window Expired',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when payment deadline passes without capture.',
                'requires_consent' => false,
            ],
            'reservation.confirmed' => [
                'name' => 'Booking Confirmed (Paid)',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms, NotificationChannel::WhatsApp],
                'description' => 'Dispatched when payment is captured and accommodation stay is confirmed.',
                'requires_consent' => false,
            ],
            'payment.captured' => [
                'name' => 'Payment Captured & Receipt',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched with transaction receipt details when payment is confirmed.',
                'requires_consent' => false,
            ],
            'payment.failed' => [
                'name' => 'Payment Failed',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms],
                'description' => 'Dispatched when online checkout attempt fails.',
                'requires_consent' => false,
            ],
            'reservation.cancelled' => [
                'name' => 'Reservation Cancelled',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms],
                'description' => 'Dispatched when booking is cancelled by guest, host, or admin.',
                'requires_consent' => false,
            ],
            'reservation.upcoming_stay' => [
                'name' => 'Upcoming Stay Reminder',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::WhatsApp],
                'description' => 'Sent 24 hours prior to 09:00 AM check-in date.',
                'requires_consent' => true,
            ],
            'refund.initiated' => [
                'name' => 'Refund Initiated',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when a cancellation or customer protection refund is approved and submitted.',
                'requires_consent' => false,
            ],
            'refund.completed' => [
                'name' => 'Refund Completed',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms],
                'description' => 'Dispatched when online refund completes through payment provider.',
                'requires_consent' => false,
            ],
            'review.invitation' => [
                'name' => 'Verified Review Invitation',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Sent after 08:00 AM checkout date when stay becomes review-eligible.',
                'requires_consent' => true,
            ],

            // ==========================================
            // Customer Grievances & Protection
            // ==========================================
            'grievance.acknowledged' => [
                'name' => 'Customer Grievance Acknowledged',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched with unique Case Reference when a customer protection issue is lodged.',
                'requires_consent' => false,
            ],
            'grievance.status_updated' => [
                'name' => 'Grievance Status Updated',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when investigation progresses, mediation notes are logged, or info requested.',
                'requires_consent' => false,
            ],
            'grievance.resolved' => [
                'name' => 'Grievance Case Resolved',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when a case is resolved with outcome details or refund determination.',
                'requires_consent' => false,
            ],
            'grievance.escalated' => [
                'name' => 'Grievance Case Escalated',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when case is escalated to Senior Grievance Redressal Officer.',
                'requires_consent' => false,
            ],

            // ==========================================
            // Rewards & Loyalty
            // ==========================================
            'rewards.coupon_qualified' => [
                'name' => 'Coupon Reward Qualification',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when a customer unlocks a discount coupon code.',
                'requires_consent' => true,
            ],
            'rewards.referral_attributed' => [
                'name' => 'Friend Joined via Referral',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when an invited friend registers using your unique referral code.',
                'requires_consent' => true,
            ],
            'rewards.referral_points_credited' => [
                'name' => 'Referral Reward Points Credited',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when referral reward points are added to the customer wallet.',
                'requires_consent' => true,
            ],
            'rewards.points_credited' => [
                'name' => 'Stay Loyalty Points Credited',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when completed stay earns cashback/loyalty points.',
                'requires_consent' => true,
            ],
            'rewards.points_expiring' => [
                'name' => 'Points Expiry Warning',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched 30 days prior to unredeemed loyalty points expiration.',
                'requires_consent' => true,
            ],
            'rewards.points_redeemed' => [
                'name' => 'Points Redemption Confirmation',
                'recipient_role' => 'customer',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when loyalty points are redeemed against accommodation payment.',
                'requires_consent' => false,
            ],

            // ==========================================
            // Partner / Owner Operations
            // ==========================================
            'partner.reservation_received' => [
                'name' => 'New Reservation Received',
                'recipient_role' => 'partner',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms, NotificationChannel::WhatsApp],
                'description' => 'Dispatched to property owner when guest submits a booking hold.',
                'requires_consent' => false,
            ],
            'partner.reservation_confirmed' => [
                'name' => 'Reservation Confirmed & Paid',
                'recipient_role' => 'partner',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email, NotificationChannel::Sms, NotificationChannel::WhatsApp],
                'description' => 'Dispatched to host when guest successfully pays for accepted booking.',
                'requires_consent' => false,
            ],
            'partner.payment_confirmed' => [
                'name' => 'Guest Payment Confirmed',
                'recipient_role' => 'partner',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched to host with stay financial breakdown upon guest payment capture.',
                'requires_consent' => false,
            ],
            'partner.upcoming_checkin' => [
                'name' => 'Upcoming Guest Arrival Tomorrow',
                'recipient_role' => 'partner',
                'category' => NotificationCategory::OperationalUpdate,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Sent to host 24 hours prior to scheduled guest check-in (09:00 AM IST).',
                'requires_consent' => false,
            ],
            'partner.settlement_available' => [
                'name' => 'Settlement Statement Ready',
                'recipient_role' => 'partner',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when a periodic payout settlement statement is generated.',
                'requires_consent' => false,
            ],
            'partner.transfer_completed' => [
                'name' => 'Settlement Transfer Completed',
                'recipient_role' => 'partner',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when partner bank payout transfer succeeds.',
                'requires_consent' => false,
            ],

            // ==========================================
            // Admin Operations
            // ==========================================
            'admin.customer_protection_urgent' => [
                'name' => 'Urgent Safety / Protection Escalation',
                'recipient_role' => 'admin',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched to operations administrators for safety or high-priority disputes.',
                'requires_consent' => false,
            ],
            'admin.payment_exception' => [
                'name' => 'Payment Gateway Discrepancy',
                'recipient_role' => 'admin',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when payment capture encounters unexpected gateway error.',
                'requires_consent' => false,
            ],
            'admin.notification_provider_failure' => [
                'name' => 'Notification Gateway Outage',
                'recipient_role' => 'admin',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched when an external delivery provider is persistently failing.',
                'requires_consent' => false,
            ],
            'admin.security_alert' => [
                'name' => 'Admin Security & Access Alert',
                'recipient_role' => 'admin',
                'category' => NotificationCategory::EssentialTransactional,
                'channels' => [NotificationChannel::InApp, NotificationChannel::Email],
                'description' => 'Dispatched to Super Admins upon administrative role change or security escalation.',
                'requires_consent' => false,
            ],
        ];
    }

    /**
     * @return array{
     *     name: string,
     *     recipient_role: string,
     *     category: NotificationCategory,
     *     channels: list<NotificationChannel>,
     *     description: string,
     *     requires_consent: bool
     * }|null
     */
    public function get(string $eventType): ?array
    {
        return $this->all()[$eventType] ?? null;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function byRole(string $role): array
    {
        return array_filter($this->all(), static fn ($e): bool => $e['recipient_role'] === $role);
    }
}
