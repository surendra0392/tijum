# TIJUM Complete Notification Template Catalogue

> **Authoritative Reference:** `app/Services/Notifications/NotificationEventCatalogue.php` and `app/Services/Notifications/Templates/NotificationTemplateRegistry.php`  
> **Architecture:** Phase 18 Central Notification Architecture (`NotificationDispatcher` → `NotificationPreferenceService` → `SendNotificationDeliveryJob` → `EmailNotificationChannel` / `InAppDatabaseChannel` / `PushNotificationChannel`)

---

## 1. Channel Configuration & Governance

| Channel | Config Key | Current Status | Active Templates | Notes |
|---|---|---|---|---|
| **Email** | `tijum.notifications.channels.email.enabled` | **ENABLED** (`true`) | 46 | Primary transactional & operational channel via `TijumTransactionalMail` (`resources/views/emails/transactional.blade.php` & `transactional_text.blade.php`) with Reply-To mailboxes and RFC 8058 unsubscribe headers on `OperationalUpdate`. |
| **In-App** | `tijum.notifications.channels.in_app.enabled` | **ENABLED** (`true`) | 42 | Persisted via `InAppDatabaseChannel` into `notifications` (Web Inertia bell/inbox) and `notification_deliveries` (API v1 mobile apps) with bi-directional `read_at` synchronization. Pre-auth emails exclude In-App. |
| **Push (Mobile / Web)** | `tijum.notifications.channels.push.enabled` | **ENABLED WHERE CONFIGURED** (`true`) | 30 | Dispatched via Expo Push API (`PushNotificationChannel`) to active `MobileDevice` tokens. Sensitive keys (`otp_code`, `password`, `token`, `secret`) are strictly excluded and stripped. |
| **SMS** | `tijum.notifications.channels.sms.enabled` | **DISABLED** (`false`) | 5 *(legacy preserved)* | Intentionally deferred; `SmsGatewayManager` and 5 DLT templates remain inactive unless explicitly enabled. |
| **WhatsApp** | `tijum.notifications.channels.whatsapp.enabled` | **DISABLED** (`false`) | 5 *(legacy preserved)* | Intentionally deferred; `WhatsAppCloudApiChannel` and 5 Meta templates remain inactive unless explicitly enabled. |

**Total Catalogue Inventory:** **46 events** across **3 recipient roles** (29 Customer, 11 Partner, 6 Admin) and **128 registered template definitions** (`46 Email + 42 In-App + 30 Push + 5 disabled SMS + 5 disabled WhatsApp`).

---

## 2. Variable Normalization & Security Rules

`TemplateDefinition::render()` automatically normalizes legacy variable aliases before rendering and strips any unresolved `{placeholder}` markers afterward so raw braces never reach users:

- **Legacy Aliases Supported:** `reservation_code` → `booking_reference`, `partner_name` → `owner_name`, `check_out_date` → `checkout_date`, `refund_amount` / `total_price` → `amount`.
- **High-Priority Queue Routing (`notifications_high`):** Used automatically by `SendNotificationDeliveryJob` for `auth.*`, `security`, `payment`, `refund`, `urgent`, and `EssentialTransactional` events.
- **Secret & OTP Protection:**
  - `auth.registration_otp` and `auth.login_otp` only permit `Email` (+ config-disabled `Sms`). They never route to `Push` or `InApp`.
  - `PushNotificationChannel` explicitly strips `otp_code`, `password`, `token`, and `secret` from the `data` payload sent to Expo.
  - `AdminNotificationController::show()` masks `otp_code`, `password`, `secret`, and `token` before rendering admin delivery inspection pages.
  - `TijumTransactionalMail` escapes HTML values and formats transaction metadata cleanly via `EmailNotificationChannel`.

---

## 3. Customer Notifications (29 Events)

### 3.1 Authentication & Account Security (5 Events)

| Event Type | Category | Active Channels | Template Code(s) | Required Variables | Trigger Location |
|---|---|---|---|---|---|
| `auth.account_verification` | `essential_transactional` | Email | `customer.auth.account_verification.email` | `customer_name`, `action_url`, `expires_at` | Customer email verification flow |
| `auth.registration_otp` | `essential_transactional` | Email | `customer.auth.registration_otp.email` | `customer_name`, `otp_code`, `expires_at`, `action_url` | Registration OTP verification service |
| `auth.login_otp` | `essential_transactional` | Email | `customer.auth.login_otp.email` | `customer_name`, `otp_code`, `expires_at`, `action_url` | Customer OTP login flow |
| `auth.password_reset` | `essential_transactional` | Email | `customer.auth.password_reset.email` | `customer_name`, `action_url`, `expires_at` | Password reset request flow |
| `auth.security_alert` | `essential_transactional` | Email, In-App, Push | `customer.auth.security_alert.{email,in_app,push}` | `customer_name`, `reason`, `created_at`, `action_url` | `SecurityController::update()` |

