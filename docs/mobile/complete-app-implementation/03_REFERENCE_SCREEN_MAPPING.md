# TIJUM Mobile — Reference Screen Mapping & Design Reconciliation
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/03_REFERENCE_SCREEN_MAPPING.md`  
**Generated At:** 2026-11-20  
**Visual Reference Source:** `E:\tijum\All app UI screens direction`  
**Target Codebase:** `apps/mobile/app` & `apps/mobile/src/components`

---

## 1. Overview & Verification Methodology

Every visual screen depicted across the 12 master reference sheets in `E:\tijum\All app UI screens direction` has been mapped to its authoritative code implementation file. 

This document provides a line-item trace demonstrating that no visual element, interaction pattern, or business flow from the reference design sheets was omitted or altered in the real application.

---

## 2. Customer Experience Mapping (`TIJUM Travel App UI Showcase.png` & `TIJUM Booking Journey App Screens.png`)

### 2.1 Customer Home / Explore (`app/(customer)/explore/index.tsx`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Customer Home Showcase** | Deep Plum header bar, Location dropdown with MapPin (`Hyderabad, Telangana`), Notification bell icon with badge. | `explore/index.tsx` top brand section & `(customer)/_layout.tsx` |
| **Search & Discovery** | Tagline "Find Your Perfect Stay & Meal", pill search input with clear button, returnKeyType="search". | `explore/index.tsx` `searchBar` container with `TextInput` and `X` clear action |
| **3 Canonical Category Cards** | "Hostels & PGs" (Building2), "Homestays" (Home), "Co-Living" (Users) with soft peach highlight. | `src/components/CategoryCard.tsx` & `CATEGORY_TABS` in `explore/index.tsx` |
| **Filter Chips Bar** | "AC Only", "Food Included", "Breakfast", "Lunch", "Dinner", "Men Only", "Women Only", "Budget". | `explore/index.tsx` `cityPillContainer` & horizontal `ScrollView` |
| **Property Card Layout** | High-res cover image, "Verified" emerald pill, rating star `4.8 (12)`, heart toggle, meal badge, starting price, "View Stay" button. | `src/components/PropertyCard.tsx` with `Shadows.card` and `RadiusTokens.xl` |

### 2.2 Property Details (`app/(customer)/explore/property/[slug].tsx`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Hero Image & Gallery** | Aspect ratio photo, favorite heart button, photo count trigger badge (`galleryTriggerBadge`), interactive gallery modal. | `property/[slug].tsx` `coverImageContainer` with `Modal` and thumbnail navigator |
| **Canonical Category Card** | Canonical category architecture badge with guarantee copy and comparison disclaimer. | `property/[slug].tsx` `categoryCard` with `Sparkles` icon |
| **Timing Policy Badge** | Standard Check-in (09:00 AM) and Checkout (08:00 AM) policy notice. | `src/components/StayTimingBadge.tsx` mounted in `property/[slug].tsx` |
| **Food & Meals Inclusions** | Visual checkmarks for Breakfast, Lunch, Dinner, meal schedule timings, sample menu disclosure. | `src/components/MealBadge.tsx` and `property/[slug].tsx` `section` |
| **Room Categories & Rates** | Room category cards (Single, Double, Triple sharing, AC/Non-AC) with pricing per guest and inclusions. | `property/[slug].tsx` `roomCard` with daily/weekly/monthly rate options |
| **Sticky Booking Bar** | Bottom floating bar with starting rate summary and full-pill "Book Now" CTA. | `property/[slug].tsx` `floatingBookingBar` |

### 2.3 Booking Summary & Payment (`app/(customer)/bookings/create.tsx`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Reservation Quote** | Selected room details, stay dates, guest count, guest gender preference. | `bookings/create.tsx` form section & `CustomerApi.createReservation` |
| **Coupon & Points Redemption** | Coupon code input with "Apply" button, points wallet slider/toggle, strict discount precedence. | `bookings/create.tsx` `couponCard` and `pointsWalletCard` via `RewardsApi` |
| **Itemized Price Breakdown** | Accommodation charge, food inclusions, taxes/GST, platform fee, coupon discount, total payable. | `bookings/create.tsx` `quoteCard` with authoritative minor paise arithmetic |
| **Payment Options** | Razorpay payment gateway integration supporting UPI (GPay, PhonePe, Paytm), Cards, Net Banking. | `src/payments/RazorpayService.ts` called from `bookings/create.tsx` |

### 2.4 Confirmed Booking & My Stays (`app/(customer)/bookings/[reference].tsx` & `index.tsx`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Booking Confirmed View** | Reference ID card, stay dates, check-in instructions, front-desk QR/reference code. | `bookings/[reference].tsx` header section with `ReservationStatusBadge` |
| **15-Minute Hold Countdown** | Active countdown timer badge for pending payment states. | `bookings/[reference].tsx` `urgentHeader` with `Clock` countdown |
| **Guest Review Submission** | Post-stay review modal with 4 canonical subcategories (Food, Cleanliness, Amenities, Value). | `bookings/[reference].tsx` `reviewModal` with 1-5 star ratings |
| **Cancellation & Refund Stepper**| Dedicated Cancellation & Refund tracking card with Bank UTR, status badge, and INR amount. | `bookings/[reference].tsx` `refundCard` with `Bank UTR / Ref:` |
| **My Stays Tabbed Feed** | Segmented filter tabs: "Upcoming", "Active", "Completed", "Cancelled". | `bookings/index.tsx` `FILTER_TABS` with pull-to-refresh |

---

## 3. Account Experience Mapping (`TIJUM App Account Experience.png`)

| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **My Profile Screen** | User initial avatar, verified badge, user name, email, rewards club shortcut banner. | `app/(customer)/profile/index.tsx` `header` and `rewardsCard` |
| **Personal Details Form** | Full name, mobile number, special offers marketing consent switch, save profile button. | `profile/index.tsx` `form` with `CustomerApi.updateProfile` |
| **Security & Password** | Collapsible current password, new password, confirm password section. | `profile/index.tsx` `passwordCard` with `CustomerApi.changePassword` |
| **My Wishlist Screen** | Saved stays list, empty state with heart illustration, "Explore Verified Stays" CTA. | `app/(customer)/wishlist/index.tsx` with `CustomerApi.getWishlist` |
| **Customer Protection Desk** | Official Helpline buttons (Phone, Email), Contact Inquiry form, Grievance Lodge form, Case timeline. | `app/(customer)/support/index.tsx` & `support/[reference].tsx` |
| **Notifications Feed & Preferences** | Alerts list with unread dots, Channels preferences modal with toggles for In-App, Email, Push. | `app/(customer)/notifications/index.tsx` |
| **Switch to Partner Portal** | Role switch button revoking customer session and transitioning to host login. | `profile/index.tsx` "Switch to Partner (Host) Portal" button |

---

## 4. Partner / Host Experience Mapping (`partner screens/*.png`)

### 4.1 Host Dashboard & Operations (`app/(partner)/dashboard.tsx` & `reservations/index.tsx`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Host Command Center** | Greeting header, 3 metrics cards (Confirmed Stays, Active Stays, This Month's Payout), Quick Actions. | `app/(partner)/dashboard.tsx` `metricsGrid` & `actionRow` |
| **Reviews Quick Access** | Guest ratings highlight card navigating to `/(partner)/reviews/index`. | `dashboard.tsx` `reviewsHighlightCard` |
| **Bookings Management Feed** | Status filter tabs: "All", "Confirmed", "Awaiting Payment", "Checked In", "History". | `app/(partner)/reservations/index.tsx` `FILTER_TABS` |
| **Front Desk Review & Check-in**| Guest details, room category requested, room allocation modal, "Check In Guest" with notes. | `app/(partner)/reservations/[reference].tsx` |
| **Front Desk Check-out** | "Check Out Guest" with turnover clearance notes. | `app/(partner)/reservations/[reference].tsx` `handleCheckOut` |

### 4.2 Property & Physical Rooms Management (`app/(partner)/properties/*`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Property Overview** | Property listing cards with verification status, room counts, manage shortcuts. | `app/(partner)/properties/index.tsx` |
| **Physical Rooms Inventory** | Room list (R-101, R-102...) with category badge, status indicator dot, filter by status. | `app/(partner)/properties/[id]/rooms.tsx` |
| **Add / Edit Physical Room** | Modal for room number, room category dropdown, floor number, wing name. | `rooms.tsx` `modalVisible` form with `OwnerApi.createRoom` |
| **Room Status Update** | Update status between `active` (Available), `maintenance`, and `cleaning`. | `rooms.tsx` `statusModalVisible` with `OwnerApi.updateRoomStatus` |
| **Rate Configuration** | Authoritative rate entry (Daily, Weekly, Monthly paise), tax calculation breakdown. | `app/(partner)/properties/[id]/pricing.tsx` |
| **Inventory Blocking** | Interactive month calendar for blocking and unblocking dates. | `app/(partner)/properties/[id]/availability.tsx` |

### 4.3 Financials, Settlements & Agreements (`app/(partner)/settlements/*` & `financial-profile/*`)
| Reference Sheet Screen | Reference Visual Features | Implemented Code Component & Location |
| :--- | :--- | :--- |
| **Settlement History** | Net payout, gross amount, TDS (Section 393(1) / 194O) deduction, commission GST breakdown. | `app/(partner)/settlements/index.tsx` & `[reference].tsx` |
| **Financial Profile** | Business legal name, PAN, bank account details (IFSC, Account number). | `app/(partner)/financial-profile/index.tsx` |
| **Commission Agreements** | Terms version, commission rate %, terms hash, electronic one-tap "Accept & Sign" button. | `app/(partner)/financial-profile/agreements.tsx` |
| **Review Management** | Guest feedback list, rating breakdown, 2,500-char host response modal with live counter. | `app/(partner)/reviews/index.tsx` |
| **Host Account & Security** | Primary host contact details, password change, account status badge. | `app/(partner)/account.tsx` |

---

## 5. Exceptional States Mapping (`partner screens/TIJUM Mobile App UI Screens.png`)

| Reference Screen State | Visual Features | Implementation in Code |
| :--- | :--- | :--- |
| **No Internet Connection** | `WifiOff` icon, coral soft circle, "No Internet Connection", "Check your Wi-Fi...", "Retry Connection" CTA. | `src/components/ExceptionalState.tsx` (`type="no-internet"`) |
| **No Results Found** | `SearchX` icon, plum circle, "No Matches Found", "Try loosening your criteria...", "Reset Filters" CTA. | `src/components/ExceptionalState.tsx` (`type="no-results"`) |
| **Session Expired** | `Clock` icon, amber circle, "Session Expired", security explanation, "Sign In Again" CTA. | `src/components/ExceptionalState.tsx` (`type="session-expired"`) |
| **Account Restricted** | `ShieldAlert` icon, rose circle, "Account Notice", support contact guidance. | `src/components/ExceptionalState.tsx` (`type="account-blocked"`) |
| **Payment Failed** | `AlertCircle` icon, danger circle, "Payment Unsuccessful", failure reason, "Try Payment Again" CTA. | `src/components/ExceptionalState.tsx` (`type="payment-failed"`) |
| **Resume Your Booking** | `Clock` icon, peach circle, "Complete Your Stay Booking", active timer badge, "Resume Booking" CTA. | `src/components/ExceptionalState.tsx` (`type="resume-booking"`) |
