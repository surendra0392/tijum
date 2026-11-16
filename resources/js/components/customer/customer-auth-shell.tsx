import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CalendarCheck,
    MapPin,
    ShieldCheck,
    Utensils,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import BrandLogo from '@/components/brand/brand-logo';
import { home } from '@/routes';
import { login as ownerLogin } from '@/routes/owner';

type CustomerAuthShellProps = PropsWithChildren<{
    title: string;
    description?: string;
    footerNote?: string;
    homeUrl?: string;
}>;

type ValuePoint = {
    icon: LucideIcon;
    title: string;
    description: string;
};

const VALUE_POINTS: readonly ValuePoint[] = [
    {
        icon: MapPin,
        title: 'Four cities, one marketplace',
        description:
            'Compare Hostels/PG, Homestays, and Co-Living accommodations across Hyderabad, Guntur, Vijayawada, and Visakhapatnam.',
    },
    {
        icon: Utensils,
        title: 'Meals shown per stay',
        description:
            'See exactly which meals are included before you hold inventory and pay.',
    },
    {
        icon: Wallet,
        title: 'Transparent listed rates',
        description:
            'Review listed nightly and monthly rates with the stay duration shown up front.',
    },
];

const CATEGORY_THUMBS: readonly {
    srcSet: string;
    fallback: string;
    alt: string;
    label: string;
}[] = [
    {
        srcSet: '/images/public/category-hostel-480w.webp 480w, /images/public/category-hostel-800w.webp 800w',
        fallback: '/images/public/category-hostel-480w.jpg',
        alt: 'Bunk beds and single beds in a bright, tidy hostel and PG room',
        label: 'Hostels/PG',
    },
    {
        srcSet: '/images/public/category-homestay-480w.webp 480w, /images/public/category-homestay-800w.webp 800w',
        fallback: '/images/public/category-homestay-480w.jpg',
        alt: 'A warm homestay bedroom with soft natural light',
        label: 'Homestays',
    },
    {
        srcSet: '/images/public/category-pg-480w.webp 480w, /images/public/category-pg-800w.webp 800w',
        fallback: '/images/public/category-pg-480w.jpg',
        alt: 'A modern co-living space with private workstation and communal vibe',
        label: 'Co-Living',
    },
];

const CITIES = ['Hyderabad', 'Guntur', 'Vijayawada', 'Visakhapatnam'] as const;

function ValuePointRow({ point }: { point: ValuePoint }) {
    const Icon = point.icon;

    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-cream/15 bg-tijum-coral/20 text-tijum-peach">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-0.5">
                <p className="font-heading text-sm font-semibold text-tijum-cream">
                    {point.title}
                </p>
                <p className="text-xs leading-relaxed text-pretty text-tijum-cream/75">
                    {point.description}
                </p>
            </div>
        </div>
    );
}

function CategoryThumb({
    thumb,
    eager,
}: {
    thumb: (typeof CATEGORY_THUMBS)[number];
    eager?: boolean;
}) {
    return (
        <figure className="group relative overflow-hidden rounded-xl border border-tijum-cream/15 bg-tijum-cream/5">
            <picture>
                <source srcSet={thumb.srcSet} sizes="160px" type="image/webp" />
                <img
                    src={thumb.fallback}
                    alt={thumb.alt}
                    width={800}
                    height={600}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
            </picture>
            <figcaption className="absolute inset-x-0 bottom-0 bg-tijum-plum px-2.5 py-1.5 font-heading text-[11px] font-semibold text-tijum-cream">
                {thumb.label}
            </figcaption>
        </figure>
    );
}

