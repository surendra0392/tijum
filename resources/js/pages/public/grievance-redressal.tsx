import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    Clock,
    FileText,
    Mail,
    Scale,
    ShieldCheck,
    UserCheck,
} from 'lucide-react';
import { PublicPageHero } from '@/components/public/public-page-hero';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { index as reservationsIndex } from '@/routes/reservations';
import type { SeoMetadata } from '@/types';

interface GrievanceRedressalProps {
    grievanceOfficer?: {
        name: string;
        designation: string;
        email: string;
        phone: string;
        address?: string;
    };
    slas?: {
        acknowledgement_hours: number;
        resolution_days: number;
    };
    seo?: SeoMetadata;
}

const escalationTiers = [
    {
        level: 'Level 01',
        title: 'Direct Reservation Support',
        description:
            'Report room mismatches, meal issues, or host unavailability directly from your booking. These are handled by the host or support team.',
    },
    {
        level: 'Level 02',
        title: 'Grievance Redressal Cell',
        description:
            'If unresolved at Tier 1, tickets escalate to the Grievance Cell for priority review, assisted relocation, or refund adjudication.',
    },
    {
        level: 'Level 03',
        title: 'Statutory Escalation',
        description:
            'If you remain dissatisfied, escalate under the Consumer Protection Act, 2019 via the National Consumer Helpline or District Commission.',
    },
];

