# TIJUM Channel Compliance and Provider Integration Setup Guide
## Indian DLT, Meta WhatsApp Cloud API, Transactional Email and In-App Notifications

- **Document Version:** 1.0.0
- **Phase:** Phase 18 — Notifications, Email, SMS and WhatsApp Integration
- **Platform:** TIJUM Food-Inclusive Accommodation Marketplace
- **Target Audience:** Systems Engineers, Compliance Officers, Operations Administrators, and DevOps Engineers
- **Reference Date:** November 2026

---

## 1. Executive Compliance Overview

TIJUM operates as a premier marketplace for food-inclusive student hostels, PG accommodations, and homestays across Andhra Pradesh and Telangana (Hyderabad, Vijayawada, Guntur, and Visakhapatnam). Operating a customer-facing marketplace in India requires strict adherence to statutory telecommunications regulations and global messaging platform guidelines:

1. **Telecom Regulatory Authority of India (TRAI):** Strict compliance with the *Telecom Commercial Communications Customer Preference Regulations, 2018 (TCCCPR)* governing Distributed Ledger Technology (DLT) registration for transactional SMS.
2. **Meta WhatsApp Business Messaging Policy:** Absolute compliance with WhatsApp Business Terms of Service, Utility message categorization, explicit pre-consent enforcement, and zero marketing spam in transactional channels.
3. **Information Technology Act, 2000 & Digital Personal Data Protection Act (DPDP), 2023:** Lawful processing of user communication data, explicit affirmative consent, verifiable consent audit trails, and instantaneous opt-out honor mechanisms.
4. **Internet Engineering Task Force (IETF) Email Standards:** Full email authentication compliance including SPF, DKIM, and DMARC alignment to ensure inbox deliverability and prevent phishing.

---

## 2. Indian SMS Infrastructure & TRAI DLT Compliance

### 2.1 The Regulatory Framework
Under TRAI's TCCCPR 2018 mandate, any commercial entity sending SMS messages to Indian phone numbers (+91) must register on a blockchain-backed Distributed Ledger Technology (DLT) platform operated by licensed telecom operators (such as Jio, Airtel, Vodafone Idea, or BSNL).

Messages sent without valid registration, unregistered Sender IDs (Headers), or unregistered Content Templates are dropped by telecom gateways at the operator switch level.

### 2.2 Principal Entity (PE) Registration
TIJUM must be registered as an Enterprise/Principal Entity on any of the telecom DLT portals:
- **Vilpower (Vodafone Idea):** `https://www.vilpower.in/`
- **Jio DLT Portal:** `https://trueconnect.jio.com/`
- **Airtel DLT Portal:** `https://www.airtel.in/business/commercial-communication`

**Required Registration Documents:**
- Certificate of Incorporation / Business Registration Certificate.
- Company PAN Card and GSTIN Certificate.
- Authorized Signatory ID Proof and Letter of Authorization.
- Domain name ownership verification (`tijum.com`).

Upon successful registration, the portal issues a unique **Principal Entity ID (PE ID)** (e.g., `1101558290000012345`). This PE ID must be mapped to all SMS gateway configurations.

### 2.3 Sender Header (Sender ID) Registration
TIJUM sends transactional and service-implicit communications. The approved 6-character alphabetic Header ID is:

```
TIJUMS (Transactional / Service Header)
```

- **Header Type:** Service Implicit / Transactional.
- **Header Description:** Official notification and reservation service updates for TIJUM marketplace guests and accommodation hosts.
- **Prefix Application:** In SMS delivery, telcos prepend an operator/circle prefix (e.g., `AX-TIJUMS`, `VM-TIJUMS`, `JD-TIJUMS`).

### 2.4 DLT Content Template Approval
Every SMS format dispatched by the application must be registered and approved on the DLT portal before production use.

**Template Variable Rules:**
- In DLT portals, dynamic variables are defined using the `{#var#}` syntax.
- Maximum continuous character length per variable must not exceed 30 characters.
- Static brand name `TIJUM` must be prominently included in the template body.

**Example Approved DLT Templates:**