export default function CustomerAuthShell({
    children,
    title,
    description,
    footerNote,
    homeUrl = home.url(),
}: CustomerAuthShellProps) {
    const resolvedFooterNote =
        footerNote ?? 'TIJUM — Stay easy. Eat well. Spend less.';

    return (
        <div className="tijum-portal min-h-dvh bg-tijum-cream text-tijum-plum selection:bg-tijum-coral/30 selection:text-tijum-plum lg:grid lg:grid-cols-12">
            {/* Mobile / tablet brand header */}
            <div className="bg-tijum-plum px-5 py-6 text-tijum-cream sm:px-8 sm:py-8 lg:hidden">
                <div className="mx-auto flex max-w-lg flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <Link
                            href={homeUrl}
                            aria-label="TIJUM home"
                            className="rounded-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-peach"
                        >
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="sm"
                            />
                        </Link>
                        <Link
                            href={ownerLogin.url()}
                            className="inline-flex items-center gap-1 rounded-full border border-tijum-cream/25 px-3 py-1 font-heading text-[11px] font-semibold text-tijum-peach transition-colors hover:border-tijum-peach hover:text-tijum-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-peach"
                        >
                            Partner Portal
                            <ArrowRight className="size-3" aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-peach/80 bg-tijum-cream px-2.5 py-0.5 font-heading text-[10px] font-semibold tracking-wider text-tijum-plum uppercase">
                            <span
                                className="size-1.5 rounded-full bg-current"
                                aria-hidden="true"
                            />
                            Customer Portal
                        </span>
                        <h2 className="font-heading text-xl leading-snug font-bold tracking-tight text-balance text-tijum-cream">
                            Stay easy. Eat well. Spend less.
                        </h2>
                        <p className="text-xs leading-relaxed text-tijum-cream/80">
                            Stays with transparent meal information across
                            Hyderabad, Guntur, Vijayawada &amp; Visakhapatnam.
                        </p>
                    </div>
                </div>
            </div>

            {/* Desktop editorial brand column */}
            <aside className="relative hidden flex-col justify-between overflow-y-auto bg-tijum-plum p-8 text-tijum-cream lg:col-span-5 lg:flex xl:p-12">
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href={homeUrl}
                        aria-label="TIJUM home"
                        className="rounded-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-peach"
                    >
                        <BrandLogo variant="horizontal" tone="dark" size="lg" />
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-peach/80 bg-tijum-cream px-2.5 py-0.5 font-heading text-[10px] font-semibold tracking-wider text-tijum-plum uppercase">
                        <span
                            className="size-1.5 rounded-full bg-current"
                            aria-hidden="true"
                        />
                        Customer Portal
                    </span>
                </div>

                <div className="my-auto w-full max-w-lg space-y-6 py-8">
                    <div className="space-y-2">
                        <p className="font-heading text-xs font-semibold tracking-[0.18em] text-tijum-peach uppercase">
                            Stays with transparent meal information
                        </p>
                        <h2 className="font-heading text-3xl leading-[1.08] font-bold tracking-tight text-balance text-tijum-cream">
                            Stay easy. Eat well. Spend less.
                        </h2>
                        <p className="text-sm leading-relaxed text-pretty text-tijum-cream/80">
                            Compare listings, meal arrangements, and stay
                            durations across our launch cities — all in one
                            place.
                        </p>
                    </div>

                    {/* Editorial photography */}
                    <div className="space-y-3">
                        <div className="group relative overflow-hidden rounded-2xl border border-tijum-cream/20 bg-tijum-cream/5 shadow-tijum-card">
                            <picture>
                                <source
                                    srcSet="/images/public/hero-stay-600w.webp 600w, /images/public/hero-stay-1200w.webp 1200w"
                                    sizes="(min-width: 1280px) 420px, 360px"
                                    type="image/webp"
                                />
                                <img
                                    src="/images/public/hero-stay-600w.jpg"
                                    alt="Warm sunlit accommodation room with clean beds and wooden furniture"
                                    width={1200}
                                    height={900}
                                    loading="eager"
                                    decoding="async"
                                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </picture>
                            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-tijum-peach/40 bg-tijum-plum px-3 py-1 font-heading text-[11px] font-semibold text-tijum-cream">
                                <CalendarCheck
                                    className="size-3 text-tijum-peach"
                                    aria-hidden="true"
                                />
                                Reserve with a clear stay duration
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            {CATEGORY_THUMBS.map((thumb) => (
                                <CategoryThumb
                                    key={thumb.label}
                                    thumb={thumb}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {VALUE_POINTS.map((point) => (
                            <ValuePointRow key={point.title} point={point} />
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-cream/15 pt-5 text-xs text-tijum-cream/75">
                    <div className="flex items-center gap-1.5 text-tijum-cream/70">
                        <MapPin
                            className="size-3.5 shrink-0 text-tijum-peach"
                            aria-hidden="true"
                        />
                        <span>{CITIES.join(' · ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-tijum-cream/55">
                            Operating a stay?
                        </span>
                        <Link
                            href={ownerLogin.url()}
                            className="inline-flex items-center gap-1 font-heading font-semibold text-tijum-peach underline-offset-4 transition-colors hover:text-tijum-cream hover:underline focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-peach"
                        >
                            <span>Partner Portal</span>
                            <ArrowRight
                                className="size-3.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Form column */}
            <div className="flex flex-1 flex-col justify-between px-4 py-8 sm:px-8 sm:py-10 lg:col-span-7 lg:px-12 xl:px-16">
                <header className="mx-auto hidden w-full max-w-[480px] items-center justify-between gap-4 lg:flex">
                    <Link
                        href={homeUrl}
                        className="group inline-flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-lavender transition-colors hover:text-tijum-plum focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-plum"
                    >
                        <ArrowLeft
                            className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                            aria-hidden="true"
                        />
                        <span>Back to TIJUM</span>
                    </Link>

                    <Link
                        href={ownerLogin.url()}
                        className="inline-flex items-center gap-1 rounded-full border border-tijum-surface bg-tijum-cream px-3 py-1 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:border-tijum-coral hover:bg-tijum-coral/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-plum"
                    >
                        <span>Partner Portal</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                </header>

                <main className="mx-auto my-auto w-full max-w-[480px] py-4 sm:py-6">
                    <div className="relative overflow-hidden rounded-3xl border border-tijum-surface bg-tijum-cream p-6 shadow-tijum-soft sm:p-9">
                        <div
                            className="absolute inset-x-0 top-0 h-1.5 bg-tijum-coral"
                            aria-hidden="true"
                        />

                        <div className="mb-6 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-peach bg-tijum-surface px-2.5 py-0.5 font-heading text-[11px] font-semibold tracking-wider text-tijum-plum uppercase">
                                    <span
                                        className="size-1.5 rounded-full bg-current"
                                        aria-hidden="true"
                                    />
                                    Customer Portal
                                </span>
                                <span className="inline-flex items-center gap-1 font-heading text-[11px] font-medium text-tijum-lavender">
                                    <ShieldCheck
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    Customer account
                                </span>
                            </div>

                            {title && (
                                <h1 className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-[26px]">
                                    {title}
                                </h1>
                            )}

                            {description && (
                                <p className="text-sm leading-relaxed text-pretty text-tijum-lavender">
                                    {description}
                                </p>
                            )}
                        </div>

                        {children}

                        <div className="mt-6 flex items-start justify-center gap-2 border-t border-tijum-surface pt-4 text-[11px] leading-relaxed text-tijum-lavender">
                            <ShieldCheck
                                className="mt-0.5 size-3.5 shrink-0 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span className="text-pretty">
                                Use your TIJUM customer account credentials to
                                continue.
                            </span>
                        </div>
                    </div>
                </main>

                <footer className="mx-auto w-full max-w-[480px] space-y-1.5 text-center text-xs text-balance text-tijum-lavender">
                    <p className="font-heading font-medium tracking-wide text-tijum-plum">
                        TIJUM — Stay easy · Eat well · Spend less
                    </p>
                    <p className="text-[11px] text-tijum-lavender">
                        {resolvedFooterNote}
                    </p>
                </footer>
            </div>
        </div>
    );
}
