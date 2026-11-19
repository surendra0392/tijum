import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Coins,
    MapPin,
    ShieldCheck,
} from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';
import { home, login as customerLogin } from '@/routes';
import { faqs, privacy, terms } from '@/routes/public';
import type { AuthLayoutProps } from '@/types';

type FormWidth = 'default' | 'comfortable' | 'wide';

type OwnerAuthSplitLayoutProps = AuthLayoutProps & {
    maxWidth?: FormWidth;
};

const PARTNER_STAGES = [
    {
        step: '01',
        icon: Building2,
        title: 'Structured property setup',
        detail: 'Configure rooms, daily-to-monthly pricing, and exact meal inclusions.',
    },
    {
        step: '02',
        icon: ShieldCheck,
        title: 'Transparent verification',
        detail: 'Submit KYC and property documents with clear live review status.',
    },
    {
        step: '03',
        icon: Coins,
        title: 'Direct bookings & payouts',
        detail: 'Manage confirmed stays, room allocations, and scheduled settlements.',
    },
] as const;

export default function OwnerAuthSplitLayout({
    children,
    title = '',
    description = '',
    maxWidth = 'default',
}: OwnerAuthSplitLayoutProps) {
    const formWidthClass =
        maxWidth === 'wide'
            ? 'max-w-[38rem]'
            : maxWidth === 'comfortable'
              ? 'max-w-[32rem]'
              : 'max-w-[26.5rem]';

    return (
        <div className="tijum-auth min-h-dvh bg-white text-tijum-plum lg:grid lg:grid-cols-12">
            {/* Mobile compact Deep Plum partner header */}
            <header className="sticky top-0 z-30 bg-tijum-plum px-4 py-3.5 text-tijum-cream shadow-tijum-card sm:px-6 lg:hidden">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
                    <Link
                        href={home()}
                        aria-label="TIJUM home"
                        className="rounded-lg focus-visible:outline-tijum-peach"
                    >
                        <BrandLogo
                            variant="horizontal"
                            tone="dark"
                            size="sm"
                            portalLabel="Partner"
                        />
                    </Link>

                    <Link
                        href={customerLogin.url()}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-heading text-xs font-semibold text-tijum-cream transition-colors hover:border-tijum-peach/50 hover:bg-white/15"
                    >
                        <span>Customer Sign In</span>
                        <ArrowRight
                            className="size-3 text-tijum-peach transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                </div>
            </header>

            {/* Left crisp architectural form workspace */}
            <div className="flex min-h-[calc(100dvh-3.75rem)] flex-col bg-white lg:col-span-7 lg:min-h-dvh">
                {/* Desktop utility top bar */}
                <nav
                    className="hidden items-center justify-between gap-4 px-8 pt-7 lg:flex xl:px-12"
                    aria-label="Partner authentication navigation"
                >
                    <Link
                        href={home()}
                        aria-label="TIJUM home"
                        className="rounded-lg focus-visible:outline-tijum-coral"
                    >
                        <BrandLogo
                            variant="horizontal"
                            tone="light"
                            size="sm"
                            portalLabel="Partner"
                        />
                    </Link>

                    <Link
                        href={customerLogin.url()}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-tijum-surface/90 bg-tijum-cream/55 px-3.5 py-1.5 font-heading text-xs font-semibold text-tijum-plum shadow-2xs transition-all hover:border-tijum-coral/55 hover:bg-tijum-cream"
                    >
                        <span className="font-normal text-tijum-plum-muted">
                            Looking to book a stay?
                        </span>
                        <span>Customer Sign In</span>
                        <ArrowRight
                            className="size-3 text-tijum-coral transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                </nav>

                {/* Main centered partner form */}
                <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 xl:px-14">
                    <section
                        className={cn(
                            'mx-auto w-full animate-in duration-500 fade-in slide-in-from-bottom-2',
                            formWidthClass,
                        )}
                    >
                        {(title || description) && (
                            <div className="mb-7 space-y-2">
                                {title && (
                                    <h1 className="font-heading text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] text-balance text-tijum-plum sm:text-[2rem]">
                                        {title}
                                    </h1>
                                )}
                                {description && (
                                    <p className="text-sm leading-relaxed text-pretty text-tijum-plum-muted">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}

                        <div>{children}</div>
                    </section>
                </main>

                {/* Minimal footer */}
                <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-tijum-surface/55 px-5 py-5 text-center text-xs text-tijum-plum-muted sm:px-8 lg:px-12">
                    <span>TIJUM Partner Portal</span>
                    <span aria-hidden="true">·</span>
                    <div className="inline-flex flex-wrap items-center justify-center gap-3.5">
                        <Link
                            href={home()}
                            className="font-medium transition-colors hover:text-tijum-plum"
                        >
                            Website
                        </Link>
                        <Link
                            href={faqs()}
                            className="font-medium transition-colors hover:text-tijum-plum"
                        >
                            FAQs
                        </Link>
                        <Link
                            href={terms()}
                            className="font-medium transition-colors hover:text-tijum-plum"
                        >
                            Terms
                        </Link>
                        <Link
                            href={privacy()}
                            className="font-medium transition-colors hover:text-tijum-plum"
                        >
                            Privacy
                        </Link>
                    </div>
                </footer>
            </div>

            {/* Right architectural Deep Plum host showcase (Desktop only) */}
            <aside className="hidden bg-white p-3 lg:sticky lg:top-0 lg:col-span-5 lg:block lg:h-dvh xl:p-4">
                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] bg-[#2D1D2B] p-7 text-tijum-cream shadow-tijum-soft xl:p-9">
                    {/* Subtle architectural dot-grid & warm corner depth */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,182,163,0.14)_1px,transparent_1px)] [background-size:22px_22px] opacity-60"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-tijum-coral/15 blur-3xl"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-28 -left-24 size-80 rounded-full bg-tijum-plum/50 blur-3xl"
                    />

                    {/* Top workspace strip */}
                    <div className="relative z-10 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 font-heading text-[11px] font-semibold tracking-[0.12em] text-tijum-cream uppercase">
                            <span
                                className="size-1.5 rounded-full bg-tijum-coral"
                                aria-hidden="true"
                            />
                            Partner Workspace
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tijum-cream/80">
                            <ShieldCheck
                                className="size-3.5 text-tijum-emerald"
                                aria-hidden="true"
                            />
                            <span>Verified Host Network</span>
                        </span>
                    </div>

                    {/* Center hospitality showcase & 3-stage operational workflow */}
                    <div className="relative z-10 my-auto space-y-5 py-4 animate-in duration-500 fade-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                            <h2 className="font-heading text-2xl leading-[1.15] font-bold tracking-[-0.025em] text-balance text-tijum-cream xl:text-[1.85rem]">
                                Run your property with{' '}
                                <span className="text-tijum-peach">
                                    clarity and direct bookings.
                                </span>
                            </h2>
                            <p className="max-w-md text-xs leading-relaxed text-pretty text-tijum-cream/78 xl:text-[13px]">
                                Built for Hostel/PG, Homestay, and Co-Living
                                operators to manage listings, occupancy, and
                                settlements in one place.
                            </p>
                        </div>

                        {/* Framed hospitality photo window */}
                        <figure className="overflow-hidden rounded-2xl border border-white/12 bg-[#231521] shadow-lg">
                            <div className="relative aspect-[16/9] overflow-hidden">
                                <picture>
                                    <source
                                        srcSet="/images/public/partner-hospitality-480w.webp 480w, /images/public/partner-hospitality-800w.webp 800w"
                                        sizes="38vw"
                                        type="image/webp"
                                    />
                                    <img
                                        src="/images/public/partner-hospitality-800w.jpg"
                                        alt="Property host welcoming guests at reception"
                                        width={800}
                                        height={600}
                                        loading="eager"
                                        decoding="async"
                                        className="h-full w-full object-cover object-center"
                                    />
                                </picture>
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#231521]/90 via-[#231521]/40 to-transparent"
                                />
                                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-4 py-3">
                                    <span className="font-heading text-xs font-semibold text-tijum-cream">
                                        Hostels/PG · Homestays · Co-Living
                                    </span>
                                    <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 font-heading text-[10px] font-semibold text-emerald-200 backdrop-blur-xs">
                                        Direct Bookings
                                    </span>
                                </figcaption>
                            </div>
                        </figure>

                        {/* Numbered 3-stage partner workflow */}
                        <ol className="space-y-2.5">
                            {PARTNER_STAGES.map((stage) => {
                                const Icon = stage.icon;

                                return (
                                    <li
                                        key={stage.step}
                                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3"
                                    >
                                        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/25 bg-tijum-coral/15 text-tijum-peach">
                                            <Icon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] font-semibold text-tijum-peach/90">
                                                    {stage.step}
                                                </span>
                                                <p className="font-heading text-xs font-semibold text-tijum-cream">
                                                    {stage.title}
                                                </p>
                                            </div>
                                            <p className="text-[11px] leading-relaxed text-tijum-cream/72">
                                                {stage.detail}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    {/* Bottom cities rail */}
                    <div className="relative z-10 flex items-center justify-between gap-2 border-t border-white/12 pt-4 text-xs text-tijum-cream/78">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin
                                className="size-3.5 shrink-0 text-tijum-peach"
                                aria-hidden="true"
                            />
                            <span>
                                Hyderabad · Guntur · Vijayawada · Visakhapatnam
                            </span>
                        </span>
                    </div>
                </div>
            </aside>
        </div>
    );
}
