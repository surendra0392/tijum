# TIJUM Phase 13 Completion Report
## Online Payments and Payment Gateway Integration

> **SUPERSEDED NOTICE:** As of the Booking Architecture Correction, TIJUM operates on an instant-confirmation, inventory-controlled booking model. Owner approval before payment has been removed. Reservations are automatically confirmed upon successful payment verification. See `docs/booking-architecture-correction/` for the authoritative architecture.

- **Phase:** 13 — Online Payments and Payment Gateway Integration
- **Status:** Completed (Razorpay Standard Checkout integration, payment models, database migrations, lifecycle state machines, order creation, HMAC-SHA256 signature verification, idempotent webhook processing, automatic reconciliation & expiry command, admin-controlled gateway refunds, printable customer receipts, owner allocation gates, admin payment oversight, MySQL InnoDB concurrency testing, Pint formatting, TypeScript check, and production build verified)
- **Date:** 2026-11-12
- **Previous Phases:** Phases 00–12 (Completed and Verified)
- **Target Documentation:** `docs/TIJUM_PHASE_13_COMPLETION_REPORT.md`

---

## 1. Phase Objective and Completion Status

Phase 13 connects the verified Phase 12 reservation engine to real domestic online payments for TIJUM, the asset-light, food-inclusive accommodation marketplace.

### Customer Journey Realized
1. **Discovery & Reservation:** Customer books an eligible food-inclusive stay in Hyderabad, Guntur, Vijayawada, or Visakhapatnam.
2. **Owner Acceptance:** Property owner accepts the reservation, advancing the status to `awaiting_payment` with an authoritative 15-minute checkout deadline.
3. **Secure Online Payment:** Customer opens Razorpay Standard Checkout in a modal window directly from their reservation detail page and pays via UPI, cards, net banking, or wallets.
4. **Instant Confirmation:** Upon payment capture, Razorpay signature is verified server-side, transitioning the reservation to `confirmed` and unlocking physical room allocation for the owner.
5. **Printable Receipt:** Customer accesses and prints a clean, unstyled printable stay payment receipt (`/reservations/{reference}/receipt`).

**Completion Status:** Fully Implemented, Tested, and Verified.

---

## 2. Phase 12 Architecture Inspected and Reused

Phase 13 strictly preserves and builds upon the existing platform foundation:
- **Phase 01–05 Multi-Guard Authentication:** Preserved strict boundary isolation between `web` (`users`), `owner` (`owners`), and `admin` (`admins`).
- **Phase 06 Property & Physical Room Management:** Physical room allocations (`reservation_room_allocations`) remain strictly locked while a reservation is in `awaiting_payment` and unlock only when a captured payment moves the reservation to `confirmed`.
- **Phase 09A Direct Pricing Architecture:** Reused the immutable financial snapshot columns (`currency_code`, `unit_rate_minor`, `rate_unit`, `total_amount_minor`) stored on `reservations`. Payment orders derive their amount strictly from `$reservation->total_amount_minor`, guaranteeing that frontend clients cannot tamper with amounts.
- **Phase 11 Canonical Timing Policy:** Integrated `StayTimingPolicy` for timezone management (`Asia/Kolkata`) across payment deadlines, expiry reconciliation, and receipt generation.
- **Phase 12 Reservation Lifecycle:** Extended the reservation status enum with `awaiting_payment` and `expired`. Maintained capacity consumption rules: `pending_owner_confirmation`, `awaiting_payment`, and `confirmed` consume inventory; `declined`, `cancelled`, and `expired` release inventory.

---

## 3. Gateway Selected and Reason

