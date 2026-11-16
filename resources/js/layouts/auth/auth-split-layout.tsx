import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarCheck,
    Coins,
    MapPin,
    ShieldCheck,
    Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';
import { home, login as customerLogin } from '@/routes';
import { login as ownerLogin } from '@/routes/owner';
import { faqs, privacy, terms } from '@/routes/public';
import type { AuthLayoutProps } from '@/types';

type SplitPortal = 'customer' | 'partner';
type FormWidth = 'default' | 'comfortable' | 'wide';

type PortalContent = {
    label: string;
    eyebrow: string;
    headline: string;
    description: string;
    image: {
        srcSet: string;
        fallback: string;
        alt: string;
        width: number;
        height: number;
        caption: string;
        badge: string;
    };
    highlights: readonly {
        icon: LucideIcon;
        title: string;
        description: string;
    }[];
    railFooter: string;
    railPromise: string;
    switchPrompt: string;
    switchLabel: string;
    switchHref: () => string;
};

const PORTAL_CONTENT: Record<SplitPortal, PortalContent> = {
    customer: {
        label: 'Customer Portal',
        eyebrow: 'Find your next stay',
        headline: 'Compare rooms, durations, and meal inclusions clearly.',
        description:
            'Search TIJUM stays across supported cities, then review the details that matter before you reserve.',
        image: {
            srcSet: '/images/public/hero-stay-600w.webp 600w, /images/public/hero-stay-1200w.webp 1200w',
            fallback: '/images/public/hero-stay-600w.jpg',
            alt: 'A warm, sunlit accommodation room with neatly arranged beds',
            width: 1200,
            height: 900,
            caption: 'Hostels/PG, Homestays & Co-Living',
            badge: 'Meals Disclosed',
        },
        highlights: [
            {
                icon: MapPin,
                title: 'Search supported cities',
                description:
                    'Browse verified stays across Hyderabad, Guntur, Vijayawada, and Visakhapatnam.',
            },
            {
                icon: Utensils,
                title: 'See exact meal details',
                description:
                    'Breakfast, lunch, and dinner inclusions are shown independently on every stay.',
            },
            {
                icon: CalendarCheck,
                title: 'Choose daily, weekly, or monthly stays',
                description:
                    'Compare transparent per-duration pricing before holding your room.',
            },
        ],
        railFooter: 'Hyderabad · Guntur · Vijayawada · Visakhapatnam',
        railPromise: 'TIJUM Verified Stays',
        switchPrompt: 'Hosting a property?',
        switchLabel: 'Partner Portal',
        switchHref: () => ownerLogin.url(),
    },
    partner: {
        label: 'Partner Portal',
        eyebrow: 'Manage your TIJUM listings',
        headline: 'Keep property operations in one focused workspace.',
        description:
            'Complete onboarding, maintain room and pricing details, and follow reservations and settlements.',
        image: {
            srcSet: '/images/public/partner-hospitality-480w.webp 480w, /images/public/partner-hospitality-800w.webp 800w',
            fallback: '/images/public/partner-hospitality-480w.jpg',
            alt: 'An accommodation host welcoming guests at reception',
            width: 800,
            height: 600,
            caption: 'Direct Bookings & Payout Tracking',
            badge: 'Verified Onboarding',
        },
        highlights: [
            {
                icon: Building2,
                title: 'Structured property onboarding',
                description:
                    'Add property, room-type, meal, amenity, and operating details step by step.',
            },
            {
                icon: ShieldCheck,
                title: 'Verification status in view',
                description:
                    'Track submitted documents and respond quickly during review.',
            },
            {
                icon: Coins,
                title: 'Reservations & settlements together',
                description:
                    'Manage confirmed guest stays, room allocations, commissions, and payouts.',
            },
        ],
        railFooter: 'Hyderabad · Guntur · Vijayawada · Visakhapatnam',
        railPromise: 'Partner Workspace',
        switchPrompt: 'Looking to book a stay?',
        switchLabel: 'Customer Sign In',
        switchHref: () => customerLogin.url(),
    },
};

