import type { CSSProperties } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export const TIJUM_BRAND_ASSETS = {
    primary: '/brand/logo/tijum-logo-primary.webp',
    primaryPng: '/brand/logo/tijum-logo-primary-4x.png',
    primaryLegacyPng: '/brand/logo/tijum-logo-primary.png',
    light: '/brand/logo/tijum-logo-light.webp',
    lightPng: '/brand/logo/tijum-logo-light-4x.png',
    lightLegacyPng: '/brand/logo/tijum-logo-light.png',
    dark: '/brand/logo/tijum-logo-primary.webp',
    darkPng: '/brand/logo/tijum-logo-primary-4x.png',
    webLogoDark: '/brand/logo/tijum-web-logo-dark-4x.png',
    tagline: '/brand/logo/tijum-logo-tagline.webp',
    taglinePng: '/brand/logo/tijum-logo-tagline.png',
    taglineLight: '/brand/logo/tijum-logo-light-tagline.webp',
    taglineLightPng: '/brand/logo/tijum-logo-light-tagline.png',
    wordmarkDark: '/brand/logo/tijum-wordmark-dark.webp',
    wordmarkDarkPng: '/brand/logo/tijum-wordmark-dark.png',
    wordmarkLight: '/brand/logo/tijum-wordmark-light.webp',
    wordmarkLightPng: '/brand/logo/tijum-wordmark-light.png',
    symbol: '/brand/icons/tijum-symbol.webp',
    symbolPng: '/brand/icons/tijum-icon-4x.png',
    symbolLegacyPng: '/brand/icons/tijum-symbol.png',
    symbolLight: '/brand/icons/tijum-symbol-light.webp',
    symbolLightPng: '/brand/icons/tijum-icon-light.png',
    appIconPlum: '/brand/app/tijum-app-icon-plum.webp',
    appIconPlumPng: '/brand/icons/tijum-icon-4x.png',
    appIconCream: '/brand/app/tijum-app-icon-cream.webp',
    appIconCreamPng: '/brand/icons/tijum-icon-4x.png',
} as const;

export type BrandLogoVariant = 'horizontal' | 'stacked' | 'icon';
export type BrandLogoTone = 'light' | 'dark';
export type BrandLogoSize = 'sm' | 'md' | 'lg';

type BrandLogoProps = {
    variant?: BrandLogoVariant;
    tone?: BrandLogoTone;
    size?: BrandLogoSize;
    width?: number | string;
    height?: number | string;
    alt?: string;
    portalLabel?: string;
    showTagline?: boolean;
    loading?: 'eager' | 'lazy';
    assetSrc?: string;
    className?: string;
};

type BrandGraphicSpec = {
    webp: string;
    png: string;
    intrinsicWidth: number;
    intrinsicHeight: number;
};

const sizeMap: Record<
    BrandLogoSize,
    {
        lockup: string;
        stacked: string;
        badge: string;
        icon: string;
        tagline: string;
    }
> = {
    sm: {
        lockup: 'h-7 w-auto',
        stacked: 'h-8 w-auto',
        badge: 'text-[10px] px-2 py-0.5',
        icon: 'size-8',
        tagline: 'text-xs',
    },
    md: {
        lockup: 'h-9 w-auto',
        stacked: 'h-10 w-auto',
        badge: 'text-[11px] px-2.5 py-0.5',
        icon: 'size-9',
        tagline: 'text-xs',
    },
    lg: {
        lockup: 'h-11 w-auto sm:h-12',
        stacked: 'h-12 w-auto',
        badge: 'text-xs px-3 py-1',
        icon: 'size-11',
        tagline: 'text-sm',
    },
};

function resolveLockupSpec(isDarkSurface: boolean): BrandGraphicSpec {
    if (isDarkSurface) {
        return {
            webp: TIJUM_BRAND_ASSETS.light,
            png: TIJUM_BRAND_ASSETS.lightPng,
            intrinsicWidth: 544,
            intrinsicHeight: 144,
        };
    }

    return {
        webp: TIJUM_BRAND_ASSETS.primary,
        png: TIJUM_BRAND_ASSETS.primaryPng,
        intrinsicWidth: 544,
        intrinsicHeight: 144,
    };
}

function resolveAppIconSpec(isDarkSurface: boolean): BrandGraphicSpec {
    if (isDarkSurface) {
        return {
            webp: TIJUM_BRAND_ASSETS.appIconCream,
            png: TIJUM_BRAND_ASSETS.appIconCreamPng,
            intrinsicWidth: 256,
            intrinsicHeight: 256,
        };
    }

    return {
        webp: TIJUM_BRAND_ASSETS.appIconPlum,
        png: TIJUM_BRAND_ASSETS.appIconPlumPng,
        intrinsicWidth: 256,
        intrinsicHeight: 256,
    };
}