### 3.2 Reservations, Payments & Refunds (11 Events)

| Event Type | Category | Active Channels | Template Code(s) | Required Variables | Trigger Location |
|---|---|---|---|---|---|
| `reservation.submitted` | `essential_transactional` | Email, In-App, Push | `customer.reservation.submitted.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `room_type`, `check_in_date`, `checkout_date`, `amount`, `payment_deadline`, `action_url` | `CreateReservation::execute()` |
| `reservation.payment_required` | `essential_transactional` | Email, In-App, Push | `customer.reservation.payment_required.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `amount`, `payment_deadline`, `action_url` | Payment retry / pending checkout dispatch |
| `reservation.payment_deadline_reminder` | `essential_transactional` | Email, In-App, Push | `customer.reservation.payment_deadline_reminder.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `payment_deadline`, `action_url` | `SendScheduledNotificationRemindersCommand` |
| `reservation.payment_expired` | `essential_transactional` | Email, In-App, Push | `customer.reservation.payment_expired.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `expired_at`, `action_url` | `ReservationLifecycle::expire()` |
| `reservation.confirmed` | `essential_transactional` | Email, In-App, Push | `customer.reservation.confirmed.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `room_type`, `check_in_date`, `checkout_date`, `check_in_time`, `checkout_time`, `amount`, `action_url` | `ReservationLifecycle::confirmPaid()` |
| `payment.captured` | `essential_transactional` | Email, In-App, Push | `customer.payment.captured.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `amount`, `payment_reference`, `payment_method`, `captured_at`, `action_url` | `ReservationLifecycle::confirmPaid()` |
| `payment.failed` | `essential_transactional` | Email, In-App, Push | `customer.payment.failed.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `amount`, `failure_reason`, `action_url` | `ProcessWebhookEvent::handlePaymentFailed()` |
| `reservation.cancelled` | `essential_transactional` | Email, In-App, Push | `customer.reservation.cancelled.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `cancellation_reason`, `cancelled_at`, `refund_status`, `action_url` | `ReservationLifecycle::cancel()` |
| `reservation.upcoming_stay` | `operational_update` | Email, In-App, Push | `customer.reservation.upcoming_stay.{email,in_app,push}` | `customer_name`, `booking_reference`, `property_name`, `property_address`, `check_in_date`, `check_in_time`, `contact_information`, `action_url` | `SendScheduledNotificationRemindersCommand` |
| `refund.initiated` | `essential_transactional` | Email, In-App, Push | `customer.refund.initiated.{email,in_app,push}` | `customer_name`, `booking_reference`, `amount`, `refund_reference`, `initiated_at`, `action_url` | `InitiateAdminRefund::execute()` |
| `refund.completed` | `essential_transactional` | Email, In-App, Push | `customer.refund.completed.{email,in_app,push}` | `customer_name`, `booking_reference`, `amount`, `refund_reference`, `completed_at`, `action_url` | `InitiateAdminRefund::execute()` / `ProcessWebhookEvent::handleRefundProcessed()` |

### 3.3 Reviews, Protection Cases & Support Desk (7 Events)

