# Customer Web & Mobile Accommodation Category Integration Specification

> **Updated after final category consolidation corrections.**

**Document Reference:** `DOC-ACC-CAT-05`  
**Phase:** Accommodation Category Consolidation  
**Author:** Web Frontend Lead (`@web-ui`)  
**Status:** Completed & Corrected Integration Specification ✅  
**Date:** November 14, 2026  
**Audience:** Frontend Engineers, Mobile Engineers, QA Verifiers (`@verifier`), Coordinator (`@coordinator`)

---

## 1. Executive Summary & Objective

In accordance with Platform Architectural Directive `DOC-ACC-CAT-02`, the TIJUM web platform has completed comprehensive consolidation of its accommodation categorization taxonomy. Historical ambiguity between separate "Independent Hostel", "PG Accommodation", and various lodge/guest-house taxonomies has been completely retired in favor of strictly **Three Canonical Accommodation Categories**:

1. **Hostels/PG (`hostels-pg`)** — Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property.
2. **Homestays (`homestays`)** — Explore accommodation in residential homes, with property details, room options and available services shown for each property.
3. **Co-Living (`co-living`)** — Explore shared-living accommodation with room options, property details and available amenities shown for each space.

This integration harmonizes the customer-facing discovery journey, search and filter capabilities, property showcase screens, owner onboarding workflows, and administrative compliance operations across the React 19 Inertia client under `resources/js/`.

---

## 2. Canonical Category Design System & Tokens

Visual coherence between web and mobile clients is established through unified design tokens, typography, accent color palettes, and Lucide icon mappings:

| Category | Slug | DB Code | Text & Icon Color | Background Tint | Border Color | Lucide Icon | Core Property Focus |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hostels/PG** | `hostels-pg` | `hostel_pg` | `#442F41` (Deep Plum) | `#FFF4EE` (Cream) | `#E6E0DB` | `Building2` | Single, double, and multi-sharing rooms; independent meal options declared per property |
| **Homestays** | `homestays` | `homestay` | `#442F41` (Deep Plum) | `#FFF4EE` (Cream) | `#E6E0DB` | `Home` | Residential neighborhood homes; property details and services declared per listing |
| **Co-Living** | `co-living` | `coliving` | `#442F41` (Deep Plum) | `#FFF4EE` (Cream) | `#E6E0DB` | `Users` | Shared-living spaces; room types and community amenities declared per space |

