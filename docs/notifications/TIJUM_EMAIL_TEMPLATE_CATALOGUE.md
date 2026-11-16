# TIJUM — Email Template Catalogue

## 1. Overview

This document provides the definitive catalogue of all transactional and operational email templates implemented in the TIJUM notification architecture.

All email templates are defined in `app/Services/Notifications/Templates/NotificationTemplateRegistry.php`, linked to business triggers in `NotificationEventCatalogue.php`, and rendered through `app/Mail/TijumTransactionalMail.php` and `resources/views/emails/layouts/tijum.blade.php`.

---

## 2. Design Tokens & Brand Styling

All emails follow the approved TIJUM brand palette and responsive design specifications:

| Token | Hex Value | Usage in Email |
| :--- | :--- | :--- |
| **Deep Plum** | `#442F41` | Primary headings, table values, body emphasis, header brand |
| **Coral** | `#FF7A67` | Action buttons, brand accent, detail box accent bar, link underlines |
| **Soft Peach** | `#FFB6A3` | Badge borders, subtle dividing rules |
| **Cream** | `#FFF4EE` | Full-viewport outer background canvas |
| **Muted Lavender** | `#8B6B82` | Detail labels, secondary descriptors, footer copyright |
| **Neutral Surface** | `#E6E0DB` | Card border, table dividers |
| **Pure White** | `#FFFFFF` | Main content card container |

### Typography:
- **Headings & Badges**: `'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Body & Paragraphs**: `'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

---

## 3. Template Catalogue by Domain

### 3.1 Customer Authentication & Security

| Template Code | Event Type | Category | Subject Template | Approved Variables |
| :--- | :--- | :--- | :--- | :--- |
| `customer.auth.account_verification.email` | `auth.account_verification` | Essential Transactional | `Verify Your Email Address \| TIJUM` | `customer_name`, `action_url` |
| `customer.auth.registration_otp.email` | `auth.registration_otp` | Essential Transactional | `{otp_code} is your TIJUM verification passcode` | `customer_name`, `otp_code`, `action_url` |
| `customer.auth.login_otp.email` | `auth.login_otp` | Essential Transactional | `{otp_code} is your TIJUM login OTP` | `customer_name`, `otp_code`, `action_url` |
| `customer.auth.password_reset.email` | `auth.password_reset` | Essential Transactional | `Reset Your TIJUM Account Password` | `customer_name`, `action_url` |
| `customer.auth.security_alert.email` | `auth.security_alert` | Essential Transactional | `Security Alert: Recent Activity on Your TIJUM Account` | `customer_name`, `reason`, `action_url` |

---

### 3.2 Customer Reservations & Payments

