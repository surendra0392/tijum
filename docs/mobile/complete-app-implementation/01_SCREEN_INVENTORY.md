# TIJUM Mobile — Complete Screen & Navigation Inventory
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/01_SCREEN_INVENTORY.md`  
**Generated At:** 2026-11-20  
**Application Root:** `apps/mobile/app`  
**Route Type:** File-Based Routing via Expo Router (`~55.0.18`)

---

## 1. Overview of Mobile Route Hierarchy

The TIJUM mobile application employs Expo Router's file-based layout structure with strict role-segregated navigation stacks:
```
apps/mobile/app/
├── _layout.tsx                     # Root App Layout & Auth Provider
├── index.tsx                       # Splash, Welcome & Persona Selection
├── (auth)/                         # Authentication & Identity Stack
│   ├── _layout.tsx
│   ├── customer-login.tsx
│   ├── customer-register.tsx
│   ├── owner-login.tsx
│   └── owner-register.tsx
├── (customer)/                     # Customer Portal Stack (Tabs & Modals)
│   ├── _layout.tsx                 # 4-Tab Navigation & Hidden Screen Registrations
│   ├── explore/
│   │   ├── index.tsx               # Main Stay Discovery, Search & Filters
│   │   └── property/[slug].tsx     # Stay Details, Room Types, Gallery & Food Info
│   ├── bookings/
│   │   ├── index.tsx               # My Stays (Upcoming, Active, Past, Cancelled)
│   │   ├── create.tsx              # Booking Summary, Price Quote & Razorpay Pay
│   │   └── [reference].tsx         # Confirmed Stay, Front-Desk Code, Review & Refund
│   ├── notifications/index.tsx     # Alerts Feed & Notification Channel Modal
│   ├── profile/index.tsx           # Customer Account, Security & Preferences
│   ├── wishlist/index.tsx          # Saved Stays Grid & Favorites
│   ├── support/
│   │   ├── index.tsx               # Customer Protection Desk & Grievance History
│   │   └── [reference].tsx         # Case Timeline & Official Messaging
│   └── rewards/
│       ├── index.tsx               # Loyalty Overview
│       ├── points.tsx              # Points Wallet & FEFO Ledger
│       ├── referrals.tsx           # Refer & Earn Sharing
│       └── coupons.tsx             # Promotional Vouchers
└── (partner)/                      # Partner / Host Command Stack (Tabs & Modals)
    ├── _layout.tsx                 # Partner 6-Tab Navigation & Property Sub-routes
    ├── dashboard.tsx               # Host Command Center & 6-Month Metrics
    ├── reservations/
    │   ├── index.tsx               # Guest Bookings Feed & Status Filters
    │   └── [reference].tsx         # Front-Desk Review, Room Allocation & Check-in/out
    ├── properties/
    │   ├── index.tsx               # Host Properties List & Verification Badges
    │   ├── create.tsx              # 5-Step Property Wizard
    │   └── [id]/
    │       ├── edit.tsx            # Property Details & Meal Inclusions
    │       ├── room-types.tsx      # Room Categories (Capacity & Amenities)
    │       ├── rooms.tsx           # Physical Rooms (R-101) & Status Management
    │       ├── pricing.tsx         # Authoritative Rate Configuration (Minor Paise)
    │       ├── availability.tsx    # Date Blocking & Inventory Calendar
    │       ├── media.tsx           # Property Photo Uploads & Cover Selection
    │       └── amenities.tsx       # Standard Feature Toggles
    ├── settlements/
    │   ├── index.tsx               # Financial Payouts & Settlement Records
    │   └── [reference].tsx         # Itemized Settlement Reconciliation
    ├── financial-profile/
    │   ├── index.tsx               # Bank Account, PAN/GSTIN & Tax Status
    │   └── agreements.tsx          # Commission Agreement Audit & One-Tap Acceptance
    ├── reviews/index.tsx           # Guest Feedback & 2,500-Char Host Reply
    ├── cases/
    │   ├── index.tsx               # Dispute Management Feed
    │   └── [reference].tsx         # Case Details & Evidence Submission
    ├── notifications/index.tsx     # Partner Operational Alerts
    └── account.tsx                 # Host Profile, Security, Sessions & Role Switch
