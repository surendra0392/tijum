import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    FileCheck2,
    History,
    ShieldCheck,
} from 'lucide-react';
import {
    applicationStatusBadgeMap,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes/admin';
import {
    index as partnersIndex,
    show as showRoute,
} from '@/routes/admin/partners';
import type { OwnerVerificationStatus, VerificationEventData } from '@/types';

type PartnerVerificationHistoryProps = {
    application: {
        id: number;
        application_number: string;
        status: OwnerVerificationStatus;
        status_label: string;
        revision_number: number;
        owner_name: string;
        owner_email: string;
        business_name: string;
    };
    events: VerificationEventData[];
};

export default function PartnerVerificationHistory({
    application,
    events,
}: PartnerVerificationHistoryProps) {
    return (
        <>
            <Head title={`${application.application_number} · Audit History`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Append-Only Audit Trail"
                    title={`${application.business_name} · Verification History`}
                    description={`Application ${application.application_number} (Rev #${application.revision_number}) · Owner: ${application.owner_name}`}
                    badges={
                        <>
                            <Badge variant="outline" className="tabular-nums">
                                {application.application_number}
                            </Badge>
                            <StatusBadge
                                status={
                                    applicationStatusBadgeMap[
                                        application.status
                                    ] ?? 'neutral'
                                }
                                label={application.status_label}
                            />
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={partnersIndex.url()}>
                                    <span>Queue</span>
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={showRoute.url(application.id)}>
                                    <ArrowLeft aria-hidden="true" />
                                    <span>Back to Application Review</span>
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <section
                    aria-label="Partner audit summary"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Audit Events"
                        value={events.length}
                        helperText="Immutable chronological entries"
                        icon={History}
                    />
                    <StatCard
                        label="Active Revision"
                        value={`Rev #${application.revision_number}`}
                        helperText={application.application_number}
                        icon={FileCheck2}
                    />
                    <StatCard
                        label="Current Status"
                        value={application.status_label}
                        helperText={application.owner_email}
                        icon={ShieldCheck}
                    />
                </section>

                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                <History
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-1">
                                <CardTitle className="text-lg">
                                    Chronological Verification Events
                                </CardTitle>
                                <CardDescription>
                                    Immutable record of submissions, status
                                    changes, assignments, decisions, and
                                    document accesses
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {events.length === 0 ? (
                            <EmptyState
                                icon={History}
                                title="No verification events recorded yet"
                                description="Submissions, reviewer assignments, document accesses, and status decisions will appear here in chronological order."
                                className="shadow-none"
                            />
                        ) : (
                            <ol className="relative space-y-4 before:absolute before:top-4 before:bottom-4 before:left-4 before:w-px before:bg-tijum-surface/80 dark:before:bg-border">
                                {events.map((event) => (
                                    <li
                                        key={event.id}
                                        className="relative pl-11"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="absolute top-4 left-1.5 flex size-5 items-center justify-center rounded-full border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/40 dark:bg-tijum-coral/20 dark:text-tijum-coral"
                                        >
                                            <span className="size-2 rounded-full bg-tijum-coral" />
                                        </span>

                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm dark:border-border dark:bg-muted/45">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                    {event.event_label}
                                                </p>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-surface/80 bg-card px-2.5 py-0.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-card dark:text-muted-foreground">
                                                    <Clock
                                                        className="size-3.5 text-tijum-coral"
                                                        aria-hidden="true"
                                                    />
                                                    {formatIsoDateTime(
                                                        event.created_at,
                                                    )}
                                                </span>
                                            </div>

                                            {event.notes && (
                                                <p className="mt-2 rounded-lg border border-tijum-surface/70 bg-card px-3 py-2 text-xs leading-relaxed text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                    {event.notes}
                                                </p>
                                            )}

                                            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                <span className="rounded-md border border-tijum-surface/80 bg-card px-2 py-0.5 font-medium text-tijum-plum tabular-nums dark:border-border dark:bg-card dark:text-foreground">
                                                    Actor:{' '}
                                                    {event.actor_name ??
                                                        'System'}{' '}
                                                    ({event.actor_type}
                                                    {event.actor_id
                                                        ? ` #${event.actor_id}`
                                                        : ''}
                                                    )
                                                </span>
                                                {(event.previous_status ||
                                                    event.new_status) && (
                                                    <span className="inline-flex items-center gap-1 rounded-md border border-tijum-surface/80 bg-card px-2 py-0.5 font-medium text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                        <span>
                                                            Transition:{' '}
                                                            {event.previous_status ??
                                                                'none'}
                                                        </span>
                                                        <ArrowRight
                                                            className="size-3 text-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {event.new_status ??
                                                                'none'}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PartnerVerificationHistory.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard() },
        { title: 'Partner Verification', href: partnersIndex() },
        { title: 'Audit History', href: partnersIndex() },
    ],
};
