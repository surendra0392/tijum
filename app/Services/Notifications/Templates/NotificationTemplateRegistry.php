<?php

declare(strict_types=1);

namespace App\Services\Notifications\Templates;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;

class NotificationTemplateRegistry
{
    /**
     * @var array<string, TemplateDefinition>|null
     */
    private ?array $templates = null;

    /**
     * @return array<string, TemplateDefinition>
     */
    public function all(): array
    {
        if ($this->templates !== null) {
            return $this->templates;
        }

        $list = $this->buildDefinitions();
        $this->templates = [];
        foreach ($list as $tpl) {
            $this->templates[$tpl->code] = $tpl;
        }

        return $this->templates;
    }

    public function get(string $code): ?TemplateDefinition
    {
        return $this->all()[$code] ?? null;
    }

    public function findForEventAndChannel(string $eventType, NotificationChannel $channel): ?TemplateDefinition
    {
        foreach ($this->all() as $tpl) {
            if ($tpl->eventType === $eventType && $tpl->channel === $channel) {
                return $tpl;
            }
        }

        // Fall back to InApp template for Push channel if no explicit push template is defined
        if ($channel === NotificationChannel::Push) {
            return $this->findForEventAndChannel($eventType, NotificationChannel::InApp);
        }

        return null;
    }

    /**
     * @return list<TemplateDefinition>
     */
    public function allForChannel(NotificationChannel $channel): array
    {
        return array_values(array_filter(
            $this->all(),
            static fn (TemplateDefinition $t): bool => $t->channel === $channel
        ));
    }

