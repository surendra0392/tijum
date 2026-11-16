import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CheckCircle2,
    Clock,
    FileText,
    History,
    Info,
    Lock,
    Send,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { formatIsoDateTime } from '@/components/owner/onboarding/status-helpers';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import amenitiesRoutes from '@/routes/admin/amenities';
import type {
    AdminAmenityQueueRow,
    AmenityAssignmentEventData,
    AmenityAssignmentSummary,
} from '@/types';

type Props = {
    assignment: AmenityAssignmentSummary &
        AdminAmenityQueueRow & {
            internal_reviewer_notes?: string | null;
            approved_snapshot?: Record<string, unknown> | null;
        };
    events: AmenityAssignmentEventData[];
    reviewers: { id: number; name: string }[];
    permissions: {
        can_assign: boolean;
        can_start_review: boolean;
        can_request_information: boolean;
        can_approve: boolean;
        can_reject: boolean;
    };
};

function statusToSemantic(status: string): SemanticStatus {
    if (status === 'approved') return 'verified';
    if (status === 'submitted' || status === 'under_review')
        return 'processing';
    if (status === 'needs_information') return 'pending';
    if (status === 'rejected') return 'rejected';
    if (status === 'inactive') return 'cancelled';
    return 'neutral';
}

export default function AdminAmenityShowRoomType({
    assignment,
    events,
    reviewers,
    permissions,
}: Props) {
    const assignForm = useForm({ assigned_admin_id: '' });
    const requestForm = useForm({
        requested_information: '',
        internal_reviewer_notes: '',
    });
    const approveForm = useForm({
        decision_reason: '',
        internal_reviewer_notes: '',
    });
    const rejectForm = useForm({
        decision_reason: '',
        internal_reviewer_notes: '',
    });

    const postForm = (
        url: string,
        form: {
            post: (url: string, options?: { preserveScroll?: boolean }) => void;
        },
        e?: FormEvent,
    ) => {
        e?.preventDefault();
        form.post(url, { preserveScroll: true });
    };

    return (
        <>
            <Head
                title={`Review Amenity · ${assignment.amenity_name ?? assignment.assignment_reference}`}
            />
            <div className="space-y-6">
                <PageHeader
                    eyebrow={`${assignment.assignment_reference} · Room-Type Amenity Review`}
                    title={assignment.amenity_name ?? 'Amenity assignment'}
                    description={`${assignment.property_name ?? 'Property'} · Room type: ${assignment.room_type_name ?? assignment.property_room_type_id ?? '—'}`}
                    badges={
                        <>
                            <StatusBadge
                                status={statusToSemantic(assignment.status)}
                                label={assignment.status_label}
                            />
                            <Badge variant="outline">
                                {assignment.availability_label}
                            </Badge>
                            {assignment.assigned_reviewer_name && (
                                <Badge variant="secondary">
                                    Reviewer:{' '}
                                    {assignment.assigned_reviewer_name}
                                </Badge>
                            )}
                        </>
                    }
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={amenitiesRoutes.index.url()}>
                                <ArrowLeft aria-hidden="true" />
                                <span>Back to queue</span>
                            </Link>
                        </Button>
                    }
                />

                {assignment.requested_information && (
                    <Card
                        role="status"
                        className="border-l-4 border-l-amber-500 py-4 dark:border-l-amber-400"
                    >
                        <CardContent className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
                                <Info className="size-4.5" aria-hidden="true" />
                            </span>
                            <div className="space-y-0.5">
                                <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    Requested information
                                </p>
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    {assignment.requested_information}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="min-w-0 space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <BedDouble
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">
                                            Assignment details
                                        </CardTitle>
                                        <CardDescription>
                                            Room-type amenity submission
                                            metadata and partner notes
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid gap-3 text-sm md:grid-cols-2">
                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Property
                                        </dt>
                                        <dd className="mt-0.5 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                            {assignment.property_name} (
                                            {assignment.property_reference})
                                        </dd>
                                    </div>
                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Partner
                                        </dt>
                                        <dd className="mt-0.5 font-medium break-all text-tijum-plum dark:text-foreground">
                                            {assignment.owner_name} ·{' '}
                                            {assignment.owner_email}
                                        </dd>
                                    </div>
                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Room Type
                                        </dt>
                                        <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                            {assignment.room_type_name ??
                                                assignment.property_room_type_id ??
                                                '—'}
                                        </dd>
                                    </div>
                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Category &amp; Revision
                                        </dt>
                                        <dd className="mt-0.5 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                            {assignment.category_name ?? '—'} ·
                                            #{assignment.revision_number}{' '}
                                            {assignment.is_current
                                                ? '(current)'
                                                : ''}
                                        </dd>
                                    </div>
                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 md:col-span-2 dark:border-border dark:bg-muted/45">
                                        <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Details
                                        </dt>
                                        <dd className="mt-1 leading-relaxed whitespace-pre-line text-tijum-plum dark:text-foreground">
                                            {assignment.details || '—'}
                                        </dd>
                                    </div>
                                    {assignment.decision_reason && (
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 md:col-span-2 dark:border-border dark:bg-muted/45">
                                            <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Decision reason
                                            </dt>
                                            <dd className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                {assignment.decision_reason}
                                            </dd>
                                        </div>
                                    )}
                                    {assignment.internal_reviewer_notes && (
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 md:col-span-2 dark:border-border dark:bg-muted/45">
                                            <dt className="flex items-center gap-1.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                <Lock
                                                    className="size-3"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Internal reviewer notes
                                                </span>
                                            </dt>
                                            <dd className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                {
                                                    assignment.internal_reviewer_notes
                                                }
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <FileText
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">
                                            Event history
                                        </CardTitle>
                                        <CardDescription>
                                            Append-only verification timeline.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {events.length === 0 ? (
                                    <EmptyState
                                        icon={History}
                                        title="No events yet"
                                        description="Verification lifecycle events and reviewer decisions will appear here."
                                        className="bg-tijum-cream/25 py-8 shadow-none dark:bg-muted/30"
                                    />
                                ) : (
                                    events.map((event) => (
                                        <div
                                            key={event.id}
                                            className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-sm dark:border-border dark:bg-muted/45"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                    {event.event_type_label}
                                                </p>
                                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {formatIsoDateTime(
                                                        event.created_at,
                                                    )}
                                                </p>
                                            </div>
                                            <p className="mt-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {event.actor_name ??
                                                    event.actor_type}
                                                {event.previous_status ||
                                                event.new_status ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <span>
                                                            {' '}
                                                            ·{' '}
                                                            {event.previous_status ??
                                                                '—'}
                                                        </span>
                                                        <ArrowRight
                                                            className="size-3 text-tijum-plum-muted dark:text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {event.new_status ??
                                                                '—'}
                                                        </span>
                                                    </span>
                                                ) : null}
                                            </p>
                                            {event.notes && (
                                                <p className="mt-1.5 text-tijum-plum dark:text-foreground">
                                                    {event.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <aside className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <ShieldCheck
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">
                                            Review actions
                                        </CardTitle>
                                        <CardDescription>
                                            Role-based amenity verification
                                            workflow.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {permissions.can_assign && (
                                    <form
                                        onSubmit={(e) =>
                                            postForm(
                                                amenitiesRoutes.roomType.assign.url(
                                                    assignment.id,
                                                ),
                                                assignForm,
                                                e,
                                            )
                                        }
                                        className="space-y-2.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45"
                                    >
                                        <Label
                                            htmlFor="assign"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Assign reviewer
                                        </Label>
                                        <Select
                                            value={
                                                assignForm.data
                                                    .assigned_admin_id
                                            }
                                            onValueChange={(v) =>
                                                assignForm.setData(
                                                    'assigned_admin_id',
                                                    v,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="assign"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select reviewer" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {reviewers.map((r) => (
                                                    <SelectItem
                                                        key={r.id}
                                                        value={String(r.id)}
                                                    >
                                                        {r.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            disabled={assignForm.processing}
                                            loading={assignForm.processing}
                                        >
                                            Assign
                                        </Button>
                                    </form>
                                )}

                                {permissions.can_start_review && (
                                    <Button
                                        variant="plum"
                                        className="w-full"
                                        onClick={() =>
                                            router.post(
                                                amenitiesRoutes.roomType.startReview.url(
                                                    assignment.id,
                                                ),
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <Clock aria-hidden="true" />
                                        <span>Start review</span>
                                    </Button>
                                )}

                                {permissions.can_request_information && (
                                    <form
                                        onSubmit={(e) =>
                                            postForm(
                                                amenitiesRoutes.roomType.requestInformation.url(
                                                    assignment.id,
                                                ),
                                                requestForm,
                                                e,
                                            )
                                        }
                                        className="space-y-2.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45"
                                    >
                                        <Label
                                            htmlFor="req-info"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Request information
                                        </Label>
                                        <Textarea
                                            id="req-info"
                                            value={
                                                requestForm.data
                                                    .requested_information
                                            }
                                            onChange={(e) =>
                                                requestForm.setData(
                                                    'requested_information',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Explain required corrections"
                                        />
                                        {requestForm.errors
                                            .requested_information && (
                                            <p className="text-xs text-status-error-fg">
                                                {
                                                    requestForm.errors
                                                        .requested_information
                                                }
                                            </p>
                                        )}
                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant="outline"
                                            className="w-full"
                                            disabled={requestForm.processing}
                                            loading={requestForm.processing}
                                        >
                                            <Send aria-hidden="true" />
                                            <span>Request info</span>
                                        </Button>
                                    </form>
                                )}

                                {permissions.can_approve && (
                                    <form
                                        onSubmit={(e) =>
                                            postForm(
                                                amenitiesRoutes.roomType.approve.url(
                                                    assignment.id,
                                                ),
                                                approveForm,
                                                e,
                                            )
                                        }
                                        className="space-y-2.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45"
                                    >
                                        <Label
                                            htmlFor="approve-reason"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Approve (optional note)
                                        </Label>
                                        <Textarea
                                            id="approve-reason"
                                            value={
                                                approveForm.data.decision_reason
                                            }
                                            onChange={(e) =>
                                                approveForm.setData(
                                                    'decision_reason',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant="plum"
                                            className="w-full"
                                            disabled={approveForm.processing}
                                            loading={approveForm.processing}
                                        >
                                            <CheckCircle2 aria-hidden="true" />
                                            <span>Approve</span>
                                        </Button>
                                    </form>
                                )}

                                {permissions.can_reject && (
                                    <form
                                        onSubmit={(e) =>
                                            postForm(
                                                amenitiesRoutes.roomType.reject.url(
                                                    assignment.id,
                                                ),
                                                rejectForm,
                                                e,
                                            )
                                        }
                                        className="space-y-2.5 rounded-xl border border-l-4 border-tijum-surface/80 border-l-destructive bg-tijum-cream/40 p-3.5 dark:border-border dark:border-l-destructive dark:bg-muted/45"
                                    >
                                        <Label
                                            htmlFor="reject-reason"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Reject (reason required)
                                        </Label>
                                        <Textarea
                                            id="reject-reason"
                                            value={
                                                rejectForm.data.decision_reason
                                            }
                                            onChange={(e) =>
                                                rejectForm.setData(
                                                    'decision_reason',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        {rejectForm.errors.decision_reason && (
                                            <p className="text-xs text-status-error-fg">
                                                {
                                                    rejectForm.errors
                                                        .decision_reason
                                                }
                                            </p>
                                        )}
                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant="destructive"
                                            className="w-full"
                                            disabled={rejectForm.processing}
                                            loading={rejectForm.processing}
                                        >
                                            <XCircle aria-hidden="true" />
                                            <span>Reject</span>
                                        </Button>
                                    </form>
                                )}

                                {!permissions.can_assign &&
                                    !permissions.can_start_review &&
                                    !permissions.can_request_information &&
                                    !permissions.can_approve &&
                                    !permissions.can_reject && (
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                            Read-only access for your role.
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}
