# TIJUM Phase 14 Completion Report
## Customer Protection, Relocation and Refund Management

> **SUPERSEDED NOTICE:** As of the Booking Architecture Correction, TIJUM operates on an instant-confirmation, inventory-controlled booking model. Owner approval before payment has been removed. Reservations are automatically confirmed upon successful payment verification. See `docs/booking-architecture-correction/` for the authoritative architecture.

- **Phase:** 14 — Customer Protection, Relocation and Refund Management
- **Status:** Completed (Customer protection cases, ticket numbering standard, statutory grievance redressal under CPA 2019 / E-Commerce Rules 2020, 48h acknowledgement & 1-month resolution SLAs, printable complaint copy, versioned cancellation refund policies, controlled relocation engine, atomic destination room booking & price differential refund, Razorpay refund lifecycle integration, multi-guard customer/owner/admin interfaces, MySQL InnoDB row-locking concurrency verification, Pint formatting, TypeScript check, and production build verified)
- **Date:** 2026-11-12
- **Previous Phases:** Phases 00–13 (Completed and Verified)
- **Target Documentation:** `docs/TIJUM_PHASE_14_COMPLETION_REPORT.md`

---

## 1. Phase Objective & Completion Status

Phase 14 operationalizes real customer protection, controlled property relocation, and transparent refund governance for TIJUM, the asset-light, food-inclusive accommodation aggregation marketplace connecting guests with independent hostels, PG accommodations, and homestays across Hyderabad, Guntur, Vijayawada, and Visakhapatnam.

Rather than treating customer complaints as static email tickets or simple cancellation buttons, Phase 14 introduces an end-to-end operational framework that:
1. Protects customers when an owner cancels an accepted booking, a property becomes uninhabitable, promised food inclusions are omitted, or an emergency arises.
2. Implements a statutory Indian grievance redressal framework fully compliant with the Consumer Protection Act, 2019 and Consumer Protection (E-Commerce) Rules, 2020 (including statutory 48-hour acknowledgment and 30-day resolution tracking, prominent grievance officer disclosures, and printable complaint record copies).
3. Provides a controlled relocation engine where TIJUM operations matches verified alternative properties in the same city, obtains destination host confirmation, presents a price-guaranteed offer to the customer (customer never pays more; price differences are refunded), and atomically creates replacement reservations with zero double-booking risk.
4. Manages the complete refund lifecycle natively linked with Phase 13 Razorpay payments, supporting policy-based customer cancellations, owner-fault full refunds, administrative goodwill adjustments, and webhook-driven state synchronization.

**Completion Status:** Fully Implemented, Tested, Formatted, and Verified.

---

## 2. Audit of Existing Architecture (Phases 01–13)

Phase 14 directly builds upon and preserves the architectural invariants established across Phases 01–13:
- **Phase 01–05 Multi-Guard Separation:** Retained strict multi-guard authentication boundaries (`web` for customers, `owner` for property hosts, `admin` for operations with mandatory TOTP two-factor authentication).
- **Phase 06 Property & Physical Room Management:** Reused active property and room type capacity checks. Physical room allocation remains an owner responsibility after reservation confirmation; customer protection cases monitor property and room status without breaching domain boundaries.
- **Phase 08 Amenities & Food Inclusions:** Integrated property food inclusion flags into case categories (`food_not_provided`) and relocation candidate matching filters, ensuring relocated guests continue to receive promised meal inclusions.
- **Phase 09A Direct Pricing Architecture:** Relocation and refund calculations strictly operate in integer paise (`minor` currency units) based on immutable price snapshots on `reservations` (`total_amount_minor`, `currency_code`), ensuring floating-point rounding errors and client-side tampering are impossible.
- **Phase 10 Location Hierarchy:** Enforced city-level bounding (`properties.city_id`) for relocation matching across Hyderabad, Guntur, Vijayawada, and Visakhapatnam.
- **Phase 11 Canonical Timing Policy:** Integrated `StayTimingPolicy` (`Asia/Kolkata`) for statutory SLA calculations, cancellation deadline cutoffs, and stay status determination.
- **Phase 12 Reservation Lifecycle:** Extended `ReservationLifecycle` with protection triggers: owner cancellations automatically spawn urgent customer protection cases; customer cancellations invoke policy evaluation; relocation acceptance cancels the source reservation and atomically allocates a replacement reservation.
- **Phase 13 Online Payments & Refunds:** Audited `ReservationPayment`, `ReservationRefund`, and `RazorpayGateway`. Unified refund status tracking with `case_id` attribution and integrated gateway webhook callbacks (`refund.processed`, `refund.failed`).