```

---

## 2. Complete Screen Inventory Table

| Screen Path | Persona | Primary Function | Connected API Endpoint(s) | Reference Design Target |
| :--- | :--- | :--- | :--- | :--- |
| `app/index.tsx` | Shared | Splash, 3-slide value carousel, transparent meal disclosure, official channels, role router | `useAuth()` state | `TIJUM Stay, Dine & Belong App Screens.png` |
| `app/(auth)/customer-login.tsx` | Customer | Customer sign-in via email/phone, forgot password modal | `POST /api/v1/auth/customer/login` | `TIJUM Stay, Dine & Belong App Screens.png` |
| `app/(auth)/customer-register.tsx` | Customer | Customer onboarding with phone verification & legal consent | `POST /api/v1/auth/customer/register` | `TIJUM Owner Management App Flows.png` |
| `app/(auth)/owner-login.tsx` | Partner | Partner sign-in with credentials, password recovery modal | `POST /api/v1/auth/owner/login` | `TIJUM Partner App UI Showcase.png` |
| `app/(auth)/owner-register.tsx` | Partner | 10-field partner onboarding wizard with business info | `POST /api/v1/auth/owner/register` | `TIJUM Owner Management App Flows.png` |
| `app/(customer)/explore/index.tsx` | Customer | Stay discovery, city selector, search bar, canonical categories, filter chips, property list | `GET /api/v1/properties` | `TIJUM Travel App UI Showcase.png` |
| `app/(customer)/explore/property/[slug].tsx` | Customer | Stay detail view, photo gallery modal, room categories, food inclusion badges, house rules | `GET /api/v1/properties/{slug}` | `TIJUM Travel App UI Showcase.png` |
| `app/(customer)/bookings/create.tsx` | Customer | Reservation quote, stay duration, coupon discount, points redemption, Razorpay pay | `POST /api/v1/customer/reservations` | `TIJUM Travel App UI Showcase.png` |
| `app/(customer)/bookings/index.tsx` | Customer | Tabbed booking management (Upcoming, Active, Past, Cancelled) with reservation cards | `GET /api/v1/customer/reservations` | `TIJUM Travel App UI Showcase.png` |
| `app/(customer)/bookings/[reference].tsx` | Customer | Active stay view, 15-min hold countdown, check-in code, review modal, refund tracking | `GET /api/v1/customer/reservations/{ref}` | `TIJUM Travel App UI Showcase.png` |
| `app/(customer)/wishlist/index.tsx` | Customer | 2-column saved stays grid with optimistic toggle | `GET /api/v1/customer/wishlist` | `TIJUM App Account Experience.png` |
| `app/(customer)/support/index.tsx` | Customer | Customer protection SLA overview, contact inquiry, grievance lodge, active case list | `GET/POST /api/v1/customer/cases` | `TIJUM Travel App UI Showcase.png` |
| `app/(customer)/support/[reference].tsx` | Customer | Case timeline, priority SLA badge, message exchange | `GET /api/v1/customer/cases/{ref}` | `TIJUM Booking Journey App Screens.png` |
| `app/(customer)/notifications/index.tsx` | Customer | In-app alerts feed, mark as read, channel preference modal (Email, Push, SMS, WhatsApp) | `GET/PATCH /api/v1/customer/notifications` | `TIJUM App Account Experience.png` |
| `app/(customer)/profile/index.tsx` | Customer | Customer account profile, password update, rewards entry, role switch to host | `GET/PUT /api/v1/customer/profile` | `TIJUM App Account Experience.png` |
| `app/(customer)/rewards/index.tsx` | Customer | Rewards club overview, points balance, referral shortcut | `GET /api/v1/rewards/overview` | `TIJUM App Account Experience.png` |
| `app/(customer)/rewards/points.tsx` | Customer | Points ledger, FEFO expiration status, earn/redeem log | `GET /api/v1/rewards/points` | `TIJUM App Account Experience.png` |
| `app/(customer)/rewards/referrals.tsx` | Customer | Referral code, share link with pre-filled message, referral bonus status | `GET /api/v1/rewards/referrals` | `TIJUM App Account Experience.png` |
| `app/(customer)/rewards/coupons.tsx` | Customer | Available promotional coupons, minimum stay requirements, copy coupon action | `GET /api/v1/rewards/coupons` | `TIJUM App Account Experience.png` |
| `app/(partner)/dashboard.tsx` | Partner | Host command center, metrics (Stays, Bookings, Payout), 6-month trend chart, quick actions | `GET /api/v1/owner/dashboard` | `TIJUM Partner App UI Showcase.png` |
| `app/(partner)/reservations/index.tsx` | Partner | Reservation management feed with status filter tabs (Confirmed, Awaiting, Checked-In) | `GET /api/v1/owner/reservations` | `TIJUM Partner App Operations Dashboard.png` |
| `app/(partner)/reservations/[reference].tsx` | Partner | Front-desk review, guest details, room allocation modal, check-in with notes, check-out | `GET/POST /api/v1/owner/reservations/{ref}` | `TIJUM Partner App Showcase.png` |
| `app/(partner)/properties/index.tsx` | Partner | Property listings overview, active badges, rooms count, edit shortcuts | `GET /api/v1/owner/properties` | `TIJUM Property Management UI Showcase.png` |
| `app/(partner)/properties/create.tsx` | Partner | 5-step property creation wizard (Basic info, Photos, Amenities, Room Types, Pricing) | `POST /api/v1/owner/properties` | `TIJUM Property Management UI Showcase.png` |
| `app/(partner)/properties/[id]/rooms.tsx` | Partner | Physical rooms inventory (R-101 to R-105), room status update (Available, Cleaning, Maint.) | `GET/POST /api/v1/owner/properties/{id}/rooms` | `TIJUM Partner App Showcase.png` |
| `app/(partner)/properties/[id]/pricing.tsx` | Partner | Rate configuration (Daily, Weekly, Monthly paise), tax calculation breakdown | `GET/PUT /api/v1/owner/properties/{id}/pricing` | `TIJUM Property Management UI Showcase.png` |
| `app/(partner)/properties/[id]/availability.tsx` | Partner | Interactive calendar for blocking and unblocking inventory dates | `GET/POST /api/v1/owner/properties/{id}/availability` | `TIJUM Property Management UI Showcase.png` |
| `app/(partner)/settlements/index.tsx` | Partner | Settlement feed, net earnings, TDS & GST deductions, bank account transfer status | `GET /api/v1/owner/settlements` | `TIJUM Partner App UI Showcase.png` |
| `app/(partner)/financial-profile/index.tsx` | Partner | Host business entity, bank details (IFSC, Account number), PAN verification | `GET/PUT /api/v1/owner/financial-profile` | `TIJUM Owner Management App Flows.png` |
| `app/(partner)/financial-profile/agreements.tsx` | Partner | Commission agreements review, terms hash, electronic one-tap acceptance | `GET/POST /api/v1/owner/commission-agreements` | `TIJUM Owner Management App Flows.png` |
| `app/(partner)/reviews/index.tsx` | Partner | Guest reviews list, rating star breakdown, 2,500-char host reply submission | `GET/POST /api/v1/owner/reviews` | `TIJUM Partner App Operations Dashboard.png` |
| `app/(partner)/cases/index.tsx` | Partner | Host dispute cases list, SLA resolution countdown, evidence upload | `GET /api/v1/owner/cases` | `TIJUM Partner App Operations Dashboard.png` |
| `app/(partner)/account.tsx` | Partner | Primary host contact details, password change, active sessions, role switcher | `GET/PUT /api/v1/owner/profile` | `TIJUM Owner Management App Flows.png` |

---

## 3. Exceptional & Shared States Coverage

All exceptional and edge cases are implemented via reusable components (`ExceptionalState.tsx`) or modal views matching `partner screens/TIJUM Mobile App UI Screens.png`:
1. **No Internet Connection (`no-internet`):** Offline illustration, retry button.
2. **No Results Found (`no-results`):** Search reset button, advice on loosening filters.
3. **Session Expired (`session-expired`):** Security notification, redirect to login.
4. **Account Blocked (`account-blocked`):** Support contact guidance for restricted accounts.
5. **Payment Failed (`payment-failed`):** Gateway failure explanation, retry options.
6. **Resume Your Booking (`resume-booking`):** 15-minute inventory hold countdown timer and instant payment completion CTA.
