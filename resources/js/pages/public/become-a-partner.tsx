import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BedDouble,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    Home,
    SlidersHorizontal,
    Users,
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
    ACCOMMODATION_CATEGORIES,
    PARTNER_BENEFITS,
    PUBLIC_IMAGES,
} from '@/data/public-content';
import { login as ownerLogin, register as ownerRegister } from '@/routes/owner';
import { faqs } from '@/routes/public';
import type { SeoMetadata } from '@/types';

type BecomeAPartnerProps = {
    seo?: SeoMetadata;
};

const partnerSteps = [
    {
        step: '01',
        title: 'Create Your Owner Account',
        detail: 'Register through the dedicated TIJUM Partner Portal using your operator contact details and verify your email.',
        icon: Building2,
    },
    {
        step: '02',
        title: 'Set Up Your Property Profile',
        detail: 'Submit your property details, verification documents, room options, and meal schedule directly in the Partner Portal.',
        icon: ClipboardCheck,
    },
    {
        step: '03',
        title: 'Showcase Meals & Amenities',
        detail: 'Publish room configurations, the meals your package includes, check-in schedules, and amenities clearly for guests.',
        icon: Utensils,
    },
    {
        step: '04',
        title: 'Manage Bookings & Stays',
        detail: 'View confirmed bookings, manage availability, and allocate physical rooms from your owner workspace.',
        icon: SlidersHorizontal,
    },
];

const categoryIcons = [BedDouble, Home, Users];

export default function BecomeAPartner({ seo }: BecomeAPartnerProps) {
    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Become a Partner — List Your Hostel/PG, Homestay, or Co-Living | TIJUM"
                fallbackDescription="Partner with TIJUM to reach customers seeking verified Hostels/PG, Homestays, and Co-Living accommodations with property-specific food flags."
            />

            <PublicPageHero
                eyebrow="TIJUM Partner Portal"
                title="Have accommodation? Grow with food-inclusive bookings."
                description="Reach customers searching for daily, weekly, and monthly food-inclusive stays directly at your independent Hostel/PG, Homestay, or Co-Living property."
                breadcrumbs={[{ label: 'Become a Partner', current: true }]}
                badges={
                    <Badge variant="peach">
                        Phase 1 Launch Cities Open for Owners
                    </Badge>
                }
                actions={
                    <>
                        <Button size="lg" asChild>
                            <Link href={ownerRegister()}>
                                <span>Become a TIJUM Partner</span>
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                        <Button variant="plum" size="lg" asChild>
                            <Link href={ownerLogin()}>Partner Login</Link>
                        </Button>
                    </>
                }
            />

            {/* Partner Benefits Split */}
            <section className="bg-tijum-cream py-12 sm:py-16 lg:py-20">
                <ResponsiveContainer width="wide">
                    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                        <div className="space-y-5 lg:col-span-6">
                            <div className="space-y-2">
                                <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                    Why partner with TIJUM
                                </p>
                                <h2 className="tijum-section-title">
                                    Built for independent property operators
                                </h2>
                            </div>
                            <ul className="space-y-3 text-sm text-tijum-plum sm:text-base">
                                {PARTNER_BENEFITS.map((benefit) => (
                                    <li
                                        key={benefit}
                                        className="flex items-start gap-3 rounded-2xl border border-tijum-surface bg-white p-4 shadow-tijum-card"
                                    >
                                        <CheckCircle2
                                            className="mt-0.5 size-5 shrink-0 text-tijum-emerald"
                                            aria-hidden="true"
                                        />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lg:col-span-6">
                            <div className="overflow-hidden rounded-[28px] border border-tijum-surface bg-white p-2 shadow-tijum-soft">
                                <IllustrativeImage
                                    image={PUBLIC_IMAGES.partnerHospitality}
                                    priority
                                    showIllustrativeTag
                                    aspectClassName="aspect-4/3 rounded-[22px]"
                                />
                            </div>
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>

            {/* Eligible Property Formats */}
            <section className="border-y border-tijum-surface bg-white py-14 sm:py-16">
                <ResponsiveContainer width="wide" className="space-y-10">
                    <SectionHeading
                        eyebrow="Eligible Phase 1 Property Categories"
                        title="Accommodation formats eligible to join now"
                        description="TIJUM partners with verified independent properties across Hyderabad, Guntur, Vijayawada, and Visakhapatnam."
                    />

                    <div className="grid gap-6 md:grid-cols-3">
                        {ACCOMMODATION_CATEGORIES.map((category, idx) => {
                            const Icon = categoryIcons[idx] ?? Building2;

                            return (
                                <article
                                    key={category.id}
                                    className="rounded-[24px] border border-tijum-surface bg-tijum-cream/55 p-6 shadow-tijum-card"
                                >
                                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white border border-tijum-surface text-tijum-plum">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <h3 className="mt-4 font-heading text-lg font-bold text-tijum-plum">
                                        {category.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-tijum-lavender">
                                        {category.description}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </ResponsiveContainer>
            </section>

            {/* Partner Journey */}
            <section className="bg-tijum-cream py-14 sm:py-16 lg:py-20">
                <ResponsiveContainer width="wide" className="space-y-10">
                    <SectionHeading
                        eyebrow="Partner Journey"
                        title="From onboarding to reservation management"
                    />

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {partnerSteps.map((item) => {
                            const Icon = item.icon;

                            return (
                                <article
                                    key={item.step}
                                    className="flex flex-col justify-between rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                                <Icon
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <Badge variant="outline">
                                                Step {item.step}
                                            </Badge>
                                        </div>
                                        <h3 className="font-heading text-base font-bold text-tijum-plum">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-tijum-lavender">
                                            {item.detail}
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <PublicCtaBand
                        eyebrow="Partner Registration"
                        title="Ready to create your Partner Portal account?"
                        description="Partner accounts are dedicated to hosts and separate from customer accounts. Manage listings, availability, bookings, and physical room allocations directly."
                        primaryAction={{
                            label: 'Create Partner Account',
                            href: ownerRegister(),
                        }}
                        secondaryAction={{
                            label: 'Partner FAQs',
                            href: faqs(),
                        }}
                    />
                </ResponsiveContainer>
            </section>
        </>
    );
}