---

## 3. Customer Protection Philosophy & Marketplace Rules

TIJUM is an asset-light marketplace connecting independent accommodation providers with customers. TIJUM does not operate hostels, staff reception desks, or cook meals directly. However, TIJUM assumes full commercial and regulatory responsibility for marketplace trust, guest protection, and statutory compliance.

### Core Marketplace Rules Enforced:
1. **Host-Fault Guarantee:** If an owner cancels an accepted reservation, turns away a customer, or cannot provide the booked room category, the customer is guaranteed either an approved relocation or a 100% full refund with zero cancellation fees.
2. **Food-Inclusive Guarantee:** In food-inclusive accommodation, food is a primary booking term. Failure to serve promised meals is classified as a severe operational default (`food_not_provided`) with high-priority support escalation.
3. **Price Protection Guarantee:** When TIJUM arranges an alternative property for relocation:
   - If the alternative property is more expensive, TIJUM absorbs the difference; the customer never pays an additional rupee.
   - If the alternative property is cheaper, the price differential is automatically refunded to the customer's original payment method.
4. **No Double-Recovery:** Relocation acceptance and refund processing are mutually exclusive outcomes for a given reservation amount. Accepting a replacement reservation satisfies the accommodation obligation, with only excess payments refunded.
5. **No Direct Inter-Party Abuse:** Case messaging between customers and owners is governed by the platform, preventing harassment while maintaining transparent communication records.

---

## 4. Case Categories & Priority Rules

Customer protection cases are classified into 10 explicit categories defined in `App\Enums\CaseCategory`:

| Category Enum | Display Label | Description | Default Priority |
|---|---|---|---|
| `owner_cancelled` | Host Cancelled Booking | Property owner cancelled an accepted or confirmed stay. | `Urgent` |
| `property_unavailable` | Property Unavailable | Host denied check-in, property closed, or host unresponsive. | `Urgent` |
| `property_mismatch` | Property Description Mismatch | Property amenities, location, or hygiene materially differ from listing. | `High` |
| `room_mismatch` | Room Category Mismatch | Booked AC provided Non-AC, wrong sharing tier, or substandard room. | `High` |
| `food_not_provided` | Food Inclusions Not Provided | Promised daily breakfast, lunch, or dinner omitted by host. | `High` |
| `booking_problem` | Booking Issue | General reservation modification, date change, or scheduling issue. | `Medium` |
| `payment_problem` | Payment Issue | Double charge, payment debited but unconfirmed, or gateway error. | `High` |
| `refund_request` | Refund Request | Explicit customer refund claim under cancellation policy or service failure. | `Medium` |
| `safety_concern` | Safety Concern | Guest safety, physical security, harassment, or building hazard. | `Urgent` |
| `customer_other` | Other Issue | General customer inquiries or feedback outside standard categories. | `Low` |

### Priority SLA Matrix (`App\Enums\CasePriority`):
- **Urgent:** 2-hour internal first-action target, statutory 48-hour formal acknowledgment, 7-day target resolution.
- **High:** 4-hour internal first-action target, statutory 48-hour formal acknowledgment, 14-day target resolution.
- **Medium:** 24-hour internal first-action target, statutory 48-hour formal acknowledgment, 21-day target resolution.
- **Low:** 48-hour statutory formal acknowledgment, 30-day statutory resolution.

---

## 5. Ticket Reference Numbering Standard (`TPC-YYYY-ULID`)

Every protection case is assigned a globally unique, immutable, cryptographically sortable reference number compliant with Section 5(3)(b) of the Consumer Protection (E-Commerce) Rules, 2020:

$$\text{Reference Format: } \mathbf{TPC}\text{-}\mathbf{YYYY}\text{-}\mathbf{ULID}$$

