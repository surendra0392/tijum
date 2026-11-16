# Customer & Partner Auth Overhaul, Search Map, and UX Features Report

**Document Reference:** `DOC-ACC-CAT-13`  
**Phase:** Customer & Partner Auth Overhaul, Search Map & UX Features  
**Author:** Platform Content & SEO Specialist (`@content-seo`)  
**Contributors:** Platform Auditor (`@auditor`), Backend & Database Engineer (`@backend-db`), Web UI Engineer (`@web-ui`), QA & Test Verifier (`@verifier`), Swarm Coordinator (`@coordinator`)  
**Status:** Complete & Certified ✅  
**Date:** November 14, 2026  
**Audience:** Platform Architects, Engineering Swarm, Product Design, Operations & Legal Counsel

---

## 1. Executive Summary & Initiative Overview

Following Swarm Brief #32, this initiative implements ten user-requested platform enhancements across authentication, onboarding, search discovery, layout density, and customer experience:

1. **Customer Authentication Overhaul:** Mandatory phone number collection with SMS OTP verification in registration, explicit Terms & Conditions acceptance timestamping (`terms_accepted_at`), dual-identifier login (Email or Mobile Phone), and forgot password via Email or Phone.
2. **Partner & Admin Auth UI Design:** Clean, modern, responsive aesthetics for Partner/Owner and Admin authentication portals, adhering strictly to TIJUM brand tokens.
3. **Full 10-Field Partner Onboarding:** Streamlined partner registration capturing: Owner Name, Email, Mandatory Mobile Number, Property Name, Property Category (Hostels/PG, Homestays, Co-Living), Gender Availability (Male, Female, Both), City, Locality/Area, Property Description, and Terms & Conditions acceptance.
4. **Search Gender Preference Filtering:** Added gender preference filter (Male, Female, Any/All) in search filters and property eligibility services.
5. **City Detail Page Instant Search:** Immediate execution of search queries upon clicking city action buttons ("Search Guntur", "View live results") with pre-populated city IDs, duration, check-in, and guest counts.
6. **Property Card Sizing & 3-Column Layout:** Enforced responsive 3-cards-per-row grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) across search and city pages, eliminating oversized cards and adding pagination controls.
7. **Interactive Map View:** Side-by-side search listing with an interactive map featuring custom TIJUM price markers, while cleanly hiding sidebar filters in map view.
8. **"Discover Your Way to Stay":** Consolidated canonical category cards into a clean 1-row layout (`grid-cols-1 md:grid-cols-3`) on the homepage.
9. **Homepage Featured Properties:** Curated verified accommodation listings displayed on the homepage in a high-density 3-card grid.
10. **Customer Wishlist & Property Comparison:** Interactive heart icon on property cards, dedicated database table (`customer_wishlists`), customer dashboard wishlist view, and side-by-side property comparison drawer.

---

## 2. Legal & Regulatory Infrastructure

To support the mandatory Terms & Conditions (`terms`) acceptance checkbox across both Customer Registration and Partner Onboarding, `@content-seo` authored dedicated, legally sound public pages and routes:

### 2.1 Terms of Service (`/terms`, route: `public.terms`)
- **File Location:** `resources/js/pages/public/terms.tsx`
- **Controller Action:** `App\Http\Controllers\Public\PublicPageController::terms`
- **SEO & Structured Data:** Full Schema.org `Organization` and `BreadcrumbList` integration.
- **Core Policy Modules:**
  1. *Acceptance of Terms & Eligibility:* Age requirements, verified phone number/email, account security.
  2. *Asset-Light Marketplace Model:* Explicit clarification that TIJUM is an accommodation marketplace aggregator for Hostels/PG, Homestays, and Co-Living, and does not operate physical buildings or centralized kitchens.
  3. *Reservations, Inventory Hold & Payments:* Details the 15-minute inventory hold, automatic instant confirmation upon verified payment (Razorpay), elimination of manual gatekeeper approval, and prohibition of offline cash transactions.
  4. *Property-Specific Food Flags & Stay Timings:* Discloses independent meal flags (Food Provided, Breakfast, Lunch, Dinner) and standard stay hours (12:00 PM check-in / 11:00 AM checkout, early check-in from 7:00 AM).
  5. *Property Partner Responsibilities:* Truthful listing details, room readiness, safety standards, and municipal compliance.
  6. *Cancellations, Relocations & Grievance Redressal:* Reference to statutory consumer rights under the Consumer Protection Act, 2019 and E-Commerce Rules.

