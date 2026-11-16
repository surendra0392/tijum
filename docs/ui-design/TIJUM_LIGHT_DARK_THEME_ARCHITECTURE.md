# TIJUM Light / Dark Mode Theme Architecture

## 1. Overview & Architectural Goals

The TIJUM Authenticated Portals Theme Architecture provides instantaneous, reactive theme switching between **Light Mode** and **Dark Mode** with:
- Zero flash of unstyled content (FOUC).
- Persistent state saved to `localStorage` and synchronized across tabs.
- Full scoped isolation from public landing pages and authentication screens.
- WCAG AA contrast compliance across all cards, dialogs, forms, badges, and data tables.

---

## 2. Centralized State & Theme Synchronization

### 2.1 The Appearance Hook (`useAppearance`)

Theme state is managed through the centralized React hook located in `resources/js/hooks/use-appearance.tsx`:

```typescript
export function useAppearance() {
    // Reads from localStorage or system preferences
    // Toggles 'dark' class on document.documentElement
    // Updates appearance state reactively
}
```

### 2.2 Centralized Toggle Component (`ThemeToggle`)

The shared toggle component in `resources/js/components/theme-toggle.tsx`:
- Provides an accessible, keyboard-focusable button displaying `Sun` (when dark) or `Moon` (when light).
- Embedded into the top navigation header of:
  - **Customer Portal:** `resources/js/components/app-sidebar-header.tsx`
  - **Owner / Partner Portal:** `resources/js/layouts/owner-layout.tsx`
  - **Admin Console:** `resources/js/layouts/admin-layout.tsx`

---

## 3. Dark Mode Contrast Remediation & CSS Tokens

In earlier iterations, elements with `.text-tijum-plum` suffered near-zero contrast when rendered against dark backgrounds because `#442F41` is a dark plum. 

To solve this without modifying hundreds of component calls or breaking light mode:
1. `resources/css/portals.css` intercepts `.text-tijum-plum` under dark portal containers:
```css
.dark .tijum-customer .text-tijum-plum,
.dark .tijum-owner .text-tijum-plum,
.dark .tijum-admin .text-tijum-plum,
.dark .tijum-admin-theme .text-tijum-plum {
    color: var(--foreground); /* #FFF4EE (high contrast) */
}
```
2. Similarly, `.text-tijum-plum-muted` maps dynamically:
```css
.dark .tijum-customer .text-tijum-plum-muted,
.dark .tijum-owner .text-tijum-plum-muted,
.dark .tijum-admin .text-tijum-plum-muted,
.dark .tijum-admin-theme .text-tijum-plum-muted {
    color: var(--muted-foreground); /* #D4C4D0 (readable) */
}
```
3. Hardcoded white cards `.bg-white` automatically map to `--card` (`#281A27`), eliminating blinding white cards in dark mode.
4. Input fields, select dropdowns, and textareas map background to `--card`, borders to `--border`, and text to `--foreground`.

---

## 4. Theme Isolation (No Leakage)

Public layouts (`PublicLayout`, `welcome.tsx`, auth login/register) do NOT have the `.tijum-customer`, `.tijum-owner`, or `.tijum-admin` classes attached. Hence, all scoped portal rules are dormant on marketing pages, ensuring marketing and landing pages retain their bespoke brand design.