| Internal Event Code | DLT Template ID | Registered Template Text |
| :--- | :--- | :--- |
| `reservation.submitted` | `1107161829384729101` | `Dear {#var#}, your booking request {#var#} for {#var#} has been submitted to the host. Track status at tijum.com - TIJUM` |
| `reservation.owner_accepted` | `1107161829384729102` | `Great news! Host accepted booking {#var#} at {#var#}. Complete payment within 15 mins at {#var#} to confirm stay. - TIJUM` |
| `reservation.confirmed` | `1107161829384729103` | `Booking CONFIRMED! Ref: {#var#} at {#var#}. Check-in: {#var#} 09:00 AM. Food inclusive: {#var#}. Details: {#var#} - TIJUM` |
| `payment.failed` | `1107161829384729104` | `Payment for booking {#var#} could not be processed. Please retry before {#var#} at {#var#} to retain room. - TIJUM` |
| `refund.completed` | `1107161829384729105` | `Refund of Rs. {#var#} for booking {#var#} has been initiated to your original payment method. Ref: {#var#} - TIJUM` |
| `partner.reservation_received`| `1107161829384729106` | `New reservation request {#var#} received for {#var#}, {#var#}. Please accept or decline on your owner portal. - TIJUM` |

### 2.5 SMS Gateway Integration (MSG91 Flow API)
TIJUM interfaces with the MSG91 Flow API to ensure instant, high-throughput delivery across all Indian telecommunications circles.

**Configuration Keys (`.env`):**
```dotenv
SMS_DRIVER=msg91
SMS_SIMULATION=false
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_SENDER_ID=TIJUMS
MSG91_DLT_PE_ID=1101558290000012345
MSG91_ENDPOINT=https://control.msg91.com/api/v5/flow/
```

**Recipient Phone Sanitization:**
The `SmsGatewayManager` rigorously validates and normalizes all destination numbers:
1. Strips all spaces, hyphens, and parentheses.
2. Enforces E.164 formatting (`+91` followed by exactly 10 digits).
3. Asserts the first mobile digit belongs to the valid Indian mobile spectrum (`6`, `7`, `8`, or `9`).
4. Non-Indian or malformed phone numbers are rejected immediately at the gateway boundary with status `Failed` and reason `INVALID_PHONE_DESTINATION`, saving API credits and logging diagnostic errors.

---

## 3. Meta WhatsApp Business Cloud API Integration

### 3.1 Architecture & Setup
TIJUM integrates natively with Meta's official WhatsApp Business Platform Cloud API (`graph.facebook.com/v21.0`), eliminating third-party aggregator latency and ensuring end-to-end encryption.

```
+------------------+         HTTPS POST          +---------------------------+
|  TIJUM Dispatcher| ------------------------->  | Meta Cloud API v21.0      |
|  (Laravel Queue) |                             | (graph.facebook.com)      |
+------------------+                             +---------------------------+
         |                                                     |
         | HMAC-SHA256                                         | Status Updates
         v                                                     v
+------------------+        Webhook Receipt      +---------------------------+
| WhatsApp Webhook | <-------------------------  | (sent, delivered,         |
| Controller       |                             |  read, failed)            |
+------------------+                             +---------------------------+
```

### 3.2 Meta Business Manager & Credentials
1. **Meta Business Account:** Verified organization on `business.facebook.com`.
2. **System User:** Created under Business Settings with the role `Admin`.
3. **Permissions Granted:** `whatsapp_business_messaging`, `whatsapp_business_management`.
4. **Permanent Token:** A system-user access token generated with no expiration.
5. **WABA ID & Phone Number ID:** Located under WhatsApp > API Setup.

**Configuration Keys (`.env`):**
```dotenv
WHATSAPP_DRIVER=cloud_api
WHATSAPP_SIMULATION=false
WHATSAPP_TOKEN=EAAG...permanent_token...
WHATSAPP_PHONE_NUMBER_ID=109283746592817
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_WEBHOOK_VERIFY_TOKEN=tijum_secure_webhook_verify_token_2026
WHATSAPP_APP_SECRET=a1b2c3d4e5f67890abcdef1234567890
```

### 3.3 Strict Opt-In Policy & Explicit Consent
WhatsApp messaging is strictly contingent upon prior affirmative user consent:
1. **Explicit Checkbox:** Provided at customer checkout (`/checkout`) and partner onboarding (`/owner/register`).
2. **Consent Record:** Every consent action writes an immutable record to `notification_consent_records`:
   - `notifiable_type`: `App\Models\User` or `App\Models\Owner`
   - `notifiable_id`: Model ID
   - `channel`: `whatsapp`
   - `category`: `essential_transactional` or `operational_updates`
   - `action`: `opt_in`
   - `source`: Web checkout form, account settings toggle, or admin portal
   - `ip_address`: Client IP address for regulatory verification
   - `user_agent`: Client browser signature
   - `created_at`: Exact timestamp in `Asia/Kolkata`
