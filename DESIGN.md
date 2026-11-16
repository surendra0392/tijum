---
version: '1.0'
name: TIJUM Editorial Marketplace
description: Warm, trustworthy accommodation discovery with explicit meal information and affordable-stay clarity.
colors:
    primary: '#442F41'
    action: '#FF7A67'
    accent: '#FFB6A3'
    background: '#FFF4EE'
    supporting: '#8B6B82'
    border: '#E6E0DB'
    food-positive: '#10B981'
typography:
    display:
        fontFamily: Montserrat
        fontSize: 60px
        fontWeight: 700
        lineHeight: 1
        letterSpacing: -0.03em
    headline-lg:
        fontFamily: Montserrat
        fontSize: 48px
        fontWeight: 700
        lineHeight: 1.08
        letterSpacing: -0.025em
    headline-md:
        fontFamily: Montserrat
        fontSize: 36px
        fontWeight: 700
        lineHeight: 1.12
        letterSpacing: -0.02em
    headline-sm:
        fontFamily: Montserrat
        fontSize: 24px
        fontWeight: 600
        lineHeight: 1.25
        letterSpacing: -0.01em
    title:
        fontFamily: Montserrat
        fontSize: 20px
        fontWeight: 600
        lineHeight: 1.4
    label:
        fontFamily: Montserrat
        fontSize: 14px
        fontWeight: 600
        lineHeight: 1.4
    body-lg:
        fontFamily: Nunito
        fontSize: 18px
        fontWeight: 400
        lineHeight: 1.6
    body-md:
        fontFamily: Nunito
        fontSize: 16px
        fontWeight: 400
        lineHeight: 1.6
    body-sm:
        fontFamily: Nunito
        fontSize: 14px
        fontWeight: 400
        lineHeight: 1.5
rounded:
    sm: 8px
    md: 12px
    lg: 20px
    xl: 28px
    full: 999px
spacing:
    xs: 4px
    sm: 8px
    md: 16px
    lg: 24px
    xl: 32px
    2xl: 48px
    3xl: 64px
    4xl: 80px
    5xl: 96px
components:
    button-primary:
        backgroundColor: '{colors.action}'
        textColor: '{colors.primary}'
        rounded: '{rounded.md}'
        height: 48px
        padding: 16px
        typography: '{typography.label}'
    button-secondary:
        backgroundColor: '{colors.primary}'
        textColor: '{colors.background}'
        rounded: '{rounded.md}'
        height: 48px
        padding: 16px
        typography: '{typography.label}'
    input:
        backgroundColor: '{colors.background}'
        textColor: '{colors.primary}'
        rounded: '{rounded.md}'
        height: 48px
        padding: 16px
    card:
        backgroundColor: '{colors.background}'
        textColor: '{colors.primary}'
        rounded: '{rounded.lg}'
        padding: 24px
    image-card:
        backgroundColor: '{colors.primary}'
        textColor: '{colors.background}'
        rounded: '{rounded.xl}'
    food-positive:
        backgroundColor: '{colors.food-positive}'
        textColor: '{colors.primary}'
        rounded: '{rounded.full}'
---

# TIJUM Editorial Marketplace

## Overview

TIJUM is a premium but affordable Indian accommodation marketplace for students, working professionals, relocating customers, and value-conscious travellers. The experience is warm and editorial rather than hotel-luxury, directory-like, or SaaS-like. Photography carries emotion; typography and spacing carry confidence; real inventory, meal, pricing, reservation, and review data carry trust.

The core promise is **Stay easy. Eat well. Spend less.** Every surface should help a customer understand the accommodation, the exact meal arrangement, the supported stay duration, and the next reservation step without guesswork.

## Colors

- **Deep Plum (`#442F41`)** is the identity color for headings, navigation, footer, key surfaces, and primary text.
- **Coral (`#FF7A67`)** is reserved for the most important action and active interactive states.
- **Soft Peach (`#FFB6A3`)** supports small highlights, focus treatments, and restrained section accents.
- **Cream (`#FFF4EE`)** is the principal page and component surface.
- **Muted Lavender (`#8B6B82`)** supports secondary copy and quiet metadata.
- **Neutral Surface (`#E6E0DB`)** creates borders, dividers, and low-emphasis section layers.
- **Food Emerald (`#10B981`)** is semantic only. Use it for a real positive food or meal-inclusion state, never for generic success decoration.

