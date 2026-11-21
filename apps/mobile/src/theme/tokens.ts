/**
 * TIJUM Design Token System
 * Authoritative visual design tokens extracted directly from reference sheets:
 * E:\tijum\All app UI screens direction
 */

export const Palette = {
    // Brand Core
    plumDark: '#2A122A', // Deepest eggplant / splash screen canvas
    plumDeep: '#381E38', // Header app bars, cards, brand anchors
    plumPrimary: '#4A154B', // Primary brand CTA buttons, active accents
    plumLight: '#6B3A6C', // Subtle plum hover / highlight

    // Coral & Peach Accents
    coralDark: '#C94534', // Dark coral pressed state
    coralPrimary: '#E05A47', // Primary roof mark, active chips, key CTAs
    coralLight: '#E85D4E', // Vivid coral link / icon highlight
    peachHighlight: '#FF8A73', // Secondary badges & highlights
    peachSoft: '#FFEBDD', // Soft peach chip backgrounds
    peachCream: '#FFF3EA', // Lightest tint for active container surfaces

    // Warm Canvas & Surfaces
    canvas: '#FFF9F5', // Primary warm cream screen background
    surface: '#FFFFFF', // Card surfaces & elevated containers
    surfaceSubtle: '#F6F2EE', // Subtle input fields, dividers, inactive chips
    borderSubtle: '#EBE3DC', // Fine hair-line borders
    borderStrong: '#D6CBC2', // Focused or outlined inputs

    // Typography & Ink
    inkPrimary: '#1E121E', // Primary headings & heavy text (deep charcoal-plum)
    inkSecondary: '#6B5E6B', // Body text, descriptive labels, subtitles
    inkMuted: '#9E919E', // Placeholder text, inactive icons, timestamps
    inkInverse: '#FFFFFF', // White text on deep plum/coral

    // Functional & Semantic States
    success: '#2E7D32', // Verified checkmark, available room dot, confirmed badge
    successLight: '#E8F5E9', // Success pill background
    successText: '#1B5E20', // Success badge label

    warning: '#ED6C02', // 15-min countdown timer, pending hold, cleaning status
    warningLight: '#FFF3E0', // Warning pill background
    warningText: '#E65100', // Warning badge label

    danger: '#D32F2F', // Error state, cancelled badge, delete account action
    dangerLight: '#FFEBEE', // Danger pill background
    dangerText: '#B71C1C', // Danger badge label

    info: '#0284C7', // Info alert, case tracking link
    infoLight: '#E0F2FE', // Info pill background
    infoText: '#0369A1', // Info badge label

    // Category Theming (Canonical 3)
    categoryHostel: '#4A154B',
    categoryHomestay: '#E05A47',
    categoryColiving: '#2A52BE',
};

export const SpacingTokens = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    hero: 48,
};

export const RadiusTokens = {
    xs: 4,
    sm: 6,
    md: 10,
    base: 14,
    lg: 18,
    xl: 22,
    pill: 9999,
    full: 9999,
};

export const ShadowTokens = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    subtle: {
        shadowColor: '#1E121E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    card: {
        shadowColor: '#1E121E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    elevated: {
        shadowColor: '#1E121E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 4,
    },
    floating: {
        shadowColor: '#381E38',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 6,
    },
};

export const TypographyTokens = {
    fontSize: {
        xxs: 10,
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        title: 28,
        hero: 34,
    },
    lineHeight: {
        xxs: 14,
        xs: 16,
        sm: 20,
        base: 24,
        lg: 26,
        xl: 28,
        xxl: 32,
        title: 36,
        hero: 42,
    },
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        heavy: '800' as const,
        black: '900' as const,
    },
};