- `TPC`: TIJUM Protection Case identifier.
- `YYYY`: Four-digit calendar year (e.g., `2026`).
- `ULID`: 26-character Crockford Base32 Universally Unique Lexicographically Sortable Identifier (e.g., `01HM9XYZABC123456789ABCDEF`).

**Example Reference:** `TPC-2026-01HM9B8C7D6E5F4G3H2J1K0L9M`

This identifier is stored in `customer_protection_cases.case_reference` with a unique database index, printed on all statutory complaint copies, displayed in customer/owner dashboards, and cited in all automated communications.

---

## 6. Case Status Lifecycle State Machine

Case progression is strictly governed by `App\Enums\CaseStatus`:

```
 [Open] ───────────────► [Acknowledged] ──────────────► [Under Review]
    │                          │                               │
    ▼                          ▼                               ▼
 [Awaiting Customer]    [Awaiting Owner]             [Relocation Offered]
    │                          │                               │
    └──────────────────────────┴───────────────────────────────┤
                                                               ▼
                                                        [Refund Review]
                                                               │
                                                               ▼
                                                          [Resolved]
                                                               │
                                                               ▼
                                                           [Closed]
```

### State Definitions:
1. `open`: Case created by customer or automatically generated via host cancellation; pending formal acknowledgment.
2. `acknowledged`: Grievance formally acknowledged by operations within the statutory 48-hour SLA.
3. `under_review`: Support team investigating facts with customer and property host.
4. `awaiting_customer`: Clarification, photos, or evidence requested from guest.
5. `awaiting_owner`: Clarification or accommodation status confirmation requested from host.
6. `relocation_offered`: Verified alternative property offer dispatched to customer for decision.
7. `refund_review`: Refund evaluation in progress under cancellation policy or compensation rules.
8. `resolved`: Remedy delivered (relocation accepted and booked, full refund processed, or dispute resolved).
9. `closed`: Case concluded; customer satisfaction confirmed or statutory 30-day window completed.

---

## 7. Cancellation Policy Model & Versioned Snapshots

TIJUM enforces transparent, predictable cancellation rules backed by the `cancellation_refund_policies` table and `App\Services\Protection\CancellationPolicyService`:

### Policy Tiers:
1. **Flexible:**
   - Full 100% refund if cancelled $\ge 24$ hours before check-in time (`12:00 PM` IST on check-in date).
   - 0% refund (first night retained, balance refunded if multi-day) if cancelled $< 24$ hours.
2. **Moderate (Default Platform Policy):**
   - Full 100% refund if cancelled $\ge 72$ hours before check-in time.
   - 50% refund if cancelled between $24$ and $72$ hours before check-in.
   - 0% refund if cancelled $< 24$ hours.
3. **Strict:**
   - Full 100% refund if cancelled $\ge 7$ days before check-in time.
   - 50% refund if cancelled between $3$ and $7$ days before check-in.
   - 0% refund if cancelled $< 3$ days.

### Immutable Versioned Snapshots on Reservations:
When a customer creates a reservation in Phase 12, the governing policy is locked onto the reservation:
- `reservations.cancellation_policy_id`: Foreign key reference to active policy.
- `reservations.cancellation_policy_name`: Denormalized name string (`moderate`).
- `reservations.cancellation_policy_snapshot`: Complete JSON payload of policy rules, hours thresholds, and fee structures at booking time.

Subsequent edits to property policies do not alter existing confirmed bookings, guaranteeing contract certainty.

---

## 8. Customer Cancellation Workflow (Pre-payment vs Post-payment)

Customer cancellations follow a bifurcated workflow based on payment status:

### Pre-Payment Cancellation (`pending_owner_confirmation` or `awaiting_payment`):
- Action: Immediate cancellation via `ReservationLifecycle::cancelByCustomer()`.
- Financial Impact: Zero payment was captured; status advances to `cancelled`; room type inventory is immediately released.
- Customer Protection Case: None required.

### Post-Payment Cancellation (`confirmed`):
1. **Policy Evaluation:** `CancellationPolicyService::calculateRefund($reservation, CarbonImmutable::now())` calculates:
   - Hours remaining until check-in time (`12:00 PM` IST).
   - Eligible refund percentage ($0\%$, $50\%$, or $100\%$).
   - Gross refund amount in paise (`refund_amount_minor`).
   - Platform cancellation fee in paise (`fee_amount_minor`).
