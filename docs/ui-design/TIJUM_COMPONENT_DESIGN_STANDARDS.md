# TIJUM Component Design Standards & UI Guidelines

## 1. Component Library Standards

All authenticated portal interfaces must use the standard component primitives located in `resources/js/components/ui/` and `resources/js/components/shared/`.

---

## 2. Shared Primitives Specification

### 2.1 Buttons (`Button`)

- **Default (Primary):** `bg-tijum-coral text-white hover:bg-tijum-coral/90`
- **Plum (Brand Secondary):** `bg-tijum-plum text-white hover:bg-tijum-plum/90 dark:bg-tijum-plum/80`
- **Outline:** `border border-tijum-surface/80 dark:border-border text-tijum-plum dark:text-foreground hover:bg-tijum-cream/40 dark:hover:bg-accent`
- **Ghost:** `text-tijum-plum dark:text-foreground hover:bg-tijum-cream/50 dark:hover:bg-accent`
- **Destructive:** `bg-destructive text-destructive-foreground hover:bg-destructive/90`

### 2.2 Badges (`Badge`)

- **Default:** `bg-tijum-plum text-white dark:bg-card dark:text-foreground`
- **Secondary:** `bg-tijum-cream dark:bg-card text-tijum-plum dark:text-foreground`
- **Outline:** `border border-tijum-surface/80 dark:border-border text-tijum-plum dark:text-foreground`
- **Food:** `border border-emerald-300/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold` — **Reserved exclusively for meals and food service**.
- **Destructive:** `bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900`

### 2.3 Cards (`Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`)

- **Surface:** `bg-white dark:bg-card border-tijum-surface/80 dark:border-border shadow-tijum-card rounded-2xl`
- **Title:** `font-heading font-semibold text-tijum-plum dark:text-foreground`
- **Description:** `text-tijum-plum-muted dark:text-muted-foreground text-xs`

### 2.4 Tables (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell`)

- Located in `resources/js/components/ui/table.tsx`.
- **Header:** `bg-tijum-cream/60 dark:bg-card/90 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground uppercase tracking-wider`
- **Rows:** `border-b border-tijum-surface/70 dark:border-border transition-colors hover:bg-tijum-cream/30 dark:hover:bg-muted/40`
- **Cells:** `text-sm text-tijum-plum dark:text-foreground`

### 2.5 Form Controls (`Input`, `Select`, `Textarea`, `Checkbox`)

- **Input / Textarea:** `bg-white dark:bg-card border-tijum-border-control dark:border-border text-tijum-plum dark:text-foreground focus-visible:ring-2 focus-visible:ring-tijum-coral`
- **Checkbox:** `border-tijum-border-control dark:border-border data-[state=checked]:bg-tijum-coral data-[state=checked]:text-white`
- **Select Content:** `bg-white dark:bg-card border-border shadow-tijum-card`

### 2.6 Dialogs & Drawers (`Dialog`, `Sheet`)

- **Dialog Overlay:** `bg-black/50 backdrop-blur-xs`
- **Dialog Content:** `bg-white dark:bg-card border-border shadow-tijum-card rounded-2xl text-tijum-plum dark:text-foreground`
- **Drawer / Sheet Content:** `bg-white dark:bg-card border-border shadow-2xl`

---

## 3. Strict Rules & Anti-Patterns

1. **NO raw emerald for non-food elements.** Always check semantic intent.
2. **NO hardcoded `#ffffff` or `bg-white` without dark mode consideration.** Always use theme-aware classes or rely on scoped `.tijum-*` rules.
3. **NO raw `#442F41` for foreground text on dark elements.** Always pair with `dark:text-foreground` or use CSS token variables.
4. **NO mixing arbitrary font families.** Headings must use Montserrat (`font-heading`), body text must use Nunito.
