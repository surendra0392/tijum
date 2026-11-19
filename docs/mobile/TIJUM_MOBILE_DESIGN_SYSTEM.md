# TIJUM Mobile Design System & UI Specification

**Document Reference:** `docs/mobile/TIJUM_MOBILE_DESIGN_SYSTEM.md`  
**Application Scope:** `apps/mobile/src/theme/` and `apps/mobile/src/components/`  
**Brand Identity:** "Stay easy. Eat well. Spend less."  
**Platform Target:** React Native (iOS & Android)  
**Date:** November 20, 2026  
**Status:** **ACTIVE & CERTIFIED**

---

## 1. Color Tokens & Brand Palette

The mobile design system strictly aligns with the TIJUM web brand identity, utilizing a refined South Indian hospitality palette:

| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| `deepPlum` | `#442F41` | Primary brand color, headers, primary buttons, bottom tab active icons |
| `coral` | `#FF7A67` | Vibrant accent, badges, CTA highlights, active indicators, ratings |
| `warmCream` | `#FFF4EE` | Soft brand background tint, card accents, container backgrounds |
| `card` | `#FFFFFF` | Primary surface background for cards, modals, sheets |
| `textPrimary` | `#1F2937` | Dark charcoal for high-contrast headings and primary labels |
| `textSecondary`| `#6B7280` | Neutral gray for subtitles, secondary labels, metadata |
| `border` | `#E5E7EB` | Subtle dividers and component outlines |
| `emerald` | `#059669` | Success notifications, verified host badges, active stay status |
| `amber` | `#D97706` | Pending approvals, awaiting payment badges, warning notices |
| `rose` | `#DC2626` | Destructive alerts, cancellations, form validation error texts |

---

## 2. Typography & Scale

The mobile application utilizes system font hierarchies (San Francisco on iOS, Roboto on Android) for optimal native rendering speed:

| Scale Token | Font Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `hero` | 28px | 34px | 800 (ExtraBold) | Brand splash & top marketing headers |
| `h1` | 22px | 28px | 700 (Bold) | Screen titles & prominent section headers |
| `h2` | 18px | 24px | 600 (SemiBold) | Property card titles, card headers |
| `h3` | 16px | 22px | 600 (SemiBold) | Sub-section headings, modal titles |
| `body` | 14px | 20px | 400 (Regular) | Primary text, descriptions, input values |
| `bodyMedium` | 14px | 20px | 500 (Medium) | Emphasized body text, table values |
| `caption` | 12px | 16px | 400 (Regular) | Timestamps, metadata, helper text |
| `captionBold` | 12px | 16px | 700 (Bold) | Badges, small status chips, price units |

---

## 3. Spacing & Border Radius Scale

```typescript
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
};

export const BorderRadius = {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    pill: 9999,
};
```

---

## 4. Reusable Component Catalog

1. **Button (`src/components/Button.tsx`):**
   - Variants: `primary` (Deep Plum), `secondary` (Coral), `outline` (Border), `ghost`.
   - Built-in loading state with native `ActivityIndicator`.
   - Disabled state with opacity reduction and touch lock.

2. **Input (`src/components/Input.tsx`):**
   - Floating label with focus outline.
   - Built-in error message display in `Colors.rose`.
   - Secure text entry toggle for passwords.
   - Multiline support for reviews and notes.

3. **Badge (`src/components/Badge.tsx`):**
   - Status chips: `success` (green), `warning` (amber), `danger` (red), `neutral` (gray), `accent` (coral).
   - Used for reservation lifecycle, verification status, and food flags.

4. **StayTimingBadge (`src/components/StayTimingBadge.tsx`):**
   - Displays canonical 09:00 AM Check-In and 08:00 AM Check-Out policy.
   - Prominently highlighted in Coral on all stay specification views.

5. **MealBadge (`src/components/MealBadge.tsx`):**
   - Displays breakfast, lunch, and dinner inclusion with operational timeframes.