### Selected Gateway: Razorpay Standard Checkout
- **Primary Market Fit:** TIJUM operates exclusively in India across Hyderabad (Telangana), Guntur, Vijayawada, and Visakhapatnam (Andhra Pradesh). Razorpay is the domestic market leader offering comprehensive native support for UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard debit and credit cards, domestic netbanking across 50+ Indian banks, and mobile wallets.
- **Implementation Strategy:** Standard Checkout modal (client-side script `https://checkout.razorpay.com/v1/checkout.js`) with server-side order creation and signature verification.
- **Gateway Abstraction:** Enforced through a clean PHP interface `App\Contracts\PaymentGateway` implemented by `App\Services\Payments\RazorpayGateway`, using Laravel's native `Http` client with HTTP Basic Auth, retry policies, and HMAC SHA-256 signature verification. No third-party SDK dependencies were added.

---

## 4. Gateway Account and Model Prerequisites

### Operating Model
- **Platform Direct Merchant Model:** TIJUM collects guest booking payments directly as the merchant of record on Razorpay.
- **Configuration Keys:**
  - `RAZORPAY_KEY_ID`: Public API key for client checkout options.
  - `RAZORPAY_KEY_SECRET`: Secret key used for HTTP Basic Auth order creation and signature validation.
  - `RAZORPAY_WEBHOOK_SECRET`: Shared secret for incoming webhook signature verification (`X-Razorpay-Signature`).
- **Production Gating:** While credentials are configured in test mode for automated verification, live production payments remain gated by the presence and validation of real production API credentials in the environment.

---

## 5. Payment Lifecycle and Reservation Status Changes

Reservation status and payment status remain completely decoupled:

### Reservation Status (`ReservationStatus`)
- `pending_owner_confirmation`: Initial state upon submission. Consumes capacity.
- `awaiting_payment`: Set when owner confirms. Consumes capacity. 15-minute deadline applied.
- `confirmed`: Set when payment is captured. Consumes capacity. Physical room allocation unlocked.
- `declined`: Owner declined request. Releases capacity.
- `cancelled`: Customer or owner cancelled. Releases capacity. If paid, flags `requires_refund_review = true`.
- `expired`: Payment deadline lapsed without captured payment. Releases capacity.

### Payment Status (`PaymentStatus`)
- `created`: Razorpay order generated; awaiting customer checkout attempt.
- `authorized`: Funds authorized at gateway but not yet captured.
- `captured`: Funds settled and captured. Triggers reservation confirmation.
- `failed`: Payment attempt failed at gateway; customer can retry.
- `cancelled`: Payment cancelled or reservation expired prior to capture.
- `partially_refunded`: Part of captured amount refunded by admin.
- `refunded`: Full captured amount refunded by admin.

---

## 6. Payment Window and Expiry Behavior

- **Authoritative Window:** 15 minutes from the moment the owner accepts the reservation (`accepted_at + 15 minutes`).
- **Storage:** Stored in `reservations.payment_deadline_at`.
- **Scheduled Expiry Command:** `php artisan tijum:expire-reservations` scheduled to run every minute via `routes/console.php`.
- **Pre-Expiry Reconcile:** Before expiring an unpaid reservation, the reconciler contacts Razorpay's API to inspect the order status and check for any in-flight captured payments (`fetchOrderPayments`). If a captured payment is discovered, the reservation is confirmed instead of expired. If unpaid, the reservation is marked `expired`, pending payments are marked `cancelled`, and room capacity is instantly released back to the marketplace.

---

## 7. Database Migrations and Schema

Four forward-only migrations were executed on both development (`tijum`) and test (`tijum_test`) databases:

1. **`2026_11_12_180001_add_payment_fields_to_reservations_table.php`**
   - Added `payment_deadline_at` (timestamp null).
   - Added `accepted_at` (timestamp null).
   - Added `expired_at` (timestamp null).
   - Added `requires_refund_review` (boolean default false).
   - Added indexes on `[status, payment_deadline_at]` and `[requires_refund_review]`.

