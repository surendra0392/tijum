# TIJUM Customer Review and Moderation Code of Practice
## Operational Policy and Process Manual

- **Document Identifier:** TIJUM-POL-REV-2026.1
- **Effective Date:** 2026-11-13
- **Guiding Standard:** Bureau of Indian Standards (BIS) IS 19000:2022 — *Online Consumer Reviews — Principles and Requirements for their Collection, Moderation and Publication* (Voluntary Process Alignment)
- **Certification Status Notice:** TIJUM aligns its review collection, moderation, and publication workflows with the core principles of IS 19000:2022. This document constitutes an internal operational code of practice. TIJUM makes **no claim of official BIS certification, third-party conformity assessment, or government endorsement**. Any future formal conformity assessment under the BIS certification scheme for online review platforms constitutes an independent business decision.
- **Regulatory Framework:** Consumer Protection Act, 2019; Consumer Protection (E-Commerce) Rules, 2020; Central Consumer Protection Authority (CCPA) Guidelines for Prevention of Misleading Advertisements and Endorsements, 2022.

---

## 1. Review Eligibility Criteria

To maintain authentic marketplace integrity, customer reviews and star ratings are strictly coupled to genuine, paid accommodation bookings:

1. **Authenticated Customer:** A review can only be authored and submitted by the registered guest whose authenticated customer account (`web` guard) owns the booking record.
2. **Payment Verification:** The reservation must have an associated, verified online payment in `PaymentStatus::Captured` via Razorpay Standard Checkout (Phase 13). Unpaid reservations, pending payment authorizations, or failed transactions are strictly ineligible.
3. **Scheduled Stay Completion:** The reservation must have elapsed its scheduled checkout datetime, calculated deterministically via `StayTimingPolicy` (08:00 AM `Asia/Kolkata` on the checkout date).
4. **Lifecycle State Integrity:** Reservations in terminal failure states (`Declined`, `Expired`, `Cancelled`) cannot receive reviews.
5. **No Relocation Source Duplication:** If a guest accepted an alternative accommodation under Phase 14 relocation, the cancelled original source reservation is barred from review; only the accepted replacement reservation becomes eligible after its scheduled checkout.
6. **One Review per Reservation:** Each eligible reservation permits exactly one property review. Duplicate submissions are barred by database unique constraints and transactional authorization checks.
7. **Configurable Submission Window:** Reviews must be submitted within **30 calendar days** following the scheduled checkout date (`config('tijum.reviews.submission_window_days')`). Upon expiration, new submissions are blocked.

---

## 2. Booking Verification and "Verified Booking" Badge

1. **Accurate Disclosure:** The platform prominently labels eligible public customer reviews with a **Verified Booking** badge.
2. **Distinction from Physical Stay Tracking:** TIJUM accurately discloses that this badge attests that the review originates from a genuine customer with a paid, completed reservation for the specified property. TIJUM **does not claim independent physical presence verification**, on-premise biometric tracking, or physical room key audit.
3. **Prohibition of Fabricated Check-ins:** Administrative staff, property hosts, and platform automated jobs must never manufacture check-in records or assert physical room occupancy.

---

## 3. Review Collection Process

1. **Equal Opportunity (No Review Gating):** All customers who complete eligible paid bookings receive identical, neutral opportunities to submit feedback. TIJUM strictly prohibits "review gating" (filtering customers with satisfaction surveys before inviting only satisfied guests to post public reviews).
2. **Neutral Invitation:** Review prompts in customer dashboards and automated notifications use neutral language ("Share your accommodation experience with future guests") without suggestive bias.
3. **No Financial Incentivization:** TIJUM strictly forbids discounts, cashback, future booking vouchers, loyalty points, or gifts in exchange for reviews or contingent upon rating score.
4. **No Conditional Support:** Customer service resolution, customer protection claims, and refund processing must never be made contingent on posting a positive review or removing critical feedback.

---

## 4. Review Author Responsibilities

Reviewers are expected to provide truthful, first-hand accounts of their accommodation experience:
1. Base feedback exclusively on the booked accommodation and stay period.
2. Provide constructive, specific information regarding cleanliness, food provision, communication, and amenities.
3. Refrain from disclosing personal contact information (phone numbers, private email addresses, personal identification documents).
4. Refrain from profanity, hate speech, abusive language, or defamatory statements.

---

## 5. Moderation Principles and Governance

