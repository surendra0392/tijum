# TIJUM — Server SMTP Email Architecture

## 1. Executive Summary

This document outlines the technical architecture, design principles, and operational integration of the TIJUM authenticated server SMTP transactional email system. 

TIJUM operates its email infrastructure through its own domain-authenticated mail server (`mail.tijum.com`) utilizing Laravel's native SMTP mail transport powered by Symfony Mailer (`EsmtpTransport`). Rather than relying on external metered third-party transactional email providers (such as Postmark, Amazon SES, Resend, or Mailgun), all platform communications are dispatched through the dedicated host mail server across secure encrypted protocols (SSL/TLS on Port 465 or STARTTLS on Port 587).

The implementation strictly preserves and integrates with TIJUM's existing Phase 18 Central Notification Engine, ensuring zero duplication of dispatch pipelines, complete transaction isolation, idempotency guarantees, and unified audit tracking across all channels (Email, In-App, SMS, WhatsApp).

---

## 2. Core Architectural Pillars

```
+---------------------------------------------------------------------------------------------------+
|                                  TIJUM Domain Business Triggers                                    |
|   (Reservations, Payments, Auth OTP, Grievances, Settlements, Partner Ops, Loyalty Rewards)     |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    NotificationDispatcher                                         |
|  - Validates event against NotificationEventCatalogue                                             |
|  - Resolves destination (Customer, Host, Administrator)                                           |
|  - Checks consent & preference via NotificationPreferenceService                                  |
|  - Generates cryptographic idempotency key (SHA-256)                                              |
|  - Writes persistent NotificationDelivery record                                                  |
|  - Dispatches SendNotificationDeliveryJob::dispatch()->afterCommit()                              |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                    Queue Infrastructure                                           |
|  - Priority Queue (notifications_high): Auth OTP, Password Reset, Security, Urgent Escalations     |
|  - Standard Queue (notifications): Reminders, Confirmations, Statements, Reviews                  |
|  - Exponential Backoff Retry Policy: [10s, 60s, 300s]                                             |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                  EmailNotificationChannel                                         |
|  - Retrieves template definition from NotificationTemplateRegistry                                |
|  - Injects approved event payload variables with HTML entity sanitization                         |
|  - Resolves departmental Reply-To address (bookings@, support@, grievance@, admin@)               |
|  - Attaches RFC 8058 one-click List-Unsubscribe header for operational updates                    |
|  - Assembles dual-format (HTML + Plain Text) TijumTransactionalMail                               |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                            Symfony Mailer SMTP Transport Driver                                   |
|  - Host: mail.tijum.com:465 (smtps SSL) / 587 (STARTTLS)                                         |
|  - Authentication: AUTH LOGIN (no-reply@tijum.com)                                                |
|  - Socket timeout: 5s connection window                                                           |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                               Recipient Mail Transfer Agent (MTA)                                 |
|                         (Gmail, Apple Mail, Outlook, Custom Corporate MTAs)                       |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

### Key Architectural Tenets:
1. **Zero External Lock-In**: Complete autonomy using self-hosted domain SMTP (`mail.tijum.com`).
2. **Absolute Transaction Safety**: All email jobs are queued with `->afterCommit()`. Notification errors or network timeouts never roll back database transactions, reservation bookings, payment captures, or grievance filings.
3. **Strict Credential Protection**: SMTP authentication credentials (`MAIL_PASSWORD`, `MAIL_USERNAME`) are loaded strictly from the environment (`.env`), never hardcoded, never committed to VCS, and sanitized from all exception stack traces and Admin interfaces.
4. **Unified Template Registry**: All email bodies, subjects, and parameters are catalogued centrally in `NotificationTemplateRegistry`.
5. **Brand Consistency**: Responsive HTML + plain-text email layouts adhere strictly to the approved TIJUM design system palette (`#442F41`, `#FF7A67`, `#FFB6A3`, `#FFF4EE`, `#8B6B82`, `#E6E0DB`) and typography (Montserrat for headings, Nunito for body).

