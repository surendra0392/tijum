# TIJUM Notification Event Catalogue & Template Registry

## Overview

TIJUM operates a unified, centralized notification infrastructure that connects the marketplace's customer, partner, and administrative domains to four distinct delivery surfaces:
1. **In-App Database Notifications** (Real-time and persistent across customer, partner, and admin portals)
2. **Transactional Email** (Responsive HTML and plain-text layouts in brand colors: Cream `#FFF4EE`, Deep Plum `#442F41`, Coral `#FF7A67`)
3. **Indian Transactional SMS** (TRAI / Telecom Commercial Communications Customer Preference Regulations DLT-compliant service SMS via MSG91 with registered Header ID `TIJUMS`)
4. **Meta WhatsApp Business Platform Cloud API** (Approved Meta Utility templates with strict prior explicit consent enforcement and automated inbound `STOP` opt-out processing)

---

## Event Matrix

| Event Code | Recipient | Category | Channels | Description & Trigger | Consent Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `reservation.submitted` | Customer | Essential Transactional | In-App, Email, SMS, WhatsApp | Customer submits new reservation request | No (Contractual) |
| `reservation.owner_accepted` | Customer | Essential Transactional | In-App, Email, SMS, WhatsApp | Host accepts request; 15-min window opens | No (Contractual) |
| `reservation.owner_declined` | Customer | Essential Transactional | In-App, Email, SMS | Host declines accommodation request | No (Contractual) |
| `reservation.payment_required` | Customer | Essential Transactional | In-App, Email, SMS, WhatsApp | 15-minute checkout countdown begins | No (Contractual) |
| `reservation.payment_deadline_reminder` | Customer | Essential Transactional | In-App, SMS, WhatsApp | 5 minutes remaining on 15-min countdown | No (Contractual) |
| `reservation.payment_expired` | Customer | Essential Transactional | In-App, Email | 15-minute checkout window lapsed | No (Contractual) |
| `reservation.confirmed` | Customer | Essential Transactional | In-App, Email, SMS, WhatsApp | Payment captured; accommodation confirmed | No (Contractual) |
| `payment.captured` | Customer | Essential Transactional | In-App, Email | Online payment gateway capture webhook | No (Contractual) |
| `payment.failed` | Customer | Essential Transactional | In-App, Email, SMS | Online checkout attempt failed/declined | No (Contractual) |
| `reservation.cancelled` | Customer | Essential Transactional | In-App, Email, SMS | Stay cancelled by customer, host, or admin | No (Contractual) |
| `reservation.upcoming_stay` | Customer | Operational Update | In-App, WhatsApp | 24 hours prior to 09:00 AM check-in date | Yes |
| `refund.completed` | Customer | Essential Transactional | In-App, Email, SMS | Gateway processed refund to original source | No (Contractual) |
| `review.invitation` | Customer | Operational Update | In-App, Email | Stay completed (post-08:00 AM checkout) | Yes |
| `partner.reservation_received` | Partner | Essential Transactional | In-App, Email, SMS, WhatsApp | New booking request requires host response | No (Contractual) |
| `partner.reservation_confirmed` | Partner | Essential Transactional | In-App, Email, SMS, WhatsApp | Guest successfully paid; dates confirmed | No (Contractual) |
| `partner.transfer_completed` | Partner | Essential Transactional | In-App, Email | Marketplace payout transfer processed | No (Contractual) |
| `admin.customer_protection_urgent` | Admin | Essential Transactional | In-App, Email | High-priority safety dispute or escalation | No (Contractual) |
| `admin.payment_exception` | Admin | Essential Transactional | In-App, Email | Gateway webhook discrepancy or failure | No (Contractual) |
| `admin.notification_provider_failure` | Admin | Essential Transactional | In-App | External SMS or WhatsApp gateway outage | No (Contractual) |

---

## Channel Implementation Architecture

### 1. In-App Database Channel
- **Storage:** Dedicated `notifications` table utilizing Laravel Database Notification conventions with UUID primary keys and polymorphic notifiable models (`User`, `Owner`, `Admin`).
- **Payload:** Stored in `data` JSON column: `title`, `body`, `event_type`, `related_reference`, and optional `action_url`.
- **Portal Endpoints:**
  - Customer: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/mark-all-read`.
  - Partner: `GET /owner/notifications`, `GET /owner/notifications/unread-count`, `POST /owner/notifications/{id}/read`, `POST /owner/notifications/mark-all-read`.
  - Admin: `GET /admin/notifications`, `GET /admin/notifications/{delivery}`, `POST /admin/notifications/{delivery}/retry`.

### 2. Transactional Email Channel
- **Mailable:** `App\Mail\TijumTransactionalMail`
- **Layouts:** `resources/views/emails/layouts/tijum.blade.php`, `resources/views/emails/transactional.blade.php`, and `resources/views/emails/transactional_text.blade.php`.
- **Visual Palette:** Cream `#FFF4EE` background, Deep Plum `#442F41` typography and headers, Coral `#FF7A67` action buttons.
- **Security:** Strict strip_tags and entity escaping on all interpolated variables to prevent cross-site scripting and HTML injection in mail clients.

### 3. Indian SMS Channel (DLT Compliance)
- **Adapter:** `App\Services\Notifications\Channels\SmsGatewayManager`
- **Provider:** MSG91 Flow API (`https://control.msg91.com/api/v5/flow/`).
- **Indian Mobile Validation:** Numbers strictly formatted to E.164 standard starting with `+91` followed by valid 10-digit Indian mobile prefixes (6, 7, 8, 9). Non-Indian or invalid numbers are immediately marked `Failed` with `INVALID_PHONE_DESTINATION`.
- **DLT Mandatory Checks:** Every SMS template must map to a registered DLT Content Template ID and registered Principal Entity ID. Dispatches lacking a registered DLT template ID are rejected with `DLT_TEMPLATE_MISSING`.

### 4. Meta WhatsApp Business Cloud API Channel
- **Adapter:** `App\Services\Notifications\Channels\WhatsAppCloudApiChannel`
- **Endpoint:** `https://graph.facebook.com/v21.0/{phone_number_id}/messages`
- **Opt-in Gate:** Requires recorded prior express opt-in in `notification_consent_records`. Messages to non-opted-in users are automatically suppressed with `NO_WHATSAPP_OPT_IN`.
- **Utility Templates:** All messages use pre-approved Meta Utility templates (e.g. `tijum_booking_confirmed`, `tijum_reservation_request`).
- **Inbound Opt-Out:** Inbound WhatsApp webhook messages containing `STOP` or `UNSUBSCRIBE` trigger automatic consent revocation in `notification_consent_records` and `notification_preferences`.

---

## Idempotency & Deduplication
Every dispatch generates an immutable SHA-256 hash:
`hash('sha256', "{$eventType}:{$recipientType}:{$recipientId}:{$channel}:{$idempotencySeed}")`
Stored in `notification_deliveries.idempotency_key` with a unique database index. Re-dispatching an identical event within the same operational cycle gracefully returns the existing record without duplicating messages.