| Event Type | Category | Active Channels | Template Code(s) | Required Variables | Trigger Location |
|---|---|---|---|---|---|
| `review.invitation` | `operational_update` | Email, In-App, Push | `customer.review.invitation.{email,in_app,push}` | `customer_name`, `property_name`, `booking_reference`, `review_url`, `action_url` | `SendScheduledNotificationRemindersCommand` |
| `grievance.acknowledged` | `essential_transactional` | Email, In-App, Push | `customer.grievance.acknowledged.{email,in_app,push}` | `customer_name`, `case_reference`, `booking_reference`, `property_name`, `created_at`, `expected_response_time`, `action_url` | `CreateProtectionCase::execute()` |
| `grievance.status_updated` | `essential_transactional` | Email, In-App, Push | `customer.grievance.status_updated.{email,in_app,push}` | `customer_name`, `case_reference`, `property_name`, `case_status`, `reason`, `updated_at`, `action_url` | `UpdateCaseStatus::execute()`, `AddCaseMessage::execute()` |
| `grievance.resolved` | `essential_transactional` | Email, In-App, Push | `customer.grievance.resolved.{email,in_app,push}` | `customer_name`, `case_reference`, `property_name`, `resolution_summary`, `resolved_at`, `action_url` | `UpdateCaseStatus::execute()` |
| `grievance.escalated` | `essential_transactional` | Email, In-App, Push | `customer.grievance.escalated.{email,in_app,push}` | `customer_name`, `case_reference`, `escalation_status`, `reason`, `action_url` | `UpdateCaseStatus::execute()` |
| `support.request_received` | `essential_transactional` | Email, In-App | `customer.support.request_received.{email,in_app}` | `customer_name`, `ticket_reference`, `subject`, `created_at`, `action_url` | `CustomerSupportTicketController::store()` |
| `support.status_updated` | `essential_transactional` | Email, In-App | `customer.support.status_updated.{email,in_app}` | `customer_name`, `ticket_reference`, `ticket_status`, `latest_update`, `updated_at`, `action_url` | `AdminCustomerSupportController::storeMessage()`, `updateStatus()`, `resolve()` |

### 3.4 Rewards, Coupons & Referrals (6 Events)

| Event Type | Category | Active Channels | Template Code(s) | Required Variables | Trigger Location |
|---|---|---|---|---|---|
| `rewards.coupon_qualified` | `operational_update` | Email, In-App, Push | `customer.rewards.coupon_qualified.{email,in_app,push}` | `customer_name`, `coupon_code`, `discount_description`, `expiry_date`, `action_url` | Promotional coupon qualification flow |
| `rewards.referral_attributed` | `operational_update` | Email, In-App | `customer.rewards.referral_attributed.{email,in_app}` | `customer_name`, `referral_code`, `referred_customer_display_name`, `action_url` | `ReferralService::attributeReferral()` |
| `rewards.referral_points_credited` | `operational_update` | Email, In-App, Push | `customer.rewards.referral_points_credited.{email,in_app,push}` | `customer_name`, `points_credited`, `points_balance`, `referral_reference`, `action_url` | `ReferralService::qualifyReferralOnCompletedStay()` |
| `rewards.points_credited` | `operational_update` | Email, In-App, Push | `customer.rewards.points_credited.{email,in_app,push}` | `customer_name`, `property_name`, `booking_reference`, `points_credited`, `points_balance`, `action_url` | `LoyaltyPointsService::activatePendingPoints()` |
| `rewards.points_expiring` | `operational_update` | Email, In-App, Push | `customer.rewards.points_expiring.{email,in_app,push}` | `customer_name`, `points_balance`, `expiring_points`, `expires_at`, `action_url` | `SendScheduledNotificationRemindersCommand` |
| `rewards.points_redeemed` | `essential_transactional` | Email, In-App | `customer.rewards.points_redeemed.{email,in_app}` | `customer_name`, `booking_reference`, `property_name`, `points_redeemed`, `points_balance`, `monetary_value`, `action_url` | `ReservationLifecycle::confirmPaid()` |

---

## 4. Partner / Property Owner Notifications (11 Events)

