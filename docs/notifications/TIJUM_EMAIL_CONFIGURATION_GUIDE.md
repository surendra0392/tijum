# TIJUM — Email Configuration & Environment Guide

## 1. Overview

This guide details the environment variables, configuration parameters, mailbox identities, and security controls for operating the TIJUM server SMTP email system.

TIJUM uses direct authenticated SMTP through its domain mail server (`mail.tijum.com`). No paid third-party API services are required.

---

## 2. Server Mailbox Specifications

The following dedicated mailboxes are provisioned on `mail.tijum.com` for specific platform functional roles:

| Mailbox Address | Role / Department | Inbound Usage | Outbound Default |
| :--- | :--- | :--- | :--- |
| `no-reply@tijum.com` | Automated System Mailer | Inbound blocked / automated discard | Default transactional sender (`MAIL_FROM_ADDRESS`) |
| `notifications@tijum.com` | Operational Updates | Secondary system notification sender | System notifications & status alerts |
| `bookings@tijum.com` | Reservations & Front Desk | Guest inquiries regarding bookings | Reply-To for booking holds, payments & vouchers |
| `support@tijum.com` | Customer Care | General customer assistance & onboarding | Default platform Reply-To address |
| `grievance@tijum.com` | Grievance Redressal Cell | Statutory Consumer Protection complaints | Reply-To for dispute, mediation & refund cases |
| `admin@tijum.com` | Security & Super Admin | System alerts, security notifications, DMARC | Reply-To for administrative security escalations |
| `sales@tijum.com` | Partner Commercials | Host onboarding & commercial contracts | B2B property partner communications |
| `info@tijum.com` | Domain Catch-All | Catch-all for unrouted domain emails | General organizational inquiries |

---

## 3. Environment Variables (`.env`)

Add the following environment settings to `.env` in the deployment environment:

```dotenv
# =============================================================================
# TIJUM SERVER SMTP EMAIL CONFIGURATION
# =============================================================================
MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=mail.tijum.com
MAIL_PORT=465
MAIL_USERNAME=no-reply@tijum.com
MAIL_PASSWORD="YOUR_AUTHENTICATED_SMTP_PASSWORD"
MAIL_FROM_ADDRESS="no-reply@tijum.com"
MAIL_FROM_NAME="TIJUM"

# Master email channel enable switch
TIJUM_EMAIL_ENABLED=true

# Functional departmental addresses
TIJUM_BOOKINGS_EMAIL="bookings@tijum.com"
TIJUM_SUPPORT_EMAIL="support@tijum.com"
TIJUM_GRIEVANCE_EMAIL="grievance@tijum.com"
TIJUM_ADMIN_EMAIL="admin@tijum.com"
TIJUM_NOTIFICATIONS_EMAIL="notifications@tijum.com"
TIJUM_SALES_EMAIL="sales@tijum.com"
TIJUM_INFO_EMAIL="info@tijum.com"

# Notification Queue Configuration
TIJUM_NOTIFICATION_QUEUE=notifications
TIJUM_NOTIFICATION_HIGH_PRIORITY_QUEUE=notifications_high
```

### Alternative Port 587 (STARTTLS) Configuration

If the host firewall or hosting container restricts outbound Port 465 (SMTPS), configure Port 587 with STARTTLS:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=mail.tijum.com
MAIL_PORT=587
MAIL_USERNAME=no-reply@tijum.com
MAIL_PASSWORD="YOUR_AUTHENTICATED_SMTP_PASSWORD"
MAIL_FROM_ADDRESS="no-reply@tijum.com"
MAIL_FROM_NAME="TIJUM"
```

Both Port 465 (SSL) and Port 587 (STARTTLS) have been tested and verified operational on `mail.tijum.com`.

---

## 4. Configuration Mappings in Codebase

### `config/mail.php`
Laravel's native mail configuration reads:
```php
'default' => env('MAIL_MAILER', 'smtp'),

