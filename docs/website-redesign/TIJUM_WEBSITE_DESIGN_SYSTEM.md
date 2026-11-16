# TIJUM Website Design System

## Source of Truth

The machine-readable and rationale source is [`DESIGN.md`](../../DESIGN.md). This document describes how those tokens are implemented across the customer-facing website.

## Brand Principle

**Stay easy. Eat well. Spend less.**

TIJUM should feel premium but affordable, warm, direct, trustworthy, youthful, and grounded in the Indian accommodation market. It must not resemble a luxury hotel site, a generic SaaS page, or an old directory.

## Colors

| Token | Hex | Use |
|---|---|---|
| Deep Plum | `#442F41` | Identity, headings, navigation, footer, dark sections, important text |
| Coral | `#FF7A67` | Primary actions, active emphasis, focus treatment |
| Soft Peach | `#FFB6A3` | Supporting accents and quiet highlighted surfaces |
| Cream | `#FFF4EE` | Main background and raised light surfaces |
| Muted Lavender | `#8B6B82` | Supporting visual accents and non-critical metadata |
| Neutral Surface | `#E6E0DB` | Borders, dividers, placeholders, quiet surfaces |
| Food Emerald | `#10B981` | Real positive food and meal-inclusion states only |

### Accessibility Treatment

Raw Coral and Muted Lavender do not pass WCAG AA as small text on Cream.

- Coral remains a background, border, icon, and focus accent on light surfaces; Deep Plum is used for readable text.
- Readable secondary text uses a brand-only mix of 30% Deep Plum and 70% Muted Lavender.
- Coral text on Deep Plum is rendered as Soft Peach.
- Primary Coral buttons use Deep Plum text.
- Food Emerald is never used for generic success, payments, reviews, or account status.

Do not add blue, yellow, gold, unrelated purple, neon green, gradients, or pure black.

## Typography

### Families

- **Montserrat:** display headings, section headings, navigation, buttons, labels, badges, prices, and compact marketplace metadata.
- **Nunito:** paragraphs, helper text, long-form content, validation guidance, policies, and descriptions.

### Hierarchy

| Role | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Hero display | 60–72px | 36px | 700 |
| Section heading | 48px | 30px | 700 |
| Page heading | 48–60px | 36px | 700 |
| Card heading | 20–24px | 20px | 600 |
| Body lead | 18px | 18px | 400 |
| Body | 16px | 16px | 400 |
| Supporting | 14px | 14px | 400–600 |
| Metadata | 12px | 12px | 500–600 |

Headings use balanced wrapping. Body copy uses readable line height and a maximum measure near 65 characters.

## Spacing

The UI follows an 8-point rhythm with a 4px micro-step.

| Token | Value |
|---|---:|
| XS | 4px |
| SM | 8px |
| MD | 16px |
| LG | 24px |
| XL | 32px |
| 2XL | 48px |
| 3XL | 64px |
| 4XL | 80px |
| 5XL | 96px |

Standard sections use 64px mobile and 80px desktop vertical spacing. Major editorial transitions may use 96px.

## Layout

- Wide maximum: 1440px.
- Standard maximum: 1200px.
- Long-form maximum: 768px.
- Mobile gutter: 16px.
- Tablet gutter: 24px.
- Desktop gutter: 32–40px.
- Desktop grid: 12 columns.

Asymmetric desktop compositions collapse to one deliberate mobile column below 768px. Controls are reordered by booking relevance, not by their desktop position.

## Breakpoints

| Name | Width | Intent |
|---|---:|---|
| Small mobile | 360px | Minimum supported touch layout |
| Standard mobile | 390px | Primary mobile review width |
| Large mobile | 430px | Wide phone |
| Tablet | 768px | Two-column transitions |
| Small laptop | 1024px | Desktop content begins |
| Desktop | 1280px | Full editorial grid |
| Large desktop | 1440px | Maximum design canvas |
| Wide desktop | 1920px | Centered 1440px content |

## Shape System

- Small controls and compact elements: 8px.
- Buttons, inputs, and selects: 12px.
- Standard cards: 20px.
- Large editorial/image panels: 28px.
- Full pills: compact badges, status chips, and filter chips only.

## Elevation

Use borders and spacing before shadows.

- `shadow-tijum-card`: quiet card separation.
- `shadow-tijum-soft`: major photography, search, and conversion surfaces.
- Shadows are Deep Plum-tinted, never pure black.
- No glow effects or glass-card stacks.

## Iconography

- Use `lucide-react` for customer-facing interface icons.
- Do not use Unicode arrows, stars, emoji, or hand-drawn SVG paths as controls or status icons.
- Currency symbols and normal prose punctuation are text, not interface icons.
- Use CSS borders or spacing for simple separators rather than symbol bullets.
- Keep icon stroke, size, and alignment consistent within each control family.

## Navigation

### Desktop

- Maximum 72px height.
- Sticky Cream surface with Neutral Surface divider.
- Single-line navigation.
- Five marketplace links maximum before account actions.
- Coral reserved for the important account action.

### Mobile

- Brand logo, compact Join action, and menu trigger remain visible.
- Navigation opens as a full-height Deep Plum dialog.
- Escape closes the dialog and restores trigger focus.
- Targets are at least 44px high.

## Buttons

### Primary

- Coral background.
- Deep Plum text.
- 48px default height.
- One clear action phrase that does not wrap.