export default function GrievanceRedressal({
    grievanceOfficer,
    slas,
    seo,
}: GrievanceRedressalProps) {
    const ackHours = slas?.acknowledgement_hours ?? 48;
    const resDays = slas?.resolution_days ?? 30;

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Statutory Grievance Redressal Mechanism — TIJUM"
                fallbackDescription="Statutory grievance redressal mechanism, designated nodal officer contacts, and consumer protection policies under the Consumer Protection Act 2019 and E-Commerce Rules 2020."
            />

            <PublicPageHero
                eyebrow="Statutory Compliance & Consumer Protection"
                title="Grievance Redressal Mechanism"
                description="TIJUM ensures transparent, accountable resolution of customer concerns under the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020."
                breadcrumbs={[{ label: 'Grievance Redressal', current: true }]}
                badges={
                    <Badge variant="peach">
                        Government of India Compliance Disclosures
                    </Badge>
                }
            />

            <section className="bg-tijum-cream py-12 sm:py-16">
                <ResponsiveContainer width="wide" className="space-y-12">
                    {/* SLA Pillars */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                <Clock className="size-5" aria-hidden="true" />
                            </span>
                            <p className="mt-4 font-heading text-2xl font-bold tabular-nums text-tijum-plum">
                                {ackHours} Hours
                            </p>
                            <h2 className="mt-1 font-heading text-base font-bold text-tijum-plum">
                                Ticket Acknowledgment SLA
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-tijum-lavender">
                                Every submitted grievance ticket generates a
                                unique reference number acknowledged within{' '}
                                {ackHours} hours.
                            </p>
                        </article>

                        <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                <Scale className="size-5" aria-hidden="true" />
                            </span>
                            <p className="mt-4 font-heading text-2xl font-bold tabular-nums text-tijum-plum">
                                {resDays} Days
                            </p>
                            <h2 className="mt-1 font-heading text-base font-bold text-tijum-plum">
                                Final Redressal Target
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-tijum-lavender">
                                Escalated room mismatches, meal discrepancies,
                                and refund appeals resolve within {resDays} days
                                of registration.
                            </p>
                        </article>

                        <article className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-emerald/15 text-tijum-emerald">
                                <ShieldCheck
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <p className="mt-4 font-heading text-2xl font-bold text-tijum-plum">
                                Stay Protection
                            </p>
                            <h2 className="mt-1 font-heading text-base font-bold text-tijum-plum">
                                Assisted Alternative Stays
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-tijum-lavender">
                                When a confirmed host cannot honor inventory or
                                stated facilities, TIJUM assists with equivalent
                                stay relocation or refund review.
                            </p>
                        </article>
                    </div>

                    {/* Nodal Grievance Officer Directory & Active Reservation Link */}
                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8 lg:col-span-8">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-tijum-peach/30 px-3 py-1 font-heading text-xs font-semibold tracking-wide text-tijum-plum uppercase">
                                <UserCheck
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Nodal Grievance Officer</span>
                            </span>

                            <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl">
                                Official Contact &amp; Escalation Authority
                            </h2>
                            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-tijum-lavender">
                                Designated pursuant to the Consumer Protection
                                (E-Commerce) Rules, 2020 for TIJUM customer and
                                statutory escalations:
                            </p>

                            <dl className="mt-6 grid gap-4 rounded-2xl border border-tijum-surface bg-tijum-cream/55 p-5 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="font-heading text-xs font-semibold text-tijum-lavender">
                                        Officer Name
                                    </dt>
                                    <dd className="mt-0.5 font-heading font-bold text-tijum-plum">
                                        {grievanceOfficer?.name ??
                                            'Not yet published'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-heading text-xs font-semibold text-tijum-lavender">
                                        Designation
                                    </dt>
                                    <dd className="mt-0.5 font-semibold text-tijum-plum">
                                        {grievanceOfficer?.designation ??
                                            'Not yet published'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-heading text-xs font-semibold text-tijum-lavender">
                                        Official Email
                                    </dt>
                                    <dd className="mt-0.5">
                                        {grievanceOfficer?.email ? (
                                            <a
                                                href={`mailto:${grievanceOfficer.email}`}
                                                className="font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                                            >
                                                {grievanceOfficer.email}
                                            </a>
                                        ) : (
                                            <span className="text-tijum-lavender">
                                                Not yet published
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-heading text-xs font-semibold text-tijum-lavender">
                                        Contact Phone
                                    </dt>
                                    <dd className="mt-0.5 font-semibold text-tijum-plum">
                                        {grievanceOfficer?.phone ??
                                            'Not yet published'}
                                    </dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="font-heading text-xs font-semibold text-tijum-lavender">
                                        Operational Office
                                    </dt>
                                    <dd className="mt-0.5 text-tijum-plum">
                                        {grievanceOfficer?.address ??
                                            'Not yet published'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <aside className="flex flex-col justify-between rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-card sm:p-8 lg:col-span-4">
                            <div className="space-y-3">
                                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-peach/20 text-tijum-peach">
                                    <FileText
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h3 className="font-heading text-xl font-bold text-white">
                                    Have an active reservation?
                                </h3>
                                <p className="text-sm leading-relaxed text-tijum-cream/80">
                                    Submitting issues directly through your
                                    reservation binds exact room-type details,
                                    dates, and payment records automatically.
                                </p>
                            </div>

                            <div className="pt-6">
                                <Button size="lg" className="w-full" asChild>
                                    <Link href={reservationsIndex().url}>
                                        <span>My Reservations</span>
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </div>
                        </aside>
                    </div>

                    {/* Three-tier escalation */}
                    <div className="space-y-6">
                        <SectionHeading
                            eyebrow="Escalation Path"
                            title="Three-tier grievance escalation"
                            description="Most support cases resolve cleanly at Tier 1, with transparent progression when deeper review is needed."
                        />

                        <div className="grid gap-5 sm:grid-cols-3">
                            {escalationTiers.map((tier) => (
                                <article
                                    key={tier.level}
                                    className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card"
                                >
                                    <Badge variant="peach">{tier.level}</Badge>
                                    <h3 className="mt-4 font-heading text-base font-bold text-tijum-plum">
                                        {tier.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-tijum-lavender">
                                        {tier.description}
                                    </p>
                                </article>
                            ))}
                        </div>

                        <div className="flex items-start gap-3 rounded-[20px] border border-tijum-surface bg-white p-5 text-sm text-tijum-lavender shadow-tijum-card">
                            <Mail
                                className="mt-0.5 size-5 shrink-0 text-tijum-plum"
                                aria-hidden="true"
                            />
                            <p>
                                For formal written complaints, email the
                                Grievance Redressal Officer at{' '}
                                {grievanceOfficer?.email ? (
                                    <a
                                        href={`mailto:${grievanceOfficer.email}`}
                                        className="font-heading font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                                    >
                                        {grievanceOfficer.email}
                                    </a>
                                ) : (
                                    'the published grievance address'
                                )}{' '}
                                and include your booking reference number.
                            </p>
                        </div>
                    </div>
                </ResponsiveContainer>
            </section>
        </>
    );
}