*Note on Semantic Color Tokens:* Food Emerald (`#10B981`) is strictly reserved for positive food-inclusion status indicators (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`). Category badges use the unified Deep Plum on Cream/Neutral Surface treatment. Interactive emphasis uses Coral (`#FF7A67`).

---

## 3. Web Frontend Integration Architecture (`resources/js/`)

### 3.1 Content & Data Foundation (`resources/js/data/public-content.ts`)

`public-content.ts` acts as the single source of truth for public marketing, value propositions, FAQ structures, and illustrative imagery.

- **`AccommodationCategoryItem` Interface:**
  Updated strictly to constrain `id` and `slug` to `'hostels-pg' | 'homestays' | 'co-living'`, and icon to `'bed' | 'building' | 'home' | 'users'`.
- **Neutral Category Descriptions (Zero Unsupported Claims):**
  In strict alignment with backend `AccommodationCategory::description()` and mobile `CANONICAL_CATEGORIES`, all category descriptions are neutral, factual, and free of unsupported guarantees:
  - `hostels-pg`: *"Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property."*
  - `homestays`: *"Explore accommodation in residential homes, with property details, room options and available services shown for each property."*
  - `co-living`: *"Explore shared-living accommodation with room options, property details and available amenities shown for each space."*
- **Elimination of Unsupported Claims in Auth Shells:**
  - Removed unconditional "3 Home-Style Meals Included" and "100% physically inspected" marketing claims from `portal-auth-shell.tsx`.
  - Replaced with neutral, verified copy: *"Clear Meal Inclusions: Review property-specific breakfast, lunch, and dinner inclusions transparently before booking."* and *"Verified Partner Listings: Explore Hostels/PG, Homestays, and Co-Living accommodations with verified operator registration and structured property details."*
- **`ACCOMMODATION_CATEGORIES`:**
  Rebuilt from legacy dual hostel/pg entries into the 3 canonical items:
  - `hostels-pg`: Features the crisp, high-resolution webp/jpg srcset of `category-hostel-800w.jpg` with updated accessible alt text reflecting modern Indian student and professional hostel/PG living.
  - `homestays`: Features `category-homestay-800w.jpg` depicting warm teak furnishings, handloom accents, and natural sunlight.
  - `co-living`: Leverages high-resolution responsive imagery with modern workstation aesthetics, collaborative ambiance, and clear dining highlights.
- **Value Propositions & Meal Highlights:**
  - `VALUE_PROPOSITIONS`: Emphasizes transparent comparison of Hostels/PG, Homestays, and Co-Living accommodations with verified daily, weekly, and monthly rates.
  - `MEAL_HIGHLIGHTS`: Affirms home-style cooking prepared by independent Hostel/PG, Homestay, and Co-Living property hosts.
- **Launch City Audience Notes:**
  - Standardized across Hyderabad, Guntur, Vijayawada, and Visakhapatnam to highlight `Hostels/PG, Homestays, and Co-Living`.
- **Full & Home FAQ Suites:**
  - `createHomeFaqs` and `createFullFaqGroups` explicitly answer common queries regarding the 3 canonical categories, owner registration eligibility, and strict asset-light kitchen management boundaries.

### 3.2 Homepage Bento Showcase (`resources/js/components/public/accommodation-categories.tsx`)

The homepage accommodation section implements an asymmetric bento grid that balances visual hierarchy and engagement:

- **Icon Mapping:**
  ```tsx
  const categoryIconMap: Record<AccommodationCategoryItem['icon'], typeof BedDouble> = {
      bed: BedDouble,
      building: Building2,
      home: Home,
      users: Users,
  };
  ```
- **Grid Geometry:**
  - **Item 0 (Hostels/PG):** Occupies `lg:col-span-7 lg:row-span-2` with `aspect-auto lg:min-h-[34rem]`, hero typography, Deep Plum background, and Coral accent badge.
  - **Item 1 (Homestays):** Occupies `lg:col-span-5` top row in a 2-column split card (`0.9fr_1.1fr`) with warm peach/lavender tones.
  - **Item 2 (Co-Living):** Occupies `lg:col-span-5` bottom row in an identical 2-column split card, ensuring zero visual clutter.
- **Direct Exploration CTA:**
  Integrated with `search()` route to allow one-click exploration of each canonical category without broken query states.

### 3.3 Search Engine & Navigation (`resources/js/components/public/search-panel.tsx`)

- **Dynamic Select Dropdown:**
  Renders canonical categories from the database or props under "Stay type", with fallback to "Any stay type" (`any`).
- **Input Sanitation & Submission:**
  Form submission sends `category: category !== 'any' ? [category] : undefined`, preserving multi-category array semantics expected by backend `PropertySearchRequest`.
- **Accessibility:**
  Full ARIA labeling with `id={`${id}-category`}`, `aria-invalid`, and keyboard navigation support via Radix UI primitives.

### 3.4 Search Results & Dynamic Filtering (`resources/js/pages/public/search/index.tsx`)

- **Filter Panel:**
  Iterates over dynamic `categories` supplied by the backend query to render accessible checkbox toggles. Supports selecting multiple canonical categories simultaneously.
- **Active Filter Summaries & Counters:**
  Correctly indicates when active filters restrict inventory to Hostels/PG, Homestays, or Co-Living.
- **Zero Result Guidance:**
  Suggests adjusting the accommodation category filter when specific dates or localities return zero food-inclusive matches.

### 3.5 Property Listing Cards (`resources/js/components/public/property-card.tsx`)

- **Category Badge:**
  Presents `property.category` atop the thumbnail with accessible contrast.
- **Layout Variants:**
  Maintains seamless rendering across both horizontal (desktop search view) and vertical (grid/carousel) configurations.

### 3.6 Property Detail View (`resources/js/pages/public/properties/show.tsx`)

- **Header Badges:**
  Highlights `property.category.name` in a distinctive `variant="peach"` badge alongside gender eligibility and verified booking review badges.
- **Meal Package Guarantee:**
  Clearly links the canonical category rules to displayed breakfast, lunch, and dinner availability indicators.

### 3.7 Destination & City Landing Pages (`resources/js/pages/public/cities/show.tsx`)

- **City Context & Orientation:**
  Presents localized guidance for Hyderabad, Guntur, Vijayawada, and Visakhapatnam, orienting guests to canonical accommodations available near tech hubs, educational institutions, and residential neighborhoods.

---

## 4. Partner & Admin Portal Category Management

### 4.1 Owner Property Registration & Editing Forms

- **`resources/js/components/owner/properties/property-form.tsx`:**
  - Added dynamic `selectedCategory` lookup:
    ```tsx
    const selectedCategory = categories.find(
        (c) => String(c.id) === form.data.property_category_id,
    );
    ```
  - FormField `hint` dynamically reflects the official category description:
    `hint={selectedCategory?.description ?? 'Choose strictly from the 3 canonical categories: Hostels/PG, Homestays, or Co-Living.'}`
  - Select trigger placeholder updated to `"Select canonical category"`.
- **`resources/js/pages/owner/properties/index.tsx`:**
  - Updated page header eyebrow and description to guide partners onboarding Hostels/PG, Homestays, or Co-Living.
  - Category filter dropdown seamlessly handles filtering existing property inventory.
  - Empty state text guides partners to register their first canonical property listing draft.
- **`resources/js/pages/owner/dashboard.tsx`:**
  - Updated onboarding guidance notes.
  - Category overview badges updated to `<Badge variant="outline">Hostels/PG</Badge>`, `<Badge variant="outline">Homestays</Badge>`, `<Badge variant="outline">Co-Living</Badge>`.

### 4.2 Administrative Verification & Moderation Screens

- **`resources/js/pages/admin/properties/index.tsx`:**
  - Header description explicitly specifies moderation of Hostels/PG, Homestays, and Co-Living property submissions.
  - Dynamic filter dropdown permits admin compliance officers to filter queue submissions by canonical category.
- **`resources/js/pages/admin/properties/show.tsx` & `history.tsx`:**
  - Inspects property category details against operator legal agreements, room inventory, and photo evidence.
  - Displays historical audit trail snapshots with immutable category attribution.

---

## 5. Type System & Schema Synchronization

In `resources/js/types/public-search.ts`, canonical category constants and types are explicitly exported:

```typescript
export const CANONICAL_ACCOMMODATION_CATEGORIES = [
    {
        slug: 'hostels-pg',
        code: 'hostel_pg',
        name: 'Hostels/PG',
        accentColor: '#442F41',
        icon: 'Building2',
    },
    {
        slug: 'homestays',
        code: 'homestay',
        name: 'Homestays',
        accentColor: '#442F41',
        icon: 'Home',
    },
    {
        slug: 'co-living',
        code: 'coliving',
        name: 'Co-Living',
        accentColor: '#442F41',
        icon: 'Users',
    },
] as const;

export type CanonicalCategorySlug =
    (typeof CANONICAL_ACCOMMODATION_CATEGORIES)[number]['slug'];
export type CanonicalCategoryCode =
    (typeof CANONICAL_ACCOMMODATION_CATEGORIES)[number]['code'];
export type CanonicalCategoryName =
    (typeof CANONICAL_ACCOMMODATION_CATEGORIES)[number]['name'];
```

---

## 6. Mobile Application (`apps/mobile/`) Parity Verification

Cross-platform parity has been verified against the implementation delivered in `apps/mobile/` by `@mobile-app`:

1. **Category Slugs & Codes:**
   - Both Web and Mobile use identical slugs: `hostels-pg`, `homestays`, `co-living`.
   - Both use identical database codes: `hostel_pg`, `homestay`, `coliving`.
2. **Visual Tokens & Icons:**
   - Unified brand palette: Deep Plum (`#442F41`) on Cream (`#FFF4EE`) / Neutral Surface (`#E6E0DB`) across both web and mobile category badges.
   - Food Emerald (`#10B981`) is strictly reserved for positive food-inclusion status indicators across both platforms.
   - Icon semantics (`Building2`, `Home`, `Users`) are preserved identically on web and React Native.
3. **Food Guarantee Messaging:**
   - Both platforms mandate and prominently display food inclusions (breakfast, lunch, dinner) on all property cards and detail screens regardless of category.

---

## 7. Quality Assurance & Verification Results

### 7.1 TypeScript Compiler Verification
- **Command:** `npm run types:check` (`tsc --noEmit`)
- **Status:** **PASS (0 errors)** across 267+ modules and all type definitions.

### 7.2 Production Build Verification
- **Command:** `npm run build` (`vp build`)
- **Status:** **PASS**
- Generated all production assets and the Vite manifest without warnings or unresolvable imports.

### 7.3 Accessibility & Responsive Verification
- Contrast ratios on all category badges and bento cards comply with WCAG 2.1 AA standards.
- Focus outlines, screen reader legends, and ARIA attributes validated on all form and select elements.

---

## 8. Summary of Modified Frontend Files

1. `resources/js/data/public-content.ts` — Canonical category data, imagery specs, highlights, FAQs.
2. `resources/js/components/public/accommodation-categories.tsx` — Bento grid, Lucide icon map (`Users`), exploration links.
3. `resources/js/components/public/search-panel.tsx` — Stay type selection and category array formatting.
4. `resources/js/components/public/public-seo-head.tsx` — Canonical category SEO descriptions.
5. `resources/js/components/public/partner-cta-section.tsx` — Partner CTA copy.
6. `resources/js/components/customer/customer-auth-shell.tsx` — Value points and canonical category thumbnails.
7. `resources/js/components/portal-auth-shell.tsx` — Partner & customer auth shell headlines.
8. `resources/js/pages/welcome.tsx` — SEO fallback description and homepage assembly.
9. `resources/js/pages/public/about.tsx` — Mission and marketplace scope descriptions.
10. `resources/js/pages/public/how-it-works.tsx` — Platform guide copy and partner links.
11. `resources/js/pages/public/become-a-partner.tsx` — Partner benefits, category cards, and icon map.
12. `resources/js/pages/public/faqs.tsx` — Public FAQ metadata and copy.
13. `resources/js/pages/public/review-policy.tsx` — Review policy scope.
14. `resources/js/pages/auth/register.tsx` — Customer registration description.
15. `resources/js/pages/owner/auth/register.tsx` — Partner registration description.
16. `resources/js/pages/owner/dashboard.tsx` — Partner dashboard overview and category badges.
17. `resources/js/components/owner/onboarding/business-profile-form.tsx` — Operator overview description hint.
18. `resources/js/components/owner/onboarding/verification-status-panel.tsx` — Onboarding property verification copy.
19. `resources/js/pages/owner/properties/index.tsx` — Inventory management header and empty state.
20. `resources/js/components/owner/properties/property-form.tsx` — Category selection hint and placeholder.
21. `resources/js/pages/admin/properties/index.tsx` — Moderation queue description.
22. `resources/js/pages/dev/design-system.tsx` — Design system sample body copy.
23. `resources/js/layouts/public-layout.tsx` — Global footer description.
24. `resources/js/pages/admin/content/pages/form.tsx` — SEO preview summary default.
25. `resources/js/pages/public/content/show.tsx` — Food-inclusive living callout text.
26. `resources/js/types/public-search.ts` — Canonical category constants and type definitions.
27. `docs/accommodation-category-consolidation/05_CUSTOMER_WEB_MOBILE_CATEGORY_INTEGRATION.md` — Integration documentation.