2. **`2026_11_12_180002_create_reservation_payments_table.php`**
   - Primary key `id`.
   - Foreign keys: `reservation_id`, `user_id`.
   - Gateway attributes: `gateway` ('razorpay'), `gateway_order_id`, `gateway_payment_id` (nullable, indexed).
   - Idempotency & financials: `idempotency_key` (unique), `amount_minor` (integer), `currency` (char 3, default 'INR').
   - Status & lifecycle: `status`, `failure_code`, `failure_description`, `gateway_order_created_at`, `captured_at`, `metadata` (json).
   - Timestamps.

3. **`2026_11_12_180003_create_payment_webhook_events_table.php`**
   - Primary key `id`.
   - `gateway` ('razorpay').
   - `event_id` (unique string, e.g., `evt_...`).
   - `event_type` (string, e.g., `payment.captured`).
   - `payload` (json).
   - `status` (`received`, `processed`, `ignored`, `failed`).
   - `error_message` (text nullable).
   - `processed_at` (timestamp nullable).
   - Timestamps.

4. **`2026_11_12_180004_create_reservation_refunds_table.php`**
   - Primary key `id`.
   - Foreign keys: `reservation_payment_id`, `reservation_id`, `initiated_by_admin_id`.
   - Gateway refund attributes: `gateway_refund_id` (nullable, unique), `idempotency_key` (unique).
   - Financials: `amount_minor` (integer), `currency` ('INR').
   - Audit: `status` (`pending`, `processed`, `failed`), `reason` (string), `metadata` (json), `gateway_processed_at`.
   - Timestamps.

---

## 8. Razorpay Order Creation

- **Action:** `App\Actions\Payments\InitiatePaymentOrder`
- **Controller:** `CustomerPaymentController::pay`
- **Execution Flow:**
  1. Validates reservation belongs to authenticated customer and is in `awaiting_payment` state with an unexpired deadline.
  2. Acquires pessimistic `lockForUpdate` on reservation row.
  3. Reuses existing active payment order if one was generated within the last 15 minutes, or creates a new `ReservationPayment` record with a unique idempotency key.
  4. Calls `RazorpayGateway::createOrder` passing `amount_minor`, `currency`, `receipt` (booking reference), and audit notes.
  5. Updates `ReservationPayment` with `gateway_order_id` and persists metadata.
  6. Returns order payload (`order_id`, `amount_minor`, `currency`, `key_id`, customer contact details) for Razorpay checkout popup initialization.

---

## 9. Checkout Signature Verification

- **Action:** `App\Actions\Payments\VerifyCheckoutPayment`
- **Controller:** `CustomerPaymentController::verifyPayment`
- **Verification Logic:**
  - Validates `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` format via `VerifyPaymentRequest`.
  - Calculates expected HMAC-SHA256 signature using `hash_hmac('sha256', "{$orderId}|{$paymentId}", $keySecret)`.
  - Compares signatures using `hash_equals()`. Tampered signatures fail validation and throw `ValidationException::withMessages(['signature' => 'Payment signature verification failed.'])`.
  - Fetches authoritative payment record from gateway via `RazorpayGateway::fetchPayment()` to verify `amount`, `currency`, and `captured` status.
  - Updates `ReservationPayment` to `PaymentStatus::Captured` and invokes `ReservationLifecycle::confirmPaid()` inside a database transaction.

---

## 10. Webhook Security and Deduplication

- **Endpoint:** `POST /webhooks/razorpay` (exempt from CSRF in `bootstrap/app.php`).
- **Signature Check:** Validates `X-Razorpay-Signature` against the raw HTTP request body (`$request->getContent()`) using `hash_hmac('sha256', $rawBody, $webhookSecret)`.
- **Deduplication:**
  - Every incoming webhook is logged in `payment_webhook_events`.
  - Database unique index on `[gateway, event_id]` prevents re-processing duplicate deliveries. Duplicate webhook deliveries return HTTP 200 immediately without reprocessing.
- **Supported Events:**
  - `payment.captured`: Confirms payment and reservation if not already confirmed.
  - `payment.failed`: Records failure description and code on the payment record.
  - `refund.processed`: Reconciles gateway refund status.