'mailers' => [
    'smtp' => [
        'transport' => 'smtp',
        'scheme' => env('MAIL_SCHEME', 'smtps'),
        'host' => env('MAIL_HOST', 'mail.tijum.com'),
        'port' => env('MAIL_PORT', 465),
        'username' => env('MAIL_USERNAME', 'no-reply@tijum.com'),
        'password' => env('MAIL_PASSWORD'),
        'timeout' => null,
        'local_domain' => env('MAIL_EHLO_DOMAIN', 'tijum.com'),
    ],
],

'from' => [
    'address' => env('MAIL_FROM_ADDRESS', 'no-reply@tijum.com'),
    'name' => env('MAIL_FROM_NAME', 'TIJUM'),
],
```

### `config/tijum.php`
Central notification settings read:
```php
'notifications' => [
    'enabled' => (bool) env('TIJUM_NOTIFICATIONS_ENABLED', true),
    'channels' => [
        'email' => [
            'enabled' => (bool) env('TIJUM_EMAIL_ENABLED', true),
            'from_address' => env('MAIL_FROM_ADDRESS', 'no-reply@tijum.com'),
            'from_name' => env('MAIL_FROM_NAME', 'TIJUM'),
            'support_email' => env('TIJUM_SUPPORT_EMAIL', 'support@tijum.com'),
            'mailboxes' => [
                'default' => env('MAIL_FROM_ADDRESS', 'no-reply@tijum.com'),
                'bookings' => env('TIJUM_BOOKINGS_EMAIL', 'bookings@tijum.com'),
                'support' => env('TIJUM_SUPPORT_EMAIL', 'support@tijum.com'),
                'grievance' => env('TIJUM_GRIEVANCE_EMAIL', 'grievance@tijum.com'),
                'admin' => env('TIJUM_ADMIN_EMAIL', 'admin@tijum.com'),
                'notifications' => env('TIJUM_NOTIFICATIONS_EMAIL', 'notifications@tijum.com'),
                'sales' => env('TIJUM_SALES_EMAIL', 'sales@tijum.com'),
                'info' => env('TIJUM_INFO_EMAIL', 'info@tijum.com'),
            ],
        ],
    ],
    'queue' => env('TIJUM_NOTIFICATION_QUEUE', 'notifications'),
    'high_priority_queue' => env('TIJUM_NOTIFICATION_HIGH_PRIORITY_QUEUE', 'notifications_high'),
],
```

---

## 5. Security & Isolation Rules

1. **Credential Segregation**: SMTP authentication secrets are stored exclusively in deployment environment configuration (`.env`).
2. **Sanitization in Logs**: `SmtpConnectionVerifier` and `EmailNotificationChannel` filter and mask passwords (`********`) before logging any transport error.
3. **No Database Password Storage**: Database platform settings only manage public identities (display name, support address); authentication credentials remain in `.env`.
4. **Rate Limiting & Queue Throttling**: Background queue workers protect the mail server from bursts during concurrent checkouts or promotional events.

---

## 6. Live Domain Authentication Status (SPF, DKIM, DMARC)

| Protocol | Record Host / Scope | Status | Details |
| :--- | :--- | :--- | :--- |
| **SPF** | `tijum.com` (TXT) | **PASS / ACTIVE** | `v=spf1 +a +mx include:relay.mailbaby.net ~all` |
| **DKIM** | `mail.tijum.com` mailboxes | **✓ CONFIGURED** | Active on all 8 departmental mailboxes (`admin@`, `bookings@`, `grievance@`, `info@`, `no-reply@`, etc.) |
| **DMARC** | `_dmarc.tijum.com` (TXT) | **PASS / ACTIVE** | `v=DMARC1;p=quarantine;sp=none;adkim=r;aspf=r;pct=100;fo=0;rf=afrf;ri=86400` |
| **MX** | `tijum.com` (MX) | **PASS / ACTIVE** | Priority 10 pointing to `mail.tijum.com` |
| **SSL/TLS** | `mail.tijum.com:465` | **PASS / ACTIVE** | Secure TLSv1.2/TLSv1.3 encryption for all outbound mail submission |
