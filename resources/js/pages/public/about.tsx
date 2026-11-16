import { Link } from '@inertiajs/react';
import { Building2, Compass, MapPin, Utensils } from 'lucide-react';
import { IllustrativeImage } from '@/components/public/illustrative-image';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { Badge } from '@/components/ui/badge';
import { LAUNCH_CITIES, PUBLIC_IMAGES } from '@/data/public-content';
import { becomeAPartner, howItWorks, search as publicSearch } from '@/routes/public';
import { show as cityShow } from '@/routes/public/cities';
import type { SeoMetadata } from '@/types';

type AboutProps = {
    seo?: SeoMetadata;
};

export default function About({ seo }: AboutProps) {
    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="About TIJUM — Accommodation Marketplace with Food Flags"
                fallbackDescription="Learn about TIJUM’s mission to simplify affordable Hostels/PG, Homestays, and Co-Living accommodations across Hyderabad, Guntur, Vijayawada, and Visakhapatnam."
            />

            <PublicPageHero
                eyebrow="About TIJUM"
                title="Making affordable, food-inclusive accommodation simple to find."
                description="TIJUM connects guests looking for transparent stays with independent Hostels/PG, Homestay, and Co-Living operators through one platform — keeping room pricing and meal inclusions visible upfront."
                breadcrumbs={[{ label: 'About TIJUM', current: true }]}
                badges={<Badge variant="peach">Our Mission &amp; Philosophy</Badge>}
            />

            {/* Editorial Visual Split */}
            <section className="bg-tijum-cream py-12 sm:py-16 lg:py-20">
                <ResponsiveContainer width="wide" className="space-y-12">
                    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="overflow-hidden rounded-[28px] border border-tijum-surface bg-white p-2 shadow-tijum-soft lg:col-span-6">
                            <IllustrativeImage
                                image={PUBLIC_IMAGES.heroStay}
                                priority
                                showIllustrativeTag
                                aspectClassName="aspect-4/3 rounded-[22px]"
                            />
                        </div>

                        <div className="space-y-5 lg:col-span-6">
                            <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-7">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                        <Compass
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        The customer problem we solve
                                    </h2>
                                </div>
                                <div className="mt-4 space-y-3 text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    <p>
                                        Students relocating for classes, young
                                        professionals starting jobs, and value
                                        travellers often rely on phone calls and
                                        scattered referrals just to verify room
                                        rates and whether daily meals are
                                        included.
                                    </p>
                                    <p>
                                        Conventional booking platforms focus
                                        mostly on room-only hotels—leaving
                                        everyday residents to arrange daily food
                                        separately at unpredictable costs.
                                    </p>
                                </div>
                            </article>

                            <article className="rounded-[24px] border border-tijum-peach bg-white p-6 shadow-tijum-card sm:p-7">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream">
                                        <Utensils
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        Food-inclusive clarity first
                                    </h2>
                                </div>
                                <p className="mt-4 text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    Every property tracks breakfast, lunch, and
                                    dinner availability independently. Instead
                                    of vague claims, you know exactly what your
                                    rate covers before booking.
                                </p>
                            </article>
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>

            {/* Operating Model & Launch Cities */}
            <section className="border-t border-tijum-surface bg-white py-14 sm:py-16 lg:py-20">
                <ResponsiveContainer width="wide" className="space-y-12">
                    <SectionHeading
                        eyebrow="How We Operate"
                        title="An asset-light marketplace built on transparent data"
                        description="TIJUM pairs guests with independent accommodation operators rather than managing buildings itself."
                    />

                    <div className="grid gap-6 lg:grid-cols-2">
                        <article className="rounded-[24px] border border-tijum-surface bg-tijum-cream/55 p-7 shadow-tijum-card">
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-peach/35 text-tijum-plum">
                                    <Building2
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="font-heading text-xs font-bold tabular-nums text-tijum-lavender">
                                    01
                                </span>
                            </div>
                            <h3 className="mt-5 font-heading text-xl font-bold text-tijum-plum">
                                Asset-light marketplace model
                            </h3>
                            <div className="mt-3 space-y-3 text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                <p>
                                    TIJUM is a digital discovery and reservation
                                    marketplace—not an accommodation operator.
                                    We do not own hostels, lease rooms, or run
                                    central kitchens ourselves.
                                </p>
                                <p>
                                    Independent Hostels/PG, Homestay, and
                                    Co-Living operators manage their own inventory
                                    and meal options transparently across daily,
                                    weekly, and monthly bookings.
                                </p>
                            </div>
                        </article>

                        <article className="rounded-[24px] border border-tijum-surface bg-tijum-cream/55 p-7 shadow-tijum-card">
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream">
                                    <MapPin
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="font-heading text-xs font-bold tabular-nums text-tijum-lavender">
                                    02
                                </span>
                            </div>
                            <h3 className="mt-5 font-heading text-xl font-bold text-tijum-plum">
                                Focused launch markets, steady expansion
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                Our network launched across four key Indian
                                student and work corridors before expanding
                                nationwide:
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {LAUNCH_CITIES.map((city) => (
                                    <Link
                                        key={city.slug}
                                        href={cityShow(city.slug)}
                                        className="inline-flex min-h-10 items-center rounded-full border border-tijum-surface bg-white px-4 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:border-tijum-coral hover:text-tijum-coral"
                                    >
                                        {city.name}
                                    </Link>
                                ))}
                            </div>
                        </article>
                    </div>

                    <PublicCtaBand
                        eyebrow="Explore TIJUM"
                        title="Ready to find a stay or join as a property partner?"
                        description="Search verified stays with clear meal inclusions or see our step-by-step booking workflow."
                        primaryAction={{
                            label: 'Explore stays',
                            href: publicSearch(),
                        }}
                        secondaryAction={{
                            label: 'Become a Partner',
                            href: becomeAPartner(),
                        }}
                    />

                    <div className="text-center">
                        <Link
                            href={howItWorks()}
                            className="font-heading text-sm font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral"
                        >
                            Read the step-by-step booking guide
                        </Link>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
