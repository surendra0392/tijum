# TIJUM Mobile Phase M10A.1 — Support, Grievance Cases & Notifications Report

**Document Reference:** `docs/mobile/M10A1_OWNER_SUPPORT_NOTIFICATION_REPORT.md`  
**Milestone:** M10A.1 (Customer Protection Desk & Central Notifications)  
**Target Screens:** `(partner)/cases/index.tsx`, `(partner)/cases/[reference].tsx`, `(partner)/notifications/index.tsx`  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Customer Protection & Dispute Desk (Phase 14 Integration)

To comply with the Consumer Protection (E-Commerce) Rules and Phase 14 platform grievance standards, hosts must have immediate access to customer protection cases, dispute inquiries, and relocation requests raised by guests.

### 1.1 Support Cases Hub (`(partner)/cases/index.tsx`)
- **Status Filter Tabs:**
  - `Action Required`: Open cases requiring host input, clarification, or room verification.
  - `Under Review`: Cases currently evaluated by the TIJUM Customer Protection team.
  - `Resolved`: Cases successfully resolved with guest agreement or mediated settlement.
  - `All Cases`: Complete grievance history.
- **Priority-Specific SLA Dynamic Alert Banner:** When cases in `action_required` exist, the alert banner dynamically reflects the highest urgency level:
  - **Urgent Cases:** First-action response target within **2 hours** (immediate host action required).
  - **High Priority Cases:** First-action response target within **4 hours**.
  - **Medium Priority Cases:** First-action response target within **24 hours**.
  - **Low / Standard Inquiries:** First-action response target within **48 hours**.
  - **Statutory Timelines:** Displays statutory formal acknowledgement commitment within 48 hours and formal resolution tracking up to 30 days pursuant to the Consumer Protection (E-Commerce) Rules.
- **Priority Badging & SLA Tag:** Every case card in the list displays priority badges (`URGENT`, `HIGH`, `MEDIUM`, `LOW`) accompanied by the specific first-action SLA target.
- **Search:** Search across case references (e.g. `CASE-2026-0812`), booking references, or guest names.

### 1.2 Case Timeline & Message Thread (`(partner)/cases/[reference].tsx`)
The case detail screen displays complete context:
- **Case Summary:** Issue title, category (Cleanliness, Amenities Mismatch, Check-in Refusal, Safety Issue), property name, booking reference, and stay dates.
- **SLA & Statutory Commitment Card:** Highlights the case's priority-specific first action target (Urgent: 2h, High: 4h, Medium: 24h, Low: 48h) and formal statutory milestones (48h acknowledgement, 30 days resolution tracking).
- **Chronological Discussion Thread:** Messages displayed sequentially with distinct visual styling:
  - **Host Messages (You):** Deep plum tinted bubbles aligned right, tagged with `HOST`.
  - **Guest Messages:** Neutral card bubbles aligned left, tagged with `GUEST`.
  - **TIJUM Support Desk:** Amber/Golden tinted administrative notice cards spanning full width, tagged with `TIJUM DESK`.
- **Host Response Submission:** Hosts can enter a detailed response up to 3,000 characters and submit via `OwnerApi.addCaseMessage(reference, message)`. This immediately posts to the case timeline and notifies the support desk and guest.

---

## 2. Centralized Notifications & Device Registration

The partner application connects to the centralized notification engine for real-time operational alerts.

### 2.1 Partner Notification Categories
Partners receive instant alerts for critical events:
- **New Bookings:** Instant notification upon confirmed guest reservation.
- **Check-In / Check-Out Reminders:** Morning arrival schedules and room turnover alerts.
- **Grievance / Dispute Cases:** Immediate push notification when a guest files a customer protection inquiry.
- **Payout Transfers:** Settlement clearance notices containing UTR numbers.
- **Review Alerts:** Notification when a guest publishes a post-stay review.

### 2.2 Unread Count & Badge Counter
- The unread counter endpoint `GET /api/v1/owner/notifications/unread-count` returns active unread notifications.
- The partner bottom tab bar displays an unread count badge on the "Alerts" tab icon.
- Tapping "Mark All Read" triggers `POST /api/v1/owner/notifications/mark-all-read`, resetting the badge immediately.

### 2.3 Push Device Registration Architecture
In accordance with Expo Notifications SDK 55:
- Upon partner sign-in, the device queries `Notifications.getExpoPushTokenAsync()`.
- The token, unique installation UUID, device model, and OS platform (`android` | `ios`) are submitted to `POST /api/v1/owner/devices/register` (`OwnerDeviceController@register`).
- Upon sign-out, `OwnerDeviceController@unregister` is invoked to prevent push notification leakage to subsequent users of shared devices.
