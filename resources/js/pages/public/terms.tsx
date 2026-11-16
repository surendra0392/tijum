import {
    CheckCircle2,
    FileText,
    Gift,
    HelpCircle,
    Scale,
    Shield,
    Users,
} from 'lucide-react';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { faqs, grievanceRedressal } from '@/routes/public';
import type { SeoMetadata } from '@/types';

interface TermsProps {
    seo?: SeoMetadata;
}

const termsSections = [
    {
        id: 'acceptance',
        title: '1. Acceptance of Terms & Eligibility',
        icon: CheckCircle2,
        intro: 'By registering an account, searching stays, or listing a property on TIJUM, you agree to these Terms of Service, our Privacy Policy, and marketplace standards:',
        bullets: [
            'Age Requirement: Users must be at least 18 years old or have legal parent/guardian consent when an enrolled student.',
            'Verified Contact Info: Provide truthful contact details including a valid mobile number and email address.',
            'Account Security: Maintain confidentiality over credentials and activity occurring within your account.',
        ],
    },
    {
        id: 'marketplace-nature',
        title: '2. Asset-Light Marketplace Model',
        icon: Scale,
        intro: 'TIJUM operates strictly as a digital discovery and reservation platform connecting customers with independent operators of Hostels/PG, Homestays, and Co-Living properties:',
        bullets: [
            'No Property Ownership: TIJUM does not own, lease, or run physical buildings or residential kitchens.',
            'Host Operations: Independent partners remain solely responsible for physical room condition, local compliance, safety, and meal preparation.',
        ],
    },
    {
        id: 'booking-payment',
        title: '3. Reservations, Inventory Hold & Payments',
        icon: Shield,
        intro: 'Reservations follow a clear backend-verified checkout and confirmation lifecycle:',
        bullets: [
            '15-Minute Inventory Hold: Selecting an available room type places a 15-minute hold while you review quotes and complete payment.',
            'Automatic Confirmation: Confirmed status triggers automatically on backend-verified gateway payment—no manual owner approval bottleneck.',
            'Transparent Pricing: Base stay amounts, applicable taxes, fees, and meal statuses display upfront before payment.',
            'Platform Checkout Only: Never arrange unauthorized off-platform cash transfers; authorized bookings settle through verified gateways (Razorpay).',
        ],
    },
    {
        id: 'food-inclusions',
        title: '4. Property-Specific Food Flags & Stay Timings',
        icon: FileText,
        intro: 'All stay durations, arrival schedules, and meal inclusions are disclosed independently per property:',
        bullets: [
            'Independent Meal Flags: Listings specify Food Provided, Breakfast Included, Lunch Included, and Dinner Included individually—never blanketed.',
            'No Assumed Meals: Meals not marked included in base pricing may be paid separately or unavailable on site.',
            'Arrival & Departure Times: Standard timing applies across listings; early arrival is request-only and subject to room readiness.',
        ],
    },
    {
        id: 'partner-obligations',
        title: '5. Property Partner Responsibilities',
        icon: Users,
        intro: 'Independent owners registering via the Partner Portal agree to:',
        bullets: [
            'Accurate Property Records: Publish truthful property categories, gender policies, amenities, imagery, and rate cards.',
            'Room Fulfillment: Allocate prepared rooms cleanly for confirmed reservations without unauthorized cancellations.',
            'Statutory Clearances: Maintain valid municipal, hygiene, trade, and fire safety permits.',
        ],
    },
    {
        id: 'cancellation-grievances',
        title: '6. Cancellations, Relocations & Grievance Redressal',
        icon: HelpCircle,
        intro: 'Clear resolution protections apply across every confirmed booking:',
        bullets: [
            'Cancellations: Processed in line with the applicable booking cancellation window.',
            'Protection & Relocations: In confirmed host overbooking or material mismatch cases, customers may request platform-assisted relocation or refund review.',
            'Consumer Redressal: Escalate statutory grievances directly to our Grievance Officer within SLA timelines.',
        ],
    },
    {
        id: 'promotions-referrals-points',
        title: '7. Coupons, Referral Programme & Loyalty Points',
        icon: Gift,
        intro: 'Promotional codes, referral credits, and loyalty wallet usage follow transparent anti-abuse rules:',
        bullets: [
            'Coupons: Valid strictly during active campaigns and minimum booking totals; reserved during checkout hold and committed on captured payment.',
            'Refer & Earn: Rewards accrue only after genuine first-time friends register via referral link/code (/r/{code}) and complete stays; self-referrals void points.',
            'Non-Cash Points Ledger: Loyalty points are promotional credits usable solely on eligible stay bookings, expiring via FEFO schedule without cash encashment.',
            'Partner Settlement Protection: Platform-funded coupons and loyalty redemptions do not reduce host payouts.',
        ],
    },
];