    /**
     * @return list<TemplateDefinition>
     */
    private function buildDefinitions(): array
    {
        return [
            // ==========================================
            // CATEGORY A: CUSTOMER AUTHENTICATION & SECURITY
            // ==========================================
            new TemplateDefinition(
                code: 'customer.auth.account_verification.email',
                eventType: 'auth.account_verification',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Verify Your TIJUM Email Address',
                bodyTemplate: "Hello {customer_name},\n\nThank you for registering with TIJUM — verified stays with upfront pricing and property-specific food clarity.\n\nPlease verify your email address to activate your account privileges. This verification link expires at {expires_at}.\n\nIf you did not create a TIJUM account, you can safely ignore this email or contact support@tijum.com.",
                subjectTemplate: 'Verify Your Email Address | TIJUM',
                approvedVariables: ['customer_name', 'action_url', 'expires_at'],
                optionalVariables: ['expires_at' => '60 minutes'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.registration_otp.email',
                eventType: 'auth.registration_otp',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Your Registration One-Time Passcode (OTP)',
                bodyTemplate: "Hello {customer_name},\n\nYour one-time verification code to complete registration on TIJUM is:\n\n{otp_code}\n\nExpires: {expires_at}. For your security, never share this code with anyone, including TIJUM staff.",
                subjectTemplate: 'TIJUM Account Registration Verification Code',
                approvedVariables: ['customer_name', 'otp_code', 'expires_at', 'action_url'],
                optionalVariables: ['action_url' => ''],
            ),
            new TemplateDefinition(
                code: 'customer.auth.login_otp.email',
                eventType: 'auth.login_otp',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Your Secure Sign-In Passcode',
                bodyTemplate: "Hello {customer_name},\n\nUse the following one-time verification code to sign in to your TIJUM account:\n\n{otp_code}\n\nExpires: {expires_at}. Never share this passcode. If you did not request this sign-in, secure your account immediately or contact admin@tijum.com.",
                subjectTemplate: 'TIJUM Secure Sign-In Verification Code',
                approvedVariables: ['customer_name', 'otp_code', 'expires_at', 'action_url'],
                optionalVariables: ['action_url' => ''],
            ),
            new TemplateDefinition(
                code: 'customer.auth.password_reset.email',
                eventType: 'auth.password_reset',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reset Your Account Password',
                bodyTemplate: "Hello {customer_name},\n\nWe received a request to reset the password for your TIJUM account.\n\nClick the button below to choose a new password. This reset link expires at {expires_at}.\n\nIf you did not request a password reset, your password has not been changed and no further action is needed.",
                subjectTemplate: 'Reset Your TIJUM Account Password',
                approvedVariables: ['customer_name', 'action_url', 'expires_at'],
                optionalVariables: ['expires_at' => '60 minutes'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.security_alert.email',
                eventType: 'auth.security_alert',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Security Alert: Account Activity Detected',
                bodyTemplate: "Hello {customer_name},\n\nAn important security change occurred on your TIJUM account:\n\nActivity: {reason}\nTime: {created_at}\n\nIf this was you, no action is needed. If you did not authorize this activity, reset your password immediately or contact admin@tijum.com.",
                subjectTemplate: 'Security Alert: Activity on Your TIJUM Account',
                approvedVariables: ['customer_name', 'reason', 'created_at', 'action_url'],
                optionalVariables: ['action_url' => ''],
            ),
            new TemplateDefinition(
                code: 'customer.auth.security_alert.in_app',
                eventType: 'auth.security_alert',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Account Security Alert',
                bodyTemplate: 'Security update ({created_at}): {reason}. Review your account activity.',
                approvedVariables: ['customer_name', 'reason', 'created_at', 'action_url'],
                optionalVariables: ['action_url' => ''],
            ),
            new TemplateDefinition(
                code: 'customer.auth.security_alert.push',
                eventType: 'auth.security_alert',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Security Alert',
                bodyTemplate: 'Security activity was detected on your TIJUM account. Open the app to review.',
                approvedVariables: ['action_url'],
            ),

            // ==========================================
            // CATEGORY B: CUSTOMER RESERVATIONS & PAYMENTS
            // ==========================================
            // B01: Reservation submitted / payment hold created
            new TemplateDefinition(
                code: 'customer.reservation.submitted.in_app',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Hold Awaiting Payment',
                bodyTemplate: 'Hold {booking_reference} at {property_name} ({room_type}) is awaiting payment. Pay {amount} before {payment_deadline} to confirm.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'room_type', 'check_in_date', 'checkout_date', 'amount', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.email',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Complete Payment to Confirm Hold — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour inventory hold {booking_reference} for {property_name} ({room_type}) is awaiting payment and is NOT yet confirmed.\n\nStay Dates: {check_in_date} to {checkout_date}\nPayable Amount: {amount}\nPayment Deadline: {payment_deadline}\n\nPlease complete checkout within the 15-minute payment window to lock in your stay automatically.",
                subjectTemplate: 'Complete Payment for Hold {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'room_type', 'check_in_date', 'checkout_date', 'amount', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.push',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Complete Payment to Confirm Stay',
                bodyTemplate: 'Your hold {booking_reference} at {property_name} expires at {payment_deadline}. Pay now to confirm.',
                approvedVariables: ['booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.sms',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Hold Created',
                bodyTemplate: 'TIJUM: Hold {booking_reference} at {property_name} awaits payment before {payment_deadline}. Pay: {action_url}',
                dltTemplateId: '1407161234567000001',
                approvedVariables: ['booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.whatsapp',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Hold Created',
                bodyTemplate: 'Hello {customer_name}, your inventory hold {booking_reference} at {property_name} awaits payment until {payment_deadline}. Complete checkout: {action_url}',
                metaTemplateName: 'tijum_reservation_submitted',
                metaCategory: 'UTILITY',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),

            // B02: Payment required
            new TemplateDefinition(
                code: 'customer.reservation.payment_required.in_app',
                eventType: 'reservation.payment_required',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Required ({amount})',
                bodyTemplate: 'Booking {booking_reference} at {property_name} is awaiting payment of {amount}. Complete checkout by {payment_deadline}.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_required.email',
                eventType: 'reservation.payment_required',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Action Required: Complete Payment for {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour booking hold for {property_name} ({booking_reference}) requires payment confirmation.\n\nPayable Amount: {amount}\nPayment Deadline: {payment_deadline} (15-minute inventory hold window)\n\nPlease complete checkout before the timer expires to confirm your booking.",
                subjectTemplate: 'Action Required: Pay for Booking {booking_reference} at {property_name} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_required.push',
                eventType: 'reservation.payment_required',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Open',
                bodyTemplate: 'Complete payment of {amount} for {booking_reference} before {payment_deadline}.',
                approvedVariables: ['booking_reference', 'amount', 'payment_deadline', 'action_url'],
            ),

            // B03: Payment deadline reminder
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.in_app',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Closing Soon',
                bodyTemplate: 'Your payment window for booking {booking_reference} at {property_name} closes at {payment_deadline}. Pay now to secure your stay.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.email',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Urgent: Payment Window Closing Soon for {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour 15-minute inventory payment window for {property_name} ({booking_reference}) closes at {payment_deadline}.\n\nIf payment is not completed before this deadline, the hold will expire and inventory will be released automatically.",
                subjectTemplate: 'Urgent: Payment Window Closing for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.push',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Hurry: Payment Window Closing',
                bodyTemplate: 'Hold {booking_reference} expires at {payment_deadline}. Complete payment now.',
                approvedVariables: ['booking_reference', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.sms',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Reminder',
                bodyTemplate: 'TIJUM: Payment window for {booking_reference} at {property_name} expires at {payment_deadline}. Complete now: {action_url}',
                dltTemplateId: '1407161234567000003',
                approvedVariables: ['booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.whatsapp',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Closing Soon',
                bodyTemplate: 'TIJUM Reminder: Your payment deadline for booking {booking_reference} at {property_name} expires at {payment_deadline}. Pay now: {action_url}',
                metaTemplateName: 'tijum_payment_reminder',
                metaCategory: 'UTILITY',
                approvedVariables: ['booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),

            // B04: Payment window expired
            new TemplateDefinition(
                code: 'customer.reservation.payment_expired.in_app',
                eventType: 'reservation.payment_expired',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Expired',
                bodyTemplate: 'The payment window for reservation {booking_reference} at {property_name} expired at {expired_at} and held inventory was released.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'expired_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_expired.email',
                eventType: 'reservation.payment_expired',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Expired — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThe 15-minute checkout window for reservation {booking_reference} at {property_name} expired at {expired_at} without completed payment.\n\nThe inventory hold has been released back to the marketplace. You may start a new booking anytime.",
                subjectTemplate: 'Payment Window Expired: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'expired_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_expired.push',
                eventType: 'reservation.payment_expired',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Hold Expired',
                bodyTemplate: 'Payment window for {booking_reference} expired and inventory was released.',
                approvedVariables: ['booking_reference', 'action_url'],
            ),

            // B05: Reservation confirmed
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.in_app',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Confirmed',
                bodyTemplate: 'Your reservation {booking_reference} at {property_name} ({room_type}) is confirmed for {check_in_date} to {checkout_date}.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'room_type', 'check_in_date', 'checkout_date', 'check_in_time', 'checkout_time', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.email',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Your Stay is Confirmed — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour payment of {amount} has been captured and your stay at {property_name} ({room_type}) is officially confirmed!\n\nCheck-in: {check_in_date} from {check_in_time}\nCheckout: {checkout_date} by {checkout_time}\n\nThank you for booking with TIJUM.",
                subjectTemplate: 'Booking Confirmed: {booking_reference} at {property_name} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'room_type', 'check_in_date', 'checkout_date', 'check_in_time', 'checkout_time', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.push',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Confirmed',
                bodyTemplate: 'Stay {booking_reference} at {property_name} is confirmed for {check_in_date}.',
                approvedVariables: ['booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.sms',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Confirmed',
                bodyTemplate: 'TIJUM: Payment received for booking {booking_reference} at {property_name}. Check-in: {check_in_date}. Details: {action_url}',
                dltTemplateId: '1407161234567000004',
                approvedVariables: ['booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.whatsapp',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Confirmed',
                bodyTemplate: 'Hello {customer_name}, your booking {booking_reference} for {property_name} is confirmed! Check-in: {check_in_date}. View voucher: {action_url}',
                metaTemplateName: 'tijum_booking_confirmed',
                metaCategory: 'UTILITY',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),

            // B06: Payment captured / receipt
            new TemplateDefinition(
                code: 'customer.payment.captured.in_app',
                eventType: 'payment.captured',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Receipt Available',
                bodyTemplate: 'Captured payment of {amount} (Ref: {payment_reference}) for booking {booking_reference} at {property_name}.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'payment_reference', 'payment_method', 'captured_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.payment.captured.email',
                eventType: 'payment.captured',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Receipt — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThis is your official payment receipt confirming {amount} was captured successfully.\n\nBooking Reference: {booking_reference}\nProperty: {property_name}\nPayment Reference: {payment_reference}\nPayment Method: {payment_method}\nCaptured At: {captured_at}\n\nYou can view your complete transaction summary anytime in your TIJUM account.",
                subjectTemplate: 'Payment Receipt: {amount} for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'payment_reference', 'payment_method', 'captured_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.payment.captured.push',
                eventType: 'payment.captured',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Received',
                bodyTemplate: 'Payment of {amount} captured for booking {booking_reference}.',
                approvedVariables: ['amount', 'booking_reference', 'action_url'],
            ),

            // B07: Payment failed
            new TemplateDefinition(
                code: 'customer.payment.failed.in_app',
                eventType: 'payment.failed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Attempt Unsuccessful',
                bodyTemplate: 'Payment of {amount} for booking {booking_reference} at {property_name} did not succeed: {failure_reason}',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'failure_reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.payment.failed.email',
                eventType: 'payment.failed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Attempt Unsuccessful — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour payment attempt of {amount} for {property_name} ({booking_reference}) could not be completed.\n\nStatus Note: {failure_reason}\n\nIf funds were debited by your bank, they reverse automatically per your bank's schedule. You can retry payment while your checkout window remains active.",
                subjectTemplate: 'Payment Attempt Unsuccessful: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'failure_reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.payment.failed.push',
                eventType: 'payment.failed',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Unsuccessful',
                bodyTemplate: 'Your payment attempt for {booking_reference} failed. Tap to retry.',
                approvedVariables: ['booking_reference', 'action_url'],
            ),

            // B08: Reservation cancelled
            new TemplateDefinition(
                code: 'customer.reservation.cancelled.in_app',
                eventType: 'reservation.cancelled',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Cancelled',
                bodyTemplate: 'Reservation {booking_reference} for {property_name} was cancelled ({cancelled_at}). Reason: {cancellation_reason}. {refund_status}',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'cancellation_reason', 'cancelled_at', 'refund_status', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.cancelled.email',
                eventType: 'reservation.cancelled',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Cancellation Notice — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour reservation {booking_reference} for {property_name} has been cancelled at {cancelled_at}.\n\nReason: {cancellation_reason}\nRefund Status: {refund_status}\n\nAny applicable refund or protection review is tracked directly in your TIJUM account.",
                subjectTemplate: 'Reservation Cancelled: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'cancellation_reason', 'cancelled_at', 'refund_status', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.cancelled.push',
                eventType: 'reservation.cancelled',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Cancelled',
                bodyTemplate: 'Reservation {booking_reference} at {property_name} has been cancelled.',
                approvedVariables: ['booking_reference', 'property_name', 'action_url'],
            ),

            // B09: Upcoming stay reminder
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.in_app',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Upcoming Stay Tomorrow',
                bodyTemplate: 'Your stay at {property_name} begins tomorrow ({check_in_date} at {check_in_time}). Reference: {booking_reference}.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'property_address', 'check_in_date', 'check_in_time', 'contact_information', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.email',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Your Stay at {property_name} Begins Tomorrow',
                bodyTemplate: "Hello {customer_name},\n\nThis is a reminder that your stay at {property_name} begins tomorrow!\n\nBooking Reference: {booking_reference}\nCheck-in: {check_in_date} from {check_in_time}\nAddress: {property_address}\nContact: {contact_information}\n\nOpen your dashboard for check-in details and food timings.",
                subjectTemplate: 'Upcoming Stay Reminder: {property_name} ({check_in_date}) | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'property_address', 'check_in_date', 'check_in_time', 'contact_information', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.push',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Upcoming Stay Tomorrow',
                bodyTemplate: 'Check-in at {property_name} is tomorrow ({check_in_date} from {check_in_time}).',
                approvedVariables: ['property_name', 'check_in_date', 'check_in_time', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.whatsapp',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Upcoming Stay Reminder',
                bodyTemplate: 'Hello {customer_name}, reminder that your stay at {property_name} begins tomorrow ({check_in_date}) at {check_in_time}. Booking: {booking_reference}. View details: {action_url}',
                metaTemplateName: 'tijum_upcoming_stay',
                metaCategory: 'UTILITY',
                approvedVariables: ['customer_name', 'property_name', 'check_in_date', 'check_in_time', 'booking_reference', 'action_url'],
            ),

            // B10: Refund initiated
            new TemplateDefinition(
                code: 'customer.refund.initiated.in_app',
                eventType: 'refund.initiated',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Initiated',
                bodyTemplate: 'A refund of {amount} for reservation {booking_reference} was initiated at {initiated_at} (Ref: {refund_reference}).',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'initiated_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.initiated.email',
                eventType: 'refund.initiated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Initiated for {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nWe have initiated a refund of {amount} for reservation {booking_reference} at {initiated_at}.\n\nRefund Reference: {refund_reference}\n\nThis refund has been submitted to our payment gateway and is currently processing. You will receive another confirmation once settlement to your original payment method is completed.",
                subjectTemplate: 'Refund Initiated: {amount} for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'initiated_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.initiated.push',
                eventType: 'refund.initiated',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Initiated',
                bodyTemplate: 'Refund of {amount} for {booking_reference} has been initiated and is processing.',
                approvedVariables: ['amount', 'booking_reference', 'action_url'],
            ),

            // B11: Refund completed
            new TemplateDefinition(
                code: 'customer.refund.completed.in_app',
                eventType: 'refund.completed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Completed',
                bodyTemplate: 'Refund of {amount} for reservation {booking_reference} was processed on {completed_at} (Ref: {refund_reference}).',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'completed_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.completed.email',
                eventType: 'refund.completed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Completed — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour refund of {amount} for reservation {booking_reference} has been completed by our payment processor.\n\nRefund Reference: {refund_reference}\nCompleted At: {completed_at}\n\nDepending on your bank or card issuer, funds typically reflect in your statement within 5–7 business days.",
                subjectTemplate: 'Refund Completed: {amount} for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'completed_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.completed.push',
                eventType: 'refund.completed',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Update: Completed',
                bodyTemplate: 'Refund of {amount} for {booking_reference} has been completed.',
                approvedVariables: ['amount', 'booking_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.completed.sms',
                eventType: 'refund.completed',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Completed',
                bodyTemplate: 'TIJUM: Refund of {amount} for booking {booking_reference} processed. Ref: {refund_reference}. View: {action_url}',
                dltTemplateId: '1407161234567000005',
                approvedVariables: ['amount', 'booking_reference', 'refund_reference', 'action_url'],
            ),

            // B12: Review invitation
            new TemplateDefinition(
                code: 'customer.review.invitation.in_app',
                eventType: 'review.invitation',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'How was your stay at {property_name}?',
                bodyTemplate: 'Share your feedback for completed booking {booking_reference} at {property_name}.',
                approvedVariables: ['customer_name', 'property_name', 'booking_reference', 'review_url', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.review.invitation.email',
                eventType: 'review.invitation',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'How was your stay at {property_name}?',
                bodyTemplate: "Hello {customer_name},\n\nThank you for completing your stay at {property_name} (Booking: {booking_reference}).\n\nYou are eligible to submit a review rating cleanliness, food quality, communication, and overall value. All published reviews go through moderation before appearing on TIJUM.\n\nSubmit review: {review_url}",
                subjectTemplate: 'Share feedback for your stay at {property_name} | TIJUM',
                approvedVariables: ['customer_name', 'property_name', 'booking_reference', 'review_url', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.review.invitation.push',
                eventType: 'review.invitation',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Rate Your Stay',
                bodyTemplate: 'Tell us about your recent stay at {property_name}.',
                approvedVariables: ['property_name', 'action_url'],
            ),

            // ==========================================
            // CATEGORY C: CUSTOMER SUPPORT & GRIEVANCES
            // ==========================================
            // C01: Grievance acknowledged
            new TemplateDefinition(
                code: 'customer.grievance.acknowledged.in_app',
                eventType: 'grievance.acknowledged',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Grievance Case Logged ({case_reference})',
                bodyTemplate: 'Your grievance case {case_reference} for {property_name} ({booking_reference}) was received at {created_at}.',
                approvedVariables: ['customer_name', 'case_reference', 'booking_reference', 'property_name', 'created_at', 'expected_response_time', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.acknowledged.email',
                eventType: 'grievance.acknowledged',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Customer Grievance Acknowledged — {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour grievance case {case_reference} regarding booking {booking_reference} at {property_name} was received on {created_at}.\n\nExpected Initial Response Window: {expected_response_time}\n\nYou can follow updates and add messages directly from your customer protection case portal.",
                subjectTemplate: 'Grievance Acknowledged: Case {case_reference} | TIJUM Redressal Cell',
                approvedVariables: ['customer_name', 'case_reference', 'booking_reference', 'property_name', 'created_at', 'expected_response_time', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.acknowledged.push',
                eventType: 'grievance.acknowledged',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Grievance Acknowledged',
                bodyTemplate: 'Case {case_reference} has been logged with our Grievance Redressal Cell.',
                approvedVariables: ['case_reference', 'action_url'],
            ),

            // C02: Grievance status updated
            new TemplateDefinition(
                code: 'customer.grievance.status_updated.in_app',
                eventType: 'grievance.status_updated',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Grievance Status Updated',
                bodyTemplate: 'Case {case_reference} is now {case_status} ({updated_at}). {reason}',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'case_status', 'reason', 'updated_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.status_updated.email',
                eventType: 'grievance.status_updated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Update on Case {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThere is an update on your grievance case {case_reference} ({property_name}) as of {updated_at}:\n\nCurrent Status: {case_status}\nDetails: {reason}\n\nPlease visit your customer portal to review the full thread.",
                subjectTemplate: 'Status Update: Case {case_reference} ({case_status}) | TIJUM',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'case_status', 'reason', 'updated_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.status_updated.push',
                eventType: 'grievance.status_updated',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Case Update: {case_reference}',
                bodyTemplate: 'Your grievance case status changed to {case_status}.',
                approvedVariables: ['case_reference', 'case_status', 'action_url'],
            ),

            // C03: Grievance resolved
            new TemplateDefinition(
                code: 'customer.grievance.resolved.in_app',
                eventType: 'grievance.resolved',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Grievance Case Resolved',
                bodyTemplate: 'Case {case_reference} was resolved at {resolved_at}: {resolution_summary}',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'resolution_summary', 'resolved_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.resolved.email',
                eventType: 'grievance.resolved',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Grievance Resolved — {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThe TIJUM Grievance Redressal Cell has resolved case {case_reference} at {resolved_at}.\n\nResolution Summary: {resolution_summary}\n\nIf you require additional assistance, contact grievance@tijum.com.",
                subjectTemplate: 'Case Resolved: {case_reference} | TIJUM Grievance Redressal',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'resolution_summary', 'resolved_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.resolved.push',
                eventType: 'grievance.resolved',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Grievance Resolved',
                bodyTemplate: 'Case {case_reference} has been marked resolved. Tap to review summary.',
                approvedVariables: ['case_reference', 'action_url'],
            ),

            // C04: Grievance escalated
            new TemplateDefinition(
                code: 'customer.grievance.escalated.in_app',
                eventType: 'grievance.escalated',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Case Escalated ({case_reference})',
                bodyTemplate: 'Case {case_reference} status: {escalation_status}. Reason: {reason}',
                approvedVariables: ['customer_name', 'case_reference', 'escalation_status', 'reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.escalated.email',
                eventType: 'grievance.escalated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Case Escalated for Priority Review — {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour grievance case {case_reference} has been escalated ({escalation_status}) for priority review.\n\nDetails: {reason}\n\nOur operations team will follow up directly in your case portal.",
                subjectTemplate: 'Case Escalated: {case_reference} | TIJUM Redressal',
                approvedVariables: ['customer_name', 'case_reference', 'escalation_status', 'reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.escalated.push',
                eventType: 'grievance.escalated',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Case Escalated',
                bodyTemplate: 'Case {case_reference} has been escalated for priority review.',
                approvedVariables: ['case_reference', 'action_url'],
            ),

            // C05 & C06: General Support Tickets
            new TemplateDefinition(
                code: 'customer.support.request_received.in_app',
                eventType: 'support.request_received',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Support Request Received ({ticket_reference})',
                bodyTemplate: 'We received your support ticket "{subject}" at {created_at}.',
                approvedVariables: ['customer_name', 'ticket_reference', 'subject', 'created_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.support.request_received.email',
                eventType: 'support.request_received',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Support Request Received — {ticket_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThank you for contacting TIJUM Support. Your support request has been logged.\n\nTicket Reference: {ticket_reference}\nSubject: {subject}\nSubmitted At: {created_at}\n\nYou can view updates and reply directly in your Support Portal.",
                subjectTemplate: 'Support Ticket Received: {ticket_reference} | TIJUM Support',
                approvedVariables: ['customer_name', 'ticket_reference', 'subject', 'created_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.support.status_updated.in_app',
                eventType: 'support.status_updated',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Support Ticket Update ({ticket_reference})',
                bodyTemplate: 'Ticket {ticket_reference} ({ticket_status}): {latest_update}',
                approvedVariables: ['customer_name', 'ticket_reference', 'ticket_status', 'latest_update', 'updated_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.support.status_updated.email',
                eventType: 'support.status_updated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Update on Support Ticket {ticket_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThere is an update on your support ticket {ticket_reference} as of {updated_at}:\n\nStatus: {ticket_status}\nUpdate: {latest_update}\n\nVisit your Support Portal to view the full conversation or reply.",
                subjectTemplate: 'Support Update: {ticket_reference} ({ticket_status}) | TIJUM Support',
                approvedVariables: ['customer_name', 'ticket_reference', 'ticket_status', 'latest_update', 'updated_at', 'action_url'],
            ),

            // ==========================================
            // CATEGORY D: COUPONS, REFERRALS & LOYALTY
            // ==========================================
            // D01: Coupon qualified
            new TemplateDefinition(
                code: 'customer.rewards.coupon_qualified.in_app',
                eventType: 'rewards.coupon_qualified',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Coupon Unlocked: {coupon_code}',
                bodyTemplate: 'Use code {coupon_code} ({discount_description}) on an eligible booking before {expiry_date}.',
                approvedVariables: ['customer_name', 'coupon_code', 'discount_description', 'expiry_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.coupon_qualified.email',
                eventType: 'rewards.coupon_qualified',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'You Unlocked Coupon {coupon_code}',
                bodyTemplate: "Hello {customer_name},\n\nYou have qualified for a TIJUM discount coupon:\n\nCoupon Code: {coupon_code}\nBenefit: {discount_description}\nValid Until: {expiry_date}\n\nApply this code during checkout on an eligible stay.",
                subjectTemplate: 'Coupon Unlocked: {coupon_code} | TIJUM Rewards',
                approvedVariables: ['customer_name', 'coupon_code', 'discount_description', 'expiry_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.coupon_qualified.push',
                eventType: 'rewards.coupon_qualified',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Reward Coupon Unlocked',
                bodyTemplate: 'Code {coupon_code}: {discount_description}. Valid until {expiry_date}.',
                approvedVariables: ['coupon_code', 'discount_description', 'expiry_date', 'action_url'],
            ),

            // D02: Referral attributed
            new TemplateDefinition(
                code: 'customer.rewards.referral_attributed.in_app',
                eventType: 'rewards.referral_attributed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Friend Joined via Your Referral',
                bodyTemplate: '{referred_customer_display_name} registered using your referral code {referral_code}. Points will credit once their qualifying stay completes.',
                approvedVariables: ['customer_name', 'referral_code', 'referred_customer_display_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.referral_attributed.email',
                eventType: 'rewards.referral_attributed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'A Friend Registered Using Referral Code {referral_code}',
                bodyTemplate: "Hello {customer_name},\n\n{referred_customer_display_name} has registered on TIJUM using your referral code ({referral_code}).\n\nPlease note: Referral reward points are NOT credited upon registration alone. They will be credited automatically once your friend completes an eligible stay meeting minimum booking criteria.",
                subjectTemplate: 'Your friend signed up with code {referral_code} | TIJUM Referrals',
                approvedVariables: ['customer_name', 'referral_code', 'referred_customer_display_name', 'action_url'],
            ),

            // D03: Referral points credited
            new TemplateDefinition(
                code: 'customer.rewards.referral_points_credited.in_app',
                eventType: 'rewards.referral_points_credited',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Referral Bonus Credited ({points_credited} pts)',
                bodyTemplate: 'Earned {points_credited} referral points ({referral_reference}). Current balance: {points_balance} pts.',
                approvedVariables: ['customer_name', 'points_credited', 'points_balance', 'referral_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.referral_points_credited.email',
                eventType: 'rewards.referral_points_credited',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Referral Bonus: {points_credited} Points Credited',
                bodyTemplate: "Hello {customer_name},\n\nYour referral ({referral_reference}) has qualified following a completed stay! We have credited {points_credited} loyalty points to your TIJUM wallet.\n\nCurrent Available Balance: {points_balance} pts\n\nYou can redeem your available points toward upcoming stays.",
                subjectTemplate: 'Referral Bonus: {points_credited} points credited | TIJUM',
                approvedVariables: ['customer_name', 'points_credited', 'points_balance', 'referral_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.referral_points_credited.push',
                eventType: 'rewards.referral_points_credited',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Referral Points Credited',
                bodyTemplate: '{points_credited} referral bonus points added to your TIJUM wallet.',
                approvedVariables: ['points_credited', 'action_url'],
            ),

            // D04: Stay loyalty points credited
            new TemplateDefinition(
                code: 'customer.rewards.points_credited.in_app',
                eventType: 'rewards.points_credited',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: '{points_credited} Loyalty Points Credited',
                bodyTemplate: 'Earned {points_credited} points for completed stay {booking_reference} at {property_name}. Available balance: {points_balance} pts.',
                approvedVariables: ['customer_name', 'property_name', 'booking_reference', 'points_credited', 'points_balance', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_credited.email',
                eventType: 'rewards.points_credited',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Loyalty Points Earned: {points_credited} Points',
                bodyTemplate: "Hello {customer_name},\n\nThank you for completing your stay {booking_reference} at {property_name}. {points_credited} loyalty points have been activated in your wallet!\n\nCurrent Available Balance: {points_balance} pts\n\nRedeem your points on future bookings across TIJUM.",
                subjectTemplate: 'You earned {points_credited} loyalty points ({booking_reference}) | TIJUM',
                approvedVariables: ['customer_name', 'property_name', 'booking_reference', 'points_credited', 'points_balance', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_credited.push',
                eventType: 'rewards.points_credited',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Loyalty Points Earned',
                bodyTemplate: '{points_credited} points credited for stay {booking_reference} at {property_name}.',
                approvedVariables: ['points_credited', 'booking_reference', 'property_name', 'action_url'],
            ),

            // D05: Points expiring reminder
            new TemplateDefinition(
                code: 'customer.rewards.points_expiring.in_app',
                eventType: 'rewards.points_expiring',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: '{expiring_points} Loyalty Points Expiring Soon',
                bodyTemplate: '{expiring_points} of your {points_balance} available points expire on {expires_at}.',
                approvedVariables: ['customer_name', 'points_balance', 'expiring_points', 'expires_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_expiring.email',
                eventType: 'rewards.points_expiring',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Reminder: {expiring_points} Loyalty Points Expiring on {expires_at}',
                bodyTemplate: "Hello {customer_name},\n\nYou currently have {expiring_points} unredeemed loyalty points (out of your {points_balance} available points balance) scheduled to expire on {expires_at}.\n\nRedeem them on an upcoming stay before expiry.",
                subjectTemplate: '{expiring_points} TIJUM loyalty points expire on {expires_at}',
                approvedVariables: ['customer_name', 'points_balance', 'expiring_points', 'expires_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_expiring.push',
                eventType: 'rewards.points_expiring',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Points Expiring Soon',
                bodyTemplate: '{expiring_points} TIJUM loyalty points expire on {expires_at}.',
                approvedVariables: ['expiring_points', 'expires_at', 'action_url'],
            ),

            // D06: Points redeemed (FIXED: uses points_redeemed instead of points_credited)
            new TemplateDefinition(
                code: 'customer.rewards.points_redeemed.in_app',
                eventType: 'rewards.points_redeemed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: '{points_redeemed} Points Redeemed',
                bodyTemplate: 'Redeemed {points_redeemed} points ({monetary_value}) on booking {booking_reference} at {property_name}. Remaining balance: {points_balance} pts.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'points_redeemed', 'points_balance', 'monetary_value', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_redeemed.email',
                eventType: 'rewards.points_redeemed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Points Redeemed on Booking {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYou successfully redeemed {points_redeemed} loyalty points (value: {monetary_value}) toward reservation {booking_reference} at {property_name}.\n\nRemaining Available Wallet Balance: {points_balance} pts.",
                subjectTemplate: 'Points Redemption Confirmation: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'points_redeemed', 'points_balance', 'monetary_value', 'action_url'],
            ),

            // ==========================================
            // CATEGORY E: PROPERTY OWNER OPERATIONS
            // ==========================================
            // E01: Owner property submission received
            new TemplateDefinition(
                code: 'partner.property.submitted.in_app',
                eventType: 'partner.property.submitted',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Submission Received',
                bodyTemplate: 'Submission {submission_reference} for {property_name} was received at {submitted_at} and queued for verification.',
                approvedVariables: ['owner_name', 'property_name', 'submission_reference', 'submitted_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.property.submitted.email',
                eventType: 'partner.property.submitted',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Submission Received — {submission_reference}',
                bodyTemplate: "Hello {owner_name},\n\nWe have received your verification submission ({submission_reference}) for \"{property_name}\" at {submitted_at}.\n\nOur verification team will review your property details, room configurations, photos, and supporting documents. Private documents are stored securely and never linked in emails.",
                subjectTemplate: 'Property Submission Received: {property_name} ({submission_reference}) | TIJUM Partner',
                approvedVariables: ['owner_name', 'property_name', 'submission_reference', 'submitted_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.property.submitted.push',
                eventType: 'partner.property.submitted',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Submission Received',
                bodyTemplate: 'Verification submission {submission_reference} for {property_name} was received.',
                approvedVariables: ['submission_reference', 'property_name', 'action_url'],
            ),

            // E02: Property approved
            new TemplateDefinition(
                code: 'partner.property.approved.in_app',
                eventType: 'partner.property.approved',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Approved & Live',
                bodyTemplate: '{property_name} was approved at {approved_at} and is live for customer bookings.',
                approvedVariables: ['owner_name', 'property_name', 'approved_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.property.approved.email',
                eventType: 'partner.property.approved',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Approved — {property_name}',
                bodyTemplate: "Hello {owner_name},\n\nGreat news! Your property \"{property_name}\" passed verification and was approved at {approved_at}.\n\nYour approved room inventory and pricing are now published on TIJUM.",
                subjectTemplate: 'Property Approved & Live: {property_name} | TIJUM Partner',
                approvedVariables: ['owner_name', 'property_name', 'approved_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.property.approved.push',
                eventType: 'partner.property.approved',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Approved',
                bodyTemplate: '{property_name} is now verified and live on TIJUM.',
                approvedVariables: ['property_name', 'action_url'],
            ),

            // E03: Property rejected or changes requested
            new TemplateDefinition(
                code: 'partner.property.changes_requested.in_app',
                eventType: 'partner.property.changes_requested',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Review Action Required',
                bodyTemplate: '{property_name}: {review_reason}. Requested changes: {requested_changes}',
                approvedVariables: ['owner_name', 'property_name', 'review_reason', 'requested_changes', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.property.changes_requested.email',
                eventType: 'partner.property.changes_requested',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Verification Update — {property_name}',
                bodyTemplate: "Hello {owner_name},\n\nThere is a verification update for \"{property_name}\":\n\nSummary: {review_reason}\nRequested Actions: {requested_changes}\n\nPlease review the notes in your Partner Portal to make updates.",
                subjectTemplate: 'Property Verification Update: {property_name} | TIJUM Partner',
                approvedVariables: ['owner_name', 'property_name', 'review_reason', 'requested_changes', 'action_url'],
            ),

            // Legacy non-gatekeeper hold notice (informational only; no pre-payment approval)
            new TemplateDefinition(
                code: 'partner.reservation_received.in_app',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Inventory Hold Notice (Awaiting Guest Payment)',
                bodyTemplate: 'Hold {booking_reference} for {property_name} (Check-in: {check_in_date}) is awaiting guest payment confirmation. No owner approval is needed.',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_received.email',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Informational Inventory Hold — {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nA guest has initiated a temporary 15-minute inventory hold ({booking_reference}) at {property_name} for check-in on {check_in_date}.\n\nNo host approval is required. You will receive an actionable confirmation once customer payment is captured.",
                subjectTemplate: 'Inventory Hold Notice: {booking_reference} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_received.sms',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::OperationalUpdate,
                title: 'Inventory Hold Notice',
                bodyTemplate: 'TIJUM: Temporary hold {booking_reference} created for {property_name}. Confirmation follows payment. View: {action_url}',
                dltTemplateId: '1407161234567000006',
                approvedVariables: ['booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_received.whatsapp',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Inventory Hold Notice',
                bodyTemplate: 'Hello {owner_name}, a temporary hold {booking_reference} was placed for {property_name} (Check-in: {check_in_date}). Confirmation follows payment: {action_url}',
                metaTemplateName: 'tijum_partner_new_booking',
                metaCategory: 'UTILITY',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),

            // E04: New confirmed reservation (post-payment only; allocate physical room)
            new TemplateDefinition(
                code: 'partner.reservation_confirmed.in_app',
                eventType: 'partner.reservation_confirmed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Confirmed Booking ({booking_reference})',
                bodyTemplate: 'Confirmed reservation {booking_reference} at {property_name} ({room_type}, {guest_count} guest(s)) for {check_in_date} to {checkout_date}. Allocate a physical room.',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'room_type', 'check_in_date', 'checkout_date', 'guest_count', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_confirmed.email',
                eventType: 'partner.reservation_confirmed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Confirmed Booking — {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nGuest payment has been verified and booking {booking_reference} at {property_name} is now confirmed!\n\nRoom Type: {room_type}\nGuests / Units: {guest_count}\nStay Dates: {check_in_date} to {checkout_date}\nGross Booking Amount: {amount}\n\nPlease allocate the physical room for this guest in your Partner Portal and prepare meal arrangements for 09:00 AM IST check-in.",
                subjectTemplate: 'New Confirmed Booking: {booking_reference} at {property_name} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'room_type', 'check_in_date', 'checkout_date', 'guest_count', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_confirmed.push',
                eventType: 'partner.reservation_confirmed',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Confirmed Booking',
                bodyTemplate: '{booking_reference} at {property_name} ({room_type}) is confirmed. Please allocate room.',
                approvedVariables: ['booking_reference', 'property_name', 'room_type', 'action_url'],
            ),

            // E05: Payment confirmation for owner
            new TemplateDefinition(
                code: 'partner.payment_confirmed.in_app',
                eventType: 'partner.payment_confirmed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Guest Payment Captured ({booking_reference})',
                bodyTemplate: 'Captured {amount} (Ref: {payment_reference}) for booking {booking_reference} at {property_name} on {captured_at}.',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'amount', 'payment_reference', 'captured_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.payment_confirmed.email',
                eventType: 'partner.payment_confirmed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Guest Payment Captured: {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nCustomer payment of {amount} for booking {booking_reference} at {property_name} has been captured.\n\nPayment Reference: {payment_reference}\nCaptured At: {captured_at}\n\nNet partner settlement will follow the marketplace settlement cycle and approval rules after stay fulfillment.",
                subjectTemplate: 'Guest Payment Captured: {booking_reference} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'amount', 'payment_reference', 'captured_at', 'action_url'],
            ),

            // E06: Upcoming guest arrival reminder
            new TemplateDefinition(
                code: 'partner.upcoming_checkin.in_app',
                eventType: 'partner.upcoming_checkin',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Guest Arrival Tomorrow ({booking_reference})',
                bodyTemplate: '{guest_count} guest(s) arriving tomorrow ({check_in_date}) at {property_name} ({room_type}).',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'guest_count', 'room_type', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.upcoming_checkin.email',
                eventType: 'partner.upcoming_checkin',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Guest Arrival Tomorrow: {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nReminder: A confirmed guest stay is scheduled to check in tomorrow at {property_name}.\n\nBooking Reference: {booking_reference}\nRoom Type: {room_type}\nGuests: {guest_count}\nCheck-in Date: {check_in_date} from 09:00 AM IST\n\nPlease ensure physical room allocation and food preparations are ready.",
                subjectTemplate: 'Arrival Reminder: Check-in Tomorrow at {property_name} ({booking_reference}) | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'guest_count', 'room_type', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.upcoming_checkin.push',
                eventType: 'partner.upcoming_checkin',
                channel: NotificationChannel::Push,
                category: NotificationCategory::OperationalUpdate,
                title: 'Guest Arrival Reminder',
                bodyTemplate: '{booking_reference} ({room_type}) checks in tomorrow at {property_name}.',
                approvedVariables: ['booking_reference', 'room_type', 'property_name', 'action_url'],
            ),

            // E07: Customer booking cancelled
            new TemplateDefinition(
                code: 'partner.reservation_cancelled.in_app',
                eventType: 'partner.reservation_cancelled',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Cancelled ({booking_reference})',
                bodyTemplate: 'Reservation {booking_reference} at {property_name} was cancelled at {cancelled_at}. {inventory_release_status}',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'cancelled_at', 'cancellation_reason', 'inventory_release_status', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_cancelled.email',
                eventType: 'partner.reservation_cancelled',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Cancelled — {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nReservation {booking_reference} for {property_name} was cancelled at {cancelled_at}.\n\nReason: {cancellation_reason}\nInventory Status: {inventory_release_status}\n\nPlease review the reservation details in your Partner Portal.",
                subjectTemplate: 'Booking Cancelled: {booking_reference} at {property_name} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'cancelled_at', 'cancellation_reason', 'inventory_release_status', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_cancelled.push',
                eventType: 'partner.reservation_cancelled',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Cancelled',
                bodyTemplate: 'Reservation {booking_reference} at {property_name} has been cancelled.',
                approvedVariables: ['booking_reference', 'property_name', 'action_url'],
            ),

            // E08: Settlement statement available
            new TemplateDefinition(
                code: 'partner.settlement_available.in_app',
                eventType: 'partner.settlement_available',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Settlement Statement Ready ({settlement_reference})',
                bodyTemplate: 'Statement {settlement_reference} ({period_start} to {period_end}) for net payable {amount} is ready in your Financial Portal.',
                approvedVariables: ['owner_name', 'settlement_reference', 'amount', 'period_start', 'period_end', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.settlement_available.email',
                eventType: 'partner.settlement_available',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Settlement Statement Ready — {settlement_reference}',
                bodyTemplate: "Hello {owner_name},\n\nYour settlement statement {settlement_reference} for the period {period_start} to {period_end} has been approved and is ready.\n\nNet Payable Amount: {amount}\n\nPayout transfer has not yet been completed; you will receive confirmation once bank transfer completes.",
                subjectTemplate: 'Settlement Statement Available: {settlement_reference} | TIJUM Partner',
                approvedVariables: ['owner_name', 'settlement_reference', 'amount', 'period_start', 'period_end', 'action_url'],
            ),

            // E09: Payout completed
            new TemplateDefinition(
                code: 'partner.transfer_completed.in_app',
                eventType: 'partner.transfer_completed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Settlement Payout Completed',
                bodyTemplate: 'Payout of {amount} for settlement {settlement_reference} completed at {completed_at} (Transfer Ref: {transfer_reference}).',
                approvedVariables: ['owner_name', 'amount', 'settlement_reference', 'transfer_reference', 'completed_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.transfer_completed.email',
                eventType: 'partner.transfer_completed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Partner Settlement Payout Completed — {settlement_reference}',
                bodyTemplate: "Hello {owner_name},\n\nYour bank payout transfer for settlement {settlement_reference} has completed successfully.\n\nAmount Paid: {amount}\nTransfer Reference: {transfer_reference}\nCompleted At: {completed_at}\n\nYou can view the full settlement breakdown and statutory deduction summary in your Partner Financial Portal.",
                subjectTemplate: 'Settlement Payout Completed: {amount} ({settlement_reference}) | TIJUM Partner',
                approvedVariables: ['owner_name', 'amount', 'settlement_reference', 'transfer_reference', 'completed_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.transfer_completed.push',
                eventType: 'partner.transfer_completed',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Settlement Update: Payout Completed',
                bodyTemplate: 'Payout of {amount} ({settlement_reference}) has been transferred.',
                approvedVariables: ['amount', 'settlement_reference', 'action_url'],
            ),

            // E10: Payout failed or action required
            new TemplateDefinition(
                code: 'partner.transfer_failed.in_app',
                eventType: 'partner.transfer_failed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payout Transfer Attention Required',
                bodyTemplate: 'Transfer for settlement {settlement_reference} ({amount}) did not complete: {failure_reason}. Please verify your bank details.',
                approvedVariables: ['owner_name', 'amount', 'settlement_reference', 'failure_reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.transfer_failed.email',
                eventType: 'partner.transfer_failed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Action Required: Settlement Transfer Failed — {settlement_reference}',
                bodyTemplate: "Hello {owner_name},\n\nThe bank transfer for settlement {settlement_reference} ({amount}) could not be completed.\n\nReason: {failure_reason}\n\nPlease verify your linked financial profile or contact TIJUM support so the payout can be retried.",
                subjectTemplate: 'Settlement Transfer Failed: {settlement_reference} | TIJUM Partner',
                approvedVariables: ['owner_name', 'amount', 'settlement_reference', 'failure_reason', 'action_url'],
            ),

            // ==========================================
            // CATEGORY F: ADMIN OPERATIONS & SECURITY
            // ==========================================
            // F01: Critical customer-protection escalation
            new TemplateDefinition(
                code: 'admin.urgent_case.in_app',
                eventType: 'admin.customer_protection_urgent',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Urgent Protection Case ({case_reference})',
                bodyTemplate: 'Priority: {priority}. Urgent case {case_reference} for {property_name} (Booking: {booking_reference}) requires investigation.',
                approvedVariables: ['case_reference', 'property_name', 'booking_reference', 'priority', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.urgent_case.email',
                eventType: 'admin.customer_protection_urgent',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'URGENT: Customer Protection Escalation — {case_reference}',
                bodyTemplate: "TIJUM Operations Alert:\n\nA critical customer protection case has been flagged.\n\nCase Reference: {case_reference}\nPriority: {priority}\nProperty: {property_name}\nBooking Reference: {booking_reference}\n\nPlease investigate immediately in the Admin Cases Portal.",
                subjectTemplate: 'URGENT: Protection Escalation {case_reference} | TIJUM Operations',
                approvedVariables: ['case_reference', 'property_name', 'booking_reference', 'priority', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.urgent_case.push',
                eventType: 'admin.customer_protection_urgent',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Customer Protection Escalation',
                bodyTemplate: 'Urgent case {case_reference} opened for {property_name}.',
                approvedVariables: ['case_reference', 'property_name', 'action_url'],
            ),

            // F02: Payment exception
            new TemplateDefinition(
                code: 'admin.payment_exception.in_app',
                eventType: 'admin.payment_exception',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Exception ({booking_reference})',
                bodyTemplate: '{exception_type} on booking {booking_reference} (Payment: {payment_reference}) at {created_at}: {error_description}',
                approvedVariables: ['booking_reference', 'payment_reference', 'exception_type', 'error_description', 'created_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.payment_exception.email',
                eventType: 'admin.payment_exception',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Exception Alert: {booking_reference}',
                bodyTemplate: "TIJUM Finance & Operations Alert:\n\nA payment exception requires administrative review.\n\nBooking Reference: {booking_reference}\nPayment Reference: {payment_reference}\nException Type: {exception_type}\nTimestamp: {created_at}\nDetails: {error_description}\n\nInspect this booking in the Admin Reservations & Payments Portal.",
                subjectTemplate: 'Payment Exception: {booking_reference} | TIJUM Finance',
                approvedVariables: ['booking_reference', 'payment_reference', 'exception_type', 'error_description', 'created_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.payment_exception.push',
                eventType: 'admin.payment_exception',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Critical Payment Exception',
                bodyTemplate: 'Payment exception ({exception_type}) requires review for {booking_reference}.',
                approvedVariables: ['exception_type', 'booking_reference', 'action_url'],
            ),

            // F03: Notification provider failure
            new TemplateDefinition(
                code: 'admin.notification_provider_failure.in_app',
                eventType: 'admin.notification_provider_failure',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Notification Provider Failure ({provider})',
                bodyTemplate: 'Channel {channel} ({provider}) failed delivery {delivery_reference} at {created_at}: {error_description}',
                approvedVariables: ['channel', 'provider', 'error_description', 'delivery_reference', 'created_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.notification_provider_failure.email',
                eventType: 'admin.notification_provider_failure',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Notification Gateway Failure ({provider})',
                bodyTemplate: "TIJUM Infrastructure Alert:\n\nA notification transport failure occurred.\n\nChannel: {channel}\nProvider: {provider}\nDelivery Reference: {delivery_reference}\nTimestamp: {created_at}\nSanitized Summary: {error_description}\n\nAudit the Channel Gateways & Provider Readiness dashboard.",
                subjectTemplate: 'Delivery Provider Failure ({provider}) | TIJUM Infra',
                approvedVariables: ['channel', 'provider', 'error_description', 'delivery_reference', 'created_at', 'action_url'],
            ),

            // F04: Administrative security alert
            new TemplateDefinition(
                code: 'admin.security_alert.in_app',
                eventType: 'admin.security_alert',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Admin Security Alert ({severity})',
                bodyTemplate: 'Security event ({admin_reference}) at {created_at}: {reason}',
                approvedVariables: ['reason', 'admin_reference', 'created_at', 'severity', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.security_alert.email',
                eventType: 'admin.security_alert',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Administrative Security Alert ({severity})',
                bodyTemplate: "TIJUM Security Alert:\n\nAn administrative security event was recorded.\n\nSeverity: {severity}\nAdmin Reference: {admin_reference}\nTimestamp: {created_at}\nDetails: {reason}\n\nIf unexpected, review Admin Security immediately.",
                subjectTemplate: 'Security Alert ({severity}): Administrative Action Logged | TIJUM',
                approvedVariables: ['reason', 'admin_reference', 'created_at', 'severity', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.security_alert.push',
                eventType: 'admin.security_alert',
                channel: NotificationChannel::Push,
                category: NotificationCategory::EssentialTransactional,
                title: 'Security Alert',
                bodyTemplate: 'Admin security event logged ({severity}). Review in Admin Portal.',
                approvedVariables: ['severity', 'action_url'],
            ),

            // F05: New property awaiting administrative review
            new TemplateDefinition(
                code: 'admin.property_review_required.in_app',
                eventType: 'admin.property_review_required',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Review Required ({submission_reference})',
                bodyTemplate: '{property_name} submitted verification {submission_reference} by {owner_name} at {submitted_at}.',
                approvedVariables: ['property_name', 'owner_name', 'submission_reference', 'submitted_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.property_review_required.email',
                eventType: 'admin.property_review_required',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Property Application Awaiting Review — {submission_reference}',
                bodyTemplate: "TIJUM Property Verification Desk:\n\nA property verification submission requires administrative review.\n\nProperty: {property_name}\nPartner: {owner_name}\nApplication Reference: {submission_reference}\nSubmitted At: {submitted_at}\n\nOpen the Admin Property Verification queue to review and moderate.",
                subjectTemplate: 'Property Review Required: {property_name} ({submission_reference}) | TIJUM Admin',
                approvedVariables: ['property_name', 'owner_name', 'submission_reference', 'submitted_at', 'action_url'],
            ),

            // F06: Refund exception
            new TemplateDefinition(
                code: 'admin.refund_exception.in_app',
                eventType: 'admin.refund_exception',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Exception ({booking_reference})',
                bodyTemplate: 'Refund {refund_reference} ({amount}) for {booking_reference} failed at {created_at}: {error_description}',
                approvedVariables: ['booking_reference', 'refund_reference', 'amount', 'error_description', 'created_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.refund_exception.email',
                eventType: 'admin.refund_exception',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Processing Exception — {booking_reference}',
                bodyTemplate: "TIJUM Finance Alert:\n\nA customer refund failed during gateway processing or webhook reconciliation.\n\nBooking Reference: {booking_reference}\nRefund Reference: {refund_reference}\nRefund Amount: {amount}\nTimestamp: {created_at}\nError Summary: {error_description}\n\nPlease investigate and reconcile in the Admin Reservations & Refunds panel.",
                subjectTemplate: 'Refund Exception: {booking_reference} ({refund_reference}) | TIJUM Finance',
                approvedVariables: ['booking_reference', 'refund_reference', 'amount', 'error_description', 'created_at', 'action_url'],
            ),
        ];
    }
}
