import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Camera,
    CheckCircle2,
    DoorClosed,
    Edit3,
    FileCheck2,
    History,
    Layers,
    MapPin,
    PauseCircle,
    PlayCircle,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { formatIsoDateTime } from '@/components/owner/onboarding/status-helpers';
import {
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
    roomOperationalStatusMap,
} from '@/components/owner/properties/property-status-helpers';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { InfoPanel, StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes/owner';
import {
    edit as editPropertyRoute,
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import {
    cancel as cancelAmendmentRoute,
    start as startAmendmentRoute,
} from '@/routes/owner/properties/amendment';
import { index as mediaIndexRoute } from '@/routes/owner/properties/media';
import { update as operationalStatusRoute } from '@/routes/owner/properties/operational-status';
import { index as roomTypesIndexRoute } from '@/routes/owner/properties/room-types';
import { index as roomsIndexRoute } from '@/routes/owner/properties/rooms';
import { show as verificationShowRoute } from '@/routes/owner/properties/verification';
import { formatStayTime } from '@/lib/stay-timing';
import type {
    PropertyFieldsSnapshot,
    PropertyMediaData,
    PropertyOperationalStatus,
    PropertyRoomData,
    PropertyRoomTypeData,
    PropertySummaryData,
    PropertyVerificationApplicationData,
    PropertyVerificationEvaluation,
    TimingRules,
    VerificationEventData,
} from '@/types';

type OwnerPropertyShowProps = {
    property: PropertySummaryData & {
        details: PropertyFieldsSnapshot;
        approved_details: PropertyFieldsSnapshot;
        approved_snapshot: Record<string, unknown> | null;
        suspended_reason: string | null;
        can_edit_details: boolean;
        can_manage_inventory: boolean;
    };
    roomTypes: PropertyRoomTypeData[];
    rooms: PropertyRoomData[];
    roomSummary: {
        total_rooms: number;
        active_rooms: number;
        maintenance_rooms: number;
        blocked_rooms: number;
        inactive_rooms: number;
        nominal_active_capacity: number;
    };
    media: PropertyMediaData[];
    application: PropertyVerificationApplicationData | null;
    evaluation: PropertyVerificationEvaluation;
    events: VerificationEventData[];
    timingRules: TimingRules;
};

export default function OwnerPropertyShow({
    property,
    roomTypes,
    rooms,
    roomSummary,
    media,
    application,
    evaluation,
    events,
    timingRules,
}: OwnerPropertyShowProps) {
    const [pendingOpStatus, setPendingOpStatus] =
        useState<PropertyOperationalStatus | null>(null);
    const [confirmAmendmentStart, setConfirmAmendmentStart] = useState(false);
    const [confirmAmendmentCancel, setConfirmAmendmentCancel] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleOperationalStatusConfirm = () => {
        if (!pendingOpStatus) {
            return;
        }

        setBusy(true);
        router.patch(
            operationalStatusRoute.url(property.id),
            { status: pendingOpStatus },
            {
                onFinish: () => {
                    setBusy(false);
                    setPendingOpStatus(null);
                },
            },
        );
    };

    const handleStartAmendment = () => {
        setBusy(true);
        router.post(
            startAmendmentRoute.url(property.id),
            {},
            {
                onFinish: () => {
                    setBusy(false);
                    setConfirmAmendmentStart(false);
                },
            },
        );
    };

    const handleCancelAmendment = () => {
        setBusy(true);
        router.post(
            cancelAmendmentRoute.url(property.id),
            {},
            {
                onFinish: () => {
                    setBusy(false);
                    setConfirmAmendmentCancel(false);
                },
            },
        );
    };

    return (
        <>
            <Head title={`${property.name} · Property Overview`} />

            <div className="min-w-0 space-y-6">
                <PageHeader
                    eyebrow={`${property.category?.name ?? 'Property'} · ${property.property_reference}`}
                    title={property.name}
                    description={`${property.details.address_line_1}, ${property.locality}, ${property.city?.name ?? ''} (${property.state})`}
                    badges={
                        <>
                            <StatusBadge
                                status={
                                    propertyVerificationStatusMap[
                                        property.verification_status
                                    ]
                                }
                                label={property.verification_status_label}
                            />
                            <StatusBadge
                                status={
                                    propertyOperationalStatusMap[
                                        property.status
                                    ]
                                }
                                label={property.status_label}
                            />
                            {property.is_amendment_active && (
                                <Badge variant="default">
                                    Amendment Rev #
                                    {application?.revision_number}
                                </Badge>
                            )}
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            {property.can_toggle_operational_status && (
                                <>
                                    {property.status === 'active' ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setPendingOpStatus(
                                                    'temporarily_closed',
                                                )
                                            }
                                            data-test="pause-property-button"
                                        >
                                            <PauseCircle aria-hidden="true" />
                                            <span>Temporarily Close</span>
                                        </Button>
                                    ) : property.status ===
                                      'temporarily_closed' ? (
                                        <Button
                                            type="button"
                                            variant="plum"
                                            onClick={() =>
                                                setPendingOpStatus('active')
                                            }
                                            data-test="reopen-property-button"
                                        >
                                            <PlayCircle aria-hidden="true" />
                                            <span>Reopen Active</span>
                                        </Button>
                                    ) : null}
                                </>
                            )}

                            {property.can_start_amendment && (
                                <Button
                                    type="button"
                                    variant="plum"
                                    onClick={() =>
                                        setConfirmAmendmentStart(true)
                                    }
                                    data-test="start-amendment-btn"
                                >
                                    <RefreshCw aria-hidden="true" />
                                    <span>Start Re-Verification Amendment</span>
                                </Button>
                            )}

                            {application?.can_cancel_amendment && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        setConfirmAmendmentCancel(true)
                                    }
                                >
                                    Cancel Amendment
                                </Button>
                            )}

                            <Button asChild>
                                <Link href={verificationShowRoute(property.id)}>
                                    <FileCheck2 aria-hidden="true" />
                                    <span>Verification &amp; Submit</span>
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="overview"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                {property.status === 'suspended' && (
                    <Alert variant="destructive">
                        <AlertTitle>Property Suspended</AlertTitle>
                        <AlertDescription>
                            {property.suspended_reason ??
                                'Property operations have been suspended by TIJUM administration.'}
                        </AlertDescription>
                    </Alert>
                )}

                {property.is_verified && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>
                            Independent Property Verification Approved
                        </AlertTitle>
                        <AlertDescription>
                            This property is independently verified and ready
                            for customer bookings, food-inclusive rate management,
                            and daily front desk operations.{' '}
                            {!property.booking_eligible &&
                                property.is_amendment_active &&
                                'Customer booking eligibility is currently paused while your amendment revision is active.'}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Configured Room Types"
                        value={String(roomTypes.length)}
                        helperText="AC / Non-AC & sharing modes"
                        icon={Layers}
                    />
                    <StatCard
                        label="Physical Rooms"
                        value={String(roomSummary.total_rooms)}
                        helperText={`${roomSummary.active_rooms} active · ${roomSummary.maintenance_rooms} maintenance · ${roomSummary.blocked_rooms} blocked`}
                        icon={DoorClosed}
                    />
                    <StatCard
                        label="Nominal Active Capacity"
                        value={`${roomSummary.nominal_active_capacity} places`}
                        helperText="Derived dynamically from active physical rooms"
                        icon={Building2}
                    />
                    <StatCard
                        label="Uploaded Photos"
                        value={String(media.length)}
                        helperText={`Property photos: ${evaluation.property_photos_count}/${evaluation.min_property_photos} min`}
                        icon={Camera}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <InfoPanel
                        title="Property Overview & Location"
                        description="Verified category, launch city, contact details, and physical street coordinates."
                        action={
                            <div className="border-t border-tijum-surface pt-3 dark:border-border">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={editPropertyRoute(property.id)}>
                                        <Edit3 aria-hidden="true" />
                                        <span>
                                            {property.can_edit_details
                                                ? 'Edit Overview & Location'
                                                : 'View Locked Details'}
                                        </span>
                                    </Link>
                                </Button>
                            </div>
                        }
                    >
                        <dl className="space-y-2 text-sm">
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Category
                                </dt>
                                <dd className="min-w-0 font-semibold wrap-anywhere text-tijum-plum dark:text-foreground">
                                    {property.category?.name}
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Launch City
                                </dt>
                                <dd className="inline-flex min-w-0 items-center gap-1 font-semibold wrap-anywhere text-tijum-plum dark:text-foreground">
                                    <MapPin
                                        className="size-3.5 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {property.city?.name}, {property.state}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Contact
                                </dt>
                                <dd className="min-w-0 font-semibold wrap-anywhere text-tijum-plum dark:text-foreground">
                                    {property.details.contact_person_name} ·{' '}
                                    {property.details.contact_phone}
                                </dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Check-in / Checkout
                                </dt>
                                <dd className="min-w-0 font-semibold wrap-anywhere text-tijum-plum dark:text-foreground">
                                    {formatStayTime(
                                        timingRules.standard_check_in_time,
                                    )}{' '}
                                    /{' '}
                                    {formatStayTime(
                                        timingRules.standard_check_out_time,
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </InfoPanel>

                    <InfoPanel
                        title="Submission Readiness"
                        description="All requirements below are verified on the backend before review submission."
                        action={
                            <div className="border-t border-tijum-surface pt-3 dark:border-border">
                                <Button size="sm" asChild>
                                    <Link
                                        href={verificationShowRoute(
                                            property.id,
                                        )}
                                    >
                                        Open Verification Console
                                    </Link>
                                </Button>
                            </div>
                        }
                    >
                        {evaluation.missing_requirements.length === 0 ? (
                            <div className="flex items-start gap-2.5 text-sm text-status-success-fg">
                                <CheckCircle2
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    All minimum property, room type, physical
                                    room, photograph, and document checks pass
                                    for review submission.
                                </span>
                            </div>
                        ) : (
                            <ul className="list-disc space-y-1.5 pl-4 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                {evaluation.missing_requirements.map((req) => (
                                    <li key={req}>{req}</li>
                                ))}
                            </ul>
                        )}
                    </InfoPanel>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="min-w-0">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle>Room Types</CardTitle>
                                <CardDescription>
                                    Customer-facing AC / Non-AC occupancy
                                    categories
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={roomTypesIndexRoute(property.id)}>
                                    Manage
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            {roomTypes.length === 0 ? (
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    No room types configured yet.
                                </p>
                            ) : (
                                roomTypes.map((rt) => (
                                    <div
                                        key={rt.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface px-3.5 py-2.5 text-sm dark:border-border dark:bg-muted/35"
                                    >
                                        <div>
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {rt.name}
                                            </p>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {rt.max_guests_per_room}{' '}
                                                guest(s) ·{' '}
                                                {rt.is_air_conditioned
                                                    ? 'AC'
                                                    : 'Non-AC'}{' '}
                                                · {rt.gender_policy_label}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Badge variant="outline">
                                                {rt.active_rooms_count}/
                                                {rt.rooms_count} rooms
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="min-w-0">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle>Physical Rooms</CardTitle>
                                <CardDescription>
                                    Operational room numbers linked to room
                                    types
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={roomsIndexRoute(property.id)}>
                                    Manage Rooms
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            {rooms.length === 0 ? (
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    No physical room numbers recorded yet.
                                </p>
                            ) : (
                                rooms.slice(0, 6).map((room) => (
                                    <div
                                        key={room.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface px-3.5 py-2.5 text-sm dark:border-border dark:bg-muted/35"
                                    >
                                        <div>
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                Room {room.room_number}
                                            </p>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {room.room_type_name} ·{' '}
                                                {room.floor_number
                                                    ? `Floor ${room.floor_number}`
                                                    : 'No floor specified'}
                                            </p>
                                        </div>
                                        <StatusBadge
                                            status={
                                                roomOperationalStatusMap[
                                                    room.operational_status
                                                ]
                                            }
                                            label={
                                                room.operational_status_label
                                            }
                                        />
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="min-w-0">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Property Change &amp; Audit History</span>
                            </CardTitle>
                            <CardDescription>
                                Append-only event timeline across edits, room
                                updates, photos, amendments, and reviews.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={mediaIndexRoute(property.id)}>
                                Manage Gallery
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {events.length === 0 ? (
                            <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                No activity logged yet.
                            </p>
                        ) : (
                            <ol className="space-y-2.5">
                                {events.slice(0, 12).map((evt) => (
                                    <li
                                        key={evt.id}
                                        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-tijum-surface bg-tijum-cream/25 px-3.5 py-2.5 text-xs dark:border-border dark:bg-muted/35"
                                    >
                                        <div className="space-y-0.5">
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {evt.event_label}
                                            </p>
                                            {evt.notes && (
                                                <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    {evt.notes}
                                                </p>
                                            )}
                                        </div>
                                        <span className="shrink-0 text-tijum-plum-muted dark:text-muted-foreground">
                                            {formatIsoDateTime(evt.created_at)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>

                <ConfirmationDialog
                    open={pendingOpStatus !== null}
                    onOpenChange={(open) => !open && setPendingOpStatus(null)}
                    title={
                        pendingOpStatus === 'temporarily_closed'
                            ? 'Temporarily Close Property?'
                            : 'Reopen Property as Active?'
                    }
                    description={
                        pendingOpStatus === 'temporarily_closed'
                            ? 'Pausing operational availability preserves your verification approval and does not cancel property verification.'
                            : 'Restoring Active status re-enables property readiness for booking configuration.'
                    }
                    confirmLabel={
                        pendingOpStatus === 'temporarily_closed'
                            ? 'Temporarily Close'
                            : 'Mark Active'
                    }
                    loading={busy}
                    onConfirm={handleOperationalStatusConfirm}
                />

                <ConfirmationDialog
                    open={confirmAmendmentStart}
                    onOpenChange={setConfirmAmendmentStart}
                    title="Start Re-Verification Amendment?"
                    description="Creates a new draft revision (N+1) from your approved baseline without overwriting previously approved data. Customer booking eligibility pauses until the amendment is approved or cancelled."
                    confirmLabel="Start Amendment"
                    loading={busy}
                    onConfirm={handleStartAmendment}
                />

                <ConfirmationDialog
                    open={confirmAmendmentCancel}
                    onOpenChange={setConfirmAmendmentCancel}
                    tone="destructive"
                    title="Cancel Draft Amendment?"
                    description="Discards unsubmitted revision edits and restores your approved snapshot and booking eligibility cleanly."
                    confirmLabel="Discard Amendment"
                    loading={busy}
                    onConfirm={handleCancelAmendment}
                />
            </div>
        </>
    );
}

OwnerPropertyShow.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
    ],
};