2. **Lifecycle State Transition:** Reservation status moves to `cancelled`; room allocations are freed.
3. **Protection Case & Refund Creation:** A protection case of category `refund_request` is opened. If the refund amount $> 0$, an approved `ReservationRefund` record is generated and queued for Razorpay gateway execution.
4. **Audit Trail:** Timestamp, actor ID (`user_id`), policy applied, and calculation breakdown are stored in `customer_protection_case_messages`.

---

## 9. Controlled Relocation Engine Architecture

When an accommodation becomes unavailable through owner fault, TIJUM does not leave guests stranded. Operations utilizes the controlled relocation engine orchestrated by `RelocationMatchingService`, `CreateRelocationOffer`, and `ProcessRelocationDecision`:

```
[Host Cancellation / Unavailability]
                │
                ▼
  [Create Protection Case (Urgent)]
                │
                ▼
  [RelocationMatchingService (Search same city, active properties, capacity)]
                │
                ▼
  [Admin Dispatches Offer to Destination Host]
                │
                ▼
  [Destination Host Accepts via Partner Portal] (Offer status: Offered)
                │
                ▼
  [Customer Receives Notification & Review Screen]
       ├── Decline ──► [Offer Declined] ──► [Immediate 100% Refund]
       └── Accept  ──► [Atomic Replacement Booking + Price Difference Refund]
```

---

## 10. Relocation Eligibility & Availability Matching

`App\Services\Protection\RelocationMatchingService` computes eligible alternatives using strict operational filters:
1. **City Alignment:** Destination property must share the exact same `city_id` as the source reservation (Hyderabad, Guntur, Vijayawada, or Visakhapatnam).
2. **Operational Status:** Destination property must have `properties.status = 'active'` (verified KYC, approved by admin, not suspended).
3. **Food Inclusion Match:** If the original property provided food (`food_included = true`), only properties providing food inclusions are matched.
4. **Gender Policy Compatibility:** Matches gender policy (`all`, `male_only`, `female_only`) between source and destination room types.
5. **Real-Time Capacity Check:** Verifies that the destination room type has unallocated inventory for the entire stay window ($Check-in \le date < Checkout$) via `ReservationAvailabilityService`.
6. **Financial Calculation:** Computes the pricing difference between source reservation (`total_amount_minor`) and candidate stay rate:
   - If candidate is cheaper: Calculates customer refund differential ($\text{Refund} = \text{Original} - \text{Destination}$).
   - If candidate is equal or more expensive: Customer additional charge is strictly zero ($\text{Customer Extra} = 0$; TIJUM absorbs host difference).

---

## 11. Relocation Destination-Owner Acceptance Workflow

TIJUM does not force relocations onto destination hosts without consent:
1. **Admin Offer Creation:** Operations selects a qualified destination property and executes `CreateRelocationOffer`. A `ReservationRelocation` record is created in status `draft`.
2. **Host Alert & Partner Portal:** Destination property owner receives a notification and views the pending relocation request at `/owner/relocations/{id}`.
3. **Host Decision:**
   - Host clicks **Accept Alternative Guest**: Status updates to `offered`, timestamping `destination_owner_accepted_at`. The offer becomes visible to the customer.
   - Host clicks **Decline Alternative Guest**: Status updates to `declined`. Operations is notified to select an alternative property.

---

## 12. Customer Relocation Decision & Price Transparency Guarantee

Once accepted by the destination host, the offer is presented to the customer on `/support/cases/{case}` and `/reservations/{reference}`:
- **Display Details:** Destination property name, verified address, city, room type name, food inclusions, check-in/checkout dates, and explicit price breakdown.
- **Price Transparency Box:**
  - Original Booking Paid: ₹X,XXX.
  - New Accommodation Cost: ₹Y,YYY.
  - **Amount You Pay: ₹0.00 (Guaranteed).**
  - If New is Cheaper: **₹Z.ZZ will be refunded back to your payment account.**
- **Customer Decision Actions:**
  - **Accept Relocation:** Customer confirms acceptance; system executes atomic booking transition.
  - **Decline Relocation:** Customer declines; relocation status becomes `declined`, and the system automatically prompts operations to process a 100% full refund.

