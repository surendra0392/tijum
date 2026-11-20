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

export const Spacing = {
    xxs: SpacingTokens.xxs,
    xs: SpacingTokens.xs,
    sm: SpacingTokens.sm,
    md: SpacingTokens.md,
    base: SpacingTokens.base,
    lg: SpacingTokens.lg,
    xl: SpacingTokens.xl,
    xxl: SpacingTokens.xxl,
    xxxl: SpacingTokens.xxxl,
    hero: SpacingTokens.hero,
};

export const BorderRadius = {
    xs: RadiusTokens.xs,
    sm: RadiusTokens.sm,
    md: RadiusTokens.md,
    base: RadiusTokens.base,
    lg: RadiusTokens.lg,
    xl: RadiusTokens.xl,
    pill: RadiusTokens.pill,
    full: RadiusTokens.full,
};

export const Shadows = ShadowTokens;