---

## 11. Retry and Duplicate-Payment Protection

- If a customer's payment attempt fails or is cancelled in Razorpay checkout, the payment is recorded as `failed` and the reservation remains in `awaiting_payment` until the deadline expires.
- The customer can click "Retry Payment" to initiate a fresh checkout attempt before the deadline.
- Pessimistic locking (`lockForUpdate`) on the reservation and payment records ensures concurrent browser tabs or overlapping webhook calls serialize safely without creating duplicate captured payments.

---

## 12. Payment Amount and Currency Verification

- Client-side checkout parameters are strictly read-only display values for the Razorpay JavaScript SDK.
- The authoritative payment amount is computed by `InitiatePaymentOrder` directly from `reservations.total_amount_minor`.
- During both client verification and webhook processing, the gateway-reported amount and currency (`INR`) are strictly verified against the database before transitioning to `captured`.

---

## 13. Refund Implementation and Limitations

- **Action:** `App\Actions\Payments\InitiateAdminRefund`
- **Authorized Roles:** Only authenticated administrators with `SuperAdmin` or `bookings.manage` / `refunds.manage` permissions can initiate refunds.
- **Controls:**
  - Requires explicit captured payment.
  - Verifies that `amount_minor` is positive and does not exceed the remaining refundable balance (`remainingRefundableAmount()`).
  - Calls `RazorpayGateway::createRefund()` with a unique idempotency key.
  - Updates payment status to `partially_refunded` or `refunded`.
- **Explicit Limitations:** No automated cancellation penalties, seller split payouts, or customer self-service instant wallet refunds were introduced.

---

## 14. Customer Payment Experience

- **Awaiting Payment State:** Features an amber warning card with an active 15-minute countdown clock, summary of stay details, and prominent "Pay ₹X Now with Razorpay" button.
- **Standard Checkout Modal:** Seamless Razorpay checkout modal offering UPI, cards, and netbanking.
- **Confirmed State:** Displays green confirmed badge, successful payment method, captured transaction ID, and a link to the printable receipt.
- **Printable Receipt:** Dedicated route `/reservations/{reference}/receipt` displaying TIJUM branding, booking reference, customer details, food inclusions, payment transaction ID, and timestamp in clean printable styling.

---

## 15. Owner Payment Visibility

- **Status Badge:** Owner reservation detail page highlights payment status (`Awaiting Online Payment`, `Payment Captured`, `Expired`, etc.).
- **Physical Room Allocation Lock:** Room allocation input and action button are strictly disabled while payment is pending. Attempting to post room allocations while awaiting payment returns validation error `'Physical room numbers can only be allocated after payment is captured and the reservation is confirmed.'`.
- **Unlocked State:** As soon as payment is captured, the room allocation controls activate for the owner.

---

## 16. Admin Payment and Refund Oversight

- **Navigation:** Added dedicated "Payments" link to the administrator portal sidebar.
- **Payments Index (`/admin/payments`):** Searchable and filterable table displaying gateway IDs, booking references, customer names, amounts, payment methods, and statuses.
- **Payment Detail (`/admin/payments/{id}`):** Complete transaction audit, linked reservation details, captured metadata, refund history, and an explicit refund initiation form for authorized administrators.

---

## 17. Marketplace Settlement Boundary

- **Boundary Adherence:** TIJUM operates purely as an accommodation booking marketplace collecting payments from customers.
- **Zero Seller Disbursements:** No host wallets, automatic vendor payouts, escrow ledgers, or split settlements have been built in Phase 13.
- **Regulatory Safety:** Keeps the platform fully compliant with Indian domestic marketplace standards while maintaining simple accounting boundaries.

---

## 18. Authentication and Authorization

