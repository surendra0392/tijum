import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Building2,
    Check,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    FileText,
    History,
    Image as ImageIcon,
    Info,
    MapPin,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    documentStatusBadgeMap,
    formatIsoDate,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import {
    mediaModerationStatusMap,
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
    roomOperationalStatusMap,
} from '@/components/owner/properties/property-status-helpers';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatStayTime } from '@/lib/stay-timing';
import { dashboard } from '@/routes/admin';
import {
    approve,
    assign,
    history as historyRoute,
    index as propertiesIndex,
    operationalStatus,
    reject,
    requestInformation,
    startReview,
} from '@/routes/admin/properties';
import { moderate as moderateMedia } from '@/routes/admin/properties/media';
import type {
    AdminPropertyOwnerDetail,
    AdminPropertyQueueRow,
    PropertyFieldsSnapshot,
    PropertyMediaData,
    PropertyOperationalStatus,
    PropertyRoomData,
    PropertyRoomTypeData,
    PropertyVerificationApplicationData,
    PropertyVerificationDocumentData,
    PropertyVerificationEvaluation,
    TimingRules,
    VerificationEventData,
} from '@/types';

type AdminPropertyShowProps = {
    property: AdminPropertyQueueRow & {
        description: string;
        contact_person_name: string;
        contact_phone: string;
        contact_email: string | null;
        address_line_1: string;
        address_line_2: string | null;
        landmark: string | null;
        postal_code: string;
        state: string;
        country_code: string;
        latitude: string | null;
        longitude: string | null;
        approved_details: PropertyFieldsSnapshot;
        approved_snapshot: Record<string, unknown> | null;
        suspended_reason: string | null;
        approved_at: string | null;
    };
    owner: AdminPropertyOwnerDetail | null;
    application: PropertyVerificationApplicationData | null;
    roomTypes: PropertyRoomTypeData[];
    rooms: PropertyRoomData[];
    roomSummary: {
        total_rooms: number;
        active_rooms: number;
        maintenance_rooms: number;
        blocked_rooms: number;
        inactive_rooms: number;
    };
    propertyPhotos: PropertyMediaData[];
    roomPhotos: PropertyMediaData[];
    documents: PropertyVerificationDocumentData[];
    events: VerificationEventData[];
    evaluation: PropertyVerificationEvaluation;
    timingRules: TimingRules;
    reviewers: { id: number; name: string; role_label: string }[];
    permissions: {
        can_view_documents: boolean;
        can_assign: boolean;
        can_start_review: boolean;
        can_request_information: boolean;
        can_approve: boolean;
        can_reject: boolean;
        can_moderate_media: boolean;
        can_manage_status: boolean;
        can_suspend: boolean;
    };
    status?: string;
};

type MediaSectionProps = {
    title: string;
    description: string;
    items: PropertyMediaData[];
    canModerate: boolean;
    moderatingId: number | null;
    onApprovePhoto: (media: PropertyMediaData) => void;
    onOpenRejectPhoto: (media: PropertyMediaData) => void;
    isRoomSection?: boolean;
};