All review moderation is governed by seven core principles derived from IS 19000:2022:
- **Integrity:** Ensuring reviews represent real customer experiences without commercial or partner distortion.
- **Accuracy:** Displaying ratings calculated mathematically without artificial score weighting or suppression.
- **Privacy:** Protecting guest and partner personal identifiable information (PII) from public exposure.
- **Security:** Preventing bot attacks, script injection (XSS), and unauthorized record tampering.
- **Transparency:** Clearly publishing moderation criteria, eligibility windows, and calculation rules.
- **Accessibility:** Ensuring review submission, reading, and reporting are readily accessible on all devices.
- **Responsiveness:** Timely administrative evaluation of pending submissions and reported content.

---

## 6. Prohibited Content Subject to Moderation Action

Content exhibiting any of the following characteristics is subject to rejection, redaction, or hiding:
1. **Inauthentic or Fake Feedback:** Reviews identified as fabricated, commercially incentivized, or authored by competitors, property owners, or staff.
2. **Non-Guest Submissions:** Content authored by individuals other than the registered booking guest.
3. **Personal Information Disclosure:** Content revealing private phone numbers, home addresses, Aadhaar/PAN details, bank account numbers, or private full names.
4. **Threats and Abusive Language:** Profanity, intimidation, blackmail, harassment, or violent threats directed at hosts, guests, or staff.
5. **Hate Speech & Discrimination:** Content discriminating based on religion, caste, gender, sexual orientation, disability, or regional origin.
6. **Commercial Spam:** Promotional URLs, commercial advertising, or solicitations for competing businesses.
7. **Extortion & Retaliation:** Explicit demands for free stays, unearned refunds, or cash payments under threat of negative ratings.

---

## 7. Legitimate Negative Feedback (Strictly Protected)

Under no circumstances may a review be rejected, hidden, or moderated merely because it expresses an unfavorable opinion or awards a low rating (1 or 2 stars). The following constitute protected, legitimate consumer feedback:
1. Unfavorable assessments of room cleanliness, hygiene, pest presence, or plumbing.
2. Failure of the host to supply promised meals (breakfast, lunch, dinner) or poor food taste/quality.
3. Mismatches between advertised amenities (e.g. AC, Wi-Fi, geyser) and actual property conditions.
4. Host unresponsiveness, delays during arrival, or unprofessional host conduct.
5. Poor perceived value for money or noisy environment.
6. Honest descriptions of property disrepair or maintenance shortcomings.

*Operational Directive:* Any administrative staff member who suppresses legitimate negative feedback to appease a property host or boost platform metrics commits an audit violation subject to immediate disciplinary review.

---

## 8. Review Publication Workflow

```
[ Customer Submits Review ]
            |
            v
[ Status: Pending Moderation ]
            |
   +--------+--------+
   |                 |
   v                 v
[ Compliance Pass ]   [ Policy Violation Detected ]
   |                 |
   v                 v
[ Status: Published ]  [ Status: Rejected / Requires Changes ]
   |                    - Logged audit reason
   v                    - Customer notification
[ Live on Property Page ]
[ Ratings Recomputed ]
```

1. **Submission:** Upon submission, the review enters `ReviewStatus::PendingModeration`.
2. **Moderator Review:** An authorized administrator (`reviews.moderate` permission) verifies compliance with content rules.
3. **Approval:** Upon approval, status transitions to `ReviewStatus::Published`, `published_at` is stamped, and property rating summaries are recomputed.
4. **Rejection:** If content violates policy, the moderator records an auditable justification. Status transitions to `ReviewStatus::Rejected` or `ReviewStatus::RequiresChanges`.

---

## 9. Property Owner Right to Respond

Property hosts are granted a structured, professional right to respond to published customer reviews:
1. **One Public Response:** An owner may post exactly one public response per published review for properties they own.
2. **Content Boundaries:** Owner responses must remain professional, courteous, and constructive. Responses must not:
   - Disclose guest personal data, phone numbers, or private communication.
   - Accuse, insult, or harass the customer.
   - Offer private payoffs or demand rating deletion.
   - Discuss private payment/refund disputes publicly.
3. **Moderation of Responses:** Owner responses are held in `ReviewResponseStatus::PendingModeration` until verified by a moderator to prevent retaliatory harassment.
4. **Auditable Edits:** Revisions to an owner response preserve historical versions for audit tracking.

---

## 10. Review Content Reports and Investigation