| Template Code | Event Type | Category | Subject Template | Approved Variables |
| :--- | :--- | :--- | :--- | :--- |
| `customer.reservation.submitted.email` | `reservation.submitted` | Essential Transactional | `Reservation Request Received: {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `action_url` |
| `customer.reservation.payment_required.email` | `reservation.payment_required` | Essential Transactional | `Action Required: Pay for Booking {booking_reference} at {property_name} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `amount`, `payment_deadline`, `action_url` |
| `customer.reservation.payment_deadline_reminder.email` | `reservation.payment_deadline_reminder` | Essential Transactional | `Urgent: Payment Window Closing for {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `payment_deadline`, `action_url` |
| `customer.reservation.payment_expired.email` | `reservation.payment_expired` | Essential Transactional | `Payment Window Expired: {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `action_url` |
| `customer.reservation.confirmed.email` | `reservation.confirmed` | Essential Transactional | `Booking Confirmed: {booking_reference} at {property_name} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `check_in_date`, `checkout_date`, `amount`, `action_url` |
| `customer.payment.captured.email` | `payment.captured` | Essential Transactional | `Payment Receipt: INR {amount} for {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `amount`, `action_url` |
| `customer.payment.failed.email` | `payment.failed` | Essential Transactional | `Payment Attempt Unsuccessful: {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `amount`, `failure_reason`, `action_url` |
| `customer.reservation.cancelled.email` | `reservation.cancelled` | Essential Transactional | `Reservation Cancelled: {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `action_url` |
| `customer.reservation.upcoming_stay.email` | `reservation.upcoming_stay` | Operational Update | `Reminder: Your Stay at {property_name} Begins Tomorrow ({check_in_date}) \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `check_in_date`, `action_url` |
| `customer.refund.initiated.email` | `refund.initiated` | Essential Transactional | `Refund Initiated: INR {amount} for {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `amount`, `refund_reference`, `action_url` |
| `customer.refund.completed.email` | `refund.completed` | Essential Transactional | `Refund Processed: INR {amount} for {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `amount`, `refund_reference`, `action_url` |
| `customer.review.invitation.email` | `review.invitation` | Operational Update | `Share your verified review for {property_name} \| TIJUM` | `customer_name`, `property_name`, `booking_reference`, `action_url` |

---

### 3.3 Customer Support & Grievances

| Template Code | Event Type | Category | Subject Template | Approved Variables |
| :--- | :--- | :--- | :--- | :--- |
| `customer.grievance.acknowledged.email` | `grievance.acknowledged` | Essential Transactional | `Grievance Acknowledged: Case {case_reference} \| TIJUM Redressal Cell` | `customer_name`, `case_reference`, `booking_reference`, `property_name`, `action_url` |
| `customer.grievance.status_updated.email` | `grievance.status_updated` | Operational Update | `Status Update: Case {case_reference} ({case_status}) \| TIJUM` | `customer_name`, `case_reference`, `property_name`, `case_status`, `reason`, `action_url` |
| `customer.grievance.resolved.email` | `grievance.resolved` | Essential Transactional | `Case Resolved: {case_reference} \| TIJUM Grievance Redressal` | `customer_name`, `case_reference`, `property_name`, `reason`, `action_url` |
| `customer.grievance.escalated.email` | `grievance.escalated` | Essential Transactional | `Case Escalated: {case_reference} \| TIJUM Executive Redressal` | `customer_name`, `case_reference`, `property_name`, `action_url` |

---

### 3.4 Rewards & Loyalty

| Template Code | Event Type | Category | Subject Template | Approved Variables |
| :--- | :--- | :--- | :--- | :--- |
| `customer.rewards.coupon_qualified.email` | `rewards.coupon_qualified` | Operational Update | `You unlocked a new reward discount on TIJUM!` | `customer_name`, `action_url` |
| `customer.rewards.referral_attributed.email` | `rewards.referral_attributed` | Operational Update | `Your friend joined TIJUM using your referral code!` | `customer_name`, `referral_code`, `action_url` |
| `customer.rewards.referral_points_credited.email` | `rewards.referral_points_credited` | Operational Update | `Bonus: {points_credited} points credited to your TIJUM wallet!` | `customer_name`, `points_credited`, `points_balance`, `action_url` |
| `customer.rewards.points_credited.email` | `rewards.points_credited` | Operational Update | `You earned {points_credited} loyalty points on your recent stay! \| TIJUM` | `customer_name`, `property_name`, `points_credited`, `points_balance`, `action_url` |
| `customer.rewards.points_expiring.email` | `rewards.points_expiring` | Operational Update | `Your TIJUM loyalty points are expiring on {expires_at}` | `customer_name`, `points_balance`, `expires_at`, `action_url` |
| `customer.rewards.points_redeemed.email` | `rewards.points_redeemed` | Essential Transactional | `Points Redemption Confirmation: {booking_reference} \| TIJUM` | `customer_name`, `booking_reference`, `property_name`, `points_credited`, `points_balance`, `action_url` |

---

### 3.5 Partner / Owner Operations

| Template Code | Event Type | Category | Subject Template | Approved Variables |
| :--- | :--- | :--- | :--- | :--- |
| `partner.reservation_received.email` | `partner.reservation_received` | Essential Transactional | `New Reservation Hold: {booking_reference} \| TIJUM Partner` | `owner_name`, `booking_reference`, `property_name`, `check_in_date`, `action_url` |
| `partner.reservation_confirmed.email` | `partner.reservation_confirmed` | Essential Transactional | `Booking Confirmed: {booking_reference} for {property_name} \| TIJUM Partner` | `owner_name`, `booking_reference`, `property_name`, `check_in_date`, `amount`, `action_url` |
| `partner.payment_confirmed.email` | `partner.payment_confirmed` | Essential Transactional | `Payment Received in Escrow: {booking_reference} \| TIJUM Partner` | `owner_name`, `booking_reference`, `property_name`, `amount`, `action_url` |
| `partner.upcoming_checkin.email` | `partner.upcoming_checkin` | Operational Update | `Arrival Reminder: Guest Check-in Tomorrow at {property_name} ({booking_reference}) \| TIJUM Partner` | `owner_name`, `booking_reference`, `property_name`, `check_in_date`, `action_url` |
| `partner.settlement_available.email` | `partner.settlement_available` | Essential Transactional | `Settlement Statement Available: {settlement_reference} \| TIJUM` | `owner_name`, `settlement_reference`, `amount`, `action_url` |
| `partner.transfer_completed.email` | `partner.transfer_completed` | Essential Transactional | `Settlement Payout Completed: INR {amount} ({settlement_reference}) \| TIJUM` | `owner_name`, `amount`, `settlement_reference`, `action_url` |

---

### 3.6 Admin Operations & Security

| Template Code | Event Type | Category | Subject Template | Approved Variables |
| :--- | :--- | :--- | :--- | :--- |
| `admin.urgent_case.email` | `admin.customer_protection_urgent` | Essential Transactional | `URGENT: Customer Protection Escalation {case_reference} \| TIJUM Operations` | `case_reference`, `property_name`, `action_url` |
| `admin.payment_exception.email` | `admin.payment_exception` | Essential Transactional | `Payment Exception: {booking_reference} \| TIJUM Finance` | `booking_reference`, `error_description`, `action_url` |
| `admin.notification_provider_failure.email` | `admin.notification_provider_failure` | Essential Transactional | `CRITICAL: Delivery Provider Failure ({provider}) \| TIJUM Infra` | `channel`, `provider`, `error_description`, `action_url` |
| `admin.security_alert.email` | `admin.security_alert` | Essential Transactional | `Security Alert: Administrative Action Logged \| TIJUM` | `reason`, `created_at`, `action_url` |