- Customer payments and receipts are protected by `auth:web` and verified via `ReservationPolicy::payByUser` and `ReservationPolicy::receiptByUser`.
- Owner reservations and allocations are protected by `auth:owner` and verified via `ReservationPolicy::viewByOwner` and `ReservationPolicy::allocateByOwner`.
- Admin oversight and refund actions are protected by `auth:admin`, requiring confirmed two-factor TOTP authentication and `bookings.manage` / `refunds.manage` permission.

---

## 19. Files Created or Changed

### Migrations
- `database/migrations/2026_11_12_180001_add_payment_fields_to_reservations_table.php`
- `database/migrations/2026_11_12_180002_create_reservation_payments_table.php`
- `database/migrations/2026_11_12_180003_create_payment_webhook_events_table.php`
- `database/migrations/2026_11_12_180004_create_reservation_refunds_table.php`

### Contracts & Enums
- `app/Contracts/PaymentGateway.php`
- `app/Enums/PaymentStatus.php`
- `app/Enums/RefundStatus.php`
- `app/Enums/ReservationStatus.php` (updated with `AwaitingPayment`, `Expired`)

### Models
- `app/Models/Reservation.php` (updated with payment relationships and helper methods)
- `app/Models/ReservationPayment.php`
- `app/Models/ReservationRefund.php`
- `app/Models/PaymentWebhookEvent.php`

### Services & Actions
- `app/Services/Payments/RazorpayGateway.php`
- `app/Actions/Payments/InitiatePaymentOrder.php`
- `app/Actions/Payments/VerifyCheckoutPayment.php`
- `app/Actions/Payments/ProcessWebhookEvent.php`
- `app/Actions/Payments/ReconcileExpiredReservations.php`
- `app/Actions/Payments/InitiateAdminRefund.php`
- `app/Actions/Reservations/ReservationLifecycle.php` (updated)
- `app/Services/ReservationData.php` (updated)
- `app/Policies/ReservationPolicy.php` (updated)

### Controllers & Requests
- `app/Http/Controllers/Customer/CustomerPaymentController.php`
- `app/Http/Controllers/Webhooks/RazorpayWebhookController.php`
- `app/Http/Controllers/Admin/Payments/AdminPaymentController.php`
- `app/Http/Requests/Payments/VerifyPaymentRequest.php`
- `app/Http/Requests/Admin/Payments/CreateAdminRefundRequest.php`
- `app/Console/Commands/ExpireUnpaidReservationsCommand.php`

### Routes & Middleware
- `bootstrap/app.php` (CSRF exemption for `webhooks/razorpay`)
- `routes/web.php` (payment initiation, verification, receipt, and webhook routes)
- `routes/admin.php` (admin payment oversight and refund routes)
- `routes/console.php` (scheduled command registration)

### Frontend (React 19 + TypeScript + Inertia v3)
- `resources/js/types/payments.ts`
- `resources/js/types/reservations.ts` (updated)
- `resources/js/types/index.ts` (updated)
- `resources/js/pages/reservations/show.tsx` (updated with Razorpay checkout and countdown)
- `resources/js/pages/reservations/receipt.tsx` (new printable receipt)
- `resources/js/pages/owner/reservations/show.tsx` (updated with payment status and allocation blocking)
- `resources/js/pages/admin/reservations/show.tsx` (updated with payment summary)
- `resources/js/pages/admin/payments/index.tsx` (new admin payments listing)
- `resources/js/pages/admin/payments/show.tsx` (new admin payment detail & refund modal)
- `resources/js/layouts/admin-layout.tsx` (added Payments navigation)
- `resources/js/layouts/customer/customer-auth-layout.tsx` (layout meta handling)
- `resources/js/layouts/owner/owner-auth-layout.tsx` (layout meta handling)
- `resources/js/layouts/admin/admin-auth-layout.tsx` (layout meta handling)

---

## 20. Focused Phase 13 Tests