---

## 3. Component Breakdown

### 3.1 `NotificationDispatcher`
Located at `app/Services/Notifications/NotificationDispatcher.php`.
- Evaluates incoming domain events against `NotificationEventCatalogue`.
- Resolves recipient destination email from the Eloquent model (`User::$email`, `Owner::$email`, `Admin::$email`).
- Verifies recipient preferences and statutory requirements via `NotificationPreferenceService`. Essential transactional notices (e.g. OTP, booking confirmations, payment receipts) bypass marketing unsubscribe flags.
- Creates an immutable audit row in `notification_deliveries` with a SHA-256 idempotency key:
  $$\text{idempotencyKey} = \text{hash('sha256', } \text{eventType} : \text{notifiableType} : \text{notifiableId} : \text{channel} : \text{seed} \text{)}$$
- Dispatches `SendNotificationDeliveryJob::dispatch($delivery)->afterCommit()`.

### 3.2 `SendNotificationDeliveryJob`
Located at `app/Jobs/SendNotificationDeliveryJob.php`.
- Implements `ShouldQueue` with queue prioritization:
  - Critical/time-sensitive emails (`auth.*`, `security.*`, `payment.*`, `urgent.*`) are routed to `notifications_high`.
  - General operational notifications are routed to `notifications`.
- Configured with `public int $tries = 3;` and exponential retry backoff `[10, 60, 300]`.
- Upon final exhaustion, logs the sanitized failure reason to `notification_deliveries` with status `failed`.

### 3.3 `EmailNotificationChannel`
Located at `app/Services/Notifications/Channels/EmailNotificationChannel.php`.
- Formats email payloads using `NotificationTemplateRegistry::get($delivery->template_code)`.
- Implements contextual departmental Reply-To routing:
  - Grievance / Protection cases: `grievance@tijum.com`
  - Reservations / Bookings: `bookings@tijum.com`
  - Administrative / Security: `admin@tijum.com`
  - General Support: `support@tijum.com`
- Extracts structured transaction details (`Booking Reference`, `Check-in Date`, `Amount`, `OTP Code`, `Points Balance`, etc.) into tabular highlights.
- Injects RFC 8058 `List-Unsubscribe` headers for operational updates.
- Executes `Mail::to($destination)->send($mailable)` and records provider metadata and delivery timestamps.

### 3.4 `SmtpConnectionVerifier`
Located at `app/Services/Notifications/Email/SmtpConnectionVerifier.php`.
- Dedicated diagnostic engine providing continuous health monitoring for the domain mail server.
- Executes structured socket diagnostics:
  1. **DNS Resolution**: Validates hostname `mail.tijum.com` resolution to authoritative server IP (`103.191.209.159`).
  2. **TCP Socket Connectivity**: Verifies port availability (465 SSL or 587 STARTTLS) within 5.0s.
  3. **SMTP Banner & Greeting**: Validates `220 ...` ESMTP handshake.
  4. **TLS/SSL Negotiation**: Confirms cipher suite negotiation.
  5. **SMTP Authentication**: Validates `AUTH LOGIN` with `no-reply@tijum.com`.
  6. **Live Test Dispatch**: Sends authenticated test emails to explicitly authorized admin recipients without touching customer lists.
- Sanitizes all telemetry outputs so passwords and tokens never appear in logs or JSON responses.

### 3.5 Branded Mailable & Template Architecture
Located at:
- `app/Mail/TijumTransactionalMail.php`
- `resources/views/emails/layouts/tijum.blade.php`
- `resources/views/emails/transactional.blade.php`
- `resources/views/emails/transactional_text.blade.php`
- `resources/views/vendor/mail/html/themes/default.css`
- Generates standards-compliant, responsive HTML with fluid 600px width, web-safe CSS fallbacks, Montserrat headings, Nunito body typography, pill call-to-action buttons, and clear plain-text alternatives.