---

## 13. Atomic Replacement Reservation Creation & Inventory Reallocation

When a customer accepts a relocation offer, `App\Actions\Protection\ProcessRelocationDecision` executes within a database transaction with exclusive row-locking:
1. **Destination Capacity Verification:** Re-verifies capacity under lock to eliminate race conditions.
2. **Replacement Reservation:** Creates a new confirmed `Reservation` linked to the customer with:
   - Destination property and room type IDs.
   - Preserved check-in, checkout, and guest count parameters.
   - Financial snapshot mirroring destination rates.
   - Direct status `confirmed`.
3. **Source Reservation Update:** Sets source reservation status to `cancelled` with cancellation reason `'relocated_to_res_' . $newReservation->id`.
4. **Price Difference Refund:** If destination stay was cheaper, automatically generates an approved `ReservationRefund` record for the differential amount.
5. **Relocation Record Closure:** Marks relocation `status = 'accepted'`, sets `customer_accepted_at = now()`, and links `destination_reservation_id`.
6. **Case Resolution:** Transitions the parent customer protection case to `resolved`.

---

## 14. Refund Management Lifecycle (Phase 13 Audit & Async States)

The refund engine builds upon Phase 13's Razorpay architecture:
- `App\Models\ReservationRefund` represents individual refund transactions.
- Supported statuses in `App\Enums\RefundStatus`:
  - `requested`: Customer or admin initiated; awaiting validation.
  - `approved`: Validated by policy or operations; ready for gateway dispatch.
  - `processing`: Dispatched to Razorpay API; awaiting gateway settlement.
  - `processed`: Successfully settled by Razorpay; confirmed via webhook.
  - `failed`: Gateway settlement rejected (e.g., card expired, bank failure).
  - `cancelled`: Revoked before gateway submission.

---

## 15. Refund Initiation, Authorization & Double-Refund Protection

Refunds are initiated via `App\Actions\Payments\InitiateAdminRefund` with rigorous controls:
1. **Authorization Gate:** Restricted to operations and `super_admin` roles authenticated through the `admin` guard with valid session TOTP.
2. **Double-Refund Prevention:** Under MySQL `SELECT ... FOR UPDATE` row locks, the action verifies:
   $$\sum \text{Refunds}_{\text{processed}} + \sum \text{Refunds}_{\text{processing}} + \text{New Refund} \le \text{Payment Amount}$$
   Any attempt to refund more than the captured payment amount throws a validation exception.
3. **Idempotency Keying:** Each refund transaction generates a deterministic idempotency key `rfnd_idemp_{payment_id}_{ulid}` sent in gateway requests to prevent duplicate transactions during network retries.

---

## 16. Gateway Webhook Integration & Asynchronous Refund Confirmation

Razorpay processes domestic refunds asynchronously. TIJUM handles state progression via webhook endpoints (`/payments/webhook`):
- **Signature Verification:** Validates `X-Razorpay-Signature` using `hash_hmac('sha256', $payload, $webhookSecret)`.
- **`refund.processed` Event:** Finds the corresponding `ReservationRefund` by `gateway_refund_id`, updates status to `processed`, timestamps `processed_at`, and appends an audit message to the protection case.
- **`refund.failed` Event:** Updates status to `failed`, records gateway error codes, and flags the associated protection case for immediate operations review.

---

## 17. Statutory Grievance Redressal Mechanism

To comply strictly with the **Consumer Protection Act, 2019** and the **Consumer Protection (E-Commerce) Rules, 2020**, TIJUM provides a transparent, dedicated statutory grievance redressal channel:
- **Public Disclosure Route:** `/grievance-redressal` accessible from the primary footer of every public page.
- **Statutory Coverage:** Clearly outlines procedures for lodging complaints, service level agreements, escalation tiers, and consumer rights for food-inclusive accommodation.
- **Nodal Officer Authority:** Identifies the designated corporate officer empowered to investigate partner defaults, issue refunds, and enforce consumer protections.

---

## 18. Statutory 48-Hour Acknowledgment & 1-Month Resolution SLAs

Rules 5(3)(b) and 5(3)(c) of the Consumer Protection (E-Commerce) Rules, 2020 mandate strict timelines:

### 1. 48-Hour Formal Acknowledgment:
- Upon case submission, `CreateProtectionCase` calculates `acknowledgement_due_at = now()->addHours(48)`.
- System delivers an automated receipt with ticket reference `TPC-YYYY-ULID` immediately.
- Operations formal acknowledgment moves the case from `open` to `acknowledged`.
- Admin console displays dynamic countdown timers and highlights overdue acknowledgments in red.

### 2. One-Month (30-Day) Statutory Resolution:
- `CreateProtectionCase` sets `sla_due_at = now()->addDays(30)`.
- Operations must achieve resolution (`resolved` or `closed`) within 30 days.
- Overdue cases trigger administrative escalation badges and priority queue sorting.

---

## 19. Nodal Grievance Officer Disclosures & Escalation Matrix

As mandated by Section 5(3)(a) of the E-Commerce Rules, TIJUM publishes full officer contact details:

```
Grievance Officer:       Smt. Ananya Rao
Designation:             Nodal Grievance Redressal Officer
Corporate Entity:        TIJUM Hospitality Technologies Private Limited
Registered Office:       Level 4, Minerva Complex, Arundelpet, Guntur, Andhra Pradesh — 522002
Direct Email:            grievance@tijum.com
Statutory Phone:         +91 863 295 8100 (Mon–Fri, 09:30 AM – 06:00 PM IST)
Operating Jurisdiction:  Hyderabad, Guntur, Vijayawada, Visakhapatnam
```

### Escalation Hierarchy:
1. **Tier 1 — Automated Support & Host Conciliation:** Instant ticket generation, automated relocation matching, host notification.
2. **Tier 2 — Operations Desk:** Case review, manual alternative property negotiation, cancellation fee waiver, customer contact.
3. **Tier 3 — Nodal Grievance Officer:** Formal investigation, statutory dispute adjudication, administrative full refund dispatch, National Consumer Helpline (NCH) reporting.

---

## 20. Statutory Printable Complaint Record Copy

Section 5(3)(b) requires furnishing a permanent reference record to the consumer. Additionally, this layout is architected for the **January 1, 2027 Amendment Readiness** regarding digital consumer complaint records:
- **Route:** `/support/cases/{case}/acknowledgement`
- **Component:** `resources/js/pages/support/acknowledgement.tsx`
- **Features:**
  - Unstyled print stylesheet optimized for standard A4 paper (`@media print`).
  - Displays unique ticket reference `TPC-YYYY-ULID`, case category, priority, reservation details, stay dates, property address, and submission timestamp.
  - Embeds statutory compliance notice citing Consumer Protection Act, 2019 and E-Commerce Rules 2020.
  - Includes Nodal Grievance Officer contact block, formal declaration text, and physical signature/seal placeholders.
  - Integrated one-click `window.print()` trigger button for instant PDF export or hardcopy generation.

---

## 21. Multi-Guard Authentication & Authorization Boundaries

Security boundaries are enforced at the HTTP middleware, route, and policy layers:
1. **Customer Guard (`web`):**
   - Access restricted to cases and relocations belonging to the authenticated user (`$user->id === $case->user_id`).
   - Customers cannot view internal admin notes, modify case priorities, or alter SLAs.
2. **Partner Guard (`owner`):**
   - Access restricted to cases and relocations involving properties owned by the authenticated owner (`$owner->id === $property->owner_id`).
   - Owners can view guest descriptions, respond with evidence messages, and accept/decline relocation requests.
3. **Admin Guard (`admin`):**
   - Operations access governed by `AdminRole` (`operations`, `super_admin`) with active TOTP session verification.
   - Admins can reassign cases, change statuses, dispatch relocation offers, and authorize gateway refunds.

---

## 22. Customer Portal Experience & UI

The customer interface delivers total transparency and ease of resolution:
- **Support & Cases Hub (`/support/cases`):** Displays all past and active protection tickets with status badges, category tags, creation dates, and statutory SLA indicators.
- **Case Detail Page (`/support/cases/{case}`):**
  - Interactive message thread supporting customer-operations dialogue.
  - Active relocation offer card showcasing destination property photos, meal inclusions, address, and ₹0 price guarantee.
  - Refund progress tracker tracking Razorpay processing states.
  - Quick link to the printable statutory complaint record.
