# TIJUM Design System Reference

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Version:** Phase 02 Foundation  
**Mode:** Light-First Visual Identity (`color-scheme: light`)

---

## 1. Brand Colours (Locked)

All TIJUM interfaces share six locked brand colours centralized in [`resources/css/app.css`](../resources/css/app.css):

| Name | HEX | CSS Token | Primary Role |
|---|---|---|---|
| Deep Plum | `#442F41` | `--color-tijum-plum` | Primary headings, navigation, strong ink, admin sidebar, public footer |
| Coral | `#FF7A67` | `--color-tijum-coral` | Primary calls to action, selected highlights, interactive emphasis |
| Soft Peach | `#FFB6A3` | `--color-tijum-peach` | Light branded accents, supporting tags, pill borders |
| Cream | `#FFF4EE` | `--color-tijum-cream` | Main page warm canvas, authentication surfaces, subtle panels |
| Muted Lavender | `#8B6B82` | `--color-tijum-lavender` | Secondary graphics and subtle decorative elements |
| Neutral Surface | `#E6E0DB` | `--color-tijum-surface` | Borders, dividers, secondary button fills, disabled backgrounds |

---

## 2. Colour Usage Rules

- **Deep Plum (`#442F41`):** Headings (`h1`–`h6`), body ink, Customer/Owner card titles, Admin Console sidebar (`#442F41` surface), and Public footer surface.
- **Coral (`#FF7A67`):** Primary CTA buttons (`variant="default"`) paired strictly with **Deep Plum (`#442F41`) text** (`4.76:1` WCAG AA contrast; never small white text on Coral, which yields `2.55:1`). Hover state shifts smoothly to `--color-tijum-coral-hover` (`#F26854`).
- **Soft Peach (`#FFB6A3`):** Soft pill borders, highlight chips, and subtle tinted panels (`7.21:1` with Deep Plum text).
- **Cream (`#FFF4EE`):** Primary viewport background canvas (`--background`) across public, customer, owner, and auth portals (`11.24:1` with Deep Plum text).
- **Muted Lavender (`#8B6B82`) & Accessible Muted Plum (`#6C5166`):** Use `#8B6B82` for icons, dividers, and white-surface details (`4.64:1` on White); use `--color-tijum-plum-muted` (`#6C5166`, `6.46:1` on Cream / `6.98:1` on White) for body captions and secondary text.
- **Neutral Surface (`#E6E0DB`):** Card borders (`--border`), horizontal dividers, table hairlines, and neutral secondary button fills (`9.28:1` with Deep Plum text). Control borders use `--tijum-border-control` / `--input` (`#9A8494`, `3.18:1` UI contrast on Cream).

---

## 3. Semantic Colour Tokens

| Token Group | Background | Foreground | Border | Contrast Ratio |
|---|---|---|---|---|
| Success / Verified / Active | `#EDF7F2` (`--status-success-bg`) | `#1B5E3F` (`--status-success-fg`) | `#A7DAC0` (`--status-success-border`) | `7.06:1` |
| Warning / Pending | `#FEF5E7` (`--status-warning-bg`) | `#7A4409` (`--status-warning-fg`) | `#F4CC96` (`--status-warning-border`) | `7.31:1` |
| Error / Destructive / Rejected | `#FDF0EF` (`--status-error-bg`) | `#9E2A2B` (`--status-error-fg`) | `#F1B4B3` (`--status-error-border`) | `6.70:1` |
| Info / Brand Contextual | `#FFF4EE` (`--status-info-bg`) | `#442F41` (`--status-info-fg`) | `#FFB6A3` (`--status-info-border`) | `11.24:1` |
| Neutral / Cancelled | `#F4EFEC` (`--status-neutral-bg`) | `#442F41` (`--status-neutral-fg`) | `#E6E0DB` (`--status-neutral-border`) | `~10.8:1` |

Both `:root` and `.dark` resolve to the unified light-first TIJUM token values (`color-scheme: light`) across active interfaces.

---

## 4. Typography

- **Bundling:** Configured centrally in [`vite.config.ts`](../vite.config.ts) via Bunny Fonts (`Montserrat` + `Nunito`), with legacy `Instrument Sans` references removed from active styling.
- **Headings & UI (`--font-heading`):** `'Montserrat', ui-sans-serif, system-ui, sans-serif` — applied in CSS `@layer base` to `h1`–`h6`, `nav`, `label`, `button`, `[data-slot='card-title']`, and `[data-slot='dialog-title']`.
- **Body & Content (`--font-body`, `--font-sans`):** `'Nunito', ui-sans-serif, system-ui, sans-serif` — applied globally to `body`, paragraphs, descriptions, tables, and form inputs.

---

## 5. Font Weights

