import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CalendarCheck,
    MapPin,
    ShieldCheck,
    Utensils,
} from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { login as ownerLogin } from '@/routes/owner';
import { faqs, privacy, terms } from '@/routes/public';
import type { AuthLayoutProps } from '@/types';

type FormWidth = 'default' | 'comfortable' | 'wide';

type AuthSplitLayoutProps = AuthLayoutProps & {
    maxWidth?: FormWidth;
};

const CUSTOMER_PILLARS = [
    {
        icon: Utensils,
        title: 'Meals disclosed',
        detail: 'Breakfast, lunch & dinner shown clearly',
        accentClass: 'text-tijum-peach',
    },
    {
        icon: CalendarCheck,
        title: 'Flexible stays',
        detail: 'Daily, weekly & monthly room rates',
        accentClass: 'text-tijum-peach',
    },
    {
        icon: ShieldCheck,
        title: 'Verified stays',
        detail: 'Direct booking with zero guesswork',
        accentClass: 'text-tijum-emerald',
    },
] as const;

export default function AuthSplitLayout({
    children,
    title = '',
    description = '',
    maxWidth = 'default',
}: AuthSplitLayoutProps) {
    const formWidthClass =
        maxWidth === 'wide'
            ? 'max-w-[38rem]'
            : maxWidth === 'comfortable'
              ? 'max-w-[31rem]'
              : 'max-w-[25.5rem]';

    return (
        <div className="tijum-auth min-h-dvh bg-[#FFFDFB] text-tijum-plum lg:grid lg:grid-cols-12">
            {/* Mobile compact brand bar */}
            <header className="sticky top-0 z-30 border-b border-tijum-surface/75 bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:hidden">
                <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
                    <Link
                        href={home()}
                        aria-label="TIJUM home"
                        className="rounded-lg focus-visible:outline-tijum-coral"
                    >
                        <BrandLogo variant="horizontal" tone="light" size="sm" />
                    </Link>

                    <Link
                        href={home()}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-tijum-surface bg-tijum-cream/70 px-3 py-1.5 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:border-tijum-coral/50 hover:bg-tijum-cream"
                    >
                        <ArrowLeft
                            className="size-3.5 text-tijum-plum-muted transition-transform group-hover:-translate-x-0.5"
                            aria-hidden="true"
                        />
                        <span>Explore stays</span>
                    </Link>
                </div>
            </header>

            {/* Left editorial photography showcase (Desktop only — Customer Portal) */}
            <aside className="hidden bg-[#FFFDFB] p-3 lg:sticky lg:top-0 lg:col-span-5 lg:block lg:h-dvh xl:col-span-6 xl:p-4">
                <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] bg-tijum-plum text-tijum-cream shadow-tijum-soft">
                    {/* Full-bleed TIJUM stay photography */}
                    <picture className="pointer-events-none absolute inset-0 h-full w-full">
                        <source
                            srcSet="/images/public/hero-stay-600w.webp 600w, /images/public/hero-stay-1200w.webp 1200w"
                            sizes="(min-width: 1280px) 50vw, 42vw"
                            type="image/webp"
                        />
                        <img
                            src="/images/public/hero-stay-1200w.jpg"
                            alt="Sunlit TIJUM stay room with warm timber framing and clean linens"
                            width={1200}
                            height={900}
                            loading="eager"
                            decoding="async"
                            className="h-full w-full object-cover object-center"
                        />
                    </picture>

                    {/* Editorial warm Deep Plum scrim for crisp legibility */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#2A1A28]/70 via-[#352233]/25 to-[#261624]/95"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-[#241522]/96 via-[#2E1C2B]/70 to-transparent"
                    />

                    {/* Top logo & cities bar */}
                    <div className="relative z-10 flex items-center justify-between gap-4 p-7 xl:p-9">
                        <Link
                            href={home()}
                            aria-label="TIJUM home"
                            className="w-fit rounded-lg focus-visible:outline-tijum-peach"
                        >
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="md"
                            />
                        </Link>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#261624]/55 px-3.5 py-1.5 text-xs font-medium text-tijum-cream/95 backdrop-blur-md">
                            <MapPin
                                className="size-3.5 shrink-0 text-tijum-peach"
                                aria-hidden="true"
                            />
                            <span>Hyderabad · Guntur · Vijayawada · Vizag</span>
                        </span>
                    </div>

                    {/* Bottom editorial story & honest pillars */}
                    <div className="relative z-10 space-y-6 p-7 xl:p-9">
                        <div className="max-w-lg space-y-3 animate-in duration-500 fade-in slide-in-from-bottom-2">
                            <h2 className="font-heading text-3xl leading-[1.08] font-bold tracking-[-0.03em] text-balance text-tijum-cream xl:text-[2.35rem]">
                                Stay easy.{' '}
                                <span className="text-tijum-peach">
                                    Eat well.
                                </span>
                                <br />
                                Spend less.
                            </h2>
                            <p className="max-w-md text-sm leading-relaxed text-pretty text-tijum-cream/85 xl:text-[15px]">
                                Discover verified Hostels/PG, Homestays, and
                                Co-Living rooms with upfront meal flags and
                                transparent duration pricing.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-5 animate-in delay-75 duration-500 fade-in slide-in-from-bottom-2">
                            {CUSTOMER_PILLARS.map((pillar) => {
                                const Icon = pillar.icon;

                                return (
                                    <div
                                        key={pillar.title}
                                        className="rounded-2xl border border-white/12 bg-[#251523]/55 p-3.5 backdrop-blur-md"
                                    >
                                        <Icon
                                            className={cn(
                                                'size-4',
                                                pillar.accentClass,
                                            )}
                                            aria-hidden="true"
                                        />
                                        <p className="mt-2 font-heading text-xs font-semibold text-tijum-cream">
                                            {pillar.title}
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-snug text-tijum-cream/75">
                                            {pillar.detail}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Right clean form workspace */}
            <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-[#FFFDFB] lg:col-span-7 lg:min-h-dvh xl:col-span-6">
                {/* Desktop utility navigation */}
                <nav
                    className="hidden items-center justify-between gap-4 px-8 pt-7 lg:flex xl:px-12"
                    aria-label="Authentication navigation"
                >
                    <Link
                        href={home()}
                        className="group inline-flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                    >
                        <ArrowLeft
                            className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                            aria-hidden="true"
                        />
                        <span>Back to TIJUM</span>
                    </Link>

                    <Link
                        href={ownerLogin.url()}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-tijum-surface/90 bg-white px-3.5 py-1.5 font-heading text-xs font-semibold text-tijum-plum shadow-2xs transition-all hover:border-tijum-coral/55 hover:bg-tijum-cream/60"
                    >
                        <span className="font-normal text-tijum-plum-muted">
                            Hosting a property?
                        </span>
                        <span>Partner Portal</span>
                        <ArrowRight
                            className="size-3 text-tijum-coral transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                </nav>

                {/* Main centered auth content */}
                <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 xl:px-16">
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
                <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-5 pt-2 pb-6 text-center text-xs text-tijum-plum-muted sm:px-8 lg:px-12">
                    <span>TIJUM · Stay easy. Eat well. Spend less.</span>
                    <span aria-hidden="true">·</span>
                    <div className="inline-flex flex-wrap items-center justify-center gap-3.5">
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
                        <Link
                            href={ownerLogin.url()}
                            className="font-medium text-tijum-plum transition-colors hover:text-tijum-coral lg:hidden"
                        >
                            Partner Portal
                        </Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}