| Event Type | Category | Active Channels | Template Code(s) | Required Variables | Trigger Location |
|---|---|---|---|---|---|
| `partner.property.submitted` | `operational_update` | Email, In-App, Push | `partner.property.submitted.{email,in_app,push}` | `owner_name`, `property_name`, `submission_reference`, `submitted_at`, `action_url` | `SubmitPropertyVerificationApplication::execute()` |
| `partner.property.approved` | `operational_update` | Email, In-App, Push | `partner.property.approved.{email,in_app,push}` | `owner_name`, `property_name`, `approved_at`, `action_url` | `ApprovePropertyApplication::execute()` |
| `partner.property.changes_requested` | `operational_update` | Email, In-App | `partner.property.changes_requested.{email,in_app}` | `owner_name`, `property_name`, `review_reason`, `requested_changes`, `action_url` | `RejectPropertyApplication::execute()`, `RequestPropertyInformation::execute()` |
| `partner.reservation_received` | `operational_update` | Email, In-App | `partner.reservation_received.{email,in_app}` | `owner_name`, `booking_reference`, `property_name`, `check_in_date`, `action_url` | Registry legacy/manual booking notice (not sent pre-payment on instant booking) |
| `partner.reservation_confirmed` | `essential_transactional` | Email, In-App, Push | `partner.reservation_confirmed.{email,in_app,push}` | `owner_name`, `booking_reference`, `property_name`, `room_type`, `check_in_date`, `checkout_date`, `guest_count`, `amount`, `action_url` | `ReservationLifecycle::confirmPaid()` |
| `partner.payment_confirmed` | `essential_transactional` | Email, In-App | `partner.payment_confirmed.{email,in_app}` | `owner_name`, `booking_reference`, `property_name`, `amount`, `payment_reference`, `captured_at`, `action_url` | `ReservationLifecycle::confirmPaid()` |
| `partner.upcoming_checkin` | `operational_update` | Email, In-App, Push | `partner.upcoming_checkin.{email,in_app,push}` | `owner_name`, `booking_reference`, `property_name`, `check_in_date`, `guest_count`, `room_type`, `action_url` | `SendScheduledNotificationRemindersCommand` |
| `partner.reservation_cancelled` | `essential_transactional` | Email, In-App, Push | `partner.reservation_cancelled.{email,in_app,push}` | `owner_name`, `booking_reference`, `property_name`, `cancelled_at`, `cancellation_reason`, `inventory_release_status`, `action_url` | `ReservationLifecycle::cancel()` *(for confirmed/paid stays)* |
| `partner.settlement_available` | `essential_transactional` | Email, In-App | `partner.settlement_available.{email,in_app}` | `owner_name`, `settlement_reference`, `amount`, `period_start`, `period_end`, `action_url` | `ApprovePartnerSettlement::execute()` |
| `partner.transfer_completed` | `essential_transactional` | Email, In-App, Push | `partner.transfer_completed.{email,in_app,push}` | `owner_name`, `amount`, `settlement_reference`, `transfer_reference`, `completed_at`, `action_url` | `ReleasePartnerSettlement::execute()` & `ProcessWebhookEvent::handleTransferProcessed()` |
| `partner.transfer_failed` | `essential_transactional` | Email, In-App | `partner.transfer_failed.{email,in_app}` | `owner_name`, `amount`, `settlement_reference`, `failure_reason`, `action_url` | `ReleasePartnerSettlement::execute()` & `ProcessWebhookEvent::handleTransferFailed()` |

---

## 5. Admin Operational Alerts (6 Events)

| Event Type | Category | Active Channels | Template Code(s) | Required Variables | Trigger Location |
|---|---|---|---|---|---|
| `admin.customer_protection_urgent` | `essential_transactional` | Email, In-App, Push | `admin.urgent_case.{email,in_app,push}` | `case_reference`, `property_name`, `booking_reference`, `priority`, `action_url` | `CreateProtectionCase::execute()`, `UpdateCaseStatus::execute()`, `SendScheduledNotificationRemindersCommand` |
| `admin.payment_exception` | `essential_transactional` | Email, In-App, Push | `admin.payment_exception.{email,in_app,push}` | `booking_reference`, `payment_reference`, `exception_type`, `error_description`, `created_at`, `action_url` | `ReservationLifecycle::confirmPaid()` *(late payment after expiry/cancellation)* |
| `admin.notification_provider_failure` | `essential_transactional` | Email, In-App | `admin.notification_provider_failure.{email,in_app}` | `channel`, `provider`, `error_description`, `delivery_reference`, `created_at`, `action_url` | `EmailNotificationChannel::notifyAdminsOfProviderFailure()` |
| `admin.security_alert` | `essential_transactional` | Email, In-App, Push | `admin.security_alert.{email,in_app,push}` | `reason`, `admin_reference`, `created_at`, `severity`, `action_url` | `ManageAdminTwoFactor::confirmEnrollment()`, `regenerateRecoveryCodes()` |
| `admin.property_review_required` | `operational_update` | Email, In-App | `admin.property_review_required.{email,in_app}` | `property_name`, `owner_name`, `submission_reference`, `submitted_at`, `action_url` | `SubmitPropertyVerificationApplication::execute()` |
| `admin.refund_exception` | `essential_transactional` | Email, In-App | `admin.refund_exception.{email,in_app}` | `booking_reference`, `refund_reference`, `amount`, `error_description`, `created_at`, `action_url` | `InitiateAdminRefund::execute()`, `ProcessWebhookEvent::handleRefundFailed()` |
