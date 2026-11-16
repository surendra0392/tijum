import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    Clock,
    Headphones,
    Layers,
    ReceiptIndianRupee,
    Utensils,
} from 'lucide-react';
import { IllustrativeImage } from '@/components/public/illustrative-image';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    createCheckinRules,
    HOW_IT_WORKS_STEPS,
    PUBLIC_IMAGES,
} from '@/data/public-content';
import { register } from '@/routes';
import { becomeAPartner, faqs, search as publicSearch } from '@/routes/public';
import type { SeoMetadata } from '@/types';
import type { StayTimingData } from '@/types/public-search';

type HowItWorksProps = {
    seo?: SeoMetadata;
    timing: StayTimingData;
};

export default function HowItWorks({ seo, timing }: HowItWorksProps) {
    const checkinRules = createCheckinRules(timing);

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="How It Works — Stays & Food Flags | TIJUM"
                fallbackDescription="Understand how TIJUM connects guests with verified Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags."
            />

            <PublicPageHero
                eyebrow="Platform Guide"
                title="How TIJUM works from search to check-in"
                description="One straightforward discovery and booking model for Hostels/PG, Homestays, and Co-Living properties—with exact meal visibility and zero manual approval wait."
                breadcrumbs={[{ label: 'How It Works', current: true }]}
                badges={<Badge variant="peach">Marketplace Guide</Badge>}
                actions={
                    <>
                        <Button size="lg" asChild>
                            <Link href={publicSearch()}>
                                <span>Explore stays</span>
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild>
                            <Link href={register()}>Create Account</Link>
                        </Button>
                    </>
                }
            >
                <div className="grid gap-4 pt-2 md:grid-cols-2">
                    <div className="rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card sm:p-6">
                        <Badge variant="food">Live Now</Badge>
                        <h2 className="mt-3 font-heading text-lg font-bold text-tijum-plum">
                            Search, real availability &amp; instant confirmation
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-tijum-lavender">
                            Search by city and dates, inspect independent room
                            types and meal statuses, place a 15-minute inventory
                            hold, and get automatic confirmation upon backend
                            payment verification.
                        </p>
                    </div>

                    <div className="rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card sm:p-6">
                        <Badge variant="peach">Accounts &amp; Partners</Badge>
                        <h2 className="mt-3 font-heading text-lg font-bold text-tijum-plum">
                            Customer Dashboard &amp; Partner Portal
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-tijum-lavender">
                            Guests track bookings, receipts, loyalty points, and
                            support tickets from the Customer portal while hosts
                            allocate physical rooms through the Partner Portal.
                        </p>
                    </div>
                </div>
            </PublicPageHero>

            {/* 6-Step Editorial Process Grid */}
            <section
                aria-labelledby="journey-steps-heading"
                className="bg-white py-14 sm:py-16 lg:py-20"
            >
                <ResponsiveContainer width="wide" className="space-y-10">
                    <SectionHeading
                        id="journey-steps-heading"
                        eyebrow="Booking journey"
                        title="Six transparent steps from discovery to a confirmed stay"
                        description="Every step preserves clarity around room category inventory, meal plans, and verified checkout totals."
                    />

                    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {HOW_IT_WORKS_STEPS.map((item) => (
                            <li
                                key={item.step}
                                className="flex flex-col justify-between rounded-[24px] border border-tijum-surface bg-tijum-cream/55 p-6 shadow-tijum-card"
                            >
                                <div className="space-y-3">
                                    <span className="inline-flex rounded-full bg-tijum-plum px-3 py-1 font-heading text-xs font-bold tabular-nums text-tijum-cream">
                                        Step {item.step}
                                    </span>
                                    <h3 className="font-heading text-lg font-bold text-tijum-plum">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-tijum-lavender">
                                        {item.description}
                                    </p>
                                </div>
                                <p className="mt-5 border-t border-tijum-surface pt-3.5 font-heading text-xs font-semibold text-tijum-plum">
                                    {item.note}
                                </p>
                            </li>
                        ))}
                    </ol>
                </ResponsiveContainer>
            </section>

            {/* Food-Inclusive Visual Split & Policies */}
            <section className="border-t border-tijum-surface bg-tijum-cream py-14 sm:py-16 lg:py-20">
                <ResponsiveContainer width="wide" className="space-y-12">
                    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="space-y-5 lg:col-span-6">
                            <Badge variant="food">Food Transparency Policy</Badge>
                            <h2 className="tijum-section-title">
                                Why every listing separates each meal flag
                            </h2>
                            <p className="max-w-[60ch] text-base leading-[1.68] text-tijum-lavender">
                                Students, relocated workers, and short-stay
                                guests often lose significant monthly budget to
                                unexpected outside meals. TIJUM tracks food
                                availability and each meal independently before
                                reservation.
                            </p>
                            <ul className="space-y-3 text-sm text-tijum-plum">
                                <li className="flex items-start gap-3 rounded-2xl border border-tijum-surface bg-white p-4">
                                    <Utensils
                                        className="mt-0.5 size-4 shrink-0 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Breakfast, lunch, and dinner statuses are
                                        never inferred—only marked included when
                                        covered by the property.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3 rounded-2xl border border-tijum-surface bg-white p-4">
                                    <Layers
                                        className="mt-0.5 size-4 shrink-0 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Amenities, sharing configuration, and
                                        gender eligibility are displayed upfront
                                        for each room type.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3 rounded-2xl border border-tijum-surface bg-white p-4">
                                    <CalendarClock
                                        className="mt-0.5 size-4 shrink-0 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Daily, weekly, and monthly bookings all
                                        follow consistent transparent rules.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="lg:col-span-6">
                            <div className="overflow-hidden rounded-[28px] border border-tijum-surface bg-white p-2 shadow-tijum-soft">
                                <IllustrativeImage
                                    image={PUBLIC_IMAGES.heroMeal}
                                    showIllustrativeTag
                                    aspectClassName="aspect-4/3 rounded-[22px]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                <Clock
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <h3 className="mt-4 font-heading text-lg font-bold text-tijum-plum">
                                Check-in &amp; Early Arrival
                            </h3>
                            <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-tijum-lavender">
                                <p>
                                    Standard check-in is{' '}
                                    <strong className="text-tijum-plum">
                                        {checkinRules.standardCheckin}
                                    </strong>{' '}
                                    and checkout is{' '}
                                    <strong className="text-tijum-plum">
                                        {checkinRules.standardCheckout}
                                    </strong>
                                    .
                                </p>
                                <p>
                                    Early arrival from{' '}
                                    <strong className="text-tijum-plum">
                                        {checkinRules.earliestEarlyCheckin}
                                    </strong>{' '}
                                    is request-only when enabled by the room
                                    type, with zero extra arrival fee.
                                </p>
                            </div>
                        </article>

                        <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                <ReceiptIndianRupee
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <h3 className="mt-4 font-heading text-lg font-bold text-tijum-plum">
                                Verified Totals &amp; Holds
                            </h3>
                            <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-tijum-lavender">
                                <p>
                                    Each booking calculates unit rates, stay
                                    duration, and immutable snapshot totals on
                                    the server before payment.
                                </p>
                                <p>
                                    Inventory locks cleanly during the 15-minute
                                    payment hold and confirms upon payment
                                    verification.
                                </p>
                            </div>
                        </article>

                        <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                <Headphones
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <h3 className="mt-4 font-heading text-lg font-bold text-tijum-plum">
                                Stay Protection &amp; Support
                            </h3>
                            <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-tijum-lavender">
                                <p>
                                    Should check-in conditions fall short of a
                                    confirmed listing, dedicated stay protection
                                    cases and escalation SLAs apply.
                                </p>
                                <p>
                                    Verified reviews connect directly to
                                    completed paid bookings for honest signals.
                                </p>
                            </div>
                        </article>
                    </div>

                    <PublicCtaBand
                        eyebrow="Next Step"
                        title="Want more answers or looking to list a stay?"
                        description="Browse frequently asked questions or partner with TIJUM to reach direct student and working-resident bookings."
                        primaryAction={{
                            label: 'Become a Partner',
                            href: becomeAPartner(),
                        }}
                        secondaryAction={{
                            label: 'Read All FAQs',
                            href: faqs(),
                        }}
                    />
                </ResponsiveContainer>
            </section>
        </>
    );
}