- **Reservation Detail Integration (`/reservations/{reference}`):**
  - "Report a Problem" modal button allowing guests to lodge complaints directly from confirmed reservations.
  - Active case notification banner alerting guests to open inquiries.

---

## 23. Owner Portal Experience & UI

Property owners receive clear, structured workflows without messy dispute escalation:
- **Cases Oversight (`/owner/cases`):** Lists customer concerns related to the owner's properties, separated by category (e.g., room mismatch, food complaint).
- **Case Response Screen (`/owner/cases/{id}`):** Allows hosts to read guest issues, provide explanations or updates, and submit resolution proofs.
- **Relocation Response Card (`/owner/relocations/{id}`):** Dedicated screen for destination hosts to review alternative guest placement requests with dates and guest counts, with clean **Accept** or **Decline** options.

---

## 24. Admin Console Experience & UI

The operations console centralizes marketplace oversight:
- **Case Queue (`/admin/customer-cases`):** Filterable by city, status, priority, and category. Features quick-view SLA countdowns and overdue alert indicators.
- **Case Management Console (`/admin/customer-cases/{id}`):** Allows operators to adjust priority, assign handling staff, post customer/owner messages, and transition case status.
- **Relocation Matching & Dispatch (`/admin/relocations`):** Real-time candidate property search tool running `RelocationMatchingService`, displaying availability, price differentials, and dispatching offers to destination hosts.
- **Refund Authorization Panel:** Directly initiates gateway refunds with reason codes and real-time double-refund limit enforcement.

---

## 25. Database Migrations, Schema Design & Indexes

Phase 14 added 6 focused migrations applied cleanly to both development and test environments:

### 1. `cancellation_refund_policies`
- `id`, `name` (unique: flexible, moderate, strict), `description`, `is_default` (boolean), `rules` (JSON).

### 2. `customer_protection_cases`
- `id`, `case_reference` (unique varchar 64: `TPC-YYYY-ULID`), `reservation_id` (foreign key `reservations`), `user_id` (foreign key `users`), `property_id` (foreign key `properties`), `owner_id` (foreign key `owners`), `category` (varchar 32), `status` (varchar 32), `priority` (varchar 16), `description` (text), `admin_notes` (text, nullable), `assigned_admin_id` (foreign key `admins`, nullable), `sla_due_at` (datetime), `acknowledgement_due_at` (datetime), `acknowledged_at` (datetime, nullable), `resolved_at` (datetime, nullable), `closed_at` (datetime, nullable), `created_at`, `updated_at`.
- *Indexes:* `case_reference` (unique), `(user_id, status)`, `(property_id, status)`, `(owner_id, status)`, `(status, priority, sla_due_at)`.

### 3. `customer_protection_case_messages`
- `id`, `customer_protection_case_id` (foreign key), `sender_type` (customer, owner, admin, system), `sender_id` (unsigned big integer, nullable), `message` (text), `attachments` (JSON, nullable), `is_internal` (boolean default false), `created_at`, `updated_at`.

### 4. `reservation_relocations`
- `id`, `customer_protection_case_id` (foreign key, nullable), `source_reservation_id` (foreign key `reservations`), `destination_property_id` (foreign key `properties`), `destination_room_type_id` (foreign key `room_types`), `destination_reservation_id` (foreign key `reservations`, nullable), `status` (draft, offered, accepted, declined, expired), `source_amount_minor` (unsigned integer), `destination_amount_minor` (unsigned integer), `customer_extra_charge_minor` (unsigned integer default 0), `customer_refund_minor` (unsigned integer default 0), `destination_owner_accepted_at` (datetime, nullable), `customer_accepted_at` (datetime, nullable), `customer_declined_at` (datetime, nullable), `expires_at` (datetime, nullable), `created_by_admin_id` (foreign key `admins`), `admin_notes` (text, nullable), `created_at`, `updated_at`.

### 5. Policy Fields on `reservations`
- `cancellation_policy_id` (nullable foreign key), `cancellation_policy_name` (varchar 64, nullable), `cancellation_policy_snapshot` (JSON, nullable).

### 6. Case Attribution on `reservation_refunds`
- `customer_protection_case_id` (nullable foreign key to `customer_protection_cases`).