export default function Terms({ seo }: TermsProps) {
    return (
        <>
            <PublicSeoHead seo={seo} fallbackTitle="Terms of Service — TIJUM" />

            <PublicPageHero
                eyebrow="Legal & User Agreement"
                title="Terms of Service"
                description="Marketplace terms, booking conditions, meal disclosures, and mutual responsibilities for guests and partners on TIJUM."
                breadcrumbs={[{ label: 'Terms of Service', current: true }]}
                badges={
                    <Badge variant="peach" className="gap-1.5">
                        <Scale className="size-3.5" aria-hidden="true" />
                        Platform Terms &amp; Standards
                    </Badge>
                }
            />

            <section
                aria-label="Terms of service details"
                className="bg-tijum-cream py-12 sm:py-16"
            >
                <ResponsiveContainer width="wide" className="space-y-10">
                    <div className="rounded-[20px] border border-tijum-surface bg-white p-5 text-sm leading-relaxed text-tijum-lavender shadow-tijum-card sm:p-6">
                        <strong className="font-heading text-tijum-plum">
                            Last Updated: November 14, 2026.
                        </strong>{' '}
                        These Terms of Service govern access to TIJUM websites,
                        apps, and reservation workflows. Review carefully before
                        registering or booking.
                    </div>

                    <div className="grid gap-10 lg:grid-cols-12">
                        <aside className="lg:col-span-4">
                            <nav
                                aria-label="Terms sections"
                                className="rounded-[24px] border border-tijum-surface bg-white p-5 shadow-tijum-card lg:sticky lg:top-24 sm:p-6"
                            >
                                <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                    Sections
                                </p>
                                <ul className="mt-3 space-y-1">
                                    {termsSections.map((sec) => (
                                        <li key={sec.id}>
                                            <a
                                                href={`#${sec.id}`}
                                                className="block rounded-xl px-3 py-2 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral sm:text-sm"
                                            >
                                                {sec.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>

                        <div className="space-y-6 lg:col-span-8">
                            {termsSections.map((section) => {
                                const Icon = section.icon;

                                return (
                                    <article
                                        key={section.id}
                                        id={section.id}
                                        className="scroll-mt-24 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                                <Icon
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                                {section.title}
                                            </h2>
                                        </div>

                                        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                            {section.intro}
                                        </p>

                                        <ul className="mt-4 max-w-[68ch] space-y-2.5 border-t border-tijum-surface pt-4 text-sm leading-relaxed text-tijum-lavender">
                                            {section.bullets.map((bullet) => {
                                                const [lead, ...rest] =
                                                    bullet.split(':');
                                                const hasLead = rest.length > 0;
                                                return (
                                                    <li
                                                        key={bullet}
                                                        className="flex items-start gap-2.5"
                                                    >
                                                        <span
                                                            className="mt-2 size-1.5 shrink-0 rounded-full bg-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {hasLead ? (
                                                                <>
                                                                    <strong className="font-heading text-tijum-plum">
                                                                        {lead}:
                                                                    </strong>{' '}
                                                                    {rest.join(
                                                                        ':',
                                                                    )}
                                                                </>
                                                            ) : (
                                                                bullet
                                                            )}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </article>
                                );
                            })}

                            <PublicCtaBand
                                eyebrow="Policy Questions"
                                title="Questions about booking terms or consumer protection?"
                                description="Explore frequently asked questions or contact our statutory Grievance Redressal Cell."
                                primaryAction={{
                                    label: 'Grievance Cell',
                                    href: grievanceRedressal(),
                                }}
                                secondaryAction={{
                                    label: 'Read FAQs',
                                    href: faqs(),
                                }}
                            />
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