### Secondary

- Deep Plum background with Cream text, or Cream surface with Plum border.
- Transparent variants on Deep Plum use Cream borders/text.

### Interaction

- Hover adjusts brand-token opacity and a small transform.
- Active state uses a subtle 1px press.
- Focus uses a 2–3px Coral ring.
- Disabled state preserves label readability.
- Motion uses `cubic-bezier(0.22, 1, 0.36, 1)`.
- Root `scrollbar-gutter: stable` and scroll-lock compensation must keep the page width unchanged when a select, dialog, or drawer opens.

## Forms

- Labels remain visible above every control.
- Inputs and selects are at least 48px high.
- Cream background, Plum text, Plum-opacity border.
- Helper text uses accessible secondary text.
- Validation uses Coral border/background with Plum text.
- Placeholders never replace labels.
- Mobile forms use a vertical or two-column touch flow.
- Marketing consent is a separate unchecked control.

## Search

The shared `SearchPanel` supports real backend fields:

- Destination/city
- Locality where used
- Accommodation category on the homepage
- Check-in date
- Daily, weekly, or monthly duration
- Duration quantity
- Guest/room quantity

Search parameters remain in the URL. Advanced filters stay in the results page and a mobile drawer.

## Property Cards

Information order:

1. Actual property image or branded placeholder.
2. Property name and location.
3. Real category and guest eligibility.
4. Real backend rate.
5. Food-provided state and named included meals.
6. Room-type and amenity summary.
7. Real review data when present.
8. View-stay action.

Never show fabricated ratings, review counts, room numbers, beds, or stock property photography.

## Food Inclusion

Always preserve four independent fields:

- `food_provided`
- `breakfast_included`
- `lunch_included`
- `dinner_included`

Positive states may use Food Emerald. Negative/unavailable states use Neutral Surface and readable Plum/Lavender text. “Food provided” never implies all three meals.

## Room Types and Pricing

- Customers select room type and quantity only.
- Owners allocate physical rooms after confirmation.
- Never expose bed inventory or physical room selection.
- Show backend integer-paise rates as INR.
- Daily, weekly, and monthly rates remain separate.
- Do not calculate final reservation totals in the browser.
- Tell customers the backend calculates the final quote before the inventory hold begins.

## Reservation States

The UI must distinguish:

1. Awaiting payment during the 15-minute inventory hold.
2. Confirmed after backend payment verification.
3. Cancelled.
4. Expired.

The 15-minute payment window begins when the customer submits the reviewed booking. Backend-verified captured payment confirms the booking automatically without owner approval. A frontend gateway callback is never authoritative.

## Reviews

- Use **Verified Booking**.
- Do not say verified guest, verified stay, identity-verified, or physically verified.
- Display only published backend review data.
- Use Coral stars rather than gold/amber.
- Keep moderation and report actions accessible.

## Cards

Cards are used only when the boundary communicates grouping, selection, or elevation.

- Do not wrap every section in a card.
- Use dividers and whitespace for timelines, benefit lists, and editorial content.
- Image-led cards make photography the dominant surface.
- Empty states use a branded placeholder and direct next step.

## Photography

- Use approved local editorial assets for homepage/category/city/food storytelling.
- Use actual property media for property cards/details.
- Use a branded placeholder when property media is missing.
- Preserve intrinsic dimensions and aspect ratios.
- Lazy-load below-fold imagery.
- Never display a generic room image as a real property or author avatar.

## Motion

- Animate transform and opacity only where practical.
- Use motion for hierarchy, feedback, and state changes.
- Honor `prefers-reduced-motion` globally.
- Avoid auto-playing loops, scroll hijacking, and heavy parallax.
- The tagline reveal uses a small transform stagger without lowering text contrast.

## Accessibility

- Target WCAG 2.2 AA.
- One `h1` per page.
- Skip link to `#main-content`.
- Keyboard-operable dialogs, drawers, accordions, and forms.
- Visible `:focus-visible` treatment.
- Explicit labels and names on controls.
- Minimum 44px touch targets for principal actions.
- Image alt text and intrinsic dimensions.
- No horizontal overflow at 360px.
- Use accessible brand text treatments rather than changing the official palette.

## SEO

- Use `PublicSeoHead` for title, description, canonical, Open Graph, Twitter, structured data, and `robots`.
- Preserve existing slugs and route names.
- Keep city/property/blog/CMS internal linking route-safe through Wayfinder.
- Never fabricate rating schema or testimonial data.

## Content Rules

- Use direct, factual language.
- Avoid fabricated statistics, verification, guarantees, earnings, occupancy, or savings.
- Do not promise all meals at every property.
- Do not imply confirmation before the backend verifies captured payment.
- Do not describe customer booking eligibility as identity or physical-presence verification.
- Do not publish placeholder legal or social links.

## Implementation References

- Tokens and utilities: `resources/css/app.css`
- Public shell: `resources/js/layouts/public-layout.tsx`
- Customer auth shell: `resources/js/components/customer/customer-auth-shell.tsx`
- Shared search: `resources/js/components/public/search-panel.tsx`
- Property cards: `resources/js/components/public/property-card.tsx`
- Food states: `resources/js/components/public/food-inclusion-status.tsx`
- Responsive containers: `resources/js/components/shared/responsive-container.tsx`
- SEO head: `resources/js/components/public/public-seo-head.tsx`