3. **Opt-In Suppression Gate:** `WhatsAppCloudApiChannel` interrogates `NotificationPreferenceService` prior to dispatch. If explicit consent is absent, the dispatch is aborted with code `NO_WHATSAPP_OPT_IN`, safeguarding Meta sender reputation.

### 3.4 Approved Utility Message Templates
TIJUM strictly utilizes pre-approved templates categorized as **UTILITY** by Meta:

1. **`tijum_booking_submitted`**
   - *Category:* UTILITY
   - *Variables:* `{{1}}` Customer Name, `{{2}}` Booking Ref, `{{3}}` Property Name, `{{4}}` Portal URL.
2. **`tijum_booking_accepted`**
   - *Category:* UTILITY
   - *Variables:* `{{1}}` Customer Name, `{{2}}` Booking Ref, `{{3}}` Property Name, `{{4}}` Expiry Time, `{{5}}` Payment URL.
3. **`tijum_booking_confirmed`**
   - *Category:* UTILITY
   - *Variables:* `{{1}}` Customer Name, `{{2}}` Booking Ref, `{{3}}` Property Name, `{{4}}` Check-in Date, `{{5}}` Food Inclusion Summary, `{{6}}` Reservation URL.
4. **`tijum_payment_reminder`**
   - *Category:* UTILITY
   - *Variables:* `{{1}}` Customer Name, `{{2}}` Booking Ref, `{{3}}` Minutes Remaining, `{{4}}` Direct Checkout URL.
5. **`tijum_upcoming_stay`**
   - *Category:* UTILITY
   - *Variables:* `{{1}}` Customer Name, `{{2}}` Property Name, `{{3}}` Address, `{{4}}` Host Phone, `{{5}}` Check-in Time (09:00 AM).
6. **`tijum_partner_new_request`**
   - *Category:* UTILITY
   - *Variables:* `{{1}}` Host Name, `{{2}}` Booking Ref, `{{3}}` Room Category, `{{4}}` Duration, `{{5}}` Owner Action URL.

### 3.5 Automated Inbound STOP Opt-Out Handling
To comply with global anti-spam regulations and Meta's customer protection rules:
- Any incoming message containing `STOP`, `UNSUBSCRIBE`, `CANCEL`, or `OPTOUT` triggers an automatic opt-out.
- The webhook controller `WhatsAppWebhookController` identifies inbound text messages and calls `NotificationPreferenceService::recordOptOut()`.
- Updates `notification_preferences` to disable WhatsApp delivery.
- Logs an immutable `opt_out` event in `notification_consent_records` with source `inbound_whatsapp_stop`.
- Dispatches an automatic standard acknowledgment message confirming that notifications have ceased.

### 3.6 Webhook Signature Verification & Receipts
- **Verification Endpoint:** `GET /webhooks/whatsapp` responds to Meta's hub challenge (`hub.mode`, `hub.challenge`, `hub.verify_token`).
- **Data Endpoint:** `POST /webhooks/whatsapp` accepts delivery receipts (`sent`, `delivered`, `read`, `failed`).
- **HMAC-SHA256 Signature:** The `X-Hub-Signature-256` header is computed using `hash_hmac('sha256', $rawPayload, config('services.whatsapp.app_secret'))` and compared in constant time (`hash_equals`).
- **Monotonic Progression:** Delivery status is only updated forward (`sent` -> `delivered` -> `read`). A duplicate or delayed `delivered` packet cannot overwrite an existing `read` status.

---

## 4. Transactional Email Infrastructure

### 4.1 Deliverability & Infrastructure
Transactional emails are sent via authenticated SMTP or cloud provider APIs (Amazon SES, Postmark, or Mailgun).

**Key Settings (`.env`):**
```dotenv
MAIL_MAILER=smtp
MAIL_HOST=email-smtp.ap-south-1.amazonaws.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your_ses_smtp_username
MAIL_PASSWORD=your_ses_smtp_password
MAIL_FROM_ADDRESS=notifications@tijum.com
MAIL_FROM_NAME="TIJUM Marketplace"
```