- `tests/Feature/Payments/PaymentOrderCreationTest.php`: Tests order generation, idempotency, customer authorization, and payment window validation.
- `tests/Feature/Payments/PaymentVerificationTest.php`: Tests signature calculation, verification, captured status progression, and tamper rejection.
- `tests/Feature/Payments/PaymentWebhookTest.php`: Tests webhook HMAC validation, deduplication via `event_id`, and out-of-order handling.
- `tests/Feature/Payments/PaymentExpiryTest.php`: Tests automatic expiry of unpaid reservations past deadline and in-flight payment confirmation.
- `tests/Feature/Payments/AdminRefundTest.php`: Tests admin permission gating, partial refunds, full balance refunds, and excessive refund prevention.
- `tests/Feature/Payments/ReservationPaymentLifecycleTest.php`: Comprehensive test covering the full lifecycle from reservation creation, capacity consumption, owner confirmation, allocation locking, payment capture, allocation unlocking, and cancellation capacity release.

```
Tests: 16 passed (96 assertions) in tests/Feature/Payments
```

---

## 21. Full Test-Suite Results

The complete test suite was executed across all application domains:
```
Total Tests: 273
Passed:      271
Skipped:     2 (MySQL-specific InnoDB concurrency tests when running on default SQLite)
Failures:    0
Errors:      0
Assertions:  2,686
Duration:    20.34s
```

---

## 22. Real MySQL Concurrency Test Result

Executed against the isolated dedicated MySQL database `tijum_test`:
```bash
cmd /c "set DB_CONNECTION=mysql&& set DB_DATABASE=tijum_test&& php artisan test --filter=MySqlPaymentConcurrencyTest"
```
**Outcome:**
```
Test: Tests\Feature\Payments\MySqlPaymentConcurrencyTest::test_concurrent_payment_order_initiation_serializes_under_innodb_row_lock
Result: PASSED (2 assertions, 3.58s)
```
**Verification Evidence:** Proved that under real MySQL InnoDB, concurrent transactions holding `SELECT ... FOR UPDATE` row locks properly serialize and time out on `innodb_lock_wait_timeout = 1` without race conditions or dirty writes.

---

## 23. Static Analysis, Frontend, Build, and Audit Results

1. **Pint Code Formatting:**
   `vendor/bin/pint --dirty --format agent` ran cleanly; all dirty PHP files formatted to project standards.
2. **TypeScript Type Checking:**
   `npm run types:check` passed with **0 errors**.
3. **Vite Production Bundling:**
   `npm run build` completed in **10.44s**, generating optimized client assets and manifest without warnings.
4. **Wayfinder Route Generation:**
   Auto-generated typed route definitions for all customer and admin payment endpoints.

---

## 24. Migration Verification

- Development database (`tijum`): 39 total migrations executed.
- Test database (`tijum_test`): 40 tables created and synchronized with InnoDB engine.

---

## 25. Browser and Razorpay Test Mode Evidence

- Verified that customer reservation page displays the Razorpay payment card when in `awaiting_payment`.
- Verified that owner reservation page blocks room allocation until payment confirmation.
- Verified that admin console displays payment history and provides refund capabilities.
- Auth portals (`/login`, `/owner/login`, `/admin/login`) all return HTTP 200 OK with proper layouts, badges, and titles.

---

## 26. Live Payment Readiness and Blockers

- **Readiness:** The payment code is fully functional in test mode and ready for production configuration.
- **Production Enablement Step:** To enable live production payments, the platform operator simply provides the live Razorpay Key ID, Key Secret, and Webhook Secret in the environment (`.env`). No further code changes are required.

---

## 27. Confirmation of Scope Boundaries

- **Zero Seller Payouts:** No partner bank accounts, automated payouts, or split settlements were created.
- **Zero Digital Wallets:** No stored-value customer balances or wallet platforms were created.
- **Zero Bed Inventory:** The platform operates strictly on category-based room sharing capacity (`PropertyRoomType` and `PropertyRoom`), not individual bed records.
- **Zero Hotel PMS / Restaurant Systems:** TIJUM remains a customer-centric marketplace for food-inclusive hostels, PG accommodations, and homestays.