1. **Who Can Report:** Any authenticated customer or property host can report a published review or owner response for policy violations.
2. **Grounds for Reporting:** Clearly categorized options (Fake/Fraudulent, Personal Info Disclosed, Abusive Language, Hate Speech, Spam, Conflict of Interest).
3. **Non-Suppression Rule:** Submitting a report **does not automatically hide or delete the review**. The review remains publicly visible while an administrator reviews the claim.
4. **Resolution:** Moderators investigate the report, inspect booking verification logs, and record a formal resolution (`action_taken`, `no_violation_found`, or `closed`) with documented reasoning.

---

## 11. Separation from Accommodation Complaints (Phase 14)

TIJUM strictly distinguishes between two separate operational domains:
- **Review Content Reports (Phase 17):** Address violations in public written text or star ratings (e.g. "This review contains my private phone number"). Managed via `PropertyReviewReport`.
- **Accommodation Grievances & Protection Cases (Phase 14):** Address operational property failures (e.g. "Host denied my room", "Breakfast not provided", "AC not working"). Managed via `CustomerProtectionCase` with statutory SLAs under CPA 2019.

Clear cross-navigation links guide users to the correct mechanism without duplicating complaint tables.

---

## 12. Customer Privacy and Display Names

1. **Public Name Masking:** Public review cards display privacy-safe name representations (e.g., "Suresh R." or "Verified Guest") derived from the customer's account.
2. **Strict PII Redaction:** Customer email addresses, phone numbers, booking billing totals, allocation room numbers, and identity documents are never displayed publicly.
3. **Internal Data Access:** Only administrators with explicit role permissions can view underlying booking contact identifiers.

---

## 13. Review Revisions and Historical Integrity

1. **Edit Window:** Customers may edit their review within **7 calendar days** following publication (`config('tijum.reviews.edit_window_days')`).
2. **Re-Moderation:** Any substantial edit returns the review to `ReviewStatus::PendingModeration`. The prior version is not displayed during re-moderation.
3. **Immutable Revision Audit:** Previous review content, ratings, and timestamps are captured permanently in `property_review_revisions`.
4. **Post-Window Freeze:** After 7 days, direct customer rewriting is disabled to prevent retroactive score manipulation.

---

## 14. Removal and Reinstatement Protocol

1. **Removal Only for Cause:** Published reviews may only be removed or hidden following a documented policy finding (e.g., legal order, proven identity theft, or explicit personal data breach).
2. **No Deletion on Host Request:** A host request or partner dispute does not constitute valid grounds for review removal.
3. **Reinstatement:** If content was hidden erroneously or during investigation, moderators may restore status to `Published`. Rating summaries are automatically recomputed.
4. **Permanent Audit Trail:** The database preserves deleted/hidden review rows; hard SQL deletion of verified customer reviews is strictly forbidden.

---

## 15. Rating Aggregation and Mathematical Transparency

1. **Published Reviews Only:** Only reviews in `ReviewStatus::Published` are included in overall rating averages, category scores, and star distributions.
2. **Zero-Review Properties:** Properties with zero published reviews display a clean empty state ("Be the first guest to share your experience"). **No assumed or fake default ratings (e.g. 5.0) are ever displayed.**
3. **Category Independence:** Category averages (Cleanliness, Food, Communication, Value) are calculated solely from reviews where the customer explicitly provided that category rating.
4. **Single Decimal Precision:** Ratings display to one decimal place (e.g., `4.3 / 5`) using deterministic backend mathematical rounding.

---

## 16. Staff Access, Roles and Audit Logging

1. **Restricted Privileges:** Review moderation requires `AdminRole::SuperAdmin`, `AdminRole::Operations`, or `AdminRole::CustomerSupport` with `reviews.moderate` and `review_reports.manage` permissions.
2. **Two-Factor Authentication:** All administrative moderation actions require active session TOTP verification.
3. **Comprehensive Logging:** Every status change, rejection reason, revision, and report resolution logs the responsible admin ID and timestamp.

---

## 17. Review Process Audit and Cadence

1. **Quarterly Internal Quality Audits:** The Operations and Compliance teams conduct quarterly spot-checks of rejected reviews and report resolutions to verify that negative reviews are not being improperly suppressed.
2. **Discrepancy Reporting:** Any systematic variance between raw review averages and cached summary tables triggers automated platform alerts.
3. **Policy Review:** This code of practice is reviewed annually or upon legislative updates to e-commerce and consumer protection regulations in India.

---
*Authorized for Platform Operations: TIJUM Marketplace Private Limited*  
*Operational Reference: BIS IS 19000:2022 Voluntary Code of Practice*
