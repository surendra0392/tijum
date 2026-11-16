import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Coins,
    Handshake,
    Home as HomeIcon,
    KeyRound,
    Lock,
    MapPin,
    ShieldCheck,
    Sparkles,
    Star,
    Utensils,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import BrandLogo from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';
import { home, login as customerLogin } from '@/routes';
import { login as ownerLogin } from '@/routes/owner';

export type PortalAuthKind = 'customer' | 'owner' | 'admin';

type FeatureHighlight = {
    icon: LucideIcon;
    title: string;
    description: string;
};

type PortalConfig = {
    badgeLabel: string;
    badgeClassName: string;
    eyebrow: string;
    panelHeadline: string;
    panelSubtitle: string;
    featureHighlights: readonly FeatureHighlight[];
    media: {
        webpSrc: string;
        webpSrcSet: string;
        fallbackSrc: string;
        alt: string;
        width: number;
        height: number;
        floatingRating?: string;
        floatingTag?: string;
    } | null;
    cities: readonly string[];
    switchPrompt: string;
    switchLabel: string;
    switchHref: string;
    railFooter: string;
    defaultFooterNote: string;
};

const PORTAL_CONFIG: Record<PortalAuthKind, PortalConfig> = {
    customer: {
        badgeLabel: 'Customer Portal',
        badgeClassName: 'border-tijum-peach/80 bg-tijum-cream text-tijum-plum',
        eyebrow: 'Food-Inclusive Accommodation Marketplace',
        panelHeadline:
            'Hostels/PG, Homestays, and Co-Living with clear meal details.',
        panelSubtitle:
            'Book verified accommodations across Hyderabad, Guntur, Vijayawada & Vizag with property-specific room options and meal arrangements.',
        featureHighlights: [
            {
                icon: Utensils,
                title: 'Clear Meal Inclusions',
                description:
                    'Review property-specific breakfast, lunch, and dinner inclusions transparently before booking.',
            },
            {
                icon: HomeIcon,
                title: 'Verified Partner Listings',
                description:
                    'Explore Hostels/PG, Homestays, and Co-Living accommodations with verified operator registration and structured property details.',
            },
            {
                icon: Sparkles,
                title: 'Zero Brokerage & Upfront Rates',
                description:
                    'Direct transparent pricing with customer protection guarantee and easy online reservations.',
            },
        ],
        media: {
            webpSrc: '/images/public/hero-stay-1200w.webp',
            webpSrcSet:
                '/images/public/hero-stay-600w.webp 600w, /images/public/hero-stay-1200w.webp 1200w',
            fallbackSrc: '/images/public/hero-stay-600w.jpg',
            alt: 'Warm sunlit accommodation room with clean beds and wooden furniture',
            width: 1200,
            height: 900,
            floatingRating: '4.8 Verified Resident Rating',
            floatingTag: 'Transparent Meal Inclusions',
        },
        cities: ['Hyderabad', 'Guntur', 'Vijayawada', 'Visakhapatnam'],
        switchPrompt: 'Operating a Hostel/PG, Homestay, or Co-Living property?',
        switchLabel: 'Partner Portal',
        switchHref: ownerLogin.url(),
        railFooter: 'Hyderabad · Guntur · Vijayawada · Visakhapatnam',
        defaultFooterNote:
            'TIJUM — Stay easy. Eat well. Spend less. • Accommodation booking with property-specific meal arrangements.',
    },
    owner: {
        badgeLabel: 'Partner Portal',
        badgeClassName:
            'border-tijum-coral/40 bg-tijum-coral/15 text-tijum-plum',
        eyebrow: 'Independent Property Partner Workspace',
        panelHeadline:
            'Fill rooms faster with food-inclusive accommodation booking.',
        panelSubtitle:
            'Manage property onboarding, room categories, daily meals, and guest reservations directly with transparent settlements.',
        featureHighlights: [
            {
                icon: Building2,
                title: 'Direct Room & Meal Management',
                description:
                    'Complete control over building details, AC/Non-AC room types, bed capacities, and meal inclusion schedules.',
            },
            {
                icon: ShieldCheck,
                title: 'Fast-Track KYC Verification',
                description:
                    'Guided partner onboarding with verified host credentials that build immediate trust with prospective guests.',
            },
            {
                icon: Coins,
                title: 'Direct Bank Settlements',
                description:
                    'Clear, contractually-agreed commissions with automated, RBI-compliant payment settlements directly to your bank.',
            },
        ],
        media: {
            webpSrc: '/images/public/partner-hospitality-800w.webp',
            webpSrcSet:
                '/images/public/partner-hospitality-480w.webp 480w, /images/public/partner-hospitality-800w.webp 800w',
            fallbackSrc: '/images/public/partner-hospitality-480w.jpg',
            alt: 'Warm hospitality host welcoming guests at accommodation reception',
            width: 800,
            height: 600,
            floatingRating: 'Zero Platform Listing Fee',
            floatingTag: 'Direct Partner Bank Settlements',
        },
        cities: ['Hyderabad', 'Guntur', 'Vijayawada', 'Visakhapatnam'],
        switchPrompt: 'Looking to book a stay instead?',
        switchLabel: 'Customer Login',
        switchHref: customerLogin.url(),
        railFooter: 'TIJUM Partner Operations · Telangana & Andhra Pradesh',
        defaultFooterNote:
            'TIJUM Partner Portal · Isolated property-owner workspace.',
    },
    admin: {
        badgeLabel: 'Admin Console',
        badgeClassName: 'border-tijum-plum bg-tijum-plum text-tijum-cream',
        eyebrow: 'Isolated Operations Guard · TOTP Enforced',
        panelHeadline:
            'Central verification governance and marketplace oversight.',
        panelSubtitle:
            'Authorised operations console for partner verification, property audits, dispute redressal, and financial reconciliation.',
        featureHighlights: [
            {
                icon: Lock,
                title: 'Mandatory Multi-Factor TOTP',
                description:
                    'Time-based one-time password challenge enforced on every administrative session for uncompromising security.',
            },
            {
                icon: ShieldCheck,
                title: 'Audited Partner KYC Governance',
                description:
                    'Review and verify property legal entities, ownership deeds, trade licenses, and food safety certifications.',
            },
            {
                icon: KeyRound,
                title: 'Subledger & Settlement Auditing',
                description:
                    'Complete visibility over marketplace commissions, partner settlements, relocation subsidies, and gateway transfers.',
            },
        ],
        media: null,
        cities: ['Hyderabad', 'Guntur', 'Vijayawada', 'Visakhapatnam'],
        switchPrompt: 'Returning to public marketplace?',
        switchLabel: 'Public Website',
        switchHref: home.url(),
        railFooter: 'TIJUM Internal Operations',
        defaultFooterNote:
            'TIJUM Internal Operations · Provisioned administrators with mandatory TOTP protection.',
    },
};