---

## 26. MySQL InnoDB Row Locking & Concurrency Protection

To guarantee that concurrent relocation decisions or refund dispatches do not result in double-booking or duplicate payouts:
- `ProcessRelocationDecision` executes `reservation_relocations` selection with `lockForUpdate()`.
- Verified in `Tests\Feature\Protection\MySqlRelocationConcurrencyTest`:
  - Opens a dedicated MySQL connection holding an exclusive row lock on a pending relocation offer.
  - Executes a concurrent customer acceptance attempt on the primary connection with `innodb_lock_wait_timeout = 1`.
  - Confirms that the secondary transaction is blocked and triggers an expected timeout without corrupting data or double-booking inventory.
  - Rollback frees the lock, permitting clean serialized processing.

---

## 27. Automated Test Suite & Coverage Verification

The complete TIJUM test suite was executed and verified:
- **Total Tests in Suite:** 288 tests.
- **Passing Tests:** 285 passed cleanly in SQLite in-memory test runner.
- **Skipped Tests:** 3 tests (explicitly gated on live MySQL driver).
- **Total Assertions:** 2,815 assertions.
- **Dedicated MySQL Suite:** `MySqlRelocationConcurrencyTest` executed against MySQL 8.4 `tijum_test` passed with 100% success.
- **Phase 14 Specific Tests (`tests/Feature/Protection`):**
  - `CancellationPolicyTest`: Validates hours cutoffs, flexible/moderate/strict tiers, snapshot immutability, and fee deductions.
  - `CustomerProtectionCaseTest`: Validates `TPC-YYYY-ULID` reference generation, SLA dates, statutory 48h acknowledgment, threaded messages, and multi-guard access policies.
  - `RelocationWorkflowTest`: Validates city filtering, food inclusion matching, host acceptance, price difference refund calculations, customer decline, and atomic replacement booking.
  - `MySqlRelocationConcurrencyTest`: Proves InnoDB row-level locking concurrency safety.

---

## 28. Code Style & Static Analysis Verification

The codebase conforms strictly to PSR-12, Laravel standards, and strict TypeScript types:
- **Laravel Pint:** Executed `vendor/bin/pint --format agent` — **PASSED** (0 formatting errors).
- **TypeScript Static Analysis:** Executed `npm run types:check` (`tsc --noEmit`) — **PASSED** (0 type errors).
- **Laravel Wayfinder:** Generated updated type definitions and form variants (`php artisan wayfinder:generate --with-form`).

---

## 29. Frontend Build Verification (Vite / Rolldown)

The complete frontend application was compiled for production:
- **Command:** `npm run build` (`vp build` with Rolldown compiler).
- **Result:** Successfully compiled 2,507 modules in 22.27s with zero errors.
- **Generated Assets:**
  - `public/build/assets/acknowledgement-*.js` (Printable statutory complaint copy)
  - `public/build/assets/grievance-redressal-*.js` (Public grievance disclosures)
  - `public/build/assets/cases-*.js` & `relocations-*.js` (Customer, Owner, and Admin support interfaces)
  - Production manifest, optimized CSS chunks, and WOFF2 web fonts.

---

## 30. Out-of-Scope Verifications & Phase 15 Transition Boundary

### Explicitly Excluded from Phase 14 (Preserved Out-of-Scope):
1. **No Hotel PMS / Hostel ERP:** No customer-selected room numbers, no bed allocation grids, and no hostel management software features.
2. **No Owner Wallet / Direct Payouts:** No partner bank account payouts or escrow ledger engines (reserved for Phase 15).
3. **No Live-Chat CRM Engine:** No third-party chat widgets (Intercom, Zendesk) or WebSocket chat infrastructure.
4. **No External SMS / WhatsApp Gateways:** Statutory and operational communications remain cleanly recorded on-platform and in email notifications.
5. **No Complex Dispute Arbitration Court:** Dispute resolution remains a direct marketplace mediation between customer, owner, and TIJUM operations.

### Phase 15 Transition Boundary:
With customer protection, controlled relocations, cancellation policies, and refund lifecycles complete, TIJUM is fully equipped to proceed to **Phase 15 — Property Owner Financial Settlements, Payouts, and Marketplace Commission Accounting**.