type AuthSplitLayoutProps = AuthLayoutProps & {
    portal?: SplitPortal;
    maxWidth?: FormWidth;
};

export default function AuthSplitLayout({
    children,
    title = '',
    description = '',
    portal = 'customer',
    maxWidth = 'default',
}: AuthSplitLayoutProps) {
    const content = PORTAL_CONTENT[portal];
    const formWidthClass =
        maxWidth === 'wide'
            ? 'max-w-[44rem]'
            : maxWidth === 'comfortable'
              ? 'max-w-[35rem]'
              : 'max-w-[30rem]';

    return (
        <div className="tijum-auth min-h-dvh bg-tijum-cream text-tijum-plum lg:grid lg:grid-cols-12">
            <header className="rounded-b-[24px] bg-tijum-plum px-4 pt-5 pb-6 text-tijum-cream shadow-tijum-soft sm:px-6 lg:hidden">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
                    <Link
                        href={home()}
                        aria-label="TIJUM home"
                        className="rounded-lg focus-visible:outline-tijum-peach"
                    >
                        <BrandLogo variant="horizontal" tone="dark" size="sm" />
                    </Link>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 px-3 py-1 font-heading text-[10px] font-semibold tracking-[0.12em] text-tijum-cream uppercase">
                        <span
                            className="size-1.5 rounded-full bg-tijum-coral"
                            aria-hidden="true"
                        />
                        {content.label}
                    </span>
                </div>
                <div className="mx-auto mt-4 max-w-3xl">
                    <p className="font-heading text-[10px] font-semibold tracking-[0.16em] text-tijum-peach uppercase">
                        {content.eyebrow}
                    </p>
                    <p className="mt-1 max-w-xl font-heading text-lg leading-snug font-bold text-tijum-cream">
                        {content.headline}
                    </p>
                </div>
            </header>

            <aside className="relative hidden h-dvh overflow-x-hidden overflow-y-auto bg-tijum-plum text-tijum-cream lg:sticky lg:top-0 lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
                <div className="flex min-h-full flex-col justify-between gap-7 p-8 xl:p-10">
                    <div className="flex items-center justify-between gap-4">
                        <Link
                            href={home()}
                            aria-label="TIJUM home"
                            className="w-fit rounded-lg focus-visible:outline-tijum-peach"
                        >
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="lg"
                            />
                        </Link>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 px-3 py-1 font-heading text-[10px] font-semibold tracking-[0.12em] text-tijum-cream uppercase">
                            <span
                                className="size-1.5 rounded-full bg-tijum-coral"
                                aria-hidden="true"
                            />
                            {content.label}
                        </span>
                    </div>

                    <div className="my-auto max-w-lg space-y-6">
                        <figure className="overflow-hidden rounded-[22px] border border-tijum-cream/15 bg-tijum-plum shadow-tijum-soft">
                            <div className="aspect-[16/9] overflow-hidden">
                                <picture>
                                    <source
                                        srcSet={content.image.srcSet}
                                        sizes="40vw"
                                        type="image/webp"
                                    />
                                    <img
                                        src={content.image.fallback}
                                        alt={content.image.alt}
                                        width={content.image.width}
                                        height={content.image.height}
                                        loading="eager"
                                        decoding="async"
                                        className="h-full w-full object-cover"
                                    />
                                </picture>
                            </div>
                            <figcaption className="flex items-center justify-between gap-2 border-t border-tijum-cream/12 bg-tijum-plum px-4 py-2.5">
                                <span className="font-heading text-xs font-semibold text-tijum-cream">
                                    {content.image.caption}
                                </span>
                                <span className="shrink-0 rounded-full bg-tijum-coral/18 px-2.5 py-0.5 font-heading text-[10px] font-bold tracking-[0.08em] text-tijum-peach uppercase">
                                    {content.image.badge}
                                </span>
                            </figcaption>
                        </figure>

                        <div className="space-y-2">
                            <p className="font-heading text-[11px] font-semibold tracking-[0.16em] text-tijum-peach uppercase">
                                {content.eyebrow}
                            </p>
                            <h2 className="font-heading text-2xl leading-[1.15] font-bold tracking-tight text-balance text-tijum-cream xl:text-[30px]">
                                {content.headline}
                            </h2>
                            <p className="max-w-md text-sm leading-relaxed text-pretty text-tijum-cream/78">
                                {content.description}
                            </p>
                        </div>

                        <div className="divide-y divide-tijum-cream/12 border-y border-tijum-cream/12">
                            {content.highlights.map((highlight) => {
                                const Icon = highlight.icon;

                                return (
                                    <div
                                        key={highlight.title}
                                        className="flex items-start gap-3.5 py-3"
                                    >
                                        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/25 bg-tijum-coral/15 text-tijum-peach">
                                            <Icon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="space-y-0.5">
                                            <p className="font-heading text-sm font-semibold text-tijum-cream">
                                                {highlight.title}
                                            </p>
                                            <p className="text-xs leading-relaxed text-tijum-cream/72">
                                                {highlight.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-tijum-cream/15 pt-4 text-xs text-tijum-cream/75">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin
                                className="size-3.5 shrink-0 text-tijum-peach"
                                aria-hidden="true"
                            />
                            <span>{content.railFooter}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-heading font-semibold text-tijum-cream">
                            <ShieldCheck
                                className="size-3.5 shrink-0 text-tijum-emerald"
                                aria-hidden="true"
                            />
                            <span>{content.railPromise}</span>
                        </span>
                    </div>
                </div>
            </aside>

            <div className="flex min-h-[calc(100dvh-8.75rem)] flex-col lg:col-span-7 lg:min-h-dvh">
                <nav
                    className="px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8 xl:px-12"
                    aria-label="Authentication navigation"
                >
                    <div
                        className={cn(
                            'mx-auto flex w-full flex-wrap items-center justify-between gap-3',
                            formWidthClass,
                        )}
                    >
                        <Link
                            href={home()}
                            className="group inline-flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum-muted transition-colors hover:text-tijum-plum"
                        >
                            <ArrowLeft
                                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                                aria-hidden="true"
                            />
                            Back to TIJUM
                        </Link>

                        <Link
                            href={content.switchHref()}
                            className="group inline-flex items-center gap-1.5 rounded-full border border-tijum-surface bg-white px-3 py-1.5 font-heading text-xs font-semibold text-tijum-plum shadow-2xs transition-colors hover:border-tijum-coral/60 hover:bg-tijum-cream/80"
                        >
                            <span className="font-normal text-tijum-plum-muted">
                                {content.switchPrompt}
                            </span>
                            <span>{content.switchLabel}</span>
                            <ArrowRight
                                className="size-3 text-tijum-coral transition-transform group-hover:translate-x-0.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                </nav>

                <main className="flex flex-1 items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">
                    <section
                        className={cn(
                            'mx-auto w-full rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-9',
                            formWidthClass,
                        )}
                    >
                        <div className="mb-6 space-y-2.5 border-b border-tijum-surface/80 pb-5">
                            <span className="inline-flex items-center gap-2 rounded-full border border-tijum-surface bg-tijum-cream px-3 py-1 font-heading text-[11px] font-semibold tracking-[0.12em] text-tijum-plum uppercase">
                                <span
                                    className="size-1.5 rounded-full bg-tijum-coral"
                                    aria-hidden="true"
                                />
                                {content.label}
                            </span>
                            {title && (
                                <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance text-tijum-plum sm:text-[28px]">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="max-w-2xl text-sm leading-relaxed text-pretty text-tijum-plum-muted">
                                    {description}
                                </p>
                            )}
                        </div>

                        {children}
                    </section>
                </main>

                <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-6 text-center text-xs text-tijum-plum-muted sm:px-6 lg:px-8">
                    <span>TIJUM · Stay easy. Eat well. Spend less.</span>
                    <span aria-hidden="true">·</span>
                    <div className="inline-flex items-center gap-3">
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
        </div>
    );
}