type PortalAuthShellProps = PropsWithChildren<{
    portal?: PortalAuthKind;
    portalLabel?: string;
    homeUrl?: string;
    title: string;
    description?: string;
    footerNote?: string;
    maxWidth?: 'default' | 'wide';
}>;

export default function PortalAuthShell({
    children,
    portal = 'customer',
    portalLabel,
    homeUrl = home.url(),
    title,
    description,
    footerNote,
    maxWidth = 'default',
}: PortalAuthShellProps) {
    const config = PORTAL_CONFIG[portal];
    const resolvedBadgeLabel = portalLabel ?? config.badgeLabel;
    const resolvedFooterNote = footerNote ?? config.defaultFooterNote;
    const formWidthClass = maxWidth === 'wide' ? 'max-w-2xl' : 'max-w-[480px]';

    return (
        <div className="tijum-portal min-h-dvh bg-tijum-cream text-tijum-plum selection:bg-tijum-coral/30 selection:text-tijum-plum">
            {/* Mobile / Tablet (< 1024px) Rich Branded Header */}
            <div className="relative overflow-hidden border-b border-tijum-plum/20 bg-tijum-plum px-5 py-6 text-tijum-cream sm:px-8 sm:py-8 lg:hidden">
                <div
                    className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-tijum-coral/25 blur-3xl"
                    aria-hidden="true"
                />
                <div
                    className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-tijum-peach/20 blur-3xl"
                    aria-hidden="true"
                />

                <div className="relative z-10 mx-auto max-w-lg space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <Link
                            href={homeUrl}
                            className="rounded-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-peach"
                        >
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="sm"
                            />
                        </Link>
                        <Link
                            href={config.switchHref}
                            className="inline-flex items-center gap-1 font-heading text-xs font-semibold text-tijum-peach underline-offset-4 hover:text-white hover:underline"
                        >
                            <span>{config.switchLabel}</span>
                            <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <span
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-heading text-[10px] font-semibold tracking-wider uppercase',
                                config.badgeClassName,
                            )}
                        >
                            <span
                                className="size-1.5 rounded-full bg-current"
                                aria-hidden="true"
                            />
                            {resolvedBadgeLabel}
                        </span>
                        <h2 className="font-heading text-lg leading-snug font-bold tracking-tight text-tijum-cream">
                            {config.panelHeadline}
                        </h2>
                        <p className="text-xs text-tijum-cream/80">
                            {config.eyebrow}
                        </p>
                    </div>

                    {/* Quick Value Badges */}
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-tijum-cream/90">
                        {portal === 'customer' && (
                            <>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <Utensils
                                        className="size-3 text-tijum-peach"
                                        aria-hidden="true"
                                    />
                                    Transparent Meal Inclusions
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <HomeIcon
                                        className="size-3 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    100% Verified Stays
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <Sparkles
                                        className="size-3 text-tijum-peach"
                                        aria-hidden="true"
                                    />
                                    Zero Brokerage
                                </span>
                            </>
                        )}
                        {portal === 'owner' && (
                            <>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <Building2
                                        className="size-3 text-tijum-peach"
                                        aria-hidden="true"
                                    />
                                    Direct Room Allocation
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <Coins
                                        className="size-3 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    Direct Host Settlements
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <ShieldCheck
                                        className="size-3 text-tijum-peach"
                                        aria-hidden="true"
                                    />
                                    Fast-Track KYC
                                </span>
                            </>
                        )}
                        {portal === 'admin' && (
                            <>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <Lock
                                        className="size-3 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    TOTP MFA Enforced
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium backdrop-blur-xs">
                                    <ShieldCheck
                                        className="size-3 text-tijum-peach"
                                        aria-hidden="true"
                                    />
                                    Isolated Perimeter
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop (>= 1024px) 12-Column Responsive Split */}
            <div className="mx-auto flex min-h-dvh flex-col lg:grid lg:grid-cols-12">
                {/* Left Desktop Brand Column (5 Cols) */}
                <aside className="relative hidden flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#382435] via-[#442F41] to-[#2E1E2C] p-8 text-tijum-cream lg:col-span-5 lg:flex xl:p-12">
                    {/* Atmospheric Ambient Glows */}
                    <div
                        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-tijum-coral/15 blur-3xl"
                        aria-hidden="true"
                    />
                    <div
                        className="pointer-events-none absolute top-1/2 -left-28 size-80 -translate-y-1/2 rounded-full bg-tijum-peach/10 blur-3xl"
                        aria-hidden="true"
                    />
                    <div
                        className="pointer-events-none absolute right-1/4 -bottom-24 size-72 rounded-full bg-tijum-coral/10 blur-3xl"
                        aria-hidden="true"
                    />

                    {/* Top Branding Header */}
                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <Link
                            href={homeUrl}
                            className="rounded-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-peach"
                        >
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="lg"
                            />
                        </Link>
                    </div>

                    {/* Center Rich Value Section */}
                    <div className="relative z-10 my-auto w-full max-w-lg space-y-7 py-8">
                        {/* Media Visual Showcase */}
                        {config.media ? (
                            <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-2xl backdrop-blur-xs transition-transform duration-300">
                                <picture>
                                    <source
                                        srcSet={config.media.webpSrcSet}
                                        sizes="(min-width: 1280px) 480px, 400px"
                                        type="image/webp"
                                    />
                                    <img
                                        src={config.media.fallbackSrc}
                                        alt={config.media.alt}
                                        width={config.media.width}
                                        height={config.media.height}
                                        loading="eager"
                                        decoding="async"
                                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                    />
                                </picture>
                                <div className="absolute inset-0 bg-gradient-to-t from-tijum-plum/85 via-transparent to-black/25" />

                                {/* Floating Overlay Badges */}
                                {config.media.floatingRating && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-tijum-plum/85 px-3 py-1 font-heading text-[11px] font-semibold text-tijum-cream shadow-md backdrop-blur-md">
                                        <Star
                                            className="size-3 fill-tijum-coral text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {config.media.floatingRating}
                                        </span>
                                    </div>
                                )}
                                {config.media.floatingTag && (
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-tijum-coral/95 px-3.5 py-1.5 font-heading text-xs font-bold text-tijum-plum shadow-lg backdrop-blur-md">
                                        <span>{config.media.floatingTag}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-xl backdrop-blur-xs">
                                <div className="flex items-center gap-3.5">
                                    <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-tijum-coral/20 text-tijum-coral">
                                        <ShieldCheck
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <p className="font-heading text-base font-bold text-tijum-cream">
                                            Isolated Operations Boundary
                                        </p>
                                        <p className="text-xs text-tijum-cream/75">
                                            Public registration disabled ·
                                            Multi-factor TOTP enforced
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Eyebrow & Main Pitch */}
                        <div className="space-y-2">
                            <span className="font-heading text-xs font-semibold tracking-[0.18em] text-tijum-peach uppercase">
                                {config.eyebrow}
                            </span>
                            <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance text-tijum-cream xl:text-[28px]">
                                {config.panelHeadline}
                            </h2>
                            <p className="text-sm leading-relaxed text-pretty text-tijum-cream/80">
                                {config.panelSubtitle}
                            </p>
                        </div>

                        {/* 3 Pillars List */}
                        <div className="space-y-3 pt-1">
                            {config.featureHighlights.map((feat) => {
                                const IconComponent = feat.icon;
                                return (
                                    <div
                                        key={feat.title}
                                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 transition-colors hover:bg-white/[0.07]"
                                    >
                                        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-coral/20 text-tijum-peach">
                                            <IconComponent
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="space-y-0.5">
                                            <p className="font-heading text-xs font-semibold text-tijum-cream">
                                                {feat.title}
                                            </p>
                                            <p className="text-[11px] leading-relaxed text-tijum-cream/75">
                                                {feat.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Cities & Alternate Portal Link */}
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs text-tijum-cream/75">
                        <div className="flex items-center gap-1.5 text-tijum-cream/70">
                            <MapPin
                                className="size-3.5 shrink-0 text-tijum-peach"
                                aria-hidden="true"
                            />
                            <span>{config.railFooter}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-tijum-cream/55">
                                {config.switchPrompt}
                            </span>
                            <Link
                                href={config.switchHref}
                                className="inline-flex items-center gap-1 font-heading font-semibold text-tijum-peach underline-offset-4 hover:text-white hover:underline"
                            >
                                <span>{config.switchLabel}</span>
                                <ArrowRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* Right Form Column (7 Cols on desktop) */}
                <div className="flex min-h-[calc(100dvh-180px)] flex-1 flex-col justify-between px-4 py-8 sm:px-8 sm:py-10 lg:col-span-7 lg:min-h-dvh lg:px-12 xl:px-16">
                    {/* Top Desktop Navigation */}
                    <header
                        className={cn(
                            'mx-auto hidden w-full items-center justify-between gap-4 lg:flex',
                            formWidthClass,
                        )}
                    >
                        <Link
                            href={homeUrl}
                            className="group inline-flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum-muted transition-colors hover:text-tijum-plum focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-plum"
                        >
                            <ArrowLeft
                                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                                aria-hidden="true"
                            />
                            <span>Back to TIJUM</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-tijum-plum-muted">
                                {config.switchPrompt}
                            </span>
                            <Link
                                href={config.switchHref}
                                className="inline-flex items-center gap-1.5 rounded-full border border-tijum-surface bg-white px-3 py-1 font-heading text-xs font-semibold text-tijum-plum transition-all hover:border-tijum-coral hover:bg-tijum-coral/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-plum"
                            >
                                <span>{config.switchLabel}</span>
                                <ArrowRight
                                    className="size-3 text-tijum-coral"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>
                    </header>

                    {/* Main Form Center Area */}
                    <main
                        className={cn(
                            'mx-auto my-auto w-full py-4 sm:py-6',
                            formWidthClass,
                        )}
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-tijum-surface/90 bg-white p-7 shadow-[0_20px_50px_-20px_rgba(68,47,65,0.14)] ring-1 ring-black/[0.02] sm:p-9">
                            {/* Top Coral/Peach Accent Bar */}
                            <div
                                className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-tijum-coral via-tijum-peach to-tijum-coral"
                                aria-hidden="true"
                            />

                            {/* Card Header */}
                            <div className="mb-6 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-heading text-[11px] font-semibold tracking-wider uppercase',
                                            config.badgeClassName,
                                        )}
                                    >
                                        <span
                                            className="size-1.5 rounded-full bg-current"
                                            aria-hidden="true"
                                        />
                                        {resolvedBadgeLabel}
                                    </span>

                                    {portal === 'customer' && (
                                        <span className="font-heading text-[11px] font-medium text-tijum-plum-muted">
                                            Resident Sign In
                                        </span>
                                    )}
                                    {portal === 'owner' && (
                                        <span className="font-heading text-[11px] font-medium text-tijum-plum-muted">
                                            Host Workspace
                                        </span>
                                    )}
                                    {portal === 'admin' && (
                                        <span className="inline-flex items-center gap-1 font-heading text-[11px] font-medium text-tijum-plum">
                                            <ShieldCheck
                                                className="size-3.5 text-tijum-plum"
                                                aria-hidden="true"
                                            />
                                            TOTP Guarded
                                        </span>
                                    )}
                                </div>

                                {title && (
                                    <h1 className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-[26px]">
                                        {title}
                                    </h1>
                                )}

                                {description && (
                                    <p className="text-sm leading-relaxed text-pretty text-tijum-plum-muted">
                                        {description}
                                    </p>
                                )}
                            </div>

                            {/* Form Body */}
                            {children}

                            {/* Card Security Footnote */}
                            <div className="mt-6 flex items-center justify-center gap-2 border-t border-tijum-surface/70 pt-4 text-[11px] text-tijum-plum-muted">
                                <ShieldCheck
                                    className="size-3.5 shrink-0 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>
                                    256-bit encrypted · RBI-compliant gateway ·
                                    Zero spam
                                </span>
                            </div>
                        </div>
                    </main>

                    {/* Bottom Legal / Footnote */}
                    <footer className="mx-auto w-full max-w-[480px] space-y-1.5 text-center text-xs text-balance text-tijum-plum-muted">
                        <p className="font-heading font-medium tracking-wide text-tijum-plum">
                            TIJUM — Stay easy · Eat well · Spend less
                        </p>
                        <p className="text-[11px] text-tijum-plum-muted/80">
                            {resolvedFooterNote}
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