Opacity variants of these tokens are allowed. Unrelated blues, yellows, golds, greens, purples, gradients, and pure black are not part of the customer-facing system.

## Typography

Montserrat is used for display type, headings, navigation, buttons, labels, prices, and compact marketplace metadata. Nunito is used for body copy, descriptions, helper text, long-form content, validation guidance, and policy text.

Desktop hero copy uses the display role and is limited to two or three deliberately balanced lines. Mobile starts at 36px and preserves readable line length. Paragraphs default to 16px with generous line height; supporting text may use 14px but never becomes the primary way important information is communicated.

## Layout

Use a 12-column desktop grid inside a maximum 1440px container. Standard page content uses a 1200px container and long-form copy uses a 768px measure. Gutters are 16px on small mobile, 24px from 640px, and 32px from 1024px.

Section spacing follows the 8-point rhythm: 64px on mobile, 80px on desktop, and up to 96px for major editorial transitions. Multi-column sections collapse deliberately below 768px. Search, filtering, room selection, and forms prioritize touch order over preserving desktop composition.

## Elevation & Depth

Depth is created primarily through photography, overlapping composition, Deep Plum tonal surfaces, Neutral Surface borders, and whitespace. Shadows are sparse and tinted with Deep Plum at low opacity. Avoid generic black shadows, glowing effects, frosted-glass stacks, and elevation on every section.

## Shapes

Controls use 12px radii. Standard content cards use 20px. Large image-led editorial panels use 28px. Full pills are limited to compact status indicators and filter chips. Do not turn content cards, forms, or navigation groups into pills.

## Components

**Navigation:** 72px maximum desktop height, sticky Cream surface with a quiet divider, a single-line desktop hierarchy, and a full-height mobile menu with 44px minimum targets.

**Buttons:** Coral is primary, Deep Plum is secondary, and transparent controls use a Deep Plum border. Primary labels stay short and never wrap. Hover and active states adjust only brand-token opacity, transform, and border emphasis.

**Forms:** Labels always sit above fields. Inputs are at least 48px high with readable Cream surfaces, Deep Plum text, Muted Lavender helper text, Coral validation emphasis, and visible focus rings. Placeholders never replace labels.

**Search:** The search panel is a conversion surface, not a generic card. It groups destination, date, duration, quantity, and supported accommodation criteria in natural reading order. The mobile form is a vertical touch flow.

**Property cards:** Photography is dominant. Name, location, real rate, room-type availability, and four independent food states are ordered by booking relevance. Ratings render only when real published review data exists. Physical rooms and beds are never customer-selectable.

**Food status:** Always represent `food_provided`, `breakfast_included`, `lunch_included`, and `dinner_included` independently. Positive included states may use Food Emerald. Unavailable states use Neutral Surface and Muted Lavender. Never infer all meals from `food_provided`.

**Reservation:** The interface distinguishes the 15-minute inventory hold, awaiting payment, backend-verified payment, automatic confirmation, cancellation, and expiry. Owners do not approve or decline bookings; they allocate physical rooms after confirmation. Frontend callbacks never imply authoritative confirmation.

**Accordions and drawers:** Use semantic controls, keyboard support, visible focus, restrained transform/opacity transitions, and reduced-motion fallbacks.

## Do's and Don'ts

- Do use actual property, city, room-type, amenity, meal, pricing, and review data.
- Do treat imagery as a primary brand asset and reserve intrinsic dimensions to prevent layout shift.
- Do vary section composition between editorial splits, timelines, image grids, and quiet information bands.
- Do preserve named Laravel routes, Wayfinder functions, Inertia props, validation, and backend-authoritative state.
- Do keep every important action reachable and unobstructed at 360px.
- Do use Lucide icons for customer-facing actions and states; reserve text symbols for currency and prose only.
- Don't fabricate ratings, testimonials, listing counts, prices, verification, occupancy, savings, or partner performance.
- Don't claim every property offers every meal.
- Don't imply that a browser callback confirms a booking; automatic confirmation remains backend-authoritative after captured payment verification.
- Don't expose physical room numbers, bed inventory, or bed-level pricing to customers.
- Don't add early-arrival fees, unsupported maps, or promotional channels.
- Don't use repeated identical card grids, decorative gradients, emojis, or unrelated color systems.