### 2.2 Privacy Policy (`/privacy`, route: `public.privacy`)
- **File Location:** `resources/js/pages/public/privacy.tsx`
- **Controller Action:** `App\Http\Controllers\Public\PublicPageController::privacy`
- **SEO & Structured Data:** Schema.org `Organization` and `BreadcrumbList` payloads.
- **Core Policy Modules:**
  1. *Information Collected:* Mobile telephone numbers (verified via SMS OTP), full names, email addresses, property partner data, booking transaction identifiers.
  2. *Purpose of Data Processing:* Dual-identifier authentication, real-time SMS/WhatsApp booking alerts, fraud prevention, check-in coordination.
  3. *Data Sharing Boundaries:* Strict isolation; guest details shared with assigned property hosts solely for check-in fulfillment; zero sale of personal data; PCI-DSS compliance via Razorpay.
  4. *Security & Retention:* TLS encryption, Bcrypt password hashing, role-based admin access, statutory retention periods.
  5. *User Rights & DPDPA 2023:* Compliance with the Digital Personal Data Protection Act (DPDPA 2023) and Information Technology Act 2000, including rights to access, correction, and grievance escalation.

---

## 3. Public Knowledge Base & FAQ Expansion

The platform FAQ repository in `resources/js/data/public-content.ts` was expanded to provide immediate, transparent answers regarding the ten new feature areas:

| FAQ Group | Question | Canonical Guidance |
|:---|:---|:---|
| **Customers** | *Can I sign in or reset my password with my mobile number?* | Yes. TIJUM supports signing in with either your registered mobile number or your email address. You can also reset your password and receive verified SMS notifications directly to your phone. |
| **Customers** | *Can I save stays to a wishlist or compare accommodations side-by-side?* | Yes. Tap the heart icon on any property card to save it to your Wishlist in your Customer Dashboard. You can also add properties to the comparison tray to compare their room rates, meal inclusions, house rules, and amenities side-by-side. |
| **Accommodation** | *How does the gender filter work for Hostels, PGs, and Co-Living?* | You can filter search results by gender eligibility: Men, Women, or Any/All. This helps students, female professionals, and male travelers find gender-segregated or co-ed spaces that match their stay requirements. |
| **Accommodation** | *How do I explore properties on the interactive Map View?* | Toggle the Map View button on the search page or city explore page. You will see an interactive map with custom TIJUM price markers alongside the property cards, allowing you to browse neighborhoods, distances, and transit hubs visually. |
| **Property Partners** | *What information is required to register as a property partner?* | Partner registration is simple and transparent. You provide your Full Name, Email, Mobile Number, Property Name, Category (Hostels/PG, Homestays, or Co-Living), Gender Availability (Male, Female, or Both), City, Locality/Area, Property Description, and agree to the Platform Partner Terms. |

---

## 4. Search Engine Optimization & Redirection Alignment

1. **XML Sitemap Expansion (`/sitemap.xml`):**
   - Updated `App\Services\Seo\SitemapService::collectUrls()` to index:
     - `https://tijum.com/terms` (`changefreq: monthly`, `priority: 0.5`)
     - `https://tijum.com/privacy` (`changefreq: monthly`, `priority: 0.5`)
2. **Wayfinder TypeScript Route Bindings:**
   - Executed `php artisan wayfinder:generate`.
   - Auto-generated typed helpers: `terms()` and `privacy()` under `resources/js/routes/public/index.ts` and `resources/js/actions/`.
3. **Public Layout Footer Integration:**
   - Updated `resources/js/layouts/public-layout.tsx` to display **Terms of service** and **Privacy policy** directly under the "Support" footer section across all public customer views.

---

## 5. Automated Verification & Quality Gates

| Verification Gate | Execution Command | Result | Details |
|:---|:---|:---:|:---|
| **SEO & Marketing Feature Suite** | `php vendor/bin/phpunit tests/Feature/SeoAndMarketing/CategoryConsolidationContentAndRedirectsTest.php` | **5 passed, 128 assertions, 0 failed** (2.39s) | Verified 301 legacy redirects, city redirects, Schema.org nodes, XML sitemap with `/terms` and `/privacy`, and Inertia page payloads. |
| **Terms & Privacy Page Types** | `npx tsc --noEmit` | **0 errors** in `terms.tsx` & `privacy.tsx` | All TypeScript interfaces, Lucide icons, and layout props strictly validated. |
| **Wayfinder Generation** | `php artisan wayfinder:generate` | **100% synchronized** | Typed routes and controller actions regenerated. |

---

## 6. Document Sign-Off & Status

Document 13 is complete and verified. The legal, content, FAQ, and SEO infrastructure for the Customer & Partner Auth Overhaul and UX Features is certified and active.