export default function BrandLogo({
    variant = 'horizontal',
    tone = 'light',
    size = 'md',
    width,
    height,
    alt = 'TIJUM',
    portalLabel,
    showTagline = false,
    loading = 'eager',
    assetSrc,
    className,
}: BrandLogoProps) {
    const { resolvedAppearance } = useAppearance();
    const isDarkSurface = tone !== undefined ? tone === 'dark' : resolvedAppearance === 'dark';
    const styles = sizeMap[size];
    const hasCustomBox = width !== undefined || height !== undefined;
    const boxStyle: CSSProperties | undefined = hasCustomBox
        ? { width, height }
        : undefined;

    if (assetSrc) {
        return (
            <div
                style={boxStyle}
                className={cn(
                    'inline-flex items-center gap-2.5',
                    variant === 'stacked' && 'flex-col items-start gap-1.5',
                    className,
                )}
            >
                <img
                    src={assetSrc}
                    alt={alt}
                    width={typeof width === 'number' ? width : undefined}
                    height={typeof height === 'number' ? height : undefined}
                    loading={loading}
                    decoding="async"
                    className="h-auto max-h-full w-auto max-w-full object-contain select-none"
                />
                {portalLabel && variant !== 'icon' && (
                    <span
                        className={cn(
                            'rounded-full border font-heading font-semibold tracking-wide uppercase',
                            styles.badge,
                            isDarkSurface
                                ? 'border-tijum-peach/50 bg-tijum-coral text-tijum-plum'
                                : 'border-tijum-peach bg-tijum-cream text-tijum-plum',
                        )}
                    >
                        {portalLabel}
                    </span>
                )}
            </div>
        );
    }

    if (variant === 'icon') {
        const iconSpec = resolveAppIconSpec(isDarkSurface);

        return (
            <picture
                style={boxStyle}
                className={cn(
                    'inline-flex shrink-0 items-center justify-center',
                    className,
                )}
            >
                <source srcSet={iconSpec.webp} type="image/webp" />
                <img
                    src={iconSpec.png}
                    alt={alt}
                    width={iconSpec.intrinsicWidth}
                    height={iconSpec.intrinsicHeight}
                    loading={loading}
                    decoding="async"
                    className={cn(
                        'shrink-0 rounded-lg object-contain select-none',
                        hasCustomBox ? 'h-full w-full' : styles.icon,
                    )}
                />
            </picture>
        );
    }

    const lockupSpec = resolveLockupSpec(isDarkSurface);

    return (
        <div
            style={boxStyle}
            data-brand-asset-slot={lockupSpec.webp}
            className={cn(
                'inline-flex',
                variant === 'stacked' || showTagline
                    ? 'flex-col items-start gap-2'
                    : 'flex-wrap items-center gap-2.5',
                className,
            )}
        >
            <div className="inline-flex flex-wrap items-center gap-2.5">
                <picture className="inline-flex shrink-0 items-center">
                    <source srcSet={lockupSpec.webp} type="image/webp" />
                    <img
                        src={lockupSpec.png}
                        alt={alt}
                        width={lockupSpec.intrinsicWidth}
                        height={lockupSpec.intrinsicHeight}
                        loading={loading}
                        decoding="async"
                        className={cn(
                            'shrink-0 object-contain select-none',
                            hasCustomBox
                                ? 'h-full w-auto max-w-full'
                                : variant === 'stacked'
                                  ? styles.stacked
                                  : styles.lockup,
                        )}
                    />
                </picture>

                {portalLabel && (
                    <span
                        className={cn(
                            'rounded-full border font-heading font-semibold tracking-wide uppercase',
                            styles.badge,
                            isDarkSurface
                                ? 'border-tijum-peach/45 bg-tijum-coral text-tijum-plum'
                                : 'border-tijum-peach bg-tijum-cream text-tijum-plum',
                        )}
                    >
                        {portalLabel}
                    </span>
                )}
            </div>

            {showTagline && (
                <p
                    className={cn(
                        'leading-snug font-medium',
                        styles.tagline,
                        isDarkSurface
                            ? 'text-tijum-peach'
                            : 'text-tijum-plum-muted',
                    )}
                >
                    Stay easy. Eat well. Spend less.
                </p>
            )}
        </div>
    );
}