| Font | Loaded Weights | Assigned Purpose |
|---|---|---|
| `Montserrat` | `500` Medium, `600` SemiBold, `700` Bold | Navigation/labels (`500`), buttons/subheadings/badges (`600`), display headings & stat figures (`700`) |
| `Nunito` | `400` Regular, `500` Medium, `600` SemiBold, `700` Bold | Body copy/tables (`400`), helper/list descriptions (`500`), emphasized prose & key values (`600`/`700`) |

---

## 6. Heading Hierarchy

- **H1 (Page Header):** `font-heading text-2xl sm:text-3xl font-bold tracking-tight text-tijum-plum` (Landing hero scales to `text-3xl sm:text-4xl lg:text-5xl`).
- **H2 (Section Heading):** `font-heading text-lg sm:text-xl font-bold text-tijum-plum`.
- **H3 / Card Title:** `font-heading text-base sm:text-lg font-semibold leading-snug text-tijum-plum`.
- **Eyebrow:** `font-heading text-xs font-semibold uppercase tracking-wider text-tijum-plum-muted`.

---

## 7. Body Typography

- **Standard Paragraph:** `text-sm` to `text-base`, `leading-relaxed`, `Nunito`.
- **Muted Helper / Supporting Text:** `text-xs` or `text-sm` with `text-muted-foreground` (`#6C5166`).
- **Tabular Data:** `text-sm text-tijum-plum`, using `font-heading font-semibold` on row/column headers (`<th>`).

---

## 8. Buttons

Implemented in [`resources/js/components/ui/button.tsx`](../resources/js/components/ui/button.tsx) (`h-10` default height, keyboard focus ring, `loading` prop with `Spinner` and `aria-busy`):

- `default`: Coral `#FF7A67` fill with Deep Plum `#442F41` text (Primary CTA).
- `plum`: Deep Plum `#442F41` fill with Cream `#FFF4EE` text (Authority/Console actions).
- `secondary`: Neutral Surface `#E6E0DB` with Deep Plum text (Cancel / non-primary modal actions).
- `outline`: White fill with `--input` border and Deep Plum text.
- `ghost`: Transparent fill hovering to Cream `#FFF4EE`.
- `destructive`: Semantic Crimson `#9E2A2B` fill with White text.
- `link`: Deep Plum underlined link treatment.
- **Sizes:** `sm` (`h-8.5`), `default` (`h-10`), `lg` (`h-11`), `icon` (`size-9`).

---

## 9. Form Controls

- Primitives under [`resources/js/components/ui/`](../resources/js/components/ui): [`input.tsx`](../resources/js/components/ui/input.tsx), [`textarea.tsx`](../resources/js/components/ui/textarea.tsx), [`select.tsx`](../resources/js/components/ui/select.tsx), [`checkbox.tsx`](../resources/js/components/ui/checkbox.tsx), [`radio-group.tsx`](../resources/js/components/ui/radio-group.tsx), [`switch.tsx`](../resources/js/components/ui/switch.tsx), and [`password-input.tsx`](../resources/js/components/password-input.tsx).
- Structured wrappers in [`resources/js/components/shared/form-field.tsx`](../resources/js/components/shared/form-field.tsx):
  - `FormField`: connects `htmlFor`/`id`, required asterisk (`aria-hidden="true"`), help description, and `InputError` via `aria-describedby` + `aria-invalid`.
  - `FileUploadField`: accessible hidden `<input type="file">` paired with styled label dropzone and format hint.
  - `MultiSelectCheckboxGroup`: `<fieldset>` + `<legend>` semantic multi-option group.

---

## 10. Cards

- Base [`card.tsx`](../resources/js/components/ui/card.tsx): `rounded-2xl border border-tijum-surface bg-card py-6 shadow-xs`.
- Shared compositions in [`resources/js/components/shared/info-card.tsx`](../resources/js/components/shared/info-card.tsx):
  - `StatCard`: KPI summary card with top icon pill and semantic status slot.
  - `InfoPanel`: Structured guidance/status card with action slot.
  - `PropertySummaryCard`: Reusable design-only layout template prepared for Phase 03+.

---

## 11. Status Badges

Implemented in [`resources/js/components/shared/status-badge.tsx`](../resources/js/components/shared/status-badge.tsx):
Supports `active`, `verified`, `completed`, `pending`, `processing`, `rejected`, `suspended`, `cancelled`, `info`, and `neutral`. Every state renders both an icon (`aria-hidden="true"`) and text label so state never relies on colour alone.

---

## 12. Navigation

