import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    FileCheck2,
    Info,
    Mail,
    Scale,
    ShieldAlert,
    ShieldCheck,
    Star,
    Users,
} from 'lucide-react';
import { PublicCtaBand } from '@/components/public/public-cta-band';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import { grievanceRedressal, search as publicSearch } from '@/routes/public';
import type { SeoMetadata } from '@/types';

interface ReviewPolicyProps {
    submissionWindowDays: number;
    editWindowDays: number;
    maxContentLength: number;
    grievanceOfficer?: {
        name?: string;
        designation?: string;
        email?: string;
        phone?: string;
        address?: string;
        working_hours?: string;
    } | null;
    seo?: SeoMetadata;
}

const sectionList = [
    { id: 'eligibility', label: '1. Verified Booking Eligibility' },
    { id: 'disclosure', label: '2. Badge Disclosure' },
    { id: 'gating', label: '3. No Gating & Incentives' },
    { id: 'methodology', label: '4. Rating Calculation' },
    { id: 'moderation', label: '5. Moderation Grounds' },
    { id: 'responses', label: '6. Owner Responses' },
    { id: 'distinction', label: '7. Reports vs. Stay Grievances' },
    { id: 'officer', label: '8. Grievance Officer Contact' },
];

export default function ReviewPolicy({
    submissionWindowDays,
    editWindowDays,
    maxContentLength,
    grievanceOfficer,
    seo,
}: ReviewPolicyProps) {
    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Customer Review & Moderation Code of Practice — TIJUM"
                fallbackDescription="How TIJUM collects, moderates, and publishes customer feedback linked to Verified Booking reservations."
            />

            <PublicPageHero
                eyebrow="Marketplace Trust & Integrity"
                title="Customer Review & Moderation Code of Practice"
                description="TIJUM publishes customer feedback linked to eligible Verified Booking reservations across Hostels/PG, Homestays, and Co-Living properties—without overstating physical audit claims."
                breadcrumbs={[{ label: 'Review Policy', current: true }]}
                badges={
                    <Badge variant="peach" className="gap-1.5">
                        <Scale className="size-3.5" aria-hidden="true" />
                        Trust &amp; Moderation Standards
                    </Badge>
                }
            />

            <section className="bg-tijum-cream py-12 sm:py-16">
                <ResponsiveContainer width="wide" className="space-y-10">
                    {/* Code Scope Notice */}
                    <div className="flex items-start gap-3.5 rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card sm:p-6">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                            <Info className="size-5" aria-hidden="true" />
                        </span>
                        <div className="max-w-[75ch] space-y-1 text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                            <p className="font-heading font-bold text-tijum-plum">
                                Scope of this Code
                            </p>
                            <p>
                                This document sets out TIJUM&apos;s internal
                                review collection, moderation, and publication
                                practices. It is a voluntary code of practice
                                and does not constitute a third-party
                                certification, conformity assessment, or
                                government endorsement.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-10 lg:grid-cols-12">
                        {/* Sticky Section Index Rail */}
                        <aside className="lg:col-span-4">
                            <nav
                                aria-label="Review policy sections"
                                className="rounded-[24px] border border-tijum-surface bg-white p-5 shadow-tijum-card lg:sticky lg:top-24 sm:p-6"
                            >
                                <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                    Code Sections
                                </p>
                                <ul className="mt-3 space-y-1">
                                    {sectionList.map((sec) => (
                                        <li key={sec.id}>
                                            <a
                                                href={`#${sec.id}`}
                                                className="block rounded-xl px-3 py-2 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:bg-tijum-cream hover:text-tijum-coral sm:text-sm"
                                            >
                                                {sec.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>

                        {/* Main Document Flow */}
                        <div className="space-y-6 lg:col-span-8">
                            <section
                                id="eligibility"
                                className="scroll-mt-24 space-y-4 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck
                                        className="size-5 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        1. Verified Booking Eligibility
                                    </h2>
                                </div>
                                <p className="max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    To protect guests from fabricated reviews or
                                    competitive spam, reviews on TIJUM are linked
                                    exclusively to eligible completed bookings:
                                </p>
                                <div className="grid gap-3 text-xs sm:grid-cols-2 sm:text-sm">
                                    <div className="space-y-1 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4">
                                        <span className="font-heading font-bold text-tijum-plum">
                                            Registered Customer
                                        </span>
                                        <p className="text-tijum-lavender">
                                            Only the registered customer whose
                                            account completed the booking can
                                            submit feedback.
                                        </p>
                                    </div>
                                    <div className="space-y-1 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4">
                                        <span className="font-heading font-bold text-tijum-plum">
                                            Confirmed Paid Booking
                                        </span>
                                        <p className="text-tijum-lavender">
                                            The reservation must be confirmed
                                            following backend payment
                                            verification.
                                        </p>
                                    </div>
                                    <div className="space-y-1 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4">
                                        <span className="font-heading font-bold text-tijum-plum">
                                            Completed Scheduled Stay
                                        </span>
                                        <p className="text-tijum-lavender">
                                            Reviews unlock only after the
                                            scheduled checkout timestamp in stay
                                            local time.
                                        </p>
                                    </div>
                                    <div className="space-y-1 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4">
                                        <span className="font-heading font-bold text-tijum-plum">
                                            {submissionWindowDays}-Day
                                            Submission Window
                                        </span>
                                        <p className="text-tijum-lavender">
                                            Submitted within{' '}
                                            {submissionWindowDays} days of
                                            checkout while stay details are
                                            fresh.
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-tijum-lavender">
                                    Published reviews may be edited within{' '}
                                    {editWindowDays} days and are capped at{' '}
                                    {maxContentLength} characters.
                                </p>
                            </section>

                            <section
                                id="disclosure"
                                className="scroll-mt-24 space-y-3 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2
                                        className="size-5 text-tijum-emerald"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        2. &ldquo;Verified Booking&rdquo; Badge
                                        Disclosure
                                    </h2>
                                </div>
                                <p className="max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    Published reviews carry a{' '}
                                    <strong className="font-heading text-tijum-plum">
                                        Verified Booking
                                    </strong>{' '}
                                    badge indicating the review ties back to an
                                    eligible, paid reservation in our system.
                                    TIJUM does not claim physical presence
                                    audits, biometric logs, or room-key
                                    tracking.
                                </p>
                            </section>

                            <section
                                id="gating"
                                className="scroll-mt-24 space-y-3 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Scale
                                        className="size-5 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        3. Prohibition of Review Gating &amp;
                                        Incentives
                                    </h2>
                                </div>
                                <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    <li>
                                        <strong className="text-tijum-plum">
                                            No Review Gating:
                                        </strong>{' '}
                                        All eligible guests receive equal,
                                        neutral review access regardless of
                                        sentiment.
                                    </li>
                                    <li>
                                        <strong className="text-tijum-plum">
                                            No Paid Reviews:
                                        </strong>{' '}
                                        TIJUM strictly prohibits cash, points,
                                        or coupons offered in exchange for high
                                        ratings or edits.
                                    </li>
                                    <li>
                                        <strong className="text-tijum-plum">
                                            No Conditional Support:
                                        </strong>{' '}
                                        Refunds or protection rulings never
                                        depend on modifying or deleting a review.
                                    </li>
                                </ul>
                            </section>

                            <section
                                id="methodology"
                                className="scroll-mt-24 space-y-3 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Star
                                        className="size-5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        4. Rating Calculation Methodology
                                    </h2>
                                </div>
                                <p className="max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    Overall ratings reflect the arithmetic mean
                                    across all{' '}
                                    <strong className="text-tijum-plum">
                                        Published
                                    </strong>{' '}
                                    reviews for a property, rounded to two
                                    decimal places. Properties with zero
                                    published reviews display no synthetic
                                    score. Pending, rejected, or hidden items
                                    are excluded immediately.
                                </p>
                            </section>

                            <section
                                id="moderation"
                                className="scroll-mt-24 space-y-4 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <ShieldAlert
                                        className="size-5 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        5. Objective Moderation Grounds
                                    </h2>
                                </div>
                                <p className="max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    Reviews are hidden or rejected strictly on
                                    objective safety and integrity criteria:
                                </p>
                                <div className="grid gap-2.5 text-xs text-tijum-lavender sm:grid-cols-2 sm:text-sm">
                                    {[
                                        [
                                            'Hate Speech & Harassment',
                                            'Abusive, discriminatory, or threatening statements.',
                                        ],
                                        [
                                            'Obscenity & Vulgarity',
                                            'Explicit profanity or sexually explicit text.',
                                        ],
                                        [
                                            'Personal Data',
                                            'Phone numbers, Aadhaar, PAN, emails, or private addresses.',
                                        ],
                                        [
                                            'Contradicted Facts',
                                            'Claims disproved by verified booking records.',
                                        ],
                                        [
                                            'Commercial Spam',
                                            'Affiliate URLs, competitor ads, or promotional spam.',
                                        ],
                                        [
                                            'Off-Topic Content',
                                            'Text unrelated to the booked stay or food arrangement.',
                                        ],
                                    ].map(([heading, desc]) => (
                                        <div
                                            key={heading}
                                            className="rounded-xl border border-tijum-surface bg-tijum-cream/55 p-3.5"
                                        >
                                            <strong className="block font-heading text-tijum-plum">
                                                {heading}
                                            </strong>
                                            <span className="mt-0.5 block">
                                                {desc}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-tijum-lavender">
                                    <strong className="font-heading text-tijum-plum">
                                        Critical feedback is never suppressed
                                    </strong>{' '}
                                    simply because a property owner disagrees
                                    with an honest subjective score.
                                </p>
                            </section>

                            <section
                                id="responses"
                                className="scroll-mt-24 space-y-3 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Users
                                        className="size-5 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        6. Property Owner Right to Respond
                                    </h2>
                                </div>
                                <p className="max-w-[68ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                    Owners may submit one public reply to any
                                    published review. Owner replies follow the
                                    same moderation checks for professionalism
                                    and zero retaliation before displaying below
                                    the customer review.
                                </p>
                            </section>

                            <section
                                id="distinction"
                                className="scroll-mt-24 space-y-4 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle
                                        className="size-5 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        7. Review Reports vs. Stay Grievances
                                    </h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4 text-sm">
                                        <h3 className="flex items-center gap-1.5 font-heading font-bold text-tijum-plum">
                                            <ShieldAlert
                                                className="size-4 text-tijum-plum"
                                                aria-hidden="true"
                                            />
                                            Customer Protection Cases
                                        </h3>
                                        <p className="text-xs leading-relaxed text-tijum-lavender">
                                            For live booking problems (missing
                                            meals, AC/room mismatch,
                                            relocations, or refunds), open a
                                            case from your dashboard.
                                        </p>
                                        <Link
                                            href={dashboard()}
                                            className="inline-block font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                                        >
                                            File a Stay Protection Case
                                        </Link>
                                    </div>

                                    <div className="space-y-2 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-4 text-sm">
                                        <h3 className="flex items-center gap-1.5 font-heading font-bold text-tijum-plum">
                                            <FileCheck2
                                                className="size-4 text-tijum-plum"
                                                aria-hidden="true"
                                            />
                                            Review Content Reports
                                        </h3>
                                        <p className="text-xs leading-relaxed text-tijum-lavender">
                                            Use the Report link on any published
                                            review card strictly for privacy
                                            leaks, hate speech, false claims, or
                                            spam.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section
                                id="officer"
                                className="scroll-mt-24 space-y-4 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Mail
                                        className="size-5 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    <h2 className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                        8. Grievance Officer Contact Details
                                    </h2>
                                </div>
                                <p className="text-sm text-tijum-lavender">
                                    Published in accordance with the Consumer
                                    Protection (E-Commerce) Rules, 2020:
                                </p>
                                <dl className="grid gap-3 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-5 text-xs sm:grid-cols-2 sm:text-sm">
                                    {grievanceOfficer?.name && (
                                        <div>
                                            <dt className="font-heading font-semibold text-tijum-lavender">
                                                Officer Name
                                            </dt>
                                            <dd className="mt-0.5 font-semibold text-tijum-plum">
                                                {grievanceOfficer.name}
                                            </dd>
                                        </div>
                                    )}
                                    {grievanceOfficer?.designation && (
                                        <div>
                                            <dt className="font-heading font-semibold text-tijum-lavender">
                                                Designation
                                            </dt>
                                            <dd className="mt-0.5 font-semibold text-tijum-plum">
                                                {grievanceOfficer.designation}
                                            </dd>
                                        </div>
                                    )}
                                    {grievanceOfficer?.email && (
                                        <div>
                                            <dt className="font-heading font-semibold text-tijum-lavender">
                                                Email
                                            </dt>
                                            <dd className="mt-0.5">
                                                <a
                                                    href={`mailto:${grievanceOfficer.email}`}
                                                    className="font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                                                >
                                                    {grievanceOfficer.email}
                                                </a>
                                            </dd>
                                        </div>
                                    )}
                                    {grievanceOfficer?.phone && (
                                        <div>
                                            <dt className="font-heading font-semibold text-tijum-lavender">
                                                Phone
                                            </dt>
                                            <dd className="mt-0.5 font-semibold text-tijum-plum">
                                                {grievanceOfficer.phone}
                                            </dd>
                                        </div>
                                    )}
                                    {grievanceOfficer?.working_hours && (
                                        <div>
                                            <dt className="font-heading font-semibold text-tijum-lavender">
                                                Hours
                                            </dt>
                                            <dd className="mt-0.5 text-tijum-plum">
                                                {grievanceOfficer.working_hours}
                                            </dd>
                                        </div>
                                    )}
                                    {grievanceOfficer?.address && (
                                        <div className="sm:col-span-2">
                                            <dt className="font-heading font-semibold text-tijum-lavender">
                                                Address
                                            </dt>
                                            <dd className="mt-0.5 text-tijum-plum">
                                                {grievanceOfficer.address}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </section>

                            <PublicCtaBand
                                eyebrow="Customer Protection"
                                title="Need help with a booking or stay grievance?"
                                description="Review statutory turnaround times or browse verified properties with honest Verified Booking feedback."
                                primaryAction={{
                                    label: 'Explore stays',
                                    href: publicSearch(),
                                }}
                                secondaryAction={{
                                    label: 'Grievance Redressal',
                                    href: grievanceRedressal(),
                                }}
                            />
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