function MediaModerationGrid({
    title,
    description,
    items,
    canModerate,
    moderatingId,
    onApprovePhoto,
    onOpenRejectPhoto,
    isRoomSection = false,
}: MediaSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                        <ImageIcon className="size-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                            <span>{title}</span>
                            <Badge variant="outline" className="tabular-nums">
                                {items.length}
                            </Badge>
                        </CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <EmptyState
                        icon={ImageIcon}
                        title="No photos uploaded yet"
                        description="No photos have been uploaded in this section yet."
                        className="bg-tijum-cream/25 py-8 shadow-none dark:bg-muted/30"
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((photo) => (
                            <article
                                key={photo.id}
                                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-tijum-surface/80 bg-tijum-cream/35 transition-colors dark:border-border dark:bg-muted/40"
                            >
                                <div>
                                    <div className="relative aspect-[4/3] bg-tijum-cream dark:bg-muted">
                                        <img
                                            src={photo.thumbnail_preview_url}
                                            alt={
                                                photo.alt_text ||
                                                photo.original_filename
                                            }
                                            className="size-full object-cover"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                                            <StatusBadge
                                                status={
                                                    mediaModerationStatusMap[
                                                        photo.moderation_status
                                                    ] ?? 'neutral'
                                                }
                                                label={
                                                    photo.moderation_status_label
                                                }
                                            />
                                            {photo.is_cover && (
                                                <Badge variant="default">
                                                    Cover Photo
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 p-3.5 text-xs">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {photo.media_type_label}
                                            </p>
                                            <a
                                                href={photo.preview_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex shrink-0 items-center gap-1 font-medium text-tijum-plum underline-offset-4 transition-colors hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                                            >
                                                <span>Preview</span>
                                                <ExternalLink
                                                    className="size-3"
                                                    aria-hidden="true"
                                                />
                                            </a>
                                        </div>

                                        {isRoomSection &&
                                            (photo.room_type_name ||
                                                photo.room_number) && (
                                                <p className="font-medium text-tijum-plum dark:text-foreground">
                                                    {photo.room_type_name ??
                                                        'Room Photo'}
                                                    {photo.room_number
                                                        ? ` · Room ${photo.room_number}`
                                                        : ''}
                                                </p>
                                            )}

                                        <p className="truncate text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {photo.original_filename} ·{' '}
                                            {photo.width}×{photo.height} ·{' '}
                                            {photo.file_size_label}
                                        </p>

                                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Publication:{' '}
                                            <span className="font-medium text-tijum-plum dark:text-foreground">
                                                {photo.publication_status_label}
                                            </span>
                                        </p>

                                        {photo.moderation_note && (
                                            <p className="rounded-xl border border-status-error-border bg-status-error-bg px-3 py-2 text-status-error-fg">
                                                <strong>
                                                    Moderation note:
                                                </strong>{' '}
                                                {photo.moderation_note}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {canModerate && (
                                    <div className="flex items-center gap-2 border-t border-tijum-surface/80 bg-card px-3.5 py-2.5 dark:border-border">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                photo.moderation_status ===
                                                'approved'
                                                    ? 'secondary'
                                                    : 'plum'
                                            }
                                            className="flex-1"
                                            disabled={moderatingId === photo.id}
                                            loading={moderatingId === photo.id}
                                            onClick={() =>
                                                onApprovePhoto(photo)
                                            }
                                        >
                                            <Check aria-hidden="true" />
                                            <span>
                                                {photo.moderation_status ===
                                                'approved'
                                                    ? 'Approved'
                                                    : 'Approve Photo'}
                                            </span>
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 border-status-error-border text-status-error-fg hover:bg-status-error-bg hover:text-status-error-fg"
                                            disabled={moderatingId === photo.id}
                                            onClick={() =>
                                                onOpenRejectPhoto(photo)
                                            }
                                        >
                                            <X aria-hidden="true" />
                                            <span>Reject</span>
                                        </Button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const amendmentComparisonFields: {
    key: keyof PropertyFieldsSnapshot;
    label: string;
}[] = [
    { key: 'name', label: 'Property Name' },
    { key: 'category_name', label: 'Category' },
    { key: 'city_name', label: 'City' },
    { key: 'locality', label: 'Locality' },
    { key: 'address_line_1', label: 'Address Line 1' },
    { key: 'address_line_2', label: 'Address Line 2' },
    { key: 'landmark', label: 'Landmark' },
    { key: 'postal_code', label: 'Postal Code' },
    { key: 'contact_person_name', label: 'Contact Person' },
    { key: 'contact_phone', label: 'Contact Phone' },
    { key: 'contact_email', label: 'Contact Email' },
    { key: 'description', label: 'Description' },
];

export default function AdminPropertyShow({
    property,
    owner,
    application,
    roomTypes,
    rooms,
    roomSummary,
    propertyPhotos,
    roomPhotos,
    documents,
    events,
    evaluation,
    timingRules,
    reviewers,
    permissions,
    status,
}: AdminPropertyShowProps) {
    const [startingReview, setStartingReview] = useState(false);
    const [moderatingId, setModeratingId] = useState<number | null>(null);
    const [photoRejectTarget, setPhotoRejectTarget] =
        useState<PropertyMediaData | null>(null);

    const [requestInfoOpen, setRequestInfoOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);

    const assignForm = useForm<{ assigned_admin_id: string }>({
        assigned_admin_id: application?.assigned_admin_id
            ? String(application.assigned_admin_id)
            : '',
    });

    const photoRejectForm = useForm<{
        moderation_status: 'rejected';
        moderation_note: string;
    }>({
        moderation_status: 'rejected',
        moderation_note: '',
    });

    const requestInfoForm = useForm<{
        requested_information: string;
        internal_reviewer_notes: string;
        rejected_document_notes: Record<number, string>;
        rejected_media_notes: Record<number, string>;
    }>({
        requested_information: '',
        internal_reviewer_notes: '',
        rejected_document_notes: {},
        rejected_media_notes: {},
    });

    const approveForm = useForm<{
        decision_reason: string;
        internal_reviewer_notes: string;
        application?: string;
    }>({
        decision_reason: '',
        internal_reviewer_notes: '',
    });

    const rejectForm = useForm<{
        decision_reason: string;
        internal_reviewer_notes: string;
        application?: string;
    }>({
        decision_reason: '',
        internal_reviewer_notes: '',
    });

    const operationalForm = useForm<{
        status: PropertyOperationalStatus;
        reason: string;
    }>({
        status: property.operational_status,
        reason: property.suspended_reason ?? '',
    });

    const handleAssign = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!assignForm.data.assigned_admin_id) {
            return;
        }
        router.post(
            assign.url(property.id),
            { assigned_admin_id: Number(assignForm.data.assigned_admin_id) },
            { preserveScroll: true },
        );
    };

    const handleStartReview = () => {
        setStartingReview(true);
        router.post(
            startReview.url(property.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setStartingReview(false),
            },
        );
    };

    const handleApprovePhoto = (media: PropertyMediaData) => {
        setModeratingId(media.id);
        router.post(
            moderateMedia.url([property.id, media.id]),
            { moderation_status: 'approved', moderation_note: null },
            {
                preserveScroll: true,
                onFinish: () => setModeratingId(null),
            },
        );
    };

    const openPhotoRejectModal = (media: PropertyMediaData) => {
        photoRejectForm.reset();
        photoRejectForm.clearErrors();
        setPhotoRejectTarget(media);
    };

    const submitPhotoReject = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!photoRejectTarget) {
            return;
        }
        photoRejectForm.post(
            moderateMedia.url([property.id, photoRejectTarget.id]),
            {
                preserveScroll: true,
                onSuccess: () => setPhotoRejectTarget(null),
            },
        );
    };

    const submitRequestInfo = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        requestInfoForm.post(requestInformation.url(property.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRequestInfoOpen(false);
                requestInfoForm.reset();
            },
        });
    };

    const toggleFlaggedDocument = (docId: number, checked: boolean) => {
        const next = { ...requestInfoForm.data.rejected_document_notes };
        if (checked) {
            next[docId] =
                next[docId] ?? 'Please upload a clearer or updated document.';
        } else {
            delete next[docId];
        }
        requestInfoForm.setData('rejected_document_notes', next);
    };

    const submitApprove = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        approveForm.post(approve.url(property.id), {
            preserveScroll: true,
            onSuccess: () => setApproveOpen(false),
        });
    };

    const submitReject = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        rejectForm.post(reject.url(property.id), {
            preserveScroll: true,
            onSuccess: () => setRejectOpen(false),
        });
    };

    const submitOperationalStatus = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        operationalForm.post(operationalStatus.url(property.id), {
            preserveScroll: true,
            onSuccess: () => setStatusModalOpen(false),
        });
    };

    const roomColumns: DataTableColumn<PropertyRoomData>[] = [
        {
            key: 'room_number',
            header: 'Room Number',
            isRowHeader: true,
            render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                        {row.room_number}
                    </span>
                    {!row.is_approved_version && (
                        <Badge variant="outline" className="text-[10px]">
                            Pending Approval
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'room_type_name',
            header: 'Room Configuration',
            render: (row) => (
                <div className="space-y-0.5">
                    <p className="font-medium text-tijum-plum dark:text-foreground">
                        {row.room_type_name}
                    </p>
                    <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {row.accommodation_mode_label} ·{' '}
                        {row.is_air_conditioned ? 'AC' : 'Non-AC'} · Max{' '}
                        {row.max_guests_per_room}{' '}
                        {row.max_guests_per_room === 1 ? 'guest' : 'guests'}
                    </p>
                </div>
            ),
        },
        {
            key: 'location',
            header: 'Location Details',
            render: (row) => (
                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    {[
                        row.floor_number ? `Floor ${row.floor_number}` : null,
                        row.wing_name ? `Wing ${row.wing_name}` : null,
                        row.building_name,
                    ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                </span>
            ),
        },
        {
            key: 'operational_status',
            header: 'Room Status',
            render: (row) => (
                <StatusBadge
                    status={
                        roomOperationalStatusMap[row.operational_status] ??
                        'neutral'
                    }
                    label={row.operational_status_label}
                />
            ),
        },
    ];

    const allPhotos = [...propertyPhotos, ...roomPhotos];
    const changedAmendmentFields =
        property.is_amendment && application?.proposed_property_data
            ? amendmentComparisonFields.filter(({ key }) => {
                  const proposed =
                      application.proposed_property_data?.[key] ?? null;
                  const approved = property.approved_details[key] ?? null;
                  return String(proposed ?? '') !== String(approved ?? '');
              })
            : [];

    const totalPendingPhotos = evaluation.pending_moderation_media_count;
    const operationalChoices: {
        value: PropertyOperationalStatus;
        label: string;
    }[] = [
        { value: 'active', label: 'Active' },
        { value: 'temporarily_closed', label: 'Temporarily Closed' },
        ...(permissions.can_suspend
            ? [{ value: 'suspended' as const, label: 'Suspended' }]
            : []),
        { value: 'archived', label: 'Archived' },
    ];

    return (
        <>
            <Head title={`${property.property_reference} · Property Review`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`${property.property_reference} · ${property.category_name} · Rev #${application?.revision_number ?? 1}`}
                    title={property.name}
                    description={`${property.locality}, ${property.city_name} · Partner: ${property.owner_name} (${property.owner_email})`}
                    badges={
                        <>
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
                            <Badge
                                variant={
                                    property.booking_eligible
                                        ? 'food'
                                        : 'outline'
                                }
                            >
                                {property.booking_eligible
                                    ? 'Booking Eligible'
                                    : 'Not Bookable'}
                            </Badge>
                            {property.is_amendment && (
                                <Badge variant="peach">
                                    Amendment Re-Verification
                                </Badge>
                            )}
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={propertiesIndex.url()}>
                                    <ArrowLeft aria-hidden="true" />
                                    <span>Back to Queue</span>
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={historyRoute.url(property.id)}>
                                    <History aria-hidden="true" />
                                    <span>Audit History</span>
                                </Link>
                            </Button>
                        </div>
                    }
                />

                {status && (
                    <Card
                        role="status"
                        className="border-l-4 border-l-emerald-500 py-4 dark:border-l-emerald-400"
                    >
                        <CardContent className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                                <CheckCircle2
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-0.5">
                                <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    Review Action Recorded
                                </p>
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    Latest property action (
                                    {status.replaceAll('-', ' ')}) has been
                                    saved and logged to the audit timeline.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {property.suspended_reason && (
                    <Card
                        role="alert"
                        className="border-l-4 border-l-destructive py-4"
                    >
                        <CardContent className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-error-border bg-status-error-bg text-status-error-fg">
                                <ShieldAlert
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-0.5">
                                <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    Property Suspended
                                </p>
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    {property.suspended_reason}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {application?.requested_information && (
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
                                    Requested Changes Pending Partner Response
                                </p>
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    {application.requested_information}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <section
                    aria-label="Property verification summary metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Room Types"
                        value={roomTypes.length}
                        helperText={`${evaluation.room_types_count} configured`}
                        icon={BedDouble}
                    />
                    <StatCard
                        label="Physical Rooms"
                        value={roomSummary.total_rooms}
                        helperText={`${roomSummary.active_rooms} active · ${roomSummary.maintenance_rooms} maint.`}
                        icon={Building2}
                    />
                    <StatCard
                        label="Property & Room Photos"
                        value={allPhotos.length}
                        helperText={
                            totalPendingPhotos > 0
                                ? `${totalPendingPhotos} pending moderation`
                                : 'All moderated'
                        }
                        icon={ImageIcon}
                    />
                    <StatCard
                        label="Verification Documents"
                        value={documents.length}
                        helperText={
                            evaluation.documents_complete
                                ? 'Checklist complete'
                                : 'Pending requirements'
                        }
                        icon={FileText}
                    />
                </section>

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="min-w-0 space-y-6 xl:col-span-2">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList
                                variant="pill"
                                label="Property verification sections"
                                className="w-full justify-start"
                            >
                                <TabsTrigger value="overview">
                                    Overview &amp; Owner
                                </TabsTrigger>
                                <TabsTrigger
                                    value="inventory"
                                    className="tabular-nums"
                                >
                                    Room Types &amp; Rooms ({rooms.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="media"
                                    className="tabular-nums"
                                >
                                    Photos ({allPhotos.length}
                                    {totalPendingPhotos > 0
                                        ? ` · ${totalPendingPhotos} Pending`
                                        : ''}
                                    )
                                </TabsTrigger>
                                <TabsTrigger
                                    value="documents"
                                    className="tabular-nums"
                                >
                                    Documents ({documents.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="timeline"
                                    className="tabular-nums"
                                >
                                    Events ({events.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-6">
                                {/* Section 1: Owner & Business Identity */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                                <UserCheck
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">
                                                    Partner Owner &amp; Business
                                                    Identity
                                                </CardTitle>
                                                <CardDescription>
                                                    Verified partner account and
                                                    registered legal entity
                                                    details
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {owner ? (
                                            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                    <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Owner Name
                                                    </dt>
                                                    <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                                        {owner.name}
                                                    </dd>
                                                </div>
                                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                    <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Owner Email / Phone
                                                    </dt>
                                                    <dd className="mt-0.5 break-all text-tijum-plum tabular-nums dark:text-foreground">
                                                        {owner.email}
                                                        {owner.phone
                                                            ? ` · ${owner.phone}`
                                                            : ''}
                                                    </dd>
                                                </div>
                                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                    <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Partner Account Status
                                                    </dt>
                                                    <dd className="mt-0.5 text-tijum-plum tabular-nums dark:text-foreground">
                                                        {owner.status_label} (
                                                        {formatIsoDate(
                                                            owner.approved_at,
                                                        )}
                                                        )
                                                    </dd>
                                                </div>
                                                {owner.business_profile && (
                                                    <>
                                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                            <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                Business Display
                                                                Name
                                                            </dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                                                {
                                                                    owner
                                                                        .business_profile
                                                                        .display_business_name
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                            <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                Entity Type
                                                            </dt>
                                                            <dd className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                                {
                                                                    owner
                                                                        .business_profile
                                                                        .entity_type_label
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                            <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                Legal Business
                                                                Name
                                                            </dt>
                                                            <dd className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                                {owner
                                                                    .business_profile
                                                                    .legal_business_name ??
                                                                    '—'}
                                                            </dd>
                                                        </div>
                                                    </>
                                                )}
                                            </dl>
                                        ) : (
                                            <EmptyState
                                                icon={UserCheck}
                                                title="Owner details unavailable"
                                                description="Owner profile details could not be loaded for this property."
                                                className="bg-tijum-cream/25 py-8 shadow-none dark:bg-muted/30"
                                            />
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Section 2: Property Details & Amendment Comparison */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                                <MapPin
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">
                                                    Property Profile, Location
                                                    &amp; Operations Contact
                                                </CardTitle>
                                                <CardDescription className="tabular-nums">
                                                    {application
                                                        ? `${application.application_number} · Arrangement: ${application.ownership_arrangement_label}`
                                                        : 'Draft property details'}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Category &amp; City
                                                </dt>
                                                <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                                    {property.category_name} ·{' '}
                                                    {property.city_name},{' '}
                                                    {property.state}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    On-Site Contact Person
                                                </dt>
                                                <dd className="mt-0.5 text-tijum-plum tabular-nums dark:text-foreground">
                                                    {
                                                        property.contact_person_name
                                                    }{' '}
                                                    · {property.contact_phone}
                                                    {property.contact_email
                                                        ? ` · ${property.contact_email}`
                                                        : ''}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 sm:col-span-2 dark:border-border dark:bg-muted/45">
                                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Full Address
                                                </dt>
                                                <dd className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                    {[
                                                        property.address_line_1,
                                                        property.address_line_2,
                                                        property.landmark
                                                            ? `Landmark: ${property.landmark}`
                                                            : null,
                                                        property.locality,
                                                        property.city_name,
                                                        property.state,
                                                        property.postal_code,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Coordinates
                                                </dt>
                                                <dd className="mt-0.5 text-tijum-plum tabular-nums dark:text-foreground">
                                                    {property.latitude &&
                                                    property.longitude
                                                        ? `${property.latitude}, ${property.longitude}`
                                                        : 'Not provided'}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Declaration Version
                                                </dt>
                                                <dd className="mt-0.5 text-tijum-plum tabular-nums dark:text-foreground">
                                                    {application?.declaration_version
                                                        ? `v${application.declaration_version} (${formatIsoDateTime(application.declaration_accepted_at)})`
                                                        : 'Not signed yet'}
                                                </dd>
                                            </div>
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 sm:col-span-2 dark:border-border dark:bg-muted/45">
                                                <dt className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Property Description
                                                </dt>
                                                <dd className="mt-1 leading-relaxed whitespace-pre-line text-tijum-plum dark:text-foreground">
                                                    {property.description}
                                                </dd>
                                            </div>
                                        </dl>

                                        {property.is_amendment &&
                                            application?.proposed_property_data && (
                                                <div className="rounded-xl border border-l-4 border-status-warning-border border-l-amber-500 bg-status-warning-bg p-4 dark:border-l-amber-400">
                                                    <h3 className="font-heading text-sm font-semibold text-status-warning-fg">
                                                        Proposed Amendment
                                                        Changes vs Approved
                                                        Baseline
                                                    </h3>
                                                    {changedAmendmentFields.length ===
                                                    0 ? (
                                                        <p className="mt-1 text-xs text-status-warning-fg/90">
                                                            Core property
                                                            identity fields
                                                            match the approved
                                                            baseline (changes
                                                            may be in room
                                                            configurations,
                                                            rooms, photos, or
                                                            documents).
                                                        </p>
                                                    ) : (
                                                        <div className="mt-3 space-y-2.5">
                                                            {changedAmendmentFields.map(
                                                                ({
                                                                    key,
                                                                    label,
                                                                }) => (
                                                                    <div
                                                                        key={
                                                                            key
                                                                        }
                                                                        className="grid gap-3 rounded-xl border border-tijum-surface/80 bg-card p-3.5 text-xs sm:grid-cols-2 dark:border-border"
                                                                    >
                                                                        <div>
                                                                            <p className="font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                                                                                {
                                                                                    label
                                                                                }{' '}
                                                                                (Approved)
                                                                            </p>
                                                                            <p className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                                                {property
                                                                                    .approved_details[
                                                                                    key
                                                                                ] ??
                                                                                    '—'}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-status-warning-fg">
                                                                                {
                                                                                    label
                                                                                }{' '}
                                                                                (Proposed)
                                                                            </p>
                                                                            <p className="mt-0.5 text-tijum-plum dark:text-foreground">
                                                                                {application
                                                                                    .proposed_property_data?.[
                                                                                    key
                                                                                ] ??
                                                                                    '—'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent
                                value="inventory"
                                className="space-y-6"
                            >
                                {/* Section 3: Room Configurations */}
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
                                                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                                                    <span>
                                                        Room Types &amp;
                                                        Capacity Rules
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="tabular-nums"
                                                    >
                                                        {roomTypes.length}
                                                    </Badge>
                                                </CardTitle>
                                                <CardDescription>
                                                    Configuration-based capacity
                                                    derived from Room Types.
                                                    Single Room is strictly
                                                    limited to 1 guest.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {roomTypes.length === 0 ? (
                                            <EmptyState
                                                icon={BedDouble}
                                                title="No room types defined yet"
                                                description="Partner has not configured room types for this property yet."
                                                className="bg-tijum-cream/25 py-8 shadow-none dark:bg-muted/30"
                                            />
                                        ) : (
                                            roomTypes.map((rt) => (
                                                <div
                                                    key={rt.id}
                                                    className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm dark:border-border dark:bg-muted/45"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                {rt.name}
                                                            </h3>
                                                            <Badge variant="outline">
                                                                {
                                                                    rt.accommodation_mode_label
                                                                }
                                                            </Badge>
                                                            <Badge variant="outline">
                                                                {rt.is_air_conditioned
                                                                    ? 'AC'
                                                                    : 'Non-AC'}
                                                            </Badge>
                                                            {!rt.is_active && (
                                                                <Badge variant="secondary">
                                                                    Inactive
                                                                </Badge>
                                                            )}
                                                            {!rt.is_approved_version && (
                                                                <Badge variant="peach">
                                                                    Pending
                                                                    Approval
                                                                </Badge>
                                                            )}
                                                            {rt.has_pending_amendment && (
                                                                <Badge variant="secondary">
                                                                    Amendment
                                                                    Edited
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                            {
                                                                rt.active_rooms_count
                                                            }
                                                            /{rt.rooms_count}{' '}
                                                            active rooms ·{' '}
                                                            {
                                                                rt.total_active_capacity
                                                            }{' '}
                                                            guest capacity
                                                        </span>
                                                    </div>

                                                    <dl className="mt-3 grid gap-2.5 border-t border-tijum-surface/70 pt-3 text-xs text-tijum-plum-muted sm:grid-cols-2 lg:grid-cols-3 dark:border-border dark:text-muted-foreground">
                                                        <div>
                                                            <dt>Max Guests</dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                                {
                                                                    rt.max_guests_per_room
                                                                }{' '}
                                                                {rt.max_guests_per_room ===
                                                                1
                                                                    ? 'guest / room'
                                                                    : 'guests / room'}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt>
                                                                Gender Policy
                                                            </dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                                                {
                                                                    rt.gender_policy_label
                                                                }
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt>
                                                                Guest Groups
                                                            </dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum dark:text-foreground">
                                                                {rt.guest_composition_labels.join(
                                                                    ', ',
                                                                ) || '—'}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt>
                                                                Early Check-In
                                                            </dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                                {rt.early_check_in_enabled
                                                                    ? `Allowed (from ${formatStayTime(timingRules.earliest_early_check_in_time)})`
                                                                    : 'Not Allowed'}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt>
                                                                Standard Timing
                                                            </dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                                {formatStayTime(
                                                                    timingRules.standard_check_in_time,
                                                                )}{' '}
                                                                check-in ·{' '}
                                                                {formatStayTime(
                                                                    timingRules.standard_check_out_time,
                                                                )}{' '}
                                                                checkout
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt>Room Photos</dt>
                                                            <dd className="mt-0.5 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                                {
                                                                    rt.room_photos_count
                                                                }{' '}
                                                                {rt.room_photos_count ===
                                                                1
                                                                    ? 'photo'
                                                                    : 'photos'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Section 4: Physical Rooms Directory */}
                                <DataTable
                                    caption="Physical rooms belonging to this property"
                                    title="Physical Rooms Inventory"
                                    description={`Active: ${roomSummary.active_rooms} · Maintenance: ${roomSummary.maintenance_rooms} · Blocked: ${roomSummary.blocked_rooms} · Inactive: ${roomSummary.inactive_rooms}`}
                                    headerActions={
                                        <Badge
                                            variant="outline"
                                            className="tabular-nums"
                                        >
                                            {roomSummary.total_rooms} rooms
                                        </Badge>
                                    }
                                    columns={roomColumns}
                                    rows={rooms}
                                    getRowKey={(row) => row.id}
                                    pageSize={15}
                                    emptyTitle="No physical rooms created yet"
                                    emptyDescription="Partner has not added numbered physical rooms to this property yet."
                                />
                            </TabsContent>

                            <TabsContent value="media" className="space-y-6">
                                {/* Section 5: Property-Level Photos */}
                                <MediaModerationGrid
                                    title="Property Photos"
                                    description="Exterior, entrance, reception, common spaces, dining hall, and shared facility photographs (at least 3 required including cover photo)."
                                    items={propertyPhotos}
                                    canModerate={permissions.can_moderate_media}
                                    moderatingId={moderatingId}
                                    onApprovePhoto={handleApprovePhoto}
                                    onOpenRejectPhoto={openPhotoRejectModal}
                                />

                                {/* Section 6: Room Photos */}
                                <MediaModerationGrid
                                    title="Room Photos"
                                    description="Interior, furniture arrangement, and bathroom photos mapped to room configurations (at least 1 per active room type)."
                                    items={roomPhotos}
                                    canModerate={permissions.can_moderate_media}
                                    moderatingId={moderatingId}
                                    onApprovePhoto={handleApprovePhoto}
                                    onOpenRejectPhoto={openPhotoRejectModal}
                                    isRoomSection
                                />
                            </TabsContent>

                            <TabsContent
                                value="documents"
                                className="space-y-6"
                            >
                                {/* Section 7: Private Property Verification Documents */}
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
                                                    Property Verification
                                                    Documents
                                                </CardTitle>
                                                <CardDescription>
                                                    Stored privately outside
                                                    public storage and streamed
                                                    through permission-checked
                                                    admin endpoints with audit
                                                    logging.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {!permissions.can_view_documents && (
                                            <Alert
                                                variant="warning"
                                                className="mb-4"
                                            >
                                                <ShieldAlert
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                                <AlertTitle>
                                                    Document Access Restricted
                                                </AlertTitle>
                                                <AlertDescription>
                                                    Your admin role can inspect
                                                    property metadata and
                                                    operational status, while
                                                    private verification
                                                    documents remain restricted
                                                    to Property Verification
                                                    admins.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {documents.length === 0 ? (
                                            <EmptyState
                                                icon={FileText}
                                                title="No verification documents"
                                                description="No property verification documents uploaded for this revision yet."
                                                className="bg-tijum-cream/25 py-8 shadow-none dark:bg-muted/30"
                                            />
                                        ) : (
                                            <div className="space-y-3">
                                                {documents.map((doc) => (
                                                    <div
                                                        key={doc.id}
                                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm dark:border-border dark:bg-muted/45"
                                                    >
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                    {
                                                                        doc.document_type_label
                                                                    }
                                                                </p>
                                                                <StatusBadge
                                                                    status={
                                                                        documentStatusBadgeMap[
                                                                            doc
                                                                                .status
                                                                        ] ??
                                                                        'neutral'
                                                                    }
                                                                    label={
                                                                        doc.status_label
                                                                    }
                                                                />
                                                            </div>
                                                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                                {
                                                                    doc.original_filename
                                                                }{' '}
                                                                ·{' '}
                                                                {
                                                                    doc.file_size_label
                                                                }{' '}
                                                                · Uploaded{' '}
                                                                {formatIsoDateTime(
                                                                    doc.created_at,
                                                                )}
                                                            </p>
                                                            {doc.reviewer_note && (
                                                                <p className="text-xs text-status-error-fg">
                                                                    Note:{' '}
                                                                    {
                                                                        doc.reviewer_note
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>

                                                        {permissions.can_view_documents &&
                                                            (doc.preview_url ||
                                                                doc.download_url) && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {doc.preview_url && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    doc.preview_url
                                                                                }
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                            >
                                                                                <ExternalLink aria-hidden="true" />
                                                                                <span>
                                                                                    Preview
                                                                                </span>
                                                                            </a>
                                                                        </Button>
                                                                    )}
                                                                    {doc.download_url && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    doc.download_url
                                                                                }
                                                                            >
                                                                                <Download aria-hidden="true" />
                                                                                <span>
                                                                                    Download
                                                                                </span>
                                                                            </a>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="timeline" className="space-y-6">
                                {/* Section 9: Recent Audit Events */}
                                <Card>
                                    <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                                <History
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">
                                                    Recent Verification Events
                                                </CardTitle>
                                                <CardDescription className="tabular-nums">
                                                    Latest audit events recorded
                                                    for{' '}
                                                    {
                                                        property.property_reference
                                                    }
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={historyRoute.url(
                                                    property.id,
                                                )}
                                            >
                                                Full History
                                            </Link>
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {events.length === 0 ? (
                                            <EmptyState
                                                icon={History}
                                                title="No events recorded yet"
                                                description="Audit events for submissions, photo moderation, and verification decisions will appear here."
                                                className="bg-tijum-cream/25 py-8 shadow-none dark:bg-muted/30"
                                            />
                                        ) : (
                                            <ol className="space-y-2.5">
                                                {events
                                                    .slice(0, 12)
                                                    .map((ev) => (
                                                        <li
                                                            key={ev.id}
                                                            className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45"
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                    {
                                                                        ev.event_label
                                                                    }
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                                    <Clock
                                                                        className="size-3"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {formatIsoDateTime(
                                                                        ev.created_at,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {ev.notes && (
                                                                <p className="mt-1.5 text-tijum-plum dark:text-foreground">
                                                                    {ev.notes}
                                                                </p>
                                                            )}
                                                            <p className="mt-1 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                                {ev.actor_name ??
                                                                    'System'}{' '}
                                                                ({ev.actor_type}
                                                                )
                                                            </p>
                                                        </li>
                                                    ))}
                                            </ol>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Section 8: Readiness Checklist, Assignment & Admin Decisions */}
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
                                            Verification Readiness
                                        </CardTitle>
                                        <CardDescription>
                                            All submission and image moderation
                                            checks required before approval
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <ul className="space-y-2 text-xs">
                                    <li className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface/70 bg-tijum-cream/35 px-3 py-2 dark:border-border dark:bg-muted/40">
                                        <span className="text-tijum-plum dark:text-foreground">
                                            Approved Partner Owner
                                        </span>
                                        <StatusBadge
                                            status={
                                                evaluation.owner_active
                                                    ? 'verified'
                                                    : 'rejected'
                                            }
                                            label={
                                                evaluation.owner_active
                                                    ? 'Verified'
                                                    : 'Not Active'
                                            }
                                        />
                                    </li>
                                    <li className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface/70 bg-tijum-cream/35 px-3 py-2 dark:border-border dark:bg-muted/40">
                                        <span className="text-tijum-plum dark:text-foreground">
                                            Room Types &amp; Physical Rooms
                                        </span>
                                        <span className="font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                            {evaluation.room_types_count} types
                                            · {evaluation.rooms_count} rooms
                                        </span>
                                    </li>
                                    <li className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface/70 bg-tijum-cream/35 px-3 py-2 dark:border-border dark:bg-muted/40">
                                        <span className="text-tijum-plum dark:text-foreground">
                                            Property Photos &amp; Cover
                                        </span>
                                        <StatusBadge
                                            status={
                                                evaluation.media_complete
                                                    ? 'verified'
                                                    : 'pending'
                                            }
                                            label={`${evaluation.property_photos_count}/${evaluation.min_property_photos} photos`}
                                        />
                                    </li>
                                    <li className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface/70 bg-tijum-cream/35 px-3 py-2 dark:border-border dark:bg-muted/40">
                                        <span className="text-tijum-plum dark:text-foreground">
                                            Pending Photo Moderation
                                        </span>
                                        <StatusBadge
                                            status={
                                                evaluation.pending_moderation_media_count ===
                                                0
                                                    ? 'verified'
                                                    : 'pending'
                                            }
                                            label={`${evaluation.pending_moderation_media_count} pending`}
                                        />
                                    </li>
                                    <li className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface/70 bg-tijum-cream/35 px-3 py-2 dark:border-border dark:bg-muted/40">
                                        <span className="text-tijum-plum dark:text-foreground">
                                            Required Documents
                                        </span>
                                        <StatusBadge
                                            status={
                                                evaluation.documents_complete
                                                    ? 'verified'
                                                    : 'pending'
                                            }
                                            label={
                                                evaluation.documents_complete
                                                    ? 'Complete'
                                                    : 'Incomplete'
                                            }
                                        />
                                    </li>
                                </ul>

                                {evaluation.admin_missing_approvals.length >
                                    0 && (
                                    <div className="rounded-xl border border-l-4 border-status-warning-border border-l-amber-500 bg-status-warning-bg p-3.5 text-xs text-status-warning-fg dark:border-l-amber-400">
                                        <p className="font-heading font-semibold">
                                            Remaining before approval:
                                        </p>
                                        <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                            {evaluation.admin_missing_approvals.map(
                                                (item) => (
                                                    <li key={item}>{item}</li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {evaluation.ready_for_admin_approval && (
                                    <div className="rounded-xl border border-l-4 border-status-success-border border-l-emerald-500 bg-status-success-bg p-3.5 text-xs font-medium text-status-success-fg dark:border-l-emerald-400">
                                        All checklist gates and media
                                        moderations are satisfied for approval.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {permissions.can_assign && application && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        Reviewer Assignment
                                    </CardTitle>
                                    <CardDescription>
                                        Current reviewer:{' '}
                                        {application.assigned_reviewer_name ??
                                            'Unassigned'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleAssign}
                                        className="space-y-3"
                                    >
                                        <fieldset className="space-y-2">
                                            <legend className="sr-only">
                                                Assign property verification
                                                reviewer
                                            </legend>
                                            <Label
                                                htmlFor="assign-reviewer-select"
                                                className="text-tijum-plum dark:text-foreground"
                                            >
                                                Assign Reviewer
                                            </Label>
                                            <Select
                                                value={
                                                    assignForm.data
                                                        .assigned_admin_id
                                                }
                                                onValueChange={(value) =>
                                                    assignForm.setData(
                                                        'assigned_admin_id',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="assign-reviewer-select"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Choose admin reviewer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {reviewers.map((rev) => (
                                                        <SelectItem
                                                            key={rev.id}
                                                            value={String(
                                                                rev.id,
                                                            )}
                                                        >
                                                            {rev.name} (
                                                            {rev.role_label})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </fieldset>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            className="w-full"
                                        >
                                            Save Reviewer Assignment
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Verification &amp; Status Actions
                                </CardTitle>
                                <CardDescription>
                                    Record formal review transitions or adjust
                                    operational availability
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2.5">
                                {permissions.can_start_review && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start"
                                        disabled={startingReview}
                                        loading={startingReview}
                                        onClick={handleStartReview}
                                    >
                                        <Clock aria-hidden="true" />
                                        <span>Start Verification Review</span>
                                    </Button>
                                )}

                                {permissions.can_request_information && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => setRequestInfoOpen(true)}
                                    >
                                        <Info aria-hidden="true" />
                                        <span>Request Information</span>
                                    </Button>
                                )}

                                {permissions.can_approve && (
                                    <Button
                                        type="button"
                                        variant="plum"
                                        className="w-full justify-start"
                                        onClick={() => setApproveOpen(true)}
                                    >
                                        <CheckCircle2 aria-hidden="true" />
                                        <span>
                                            {property.is_amendment
                                                ? 'Approve Amendment Revision'
                                                : 'Approve Property'}
                                        </span>
                                    </Button>
                                )}

                                {permissions.can_reject && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start border-status-error-border text-status-error-fg hover:bg-status-error-bg hover:text-status-error-fg"
                                        onClick={() => setRejectOpen(true)}
                                    >
                                        <X aria-hidden="true" />
                                        <span>Reject Application</span>
                                    </Button>
                                )}

                                {(permissions.can_manage_status ||
                                    permissions.can_suspend) && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            operationalForm.setData({
                                                status: property.operational_status,
                                                reason:
                                                    property.suspended_reason ??
                                                    '',
                                            });
                                            operationalForm.clearErrors();
                                            setStatusModalOpen(true);
                                        }}
                                    >
                                        <ShieldAlert aria-hidden="true" />
                                        <span>Update Operational Status</span>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>

            {/* Moderate Photo Rejection Dialog */}
            <Dialog
                open={photoRejectTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPhotoRejectTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Uploaded Photo</DialogTitle>
                        <DialogDescription>
                            Explain why{' '}
                            {photoRejectTarget?.original_filename ??
                                'this photo'}{' '}
                            is unsuitable so the partner can replace it before
                            approval.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitPhotoReject} className="space-y-4">
                        <fieldset className="space-y-2">
                            <legend className="sr-only">
                                Photo moderation rejection reason
                            </legend>
                            <Label
                                htmlFor="photo-reject-note"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Rejection Reason *
                            </Label>
                            <Textarea
                                id="photo-reject-note"
                                value={photoRejectForm.data.moderation_note}
                                onChange={(e) =>
                                    photoRejectForm.setData(
                                        'moderation_note',
                                        e.target.value,
                                    )
                                }
                                placeholder="e.g., Blurry image, watermark detected, or wrong room category."
                                rows={3}
                            />
                            {photoRejectForm.errors.moderation_note && (
                                <p className="text-xs text-status-error-fg">
                                    {photoRejectForm.errors.moderation_note}
                                </p>
                            )}
                        </fieldset>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPhotoRejectTarget(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={photoRejectForm.processing}
                                loading={photoRejectForm.processing}
                            >
                                Confirm Photo Rejection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Request Information Dialog */}
            <Dialog open={requestInfoOpen} onOpenChange={setRequestInfoOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Request Partner Changes / Information
                        </DialogTitle>
                        <DialogDescription>
                            Send clear instructions to {property.owner_name} and
                            optionally flag documents that need re-upload.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitRequestInfo} className="space-y-4">
                        <fieldset className="space-y-3">
                            <legend className="sr-only">
                                Requested property updates and internal notes
                            </legend>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="request-info-message"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Instructions for Partner (min 10 chars) *
                                </Label>
                                <Textarea
                                    id="request-info-message"
                                    value={
                                        requestInfoForm.data
                                            .requested_information
                                    }
                                    onChange={(e) =>
                                        requestInfoForm.setData(
                                            'requested_information',
                                            e.target.value,
                                        )
                                    }
                                    rows={4}
                                    placeholder="Specify missing room photos, clearer proof of address, or corrected room capacity details."
                                />
                                {requestInfoForm.errors
                                    .requested_information && (
                                    <p className="text-xs text-status-error-fg">
                                        {
                                            requestInfoForm.errors
                                                .requested_information
                                        }
                                    </p>
                                )}
                            </div>

                            {documents.length > 0 && (
                                <div className="space-y-2">
                                    <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                        Flag Documents for Replacement
                                        (optional)
                                    </p>
                                    {documents.map((doc) => {
                                        const isChecked =
                                            doc.id in
                                            requestInfoForm.data
                                                .rejected_document_notes;
                                        return (
                                            <div
                                                key={doc.id}
                                                className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/40"
                                            >
                                                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-tijum-plum dark:text-foreground">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            toggleFlaggedDocument(
                                                                doc.id,
                                                                Boolean(
                                                                    checked,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                    <span>
                                                        {
                                                            doc.document_type_label
                                                        }{' '}
                                                        ({doc.original_filename}
                                                        )
                                                    </span>
                                                </label>
                                                {isChecked && (
                                                    <Input
                                                        value={
                                                            requestInfoForm.data
                                                                .rejected_document_notes[
                                                                doc.id
                                                            ] ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            requestInfoForm.setData(
                                                                'rejected_document_notes',
                                                                {
                                                                    ...requestInfoForm
                                                                        .data
                                                                        .rejected_document_notes,
                                                                    [doc.id]:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        placeholder="Reason this document needs replacement"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="request-info-internal"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Internal Reviewer Notes (Admin Only)
                                </Label>
                                <Textarea
                                    id="request-info-internal"
                                    value={
                                        requestInfoForm.data
                                            .internal_reviewer_notes
                                    }
                                    onChange={(e) =>
                                        requestInfoForm.setData(
                                            'internal_reviewer_notes',
                                            e.target.value,
                                        )
                                    }
                                    rows={2}
                                />
                            </div>
                        </fieldset>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRequestInfoOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                disabled={requestInfoForm.processing}
                                loading={requestInfoForm.processing}
                            >
                                Send Information Request
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {property.is_amendment
                                ? 'Approve Amendment & Promote Revision'
                                : 'Approve Property Verification'}
                        </DialogTitle>
                        <DialogDescription>
                            Approving verifies this property, publishes approved
                            media derivatives to public storage, and marks the
                            listing live if operational status is active.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitApprove} className="space-y-4">
                        {!evaluation.ready_for_admin_approval && (
                            <Alert variant="destructive">
                                <ShieldAlert
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <AlertTitle>
                                    Checklist Blockers Active
                                </AlertTitle>
                                <AlertDescription>
                                    {evaluation.admin_missing_approvals.join(
                                        ' · ',
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                        <fieldset className="space-y-3">
                            <legend className="sr-only">
                                Approval decision note and internal reviewer
                                remarks
                            </legend>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="approve-reason"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Approval Note (optional)
                                </Label>
                                <Textarea
                                    id="approve-reason"
                                    value={approveForm.data.decision_reason}
                                    onChange={(e) =>
                                        approveForm.setData(
                                            'decision_reason',
                                            e.target.value,
                                        )
                                    }
                                    rows={2}
                                    placeholder="Optional verification confirmation note visible to partner."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="approve-internal-notes"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Internal Reviewer Notes
                                </Label>
                                <Textarea
                                    id="approve-internal-notes"
                                    value={
                                        approveForm.data.internal_reviewer_notes
                                    }
                                    onChange={(e) =>
                                        approveForm.setData(
                                            'internal_reviewer_notes',
                                            e.target.value,
                                        )
                                    }
                                    rows={2}
                                />
                            </div>
                            {(approveForm.errors.application ||
                                approveForm.errors.decision_reason) && (
                                <p className="text-xs text-status-error-fg">
                                    {approveForm.errors.application ??
                                        approveForm.errors.decision_reason}
                                </p>
                            )}
                        </fieldset>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setApproveOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                disabled={approveForm.processing}
                                loading={approveForm.processing}
                            >
                                Confirm Approval
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Reject Property Verification Application
                        </DialogTitle>
                        <DialogDescription>
                            {property.has_approved_baseline
                                ? 'Rejecting this amendment preserves the previously approved property snapshot while recording your decision reason.'
                                : 'Rejecting returns a formal reason to the partner, marks non-verified media unpublished, and allows starting a corrected revision.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReject} className="space-y-4">
                        <fieldset className="space-y-3">
                            <legend className="sr-only">
                                Rejection reason and internal reviewer notes
                            </legend>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="reject-reason"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Rejection Reason (min 10 chars) *
                                </Label>
                                <Textarea
                                    id="reject-reason"
                                    value={rejectForm.data.decision_reason}
                                    onChange={(e) =>
                                        rejectForm.setData(
                                            'decision_reason',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                    placeholder="State clear reasons for rejecting this property submission."
                                />
                                {rejectForm.errors.decision_reason && (
                                    <p className="text-xs text-status-error-fg">
                                        {rejectForm.errors.decision_reason}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="reject-internal-notes"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Internal Reviewer Notes
                                </Label>
                                <Textarea
                                    id="reject-internal-notes"
                                    value={
                                        rejectForm.data.internal_reviewer_notes
                                    }
                                    onChange={(e) =>
                                        rejectForm.setData(
                                            'internal_reviewer_notes',
                                            e.target.value,
                                        )
                                    }
                                    rows={2}
                                />
                            </div>
                        </fieldset>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejectOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={rejectForm.processing}
                                loading={rejectForm.processing}
                            >
                                Confirm Rejection
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Operational Status / Suspension Dialog */}
            <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Update Property Operational Status
                        </DialogTitle>
                        <DialogDescription>
                            Suspending or archiving immediately unpublishes
                            public property photos and disables booking
                            eligibility.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={submitOperationalStatus}
                        className="space-y-4"
                    >
                        <fieldset className="space-y-3">
                            <legend className="sr-only">
                                Property operational status and reason
                            </legend>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="op-status-select"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Target Operational Status *
                                </Label>
                                <Select
                                    value={operationalForm.data.status}
                                    onValueChange={(value) =>
                                        operationalForm.setData(
                                            'status',
                                            value as PropertyOperationalStatus,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="op-status-select"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {operationalChoices.map((choice) => (
                                            <SelectItem
                                                key={choice.value}
                                                value={choice.value}
                                            >
                                                {choice.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {operationalForm.errors.status && (
                                    <p className="text-xs text-status-error-fg">
                                        {operationalForm.errors.status}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="op-status-reason"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Reason{' '}
                                    {operationalForm.data.status === 'suspended'
                                        ? '* (min 10 chars)'
                                        : '(optional, min 10 chars if entered)'}
                                </Label>
                                <Textarea
                                    id="op-status-reason"
                                    value={operationalForm.data.reason}
                                    onChange={(e) =>
                                        operationalForm.setData(
                                            'reason',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                    placeholder="Document audit context for suspending, reopening, or archiving this property."
                                />
                                {operationalForm.errors.reason && (
                                    <p className="text-xs text-status-error-fg">
                                        {operationalForm.errors.reason}
                                    </p>
                                )}
                            </div>
                        </fieldset>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStatusModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                disabled={operationalForm.processing}
                                loading={operationalForm.processing}
                            >
                                Save Operational Status
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminPropertyShow.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard() },
        { title: 'Property Verification', href: propertiesIndex() },
        { title: 'Property Review', href: propertiesIndex() },
    ],
};
