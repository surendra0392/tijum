import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    ArrowRight,
    Building2,
    Camera,
    CheckCircle2,
    ChevronDown,
    Clock,
    DoorClosed,
    Edit3,
    FileCheck2,
    History,
    Layers,
    MapPin,
    PauseCircle,
    Phone,
    PlayCircle,
    PlusCircle,
    PowerOff,
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
import { StatCard } from '@/components/shared/info-card';
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
import { formatStayTime } from '@/lib/stay-timing';
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
import {
    create as createRoomTypeRoute,
    index as roomTypesIndexRoute,
} from '@/routes/owner/properties/room-types';
import {
    create as createRoomRoute,
    index as roomsIndexRoute,
} from '@/routes/owner/properties/rooms';
import { show as verificationShowRoute } from '@/routes/owner/properties/verification';
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
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const statusError = errors?.status;

    const [pendingOpStatus, setPendingOpStatus] =
        useState<PropertyOperationalStatus | null>(null);
    const [confirmAmendmentStart, setConfirmAmendmentStart] = useState(false);
    const [confirmAmendmentCancel, setConfirmAmendmentCancel] = useState(false);
    const [busy, setBusy] = useState(false);

    const coverSrc =
        property.cover_media?.public_optimized_url ??
        property.cover_media?.public_thumbnail_url ??
        property.cover_media?.thumbnail_preview_url ??
        media[0]?.public_thumbnail_url ??
        media[0]?.thumbnail_preview_url ??
        null;

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

    const showSubmitAction =
        !property.is_verified || property.is_amendment_active;

    return (
        <>
            <Head title={`${property.name} · Property Overview`} />

            <div className="min-w-0 space-y-6">
                <section className="overflow-hidden rounded-2xl border border-tijum-surface/90 bg-white shadow-xs dark:border-border dark:bg-card">
                    <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center">
                        <Link
                            href={mediaIndexRoute(property.id)}
                            className="group relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-tijum-cream md:h-28 md:w-44 lg:h-32 lg:w-52 dark:bg-muted"
                        >
                            {coverSrc ? (
                                <img
                                    src={coverSrc}
                                    alt={
                                        property.cover_media?.alt_text ??
                                        property.name
                                    }
                                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex size-full flex-col items-center justify-center gap-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                    <Camera
                                        className="size-6 opacity-70"
                                        aria-hidden="true"
                                    />
                                    <span className="text-xs font-medium">
                                        Add cover photo
                                    </span>
                                </div>
                            )}
                            <div
                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
                                aria-hidden="true"
                            />
                            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                                <Camera
                                    className="size-3"
                                    aria-hidden="true"
                                />
                                <span>{media.length}</span>
                            </span>
                        </Link>

                        <div className="min-w-0 flex-1 space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    {property.category?.name ?? 'Property'} ·{' '}
                                    {property.property_reference}
                                </span>
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
                            </div>

                            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-tijum-plum sm:text-3xl dark:text-foreground">
                                {property.name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-tijum-plum-muted sm:text-sm dark:text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin
                                        className="size-3.5 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {property.details.address_line_1},{' '}
                                        {property.locality},{' '}
                                        {property.city?.name ?? ''} (
                                        {property.state})
                                    </span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock
                                        className="size-3.5 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Check-in{' '}
                                        {formatStayTime(
                                            timingRules.standard_check_in_time,
                                        )}{' '}
                                        · Check-out{' '}
                                        {formatStayTime(
                                            timingRules.standard_check_out_time,
                                        )}
                                    </span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone
                                        className="size-3.5 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {property.details.contact_person_name} ·{' '}
                                        {property.details.contact_phone}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-tijum-surface/80 bg-tijum-cream/30 px-5 py-3 sm:px-6 dark:border-border dark:bg-muted/25">
                        <div className="flex flex-wrap items-center gap-2">
                            {showSubmitAction && (
                                <Button size="sm" asChild>
                                    <Link
                                        href={verificationShowRoute(
                                            property.id,
                                        )}
                                    >
                                        <FileCheck2 aria-hidden="true" />
                                        <span>Verification &amp; Submit</span>
                                    </Link>
                                </Button>
                            )}

                            <Button
                                size="sm"
                                variant={
                                    !showSubmitAction &&
                                    property.can_edit_details
                                        ? 'default'
                                        : 'outline'
                                }
                                asChild
                            >
                                <Link href={editPropertyRoute(property.id)}>
                                    <Edit3 aria-hidden="true" />
                                    <span>
                                        {property.can_edit_details
                                            ? 'Edit Property Details'
                                            : 'View Property Details'}
                                    </span>
                                </Link>
                            </Button>

                            {property.can_start_amendment && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="plum"
                                    onClick={() =>
                                        setConfirmAmendmentStart(true)
                                    }
                                    data-test="start-amendment-btn"
                                >
                                    <RefreshCw aria-hidden="true" />
                                    <span>Amend Listing</span>
                                </Button>
                            )}

                            {application?.can_cancel_amendment && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                        setConfirmAmendmentCancel(true)
                                    }
                                >
                                    Cancel Amendment
                                </Button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {property.can_toggle_operational_status && (
                                <>
                                    {property.status === 'active' ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setPendingOpStatus(
                                                    'temporarily_closed',
                                                )
                                            }
                                            data-test="pause-property-button"
                                        >
                                            <PauseCircle aria-hidden="true" />
                                            <span>Pause Bookings</span>
                                        </Button>
                                    ) : property.status ===
                                          'temporarily_closed' ||
                                      property.status === 'archived' ? (
                                        <Button
                                            type="button"
                                            size="sm"
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

                            {property.can_close_completely && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setPendingOpStatus('archived')
                                    }
                                    className="border-rose-200 bg-white text-rose-700 hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-500/40 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white"
                                    data-test="close-property-completely-button"
                                >
                                    <PowerOff aria-hidden="true" />
                                    <span>Close Property</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="overview"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                {statusError && (
                    <Alert variant="destructive">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Unable to Update Property Status</AlertTitle>
                        <AlertDescription>{statusError}</AlertDescription>
                    </Alert>
                )}

                {property.status === 'archived' && (
                    <Alert variant="destructive">
                        <Archive aria-hidden="true" />
                        <AlertTitle>
                            Property Closed Completely (Archived)
                        </AlertTitle>
                        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                This property has been withdrawn from public
                                TIJUM search and new customer bookings. Existing
                                booking history and settlement records remain
                                preserved.
                            </span>
                            {property.has_approved_baseline && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="plum"
                                    onClick={() => setPendingOpStatus('active')}
                                    className="shrink-0"
                                >
                                    <PlayCircle aria-hidden="true" />
                                    <span>Reopen Property as Active</span>
                                </Button>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {property.status === 'suspended' && (
                    <Alert variant="destructive">
                        <AlertTitle>Property Suspended</AlertTitle>
                        <AlertDescription>
                            {property.suspended_reason ??
                                'Property operations have been suspended by TIJUM administration.'}
                        </AlertDescription>
                    </Alert>
                )}

                {property.is_verified &&
                    !property.booking_eligible &&
                    property.is_amendment_active && (
                        <Alert variant="warning">
                            <AlertTriangle aria-hidden="true" />
                            <AlertTitle>
                                Bookings Paused During Amendment
                            </AlertTitle>
                            <AlertDescription>
                                Customer booking eligibility is temporarily
                                paused while your amendment revision is active.
                                Submit or cancel the amendment to resume live
                                bookings.
                            </AlertDescription>
                        </Alert>
                    )}

                {(!property.is_verified ||
                    evaluation.missing_requirements.length > 0) && (
                    <Card className="min-w-0 border-tijum-surface/90 dark:border-border">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">
                                    Verification Readiness
                                </CardTitle>
                                <CardDescription>
                                    Complete all checks below before submitting
                                    for review.
                                </CardDescription>
                            </div>
                            <Button size="sm" asChild>
                                <Link href={verificationShowRoute(property.id)}>
                                    <span>Open Verification Console</span>
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {evaluation.missing_requirements.length === 0 ? (
                                <div className="flex items-start gap-2.5 text-sm text-status-success-fg">
                                    <CheckCircle2
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        All minimum property, room type,
                                        physical room, photograph, and document
                                        checks pass and are ready for
                                        submission.
                                    </span>
                                </div>
                            ) : (
                                <ul className="list-disc space-y-1.5 pl-4 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    {evaluation.missing_requirements.map(
                                        (req) => (
                                            <li key={req}>{req}</li>
                                        ),
                                    )}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Room Types"
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
                        label="Active Capacity"
                        value={`${roomSummary.nominal_active_capacity} guests`}
                        helperText="Derived from active physical rooms"
                        icon={Building2}
                    />
                    <StatCard
                        label="Gallery Photos"
                        value={String(media.length)}
                        helperText={`Property photos: ${evaluation.property_photos_count}/${evaluation.min_property_photos} min`}
                        icon={Camera}
                    />
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
                            <div className="flex flex-wrap items-center gap-2">
                                {property.can_manage_inventory && (
                                    <Button size="sm" asChild>
                                        <Link
                                            href={createRoomTypeRoute(
                                                property.id,
                                            )}
                                        >
                                            <PlusCircle aria-hidden="true" />
                                            <span>Add Room Type</span>
                                        </Link>
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={roomTypesIndexRoute(property.id)}
                                    >
                                        Manage
                                    </Link>
                                </Button>
                            </div>
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
                            <div className="flex flex-wrap items-center gap-2">
                                {property.can_manage_inventory &&
                                    roomTypes.length > 0 && (
                                        <Button size="sm" asChild>
                                            <Link
                                                href={createRoomRoute(
                                                    property.id,
                                                )}
                                            >
                                                <PlusCircle aria-hidden="true" />
                                                <span>Add Room</span>
                                            </Link>
                                        </Button>
                                    )}
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={roomsIndexRoute(property.id)}>
                                        Manage
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {rooms.length === 0 ? (
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    No physical room numbers recorded yet.
                                </p>
                            ) : (
                                <>
                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                        {rooms.slice(0, 8).map((room) => (
                                            <div
                                                key={room.id}
                                                className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface px-3 py-2 text-xs dark:border-border dark:bg-muted/35"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                        Room {room.room_number}
                                                    </p>
                                                    <p className="truncate text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                        {room.room_type_name}
                                                        {room.floor_number
                                                            ? ` · Fl ${room.floor_number}`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <StatusBadge
                                                    status={
                                                        roomOperationalStatusMap[
                                                            room
                                                                .operational_status
                                                        ]
                                                    }
                                                    label={
                                                        room.operational_status_label
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {rooms.length > 8 && (
                                        <div className="flex justify-end pt-1">
                                            <Link
                                                href={roomsIndexRoute(
                                                    property.id,
                                                )}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-tijum-coral hover:underline"
                                            >
                                                <span>
                                                    View all {rooms.length}{' '}
                                                    physical rooms
                                                </span>
                                                <ArrowRight
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="min-w-0 lg:col-span-5">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle>Location &amp; Contact</CardTitle>
                                <CardDescription>
                                    Verified street coordinates and front-desk
                                    contact
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={editPropertyRoute(property.id)}>
                                    <Edit3 aria-hidden="true" />
                                    <span>
                                        {property.can_edit_details
                                            ? 'Edit'
                                            : 'View'}
                                    </span>
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <dl className="divide-y divide-tijum-surface/75 text-sm dark:divide-border">
                                <div className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                                    <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Category
                                    </dt>
                                    <dd className="text-right font-semibold text-tijum-plum dark:text-foreground">
                                        {property.category?.name}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3 py-2.5">
                                    <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Launch City
                                    </dt>
                                    <dd className="text-right font-semibold text-tijum-plum dark:text-foreground">
                                        {property.city?.name}, {property.state}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3 py-2.5">
                                    <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Locality
                                    </dt>
                                    <dd className="text-right font-semibold text-tijum-plum dark:text-foreground">
                                        {property.locality}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3 py-2.5">
                                    <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Contact Person
                                    </dt>
                                    <dd className="text-right font-semibold text-tijum-plum dark:text-foreground">
                                        {property.details.contact_person_name}
                                    </dd>
                                </div>
                                <div className="flex items-baseline justify-between gap-3 py-2.5 last:pb-0">
                                    <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Phone
                                    </dt>
                                    <dd className="text-right font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                        {property.details.contact_phone}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    <Card className="min-w-0 lg:col-span-7">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle>Photo Gallery</CardTitle>
                                <CardDescription>
                                    {media.length === 0
                                        ? 'Upload clear property and room photographs for guests.'
                                        : `${media.length} uploaded photo${media.length === 1 ? '' : 's'} across property and room types.`}
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={mediaIndexRoute(property.id)}>
                                    <span>Manage Gallery</span>
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {media.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-tijum-surface bg-tijum-cream/25 py-10 text-center dark:border-border dark:bg-muted/20">
                                    <Camera
                                        className="size-6 text-tijum-plum-muted"
                                        aria-hidden="true"
                                    />
                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        No photographs uploaded yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {media.slice(0, 4).map((item) => (
                                        <Link
                                            key={item.id}
                                            href={mediaIndexRoute(property.id)}
                                            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-tijum-surface bg-tijum-cream dark:border-border dark:bg-muted"
                                        >
                                            <img
                                                src={
                                                    item.public_thumbnail_url ??
                                                    item.thumbnail_preview_url
                                                }
                                                alt={item.alt_text}
                                                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            {item.is_cover && (
                                                <span className="absolute top-1.5 left-1.5 rounded-full bg-tijum-plum/85 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                    Cover
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <details className="group rounded-2xl border border-tijum-surface/85 bg-card shadow-tijum-card dark:border-border">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-heading text-sm font-semibold text-tijum-plum select-none dark:text-foreground">
                        <span className="flex items-center gap-2">
                            <History
                                className="size-4 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>
                                Property Change &amp; Audit History (
                                {events.length})
                            </span>
                        </span>
                        <span className="flex items-center gap-2 text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                            <span>Click to expand timeline</span>
                            <ChevronDown
                                className="size-4 transition-transform group-open:rotate-180"
                                aria-hidden="true"
                            />
                        </span>
                    </summary>
                    <div className="border-t border-tijum-surface/75 px-6 py-4 dark:border-border">
                        <p className="mb-3 text-xs text-muted-foreground">
                            Append-only event timeline across edits, room
                            updates, photos, amendments, and reviews.
                        </p>
                        {events.length === 0 ? (
                            <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                No activity logged yet.
                            </p>
                        ) : (
                            <ol className="space-y-2">
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
                    </div>
                </details>

                <ConfirmationDialog
                    open={pendingOpStatus !== null}
                    onOpenChange={(open) => !open && setPendingOpStatus(null)}
                    tone={
                        pendingOpStatus === 'archived'
                            ? 'destructive'
                            : 'default'
                    }
                    title={
                        pendingOpStatus === 'archived'
                            ? 'Close Property Completely?'
                            : pendingOpStatus === 'temporarily_closed'
                              ? 'Temporarily Close Property?'
                              : 'Reopen Property as Active?'
                    }
                    description={
                        pendingOpStatus === 'archived'
                            ? 'Closing this property completely removes it from public listings, unpublishes public photos, and blocks new reservations. Historical bookings and payouts remain intact. Blocked automatically if current or upcoming reservations exist.'
                            : pendingOpStatus === 'temporarily_closed'
                              ? 'Pausing operational availability preserves your verification approval and can be reopened anytime.'
                              : 'Restoring Active status re-enables public visibility and booking readiness for this verified property.'
                    }
                    confirmLabel={
                        pendingOpStatus === 'archived'
                            ? 'Close Property Completely'
                            : pendingOpStatus === 'temporarily_closed'
                              ? 'Pause Bookings'
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
