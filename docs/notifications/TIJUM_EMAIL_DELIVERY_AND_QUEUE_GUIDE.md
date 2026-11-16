# TIJUM Transactional Email Delivery & Queue Architecture Guide

## 1. Overview & Architecture

The TIJUM transactional email system is fully integrated into the existing **Phase 18 Central Notification Engine**. It leverages asynchronous Laravel queues (`SendNotificationDeliveryJob`) and Symfony Mailer SMTP transport connected to `mail.tijum.com:465` (SSL).

All notifications observe database transaction boundaries (`afterCommit()`), guaranteeing that notification delivery failures never roll back business operations such as customer reservations, payments, cancellations, or refunds.

---

## 2. Queue Topology & Priority Partitioning

To guarantee that time-sensitive communications (OTP, password resets, payment notifications) are not delayed by bulk, informational, or batch emails, TIJUM implements priority queue partitioning.

| Queue Name | Priority Level | Purpose & Event Types | Target Dispatch Latency |
| :--- | :--- | :--- | :--- |
| `notifications_high` | **P0 (Critical)** | `auth.*` (OTP, Verification, Password Reset), `security.*` (Account Alerts), `payment.*` (Payment Required, Confirmed), `urgent.*` | `< 5 seconds` |
| `notifications` | **P1 (Standard)** | `reservation.*` (Lifecycle updates, reminders), `support.*` (Grievances), `partner.*` (New bookings, settlements), `admin.*` | `< 30 seconds` |
| `default` | **P2 (Low/Bulk)** | Marketing, non-critical background jobs | Best effort |

### Automatic High-Priority Routing Logic
In `SendNotificationDeliveryJob::handle()` and dispatching pipelines:
```php
$isHighPriority = str_starts_with($this->delivery->event_type, 'auth.')
    || str_starts_with($this->delivery->event_type, 'security.')
    || str_starts_with($this->delivery->event_type, 'payment.')
    || in_array($this->delivery->event_type, ['customer_registration_otp', 'customer_password_reset']);

if ($isHighPriority) {
    $this->onQueue(config('tijum.notifications.high_priority_queue', 'notifications_high'));
}
```

---

## 3. Worker Configuration & Supervision

### Local Development / Testing
To process jobs across queues in priority order:
```bash
php artisan queue:work --queue=notifications_high,notifications,default --tries=3 --timeout=60
```

### Production Supervisor Configuration
Deploy Supervisor to maintain resilient, auto-restarting background queue workers.

**File Location:** `/etc/supervisor/conf.d/tijum-worker.conf`
```ini
[program:tijum-worker-high]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/tijum/artisan queue:work --queue=notifications_high,notifications --sleep=2 --tries=3 --timeout=60 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/tijum/storage/logs/worker_high.log
stopwaitsecs=3600

[program:tijum-worker-standard]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/tijum/artisan queue:work --queue=notifications,default --sleep=3 --tries=3 --timeout=90 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/tijum/storage/logs/worker_standard.log
stopwaitsecs=3600
```

---

## 4. Retry Strategy, Backoff & Dead-Letter Handling

### Retry Policies
- **Max Attempts:** 3 tries (`public int $tries = 3;`)
- **Exponential Backoff:** `[10, 60, 300]` seconds:
  - Attempt 1: Immediate execution
  - Attempt 2: After 10 seconds (transient network glitch recovery)
  - Attempt 3: After 60 seconds (rate limiting or server connection reset)
  - Final Attempt: After 300 seconds (5 minutes)

### Failure State Handling
When an email delivery exhausts all retry attempts:
1. The `SendNotificationDeliveryJob::failed()` callback is triggered.
2. The delivery status in `notification_deliveries` is marked as `failed`.
3. Sanitized error messages (without exposing credentials) are recorded in `error_message`.
4. If the failure relates to SMTP authentication or host resolution, an administrative alert is logged to `storage/logs/laravel.log`.

---

## 5. Audit Logging & Idempotency

Every email delivery is tracked in the `notification_deliveries` table:
- `recipient_email`: The resolved destination address.
- `provider`: Set to `smtp`.
- `channel`: Set to `email`.
- `event_type`: The catalogue event (e.g., `reservation.confirmed`).
- `status`: Transitioning through `queued` -> `processing` -> `delivered` / `failed`.
- `sent_at`: Timestamp of successful submission to the SMTP server.
- `metadata`: JSON payload containing template keys, tracking IDs, and headers.

Idempotency keys prevent duplicate dispatches during distributed worker restarts or network timeouts.
