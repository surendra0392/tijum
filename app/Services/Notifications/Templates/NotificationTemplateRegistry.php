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
            // 1. CUSTOMER AUTHENTICATION & SECURITY
            // ==========================================
            new TemplateDefinition(
                code: 'customer.auth.account_verification.email',
                eventType: 'auth.account_verification',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Verify Your TIJUM Email Address',
                bodyTemplate: "Hello {customer_name},\n\nThank you for registering with TIJUM — food-inclusive stays with upfront clarity.\n\nPlease click the button below to verify your email address and activate your customer account privileges.",
                subjectTemplate: 'Verify Your Email Address | TIJUM',
                approvedVariables: ['customer_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.registration_otp.email',
                eventType: 'auth.registration_otp',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Your Registration One-Time Passcode (OTP)',
                bodyTemplate: "Hello {customer_name},\n\nYour one-time passcode for completing your TIJUM customer registration is:\n\n{otp_code}\n\nThis code is valid for 10 minutes. For your security, never share this OTP with anyone, including TIJUM staff.",
                subjectTemplate: '{otp_code} is your TIJUM verification passcode',
                approvedVariables: ['customer_name', 'otp_code', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.login_otp.email',
                eventType: 'auth.login_otp',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Your Secure Login Passcode',
                bodyTemplate: "Hello {customer_name},\n\nUse the following one-time passcode to sign in to your TIJUM account:\n\n{otp_code}\n\nValid for 5 minutes. If you did not initiate this login request, please change your password immediately or contact our security team at admin@tijum.com.",
                subjectTemplate: '{otp_code} is your TIJUM login OTP',
                approvedVariables: ['customer_name', 'otp_code', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.password_reset.email',
                eventType: 'auth.password_reset',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reset Your Account Password',
                bodyTemplate: "Hello {customer_name},\n\nWe received a request to reset your password for your TIJUM account.\n\nClick the button below to establish a new secure password. This link is valid for 60 minutes.\n\nIf you did not request a password reset, no further action is required and your account remains protected.",
                subjectTemplate: 'Reset Your TIJUM Account Password',
                approvedVariables: ['customer_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.security_alert.email',
                eventType: 'auth.security_alert',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Security Alert: Account Activity Detected',
                bodyTemplate: "Hello {customer_name},\n\nAn important security change was detected on your TIJUM account:\n\n{reason}\n\nIf this was you, you can safely disregard this email. If you did not authorize this action, please secure your account immediately.",
                subjectTemplate: 'Security Alert: Recent Activity on Your TIJUM Account',
                approvedVariables: ['customer_name', 'reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.auth.security_alert.in_app',
                eventType: 'auth.security_alert',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Account Security Notice',
                bodyTemplate: 'Security update: {reason}. Review your account activity.',
                approvedVariables: ['reason', 'action_url'],
            ),

            // ==========================================
            // 2. CUSTOMER RESERVATION SUBMITTED
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.submitted.in_app',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Request Submitted',
                bodyTemplate: 'Your reservation request {booking_reference} for {property_name} has been received. The host will review your request.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.email',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Request Received — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nWe have received your reservation request for {property_name}. The property host has been notified and will review your booking details promptly.\n\nOnce accepted by the host, you will receive a secure payment link with a 15-minute confirmation window.",
                subjectTemplate: 'Reservation Request Received: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.sms',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Submitted',
                bodyTemplate: 'TIJUM: Reservation {booking_reference} received for {property_name}. The host will review your request. View: {action_url}',
                dltTemplateId: '1407161234567000001',
                approvedVariables: ['booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.submitted.whatsapp',
                eventType: 'reservation.submitted',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Request Received',
                bodyTemplate: 'Hello {customer_name}, your reservation request {booking_reference} for {property_name} has been received. The host will review it shortly. View details: {action_url}',
                metaTemplateName: 'tijum_reservation_submitted',
                metaCategory: 'UTILITY',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'action_url'],
            ),

            // ==========================================
            // 3. PAYMENT REQUIRED (15 MIN WINDOW)
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.payment_required.in_app',
                eventType: 'reservation.payment_required',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Open (15 Mins)',
                bodyTemplate: 'Booking {booking_reference} accepted. Complete payment by {payment_deadline} to confirm your stay.',
                approvedVariables: ['booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_required.email',
                eventType: 'reservation.payment_required',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Action Required: Complete Payment for {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nGreat news! Your booking hold for {property_name} is ready for payment.\n\nAmount: INR {amount}\nPayment Deadline: {payment_deadline} (15 minutes from request acceptance)\n\nPlease complete checkout before the timer expires to secure your room and food inclusions.",
                subjectTemplate: 'Action Required: Pay for Booking {booking_reference} at {property_name} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'payment_deadline', 'action_url'],
            ),

            // ==========================================
            // 4. PAYMENT DEADLINE REMINDER (5 MINS LEFT)
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.in_app',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Closing Soon',
                bodyTemplate: 'Your payment window for booking {booking_reference} closes at {payment_deadline} (approx 5 mins left). Pay now to secure your stay.',
                approvedVariables: ['booking_reference', 'property_name', 'payment_deadline', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_deadline_reminder.email',
                eventType: 'reservation.payment_deadline_reminder',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Urgent: Payment Window Closing Soon for {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThis is a quick reminder that your 15-minute checkout window for {property_name} expires at {payment_deadline}.\n\nIf payment is not completed before this time, your inventory hold will be released automatically.",
                subjectTemplate: 'Urgent: Payment Window Closing for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'payment_deadline', 'action_url'],
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

            // ==========================================
            // 5. PAYMENT WINDOW EXPIRED
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.payment_expired.in_app',
                eventType: 'reservation.payment_expired',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Expired',
                bodyTemplate: 'The payment window for reservation {booking_reference} has expired and held inventory was released.',
                approvedVariables: ['booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.payment_expired.email',
                eventType: 'reservation.payment_expired',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Window Expired — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThe 15-minute checkout window for reservation {booking_reference} at {property_name} has expired without payment.\n\nThe held inventory has been restored to the marketplace. You are welcome to submit a new reservation request whenever you are ready.",
                subjectTemplate: 'Payment Window Expired: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'action_url'],
            ),

            // ==========================================
            // 6. PAYMENT CAPTURED / BOOKING CONFIRMED
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.in_app',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Booking Confirmed!',
                bodyTemplate: 'Payment received! Your stay at {property_name} is confirmed for check-in on {check_in_date}. Booking Reference: {booking_reference}.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.confirmed.email',
                eventType: 'reservation.confirmed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Your Stay is Confirmed — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nWe have received your payment of INR {amount}. Your booking at {property_name} is officially confirmed!\n\nCheck-in Date: {check_in_date} (09:00 AM IST)\nCheckout Date: {checkout_date} (08:00 AM IST)\nFood Inclusions: Confirmed with stay.\n\nThank you for choosing TIJUM.",
                subjectTemplate: 'Booking Confirmed: {booking_reference} at {property_name} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'check_in_date', 'checkout_date', 'amount', 'action_url'],
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
            new TemplateDefinition(
                code: 'customer.payment.captured.email',
                eventType: 'payment.captured',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Receipt: {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour payment of INR {amount} has been successfully processed through our secure payment gateway.\n\nBooking Reference: {booking_reference}\nProperty: {property_name}\n\nYour official tax invoice and booking voucher are accessible anytime from your TIJUM account.",
                subjectTemplate: 'Payment Receipt: INR {amount} for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.payment.failed.email',
                eventType: 'payment.failed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Attempt Unsuccessful — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour payment attempt of INR {amount} for {property_name} could not be completed.\n\nReason: {failure_reason}\n\nIf your funds were debited by your bank, they will automatically reverse according to your banking institution's timelines. You may retry your payment before the checkout deadline.",
                subjectTemplate: 'Payment Attempt Unsuccessful: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'amount', 'failure_reason', 'action_url'],
            ),

            // ==========================================
            // 7. RESERVATION CANCELLED
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.cancelled.in_app',
                eventType: 'reservation.cancelled',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Cancelled',
                bodyTemplate: 'Reservation {booking_reference} for {property_name} has been cancelled.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.cancelled.email',
                eventType: 'reservation.cancelled',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Cancellation Notice — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour reservation {booking_reference} for {property_name} has been cancelled.\n\nIf you are entitled to a refund or relocation assistance under our customer protection policy, details have been logged in your customer portal.",
                subjectTemplate: 'Reservation Cancelled: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'action_url'],
            ),

            // ==========================================
            // 8. UPCOMING STAY REMINDER (~24H BEFORE)
            // ==========================================
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.in_app',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Upcoming Stay Tomorrow',
                bodyTemplate: 'Your stay at {property_name} begins tomorrow ({check_in_date}). Check-in begins at 09:00 AM IST.',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.email',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Your Stay at {property_name} Begins Tomorrow!',
                bodyTemplate: "Hello {customer_name},\n\nThis is a friendly reminder that your food-inclusive stay at {property_name} begins tomorrow!\n\nBooking Reference: {booking_reference}\nCheck-in Time: {check_in_date} from 09:00 AM IST\nMeals: As selected in your reservation\n\nAccess directions, host contact, and check-in guidance on your TIJUM dashboard.",
                subjectTemplate: 'Reminder: Your Stay at {property_name} Begins Tomorrow ({check_in_date}) | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.reservation.upcoming_stay.whatsapp',
                eventType: 'reservation.upcoming_stay',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Upcoming Stay Reminder',
                bodyTemplate: 'Hello {customer_name}, reminder that your stay at {property_name} begins tomorrow ({check_in_date}) at 09:00 AM IST. Booking: {booking_reference}. View details: {action_url}',
                metaTemplateName: 'tijum_upcoming_stay',
                metaCategory: 'UTILITY',
                approvedVariables: ['customer_name', 'property_name', 'check_in_date', 'booking_reference', 'action_url'],
            ),

            // ==========================================
            // 9. REFUNDS
            // ==========================================
            new TemplateDefinition(
                code: 'customer.refund.initiated.email',
                eventType: 'refund.initiated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Initiated for {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nWe have initiated a refund of INR {amount} for reservation {booking_reference}.\n\nRefund Reference: {refund_reference}\n\nOur payment gateway has submitted the refund to your issuing bank. You will receive another notification once credit confirmation is reported.",
                subjectTemplate: 'Refund Initiated: INR {amount} for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.completed.in_app',
                eventType: 'refund.completed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Processed',
                bodyTemplate: 'A refund of INR {amount} for reservation {booking_reference} has been processed back to your original payment method.',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.completed.email',
                eventType: 'refund.completed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Processed Successfully — {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nWe have successfully completed your refund of INR {amount} for reservation {booking_reference}.\n\nRefund Reference: {refund_reference}\nThe amount typically reflects in your bank or payment account within 5–7 business days according to your banking institution.",
                subjectTemplate: 'Refund Processed: INR {amount} for {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'amount', 'refund_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.refund.completed.sms',
                eventType: 'refund.completed',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'Refund Completed',
                bodyTemplate: 'TIJUM: Refund of INR {amount} for booking {booking_reference} processed. Ref: {refund_reference}. View: {action_url}',
                dltTemplateId: '1407161234567000005',
                approvedVariables: ['amount', 'booking_reference', 'refund_reference', 'action_url'],
            ),

            // ==========================================
            // 10. REVIEWS
            // ==========================================
            new TemplateDefinition(
                code: 'customer.review.invitation.in_app',
                eventType: 'review.invitation',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::OperationalUpdate,
                title: 'Share Your Verified Review',
                bodyTemplate: 'How was your stay at {property_name}? Share an authentic verified review to help fellow guests.',
                approvedVariables: ['customer_name', 'property_name', 'booking_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.review.invitation.email',
                eventType: 'review.invitation',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'How was your stay at {property_name}?',
                bodyTemplate: "Hello {customer_name},\n\nWe hope you enjoyed your food-inclusive stay at {property_name}.\n\nAs a verified guest with a completed reservation ({booking_reference}), your honest review helps prospective travelers choose the right stay. Please take 2 minutes to share your ratings on cleanliness, food quality, communication, and value.",
                subjectTemplate: 'Share your verified review for {property_name} | TIJUM',
                approvedVariables: ['customer_name', 'property_name', 'booking_reference', 'action_url'],
            ),

            // ==========================================
            // 11. CUSTOMER GRIEVANCE & PROTECTION
            // ==========================================
            new TemplateDefinition(
                code: 'customer.grievance.acknowledged.email',
                eventType: 'grievance.acknowledged',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Customer Grievance Acknowledged — {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour grievance case {case_reference} regarding booking {booking_reference} at {property_name} has been received by the TIJUM Grievance Redressal Cell.\n\nOur customer protection officers will investigate within 48 hours according to our Consumer Protection Policy. You can track progress and submit additional information from your customer portal.",
                subjectTemplate: 'Grievance Acknowledged: Case {case_reference} | TIJUM Redressal Cell',
                approvedVariables: ['customer_name', 'case_reference', 'booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.status_updated.email',
                eventType: 'grievance.status_updated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Update on Case {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThere is an update on your grievance case {case_reference} ({property_name}):\n\nStatus: {case_status}\nNotes: {reason}\n\nPlease visit your customer portal to review details or provide requested clarification.",
                subjectTemplate: 'Status Update: Case {case_reference} ({case_status}) | TIJUM',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'case_status', 'reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.resolved.email',
                eventType: 'grievance.resolved',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Grievance Resolved — {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nThe TIJUM Grievance Redressal Cell has completed investigation for case {case_reference}.\n\nDetermination: {reason}\n\nIf you have any remaining questions or require further assistance, you may reply directly to this notice or contact grievance@tijum.com.",
                subjectTemplate: 'Case Resolved: {case_reference} | TIJUM Grievance Redressal',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'reason', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.grievance.escalated.email',
                eventType: 'grievance.escalated',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Case Escalated to Senior Redressal Officer — {case_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYour grievance case {case_reference} has been formally escalated to our Senior Grievance Redressal Officer for expedited priority handling.\n\nYou will be contacted directly with the comprehensive resolution.",
                subjectTemplate: 'Case Escalated: {case_reference} | TIJUM Executive Redressal',
                approvedVariables: ['customer_name', 'case_reference', 'property_name', 'action_url'],
            ),

            // ==========================================
            // 12. REWARDS & LOYALTY
            // ==========================================
            new TemplateDefinition(
                code: 'customer.rewards.coupon_qualified.email',
                eventType: 'rewards.coupon_qualified',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'You Unlocked a Reward Discount!',
                bodyTemplate: "Hello {customer_name},\n\nCongratulations! You have qualified for a special TIJUM discount coupon.\n\nUse your coupon code during checkout to enjoy savings on your next verified food-inclusive stay.",
                subjectTemplate: 'You unlocked a new reward discount on TIJUM!',
                approvedVariables: ['customer_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.referral_attributed.email',
                eventType: 'rewards.referral_attributed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'A Friend Joined TIJUM Using Your Referral Code!',
                bodyTemplate: "Hello {customer_name},\n\nGreat news! A friend has signed up on TIJUM using your referral code ({referral_code}).\n\nOnce their qualifying first stay is completed, reward points will be credited to your wallet balance automatically.",
                subjectTemplate: 'Your friend joined TIJUM using your referral code!',
                approvedVariables: ['customer_name', 'referral_code', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.referral_points_credited.email',
                eventType: 'rewards.referral_points_credited',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Referral Bonus: {points_credited} Points Credited!',
                bodyTemplate: "Hello {customer_name},\n\nYour friend completed their stay! You have received a referral bonus of {points_credited} points in your TIJUM wallet.\n\nCurrent Points Balance: {points_balance} pts\n\nRedeem your points anytime during your next booking checkout.",
                subjectTemplate: 'Bonus: {points_credited} points credited to your TIJUM wallet!',
                approvedVariables: ['customer_name', 'points_credited', 'points_balance', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_credited.email',
                eventType: 'rewards.points_credited',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Loyalty Points Earned: {points_credited} Points',
                bodyTemplate: "Hello {customer_name},\n\nThank you for completing your stay at {property_name}. You have earned {points_credited} loyalty points!\n\nUpdated Wallet Balance: {points_balance} pts\n\nUse these points toward your next stay across Hyderabad, Vizag, Vijayawada, and Guntur.",
                subjectTemplate: 'You earned {points_credited} loyalty points on your recent stay! | TIJUM',
                approvedVariables: ['customer_name', 'property_name', 'points_credited', 'points_balance', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_expiring.email',
                eventType: 'rewards.points_expiring',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Important: {points_balance} Points Expiring Soon',
                bodyTemplate: "Hello {customer_name},\n\nYou have {points_balance} loyalty points in your TIJUM wallet scheduled to expire on {expires_at}.\n\nBook your next accommodation now and apply your points to save before they expire.",
                subjectTemplate: 'Your TIJUM loyalty points are expiring on {expires_at}',
                approvedVariables: ['customer_name', 'points_balance', 'expires_at', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'customer.rewards.points_redeemed.email',
                eventType: 'rewards.points_redeemed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Points Redeemed on Booking {booking_reference}',
                bodyTemplate: "Hello {customer_name},\n\nYou successfully redeemed {points_credited} points toward reservation {booking_reference} at {property_name}.\n\nRemaining Wallet Balance: {points_balance} pts.",
                subjectTemplate: 'Points Redemption Confirmation: {booking_reference} | TIJUM',
                approvedVariables: ['customer_name', 'booking_reference', 'property_name', 'points_credited', 'points_balance', 'action_url'],
            ),

            // ==========================================
            // 13. PARTNER / OWNER OPERATIONS
            // ==========================================
            new TemplateDefinition(
                code: 'partner.reservation_received.in_app',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Reservation Request',
                bodyTemplate: 'New reservation request {booking_reference} received for {property_name}. Please review in your Partner Portal.',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_received.email',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Reservation Hold — {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nA customer has placed a booking hold ({booking_reference}) for {property_name}.\n\nGuest Check-in: {check_in_date}\nInventory is held. You will receive immediate confirmation once customer payment is captured.",
                subjectTemplate: 'New Reservation Hold: {booking_reference} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_received.sms',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::Sms,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Booking Request',
                bodyTemplate: 'TIJUM: New reservation {booking_reference} received for {property_name}. Please review in Partner Portal: {action_url}',
                dltTemplateId: '1407161234567000006',
                approvedVariables: ['booking_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_received.whatsapp',
                eventType: 'partner.reservation_received',
                channel: NotificationChannel::WhatsApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'New Reservation Request',
                bodyTemplate: 'Hello {owner_name}, new reservation {booking_reference} received for {property_name} (Check-in: {check_in_date}). Please review: {action_url}',
                metaTemplateName: 'tijum_partner_new_booking',
                metaCategory: 'UTILITY',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_confirmed.in_app',
                eventType: 'partner.reservation_confirmed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Paid & Confirmed',
                bodyTemplate: 'Guest has completed payment for booking {booking_reference} at {property_name}. Check-in: {check_in_date}.',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.reservation_confirmed.email',
                eventType: 'partner.reservation_confirmed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Reservation Confirmed — {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nThe guest has successfully completed online payment for booking {booking_reference} at {property_name}.\n\nCheck-in Date: {check_in_date}\nTotal Stay Value: INR {amount}\n\nPlease ensure the allocated room and meal arrangements are prepared for check-in at 09:00 AM IST.",
                subjectTemplate: 'Booking Confirmed: {booking_reference} for {property_name} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.payment_confirmed.email',
                eventType: 'partner.payment_confirmed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Credited to Escrow: Booking {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nPayment for booking {booking_reference} at {property_name} (INR {amount}) has cleared into marketplace escrow.\n\nYour net settlement will be processed according to your standard payout cycle.",
                subjectTemplate: 'Payment Received in Escrow: {booking_reference} | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.upcoming_checkin.email',
                eventType: 'partner.upcoming_checkin',
                channel: NotificationChannel::Email,
                category: NotificationCategory::OperationalUpdate,
                title: 'Guest Arrival Tomorrow: {booking_reference}',
                bodyTemplate: "Hello {owner_name},\n\nReminder: Guest arrival is scheduled for tomorrow at {property_name}.\n\nBooking: {booking_reference}\nCheck-in Date: {check_in_date} (09:00 AM IST)\n\nPlease verify that the room is sanitized and food preparations are scheduled.",
                subjectTemplate: 'Arrival Reminder: Guest Check-in Tomorrow at {property_name} ({booking_reference}) | TIJUM Partner',
                approvedVariables: ['owner_name', 'booking_reference', 'property_name', 'check_in_date', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.settlement_available.email',
                eventType: 'partner.settlement_available',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Settlement Statement Ready — {settlement_reference}',
                bodyTemplate: "Hello {owner_name},\n\nYour settlement statement {settlement_reference} has been generated.\n\nNet Payable: INR {amount}\n\nPlease review your financial statement, commission invoices, and statutory tax deductions in your Partner Portal.",
                subjectTemplate: 'Settlement Statement Available: {settlement_reference} | TIJUM',
                approvedVariables: ['owner_name', 'settlement_reference', 'amount', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.transfer_completed.in_app',
                eventType: 'partner.transfer_completed',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Settlement Payout Completed',
                bodyTemplate: 'Your marketplace settlement payout of INR {amount} has been successfully transferred. Reference: {settlement_reference}.',
                approvedVariables: ['owner_name', 'amount', 'settlement_reference', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'partner.transfer_completed.email',
                eventType: 'partner.transfer_completed',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Partner Settlement Payout Completed',
                bodyTemplate: "Hello {owner_name},\n\nWe have completed the bank payout for settlement statement {settlement_reference}.\n\nNet Amount Paid: INR {amount}\n\nYou can download the complete settlement breakdown, marketplace commission invoice, and tax withholding summary from your Partner Financial Portal.",
                subjectTemplate: 'Settlement Payout Completed: INR {amount} ({settlement_reference}) | TIJUM',
                approvedVariables: ['owner_name', 'amount', 'settlement_reference', 'action_url'],
            ),

            // ==========================================
            // 14. ADMIN OPERATIONS & SECURITY
            // ==========================================
            new TemplateDefinition(
                code: 'admin.urgent_case.in_app',
                eventType: 'admin.customer_protection_urgent',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Urgent Safety / Customer Protection Escalation',
                bodyTemplate: 'Urgent case {case_reference} logged for {property_name}. Immediate operations investigation required.',
                approvedVariables: ['case_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.urgent_case.email',
                eventType: 'admin.customer_protection_urgent',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'URGENT: Customer Protection Escalation — {case_reference}',
                bodyTemplate: "TIJUM Operations Alert:\n\nAn urgent safety or accommodation escalation ({case_reference}) has been opened for property {property_name}.\n\nPlease review immediately in the Admin Command Centre.",
                subjectTemplate: 'URGENT: Customer Protection Escalation {case_reference} | TIJUM Operations',
                approvedVariables: ['case_reference', 'property_name', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.payment_exception.in_app',
                eventType: 'admin.payment_exception',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Gateway Exception',
                bodyTemplate: 'Payment capture failure or webhook discrepancy detected for booking {booking_reference}.',
                approvedVariables: ['booking_reference', 'error_description', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.payment_exception.email',
                eventType: 'admin.payment_exception',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Payment Discrepancy Alert: Booking {booking_reference}',
                bodyTemplate: "TIJUM Financial Operations Alert:\n\nA payment gateway discrepancy or capture error was detected for reservation {booking_reference}.\n\nError: {error_description}\n\nPlease audit in the Payments Diagnostic Panel.",
                subjectTemplate: 'Payment Exception: {booking_reference} | TIJUM Finance',
                approvedVariables: ['booking_reference', 'error_description', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.notification_provider_failure.in_app',
                eventType: 'admin.notification_provider_failure',
                channel: NotificationChannel::InApp,
                category: NotificationCategory::EssentialTransactional,
                title: 'Notification Gateway Outage Detected',
                bodyTemplate: 'Notification channel {channel} reported persistent delivery failures or authentication errors with provider {provider}.',
                approvedVariables: ['channel', 'provider', 'error_description', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.notification_provider_failure.email',
                eventType: 'admin.notification_provider_failure',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Alert: Notification Gateway Outage ({provider})',
                bodyTemplate: "TIJUM Infrastructure Alert:\n\nThe {channel} delivery provider ({provider}) has reported repeated connection failures or authentication errors.\n\nDetails: {error_description}\n\nPlease check the Channel Gateways & Provider Readiness dashboard.",
                subjectTemplate: 'CRITICAL: Delivery Provider Failure ({provider}) | TIJUM Infra',
                approvedVariables: ['channel', 'provider', 'error_description', 'action_url'],
            ),
            new TemplateDefinition(
                code: 'admin.security_alert.email',
                eventType: 'admin.security_alert',
                channel: NotificationChannel::Email,
                category: NotificationCategory::EssentialTransactional,
                title: 'Administrative Security Alert',
                bodyTemplate: "TIJUM Security Alert:\n\nAn administrative security action was logged:\n\n{reason}\n\nTimestamp: {created_at}\n\nIf unexpected, audit the Admin Security Event Log immediately.",
                subjectTemplate: 'Security Alert: Administrative Action Logged | TIJUM',
                approvedVariables: ['reason', 'created_at', 'action_url'],
            ),
        ];
    }
}
