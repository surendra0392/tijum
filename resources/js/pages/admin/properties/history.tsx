import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CheckCircle2,
    Clock,
    FileCheck2,
    History,
    ShieldCheck,
} from 'lucide-react';
import { formatIsoDateTime } from '@/components/owner/onboarding/status-helpers';
import {
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
} from '@/components/owner/properties/property-status-helpers';
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
    index as propertiesIndex,
    show as showRoute,
} from '@/routes/admin/properties';
import type {
    AdminPropertyQueueRow,
    PropertyVerificationApplicationData,
    VerificationEventData,
} from '@/types';

type AdminPropertyHistoryProps = {
    property: AdminPropertyQueueRow;
    applications: PropertyVerificationApplicationData[];
    events: VerificationEventData[];
};

export default function AdminPropertyHistory({
    property,
    applications,
    events,
}: AdminPropertyHistoryProps) {
    return (
        <>
            <Head title={`${property.property_reference} · Audit History`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Append-Only Property Audit Trail"
                    title={`${property.name} · Verification History`}
                    description={`${property.property_reference} · ${property.category_name} · ${property.locality}, ${property.city_name} · Partner: ${property.owner_name}`}
                    badges={
                        <>
                            <Badge variant="outline" className="tabular-nums">
                                {property.property_reference}
                            </Badge>
                            <StatusBadge
                                status={
                                    propertyVerificationStatusMap[
                                        property.verification_status
                                    ] ?? 'neutral'
                                }
                                label={property.verification_status_label}
                            />
                            <StatusBadge
                                status={
                                    propertyOperationalStatusMap[
                                        property.operational_status
                                    ] ?? 'neutral'
                                }
                                label={property.operational_status_label}
                            />
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={propertiesIndex.url()}>
                                    <span>Queue</span>
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={showRoute.url(property.id)}>
                                    <ArrowLeft aria-hidden="true" />
                                    <span>Back to Property Review</span>
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <section
                    aria-label="Property verification audit summary"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        label="Verification Revisions"
                        value={applications.length}
                        helperText={`Latest Rev #${property.revision_number}`}
                        icon={FileCheck2}
                    />
                    <StatCard
                        label="Audit Events"
                        value={events.length}
                        helperText="Append-only entries"
                        icon={History}
                    />
                    <StatCard
                        label="Verification Status"
                        value={property.verification_status_label}
                        helperText={
                            property.assigned_reviewer_name
                                ? `Reviewer: ${property.assigned_reviewer_name}`
                                : 'Unassigned'
                        }
                        icon={ShieldCheck}
                    />
                    <StatCard
                        label="Operational State"
                        value={property.operational_status_label}
                        helperText={
                            property.booking_eligible
                                ? 'Booking Eligible'
                                : 'Not Bookable'
                        }
                        icon={Building2}
                    />
                </section>

                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                <FileCheck2
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-1">
                                <CardTitle className="text-lg">
                                    Verification Revisions
                                </CardTitle>
                                <CardDescription>
                                    Initial verification and post-approval
                                    amendment submissions recorded for this
                                    property
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {applications.length === 0 ? (
                            <EmptyState
                                icon={FileCheck2}
                                title="No verification applications recorded yet"
                                description="Initial property verification and post-approval amendment submissions will appear here."
                                className="shadow-none"
                            />
                        ) : (
                            <div className="space-y-3">
                                {applications.map((app) => (
                                    <div
                                        key={app.id}
                                        className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm dark:border-border dark:bg-muted/45"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                    {app.application_number} ·
                                                    Revision #
                                                    {app.revision_number}
                                                </span>
                                                <Badge variant="outline">
                                                    {app.is_amendment
                                                        ? 'Amendment'
                                                        : 'Initial Verification'}
                                                </Badge>
                                            </div>
                                            <StatusBadge
                                                status={
                                                    propertyVerificationStatusMap[
                                                        app.status
                                                    ] ?? 'neutral'
                                                }
                                                label={app.status_label}
                                            />
                                        </div>

                                        <div className="mt-3 grid gap-2 text-xs text-tijum-plum-muted sm:grid-cols-2 lg:grid-cols-4 dark:text-muted-foreground">
                                            <span>
                                                Arrangement:{' '}
                                                <strong className="font-medium text-tijum-plum dark:text-foreground">
                                                    {
                                                        app.ownership_arrangement_label
                                                    }
                                                </strong>
                                            </span>
                                            <span className="tabular-nums">
                                                Submitted:{' '}
                                                <strong className="font-medium text-tijum-plum dark:text-foreground">
                                                    {formatIsoDateTime(
                                                        app.submitted_at,
                                                    )}
                                                </strong>
                                            </span>
                                            <span>
                                                Reviewer:{' '}
                                                <strong className="font-medium text-tijum-plum dark:text-foreground">
                                                    {app.assigned_reviewer_name ??
                                                        'Unassigned'}
                                                </strong>
                                            </span>
                                            <span className="tabular-nums">
                                                Decided by:{' '}
                                                <strong className="font-medium text-tijum-plum dark:text-foreground">
                                                    {app.reviewed_by_name ??
                                                        '—'}
                                                </strong>{' '}
                                                (
                                                {formatIsoDateTime(
                                                    app.reviewed_at,
                                                )}
                                                )
                                            </span>
                                        </div>

                                        {app.requested_information && (
                                            <p className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-3.5 py-2.5 text-xs leading-relaxed text-status-warning-fg">
                                                <strong className="font-heading font-semibold">
                                                    Requested Info:
                                                </strong>{' '}
                                                {app.requested_information}
                                            </p>
                                        )}

                                        {app.decision_reason && (
                                            <p className="mt-2.5 rounded-lg border border-tijum-surface/80 bg-card px-3.5 py-2.5 text-xs leading-relaxed text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                <strong className="font-heading font-semibold">
                                                    Decision Note:
                                                </strong>{' '}
                                                {app.decision_reason}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                                    Immutable record of property creation,
                                    submissions, photo moderation, document
                                    access, decisions, and operational status
                                    changes
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {events.length === 0 ? (
                            <EmptyState
                                icon={History}
                                title="No verification events recorded yet"
                                description="Property submissions, photo moderation actions, document accesses, and status changes will appear chronologically."
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
                                            <CheckCircle2 className="size-3" />
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

AdminPropertyHistory.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard() },
        { title: 'Property Verification', href: propertiesIndex() },
        { title: 'Audit History', href: propertiesIndex() },
    ],
};