### 4.2 DNS Authentication & Anti-Phishing Setup
To ensure deliverability into inbox folders (avoiding spam tabs) and prevent email spoofing:
- **SPF Record:**
  `v=spf1 include:amazonses.com ~all`
- **DKIM Signing:**
  2048-bit RSA keys configured via CNAME records pointing to provider selectors (e.g., `ses._domainkey.tijum.com`).
- **DMARC Policy:**
  `v=DMARC1; p=reject; rua=mailto:dmarc-reports@tijum.com; pct=100; adkim=s; aspf=s`
- **TLS Enforcement:**
  Enforce opportunistic or mandatory TLS 1.2+ on all outbound SMTP handshakes.

### 4.3 Branded Design System & Accessibility
All email templates inherit from `resources/views/emails/layouts/tijum.blade.php`:
- **Canvas Background:** Cream `#FFF4EE` providing a warm, hospitable aesthetic.
- **Brand Typography & Titles:** Deep Plum `#442F41` for high-contrast, elegant readability.
- **Call-to-Action Buttons:** Coral `#FF7A67` with 8px rounded corners and white text (`#FFFFFF`).
- **Food Inclusion Badges:** Emerald `#10B981` indicating verified meal inclusions (Breakfast, Lunch, Dinner).
- **Responsive Layout:** 600px centered container, compatible with Microsoft Outlook, Apple Mail, Gmail, and mobile clients.
- **Plain-Text Alternative:** Every transactional email automatically renders a pure plain-text alternative view (`transactional_text.blade.php`) to accommodate screen readers and low-bandwidth connections.

---

## 5. In-App Notification System & Retention

### 5.1 Architecture & Polling
- **Storage:** Stored in the native `notifications` table with UUID primary keys.
- **Polymorphic Recipients:** Supports `App\Models\User`, `App\Models\Owner`, and `App\Models\Admin`.
- **Navigation Bell:** Integrated into Customer Header (`app-sidebar-header.tsx`), Owner Header (`owner-layout.tsx`), and Admin Header (`admin-layout.tsx`).
- **Lightweight Polling:** The bell component polls `GET /notifications/unread-count` (or `/owner/notifications/unread-count`) at an optimized 60-second interval, updating the crimson pill badge without full page reload.

### 5.2 Data Retention & Maintenance Policy
To maintain high database performance and index efficiency:
1. **Read Notifications:** Kept active for **90 days** from `read_at` timestamp.
2. **Unread Notifications:** Retained for **180 days** before automated archiving.
3. **Pruning Command:**
   `php artisan notifications:prune --days=90` (Configured in Laravel Console Scheduler).

---

## 6. Disaster Recovery & Provider Failure Runbook

### 6.1 Bounded Retries & Exponential Backoff
All outbound delivery jobs (`SendNotificationDeliveryJob`) enforce a strict retry schedule:
- **Attempt 1:** Immediate on queue processing.
- **Attempt 2:** After 10 seconds backoff.
- **Attempt 3:** After 60 seconds backoff.
- **Attempt 4 (Final):** After 300 seconds (5 minutes) backoff.
- If all 3 retries fail, status is permanently set to `Failed` and an error diagnostic log is recorded.

### 6.2 Circuit Breaker & Provider Degradation
If an external provider experiences sustained downtime:
1. Admins monitor real-time delivery failure rates at `/admin/notifications/providers`.
2. Telemetry highlights 24-hour delivery success percentages for SMS and WhatsApp.
3. In case of provider outage, the notification dispatcher logs errors gracefully without interrupting any customer reservation, checkout, or cancellation transactions.
4. Once provider service restores, failed deliveries can be individually retried from the Admin Delivery Detail view (`/admin/notifications/{delivery}`) via the **Retry Delivery** button.

---

## 7. Testing & Verification Checklist

Before deploying notification updates to production, verify:
- [x] All 32 automated notification feature tests pass (`tests/Feature/Notifications`).
- [x] Both SMS and WhatsApp gateways function in simulation mode (`SMS_SIMULATION=true`, `WHATSAPP_SIMULATION=true`).
- [x] All DLT Content Template IDs match telecom portal registrations.
- [x] Meta WhatsApp webhook endpoint verifies correctly with challenge token.
- [x] Inbound `STOP` message revokes WhatsApp preference and logs audit trail.
- [x] Responsive email views render correctly across desktop and mobile screen widths.
- [x] In-app notification bell updates unread count accurately.
- [x] Business actions execute without rollback even if a channel throws a connection exception.