- **Public Header & Footer:** Sticky light header with slide-over mobile `Sheet` drawer and Deep Plum footer ([`public-layout.tsx`](../resources/js/layouts/public-layout.tsx)).
- **Customer Sidebar:** Light collapsible sidebar focused strictly on Customer routes (`Dashboard`, `Account Settings`), keeping future marketplace links clearly disabled/badged ([`app-sidebar.tsx`](../resources/js/components/app-sidebar.tsx)).
- **Owner Sidebar:** Light collapsible partner sidebar with `Overview`, `Profile & Settings`, and cleanly labelled upcoming Partner modules ([`owner-layout.tsx`](../resources/js/layouts/owner-layout.tsx)).
- **Admin Sidebar:** Deep Plum `#442F41` operational sidebar displaying active routes (`Dashboard` gated visually on TOTP state, `Two-Factor Security`) and role-filtered planned module groups reflecting `auth.admin.role` ([`admin-layout.tsx`](../resources/js/layouts/admin-layout.tsx)).
- **Tabs & Pagination:** Single-row keyboard-navigable WAI-ARIA tabs ([`tabs.tsx`](../resources/js/components/ui/tabs.tsx)) and accessible `<nav aria-label="Pagination">` ([`pagination.tsx`](../resources/js/components/shared/pagination.tsx)).

---

## 13. Layouts

Explicitly mapped in [`resources/js/app.tsx`](../resources/js/app.tsx):

- `welcome`, `public/*`, `dev/*` -> `PublicLayout`
- `auth/*` -> `CustomerAuthLayout` (`AuthLayout`)
- `settings/*` -> `[CustomerLayout, SettingsLayout]`
- `owner/auth/*` -> `OwnerAuthLayout`
- `owner/*` -> `OwnerLayout`
- `admin/auth/*` -> `AdminAuthLayout`
- `admin/*` -> `AdminLayout`
- `default` -> `CustomerLayout` (`AppLayout`)

---

## 14. Spacing

- Horizontal page padding via [`ResponsiveContainer`](../resources/js/components/shared/responsive-container.tsx): `px-4 sm:px-6 lg:px-8`.
- Max container widths: `narrow` (`max-w-3xl`), `default` (`max-w-6xl`), `wide` (`max-w-7xl`).
- Vertical section cadence: `space-y-6` within workspaces, `space-y-10` on public/showcase pages, `gap-4` / `gap-6` across responsive grids, `gap-2` within field label/input pairs.

---

## 15. Border Radius

- Base `--radius: 0.75rem` (`12px`).
- Buttons, inputs, textareas: `rounded-lg` (`8px`–`10px`).
- Cards, modals, tables, panels: `rounded-2xl` (`16px`).
- Landing hero containers: `rounded-3xl` (`24px`).
- Badges & pills: `rounded-full`.

---

## 16. Shadows

Controlled lightweight elevation (`shadow-xs`) on white cards, buttons, and top bars over Cream `#FFF4EE` backgrounds; modals/dropdowns use soft `shadow-lg` / `shadow-md` with `border-tijum-surface`. No heavy drop shadows or excessive glassmorphism.

---

## 17. Icons

- Exclusively `lucide-react` across every portal (no mixed icon sets, no navigation emoji).
- Navigation items and inline buttons use `size-4 shrink-0`; stat/empty-state containers use `size-5`.
- Decorative icons inside labelled buttons/badges carry `aria-hidden="true"`.

---

## 18. Responsive Rules

Tested layout structure across mobile (`320px`, `375px`), tablet (`768px`), and desktop (`1024px`, `1440px`, `1920px`):
- Single-column default grids expanding via `sm:`, `md:`, `lg:` breakpoints.
- Sidebar shells collapse automatically to drawer overlays (`Sheet`) below mobile breakpoints.
- `DataTable` uses `@container (width < 600px)` CSS stacking with `data-label` prefixes inside a keyboard-scrollable `tabIndex={0}` container (`tijum-table-region`), eliminating horizontal page clipping at 320px.
- Auth shells use `min-h-dvh` to avoid mobile browser chrome jump.

---

## 19. Accessibility

- Contrast ratios mathematically verified for text (`>= 4.5:1`) and interactive control borders (`>= 3:1`).
- `@media (forced-colors: active)` fallback rules preserve button, card, badge, and focus visibility in Windows High Contrast mode.
- Modal scroll containment via `dialog:modal` and `dialog::backdrop` `overscroll-behavior: contain`, plus safe initial focus on Cancel inside destructive [`ConfirmationDialog`](../resources/js/components/shared/confirmation-dialog.tsx).
- `StatusBadge` combines iconography and text; `TabsTrigger` uses `border-b-[3px]` underline indicator on `aria-selected="true"`.

---

## 20. Brand-Logo Integration

- Central component: [`resources/js/components/brand/brand-logo.tsx`](../resources/js/components/brand/brand-logo.tsx) (`BrandLogo`), wrapped by [`tijum-wordmark.tsx`](../resources/js/components/tijum-wordmark.tsx).
- Variants: `horizontal`, `stacked`, `icon`; tones: `light` and `dark`; sizes: `sm`, `md`, `lg`; configurable `width`, `height`, `alt`, `portalLabel`, `showTagline`, and `assetSrc`.
- Asset directory placeholders created under `public/brand/logo/`, `public/brand/icons/`, and `public/brand/app/` ready to receive `tijum-logo-primary.svg`, `tijum-logo-light.svg`, `tijum-logo-dark.svg`, and `tijum-symbol.svg` without inventing temporary vector artwork.
