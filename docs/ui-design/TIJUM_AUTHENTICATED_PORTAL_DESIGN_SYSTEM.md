# TIJUM Authenticated Portals — Unified Design System Specification

## 1. Executive Summary & Brand Identity

The TIJUM Authenticated Portals Design System establishes visual consistency, high accessibility, and cohesive aesthetic standards across the three authenticated application surfaces:
1. **Customer Portal** (`.tijum-customer`) — Discovery, bookings, wishlist, rewards hub, points wallet, coupons, customer support.
2. **Owner / Partner Portal** (`.tijum-owner`) — Property onboarding, inventory, availability & rates, front-desk operations, guest complaints, financial settlements.
3. **Admin Console** (`.tijum-admin`, `.tijum-admin-theme`) — Platform command centre, operator audits, inventory verifications, settlements, reconciliation, disputes.

Public unauthenticated areas (marketing homepage, public stay discovery, landing pages, customer auth, owner auth, admin auth) are **strictly isolated** from portal styles to preserve marketing brand presentations.

---

## 2. Core Color Palette & Design Tokens

### 2.1 Brand Tokens

| Token Name | Hex Code | Light Role | Dark Role | Semantics & Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Deep Plum** | `#442F41` | Primary Brand Text, High-contrast Surfaces, Headings | Brand Anchor, Elevated Dark Canvas Background | Core anchor color of TIJUM brand identity. |
| **Coral** | `#FF7A67` | Primary Action CTA, Active Indicators, Key Accents | Primary Vibrant Action, Focal Accents | Primary interactive button, active tab indicator, link hover. |
| **Soft Peach** | `#FFB6A3` | Secondary Accents, Avatar Backgrounds, Badges | Highlight Surfaces, Icon Badges | Soft warmth, avatar fallbacks, subtle pill highlights. |
| **Cream** | `#FFF4EE` | Light Canvas Background, Card Wash | Warm Tint, Subtle Dark Neutral Mix | Distinctive warm background for customer & partner layouts. |
| **Muted Lavender** | `#8B6B82` | Secondary/Muted Text, Subheadings, Inactive Tabs | Secondary Labels, Neutral Muted Foreground | Readable secondary text with ~4.8:1 contrast in light mode. |
| **Neutral Surface** | `#E6E0DB` | Structural Borders, Input Outlines, Dividers | Border Tokens, Card Outlines | Crisp subtle separation without harsh dark lines. |

### 2.2 Critical Emerald Semantic Rule

> **CRITICAL RESTRICTION:**
> **Emerald (`#10B981`, `#059669`, `bg-emerald-50`, `text-emerald-700`) is strictly and exclusively reserved for positive food-inclusion semantics.**
>
> - **Permitted:** "Food Provided", "Breakfast Included", "Lunch Included", "Dinner Included", Meal plan badges.
> - **STRICTLY PROHIBITED:** Generic operation success alerts, referral rewards, coupons, discounts, payouts, settlements, check-in arrivals, verified accounts, or table rows. Non-food successes must use TIJUM Coral, Soft Peach, or standard semantic neutral tokens.

---

## 3. Typography Architecture

TIJUM enforces a strict dual-font typographic hierarchy across all authenticated portals:

1. **Headings, Titles, Buttons, Navigation Labels:**
   - **Font Family:** `Montserrat`, `system-ui`, `sans-serif`
   - **CSS Variable:** `var(--font-heading)`
   - **Weights:** Medium (500), SemiBold (600), Bold (700)
   - **Tracking:** Headings use slight negative tracking (`tracking-tight`); small labels & uppercase eyebrows use expanded tracking (`tracking-wider`, `tracking-[0.2em]`).

2. **Body Text, Descriptions, Table Cells, Form Helper Notes:**
   - **Font Family:** `Nunito`, `system-ui`, `sans-serif`
   - **CSS Variable:** `var(--font-body)`
   - **Weights:** Regular (400), Medium (500), SemiBold (600)
   - **Readability:** Optimized line heights (`leading-relaxed`, `leading-normal`) for legibility across mobile and desktop displays.

---

## 4. Portal Scoping & CSS Architecture

To prevent CSS leakage into public marketing or unauthenticated auth pages, portal styling is scoped under specific root classes:

```css
/* Scoped containers in resources/css/portals.css */
.tijum-customer { ... }
.tijum-owner { ... }
.tijum-admin, .tijum-admin-theme { ... }
```

### Elevation & Card Surfaces

- **Light Mode:**
  - Standard card background: `#FFFFFF`
  - Subtle secondary card: `#FFF4EE` / 40% opacity
  - Border: `#E6E0DB` / 80% (`border-tijum-surface/80`)
  - Shadows: `shadow-tijum-card` (`0 4px 20px -2px rgba(68, 47, 65, 0.05)`)

- **Dark Mode:**
  - Portal canvas: `#1E131D` (`--background`)
  - Elevated card surface: `#281A27` (`--card`)
  - Elevated modal / popover surface: `#30202F` (`--popover`)
  - Border: `#382436` (`--border`)
  - Foreground text: `#FFF4EE` (`--foreground`)
  - Muted text: `#D4C4D0` (`--muted-foreground`)
