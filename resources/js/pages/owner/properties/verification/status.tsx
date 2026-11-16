import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    FileText,
    History,
    RefreshCw,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    documentStatusBadgeMap,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import { propertyVerificationStatusMap } from '@/components/owner/properties/property-status-helpers';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { FileUploadField, FormField } from '@/components/shared/form-field';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes/owner';
import {
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import { cancel as cancelAmendmentRoute } from '@/routes/owner/properties/amendment';
import {
    destroy as deleteDocRoute,
    store as uploadDocRoute,
} from '@/routes/owner/properties/verification/documents';
import {
    show as verificationShowRoute,
    startRevision as startRevisionRoute,
    submit as submitVerificationRoute,
    withdraw as withdrawVerificationRoute,
} from '@/routes/owner/properties/verification';
import type {
    PropertyChecklistDocumentItem,
    PropertySummaryData,
    PropertyVerificationApplicationData,
    PropertyVerificationDocumentData,
    PropertyVerificationEvaluation,
    VerificationEventData,
} from '@/types';

type PropertyVerificationPageProps = {
    property: PropertySummaryData;
    application: PropertyVerificationApplicationData | null;
    applicationsHistory: PropertyVerificationApplicationData[];
    evaluation: PropertyVerificationEvaluation;
    replacedDocuments: PropertyVerificationDocumentData[];
    events: VerificationEventData[];
    maxDocumentSizeMb: number;
    declarationVersion: string;
};

function PropertyChecklistDocCard({
    propertyId,
    item,
    isEditable,
    maxDocumentSizeMb,
}: {
    propertyId: number;
    item: PropertyChecklistDocumentItem;
    isEditable: boolean;
    maxDocumentSizeMb: number;
}) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const uploadForm = useForm({
        document_type: item.type,
        document: null as File | null,
    });

    const handleUpload = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFile) {
            return;
        }
        uploadForm.setData('document', selectedFile);
        uploadForm.post(uploadDocRoute.url(propertyId), {
            forceFormData: true,
            onSuccess: () => setSelectedFile(null),
        });
    };

    const handleDelete = () => {
        if (!item.document) {
            return;
        }
        setBusy(true);
        router.delete(deleteDocRoute.url([propertyId, item.document.id]), {
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                setConfirmDelete(false);
            },
        });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText
                                className="size-4 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>{item.label}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {item.guidance}
                        </CardDescription>
                    </div>
                    <Badge variant={item.required ? 'plum' : 'outline'}>
                        {item.required ? 'Required' : 'Optional'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {item.document ? (
                    <div className="space-y-2 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3.5 text-xs dark:border-border dark:bg-muted/45">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-heading font-semibold wrap-anywhere text-tijum-plum dark:text-foreground">
                                {item.document.original_filename}
                            </span>
                            <StatusBadge
                                status={
                                    documentStatusBadgeMap[item.document.status]
                                }
                                label={item.document.status_label}
                            />
                        </div>
                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                            {item.document.file_size_label} · Uploaded{' '}
                            {formatIsoDateTime(item.document.created_at)}
                        </p>
                        {item.document.reviewer_note && (
                            <p className="rounded-lg bg-status-error-bg p-2 text-status-error-fg">
                                Reviewer note: {item.document.reviewer_note}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {item.document.preview_url && (
                                <Button size="sm" variant="outline" asChild>
                                    <a
                                        href={item.document.preview_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink aria-hidden="true" />
                                        <span>Preview</span>
                                    </a>
                                </Button>
                            )}
                            {item.document.download_url && (
                                <Button size="sm" variant="outline" asChild>
                                    <a href={item.document.download_url}>
                                        <Download aria-hidden="true" />
                                        <span>Download</span>
                                    </a>
                                </Button>
                            )}
                            {isEditable && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <Trash2 aria-hidden="true" />
                                    <span>Remove</span>
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        No file uploaded yet.
                    </p>
                )}

                {isEditable && (
                    <form onSubmit={handleUpload} className="space-y-3">
                        <FileUploadField
                            id={`prop-doc-${item.type}`}
                            name="document"
                            label={
                                item.document
                                    ? `Replace ${item.label}`
                                    : `Upload ${item.label}`
                            }
                            accept=".pdf,.jpg,.jpeg,.png"
                            hint={`PDF, JPG, JPEG, or PNG (max ${maxDocumentSizeMb} MB). Stored privately on the server.`}
                            error={uploadForm.errors.document}
                            onFileChange={(file) => {
                                setSelectedFile(file);
                                uploadForm.setData('document', file);
                            }}
                        />
                        {selectedFile && (
                            <Button
                                type="submit"
                                size="sm"
                                loading={uploadForm.processing}
                                data-test={`upload-prop-doc-${item.type}`}
                            >
                                Upload Document
                            </Button>
                        )}
                    </form>
                )}

                <ConfirmationDialog
                    open={confirmDelete}
                    onOpenChange={setConfirmDelete}
                    tone="destructive"
                    title={`Remove ${item.label}?`}
                    description="The private file will be removed from this draft verification revision."
                    confirmLabel="Remove Document"
                    loading={busy}
                    onConfirm={handleDelete}
                />
            </CardContent>
        </Card>
    );
}

export default function PropertyVerificationPage({
    property,
    application,
    applicationsHistory,
    evaluation,
    replacedDocuments,
    events,
    maxDocumentSizeMb,
    declarationVersion,
}: PropertyVerificationPageProps) {
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [cancelAmendmentOpen, setCancelAmendmentOpen] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState('');
    const [busy, setBusy] = useState(false);

    const submitForm = useForm<{
        declaration_accepted: boolean;
        application?: string;
    }>({
        declaration_accepted: false,
    });

    const isEditable = Boolean(application?.is_editable);

    const handleSubmitApplication = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        submitForm.post(submitVerificationRoute.url(property.id));
    };

    const handleWithdraw = () => {
        setBusy(true);
        router.post(
            withdrawVerificationRoute.url(property.id),
            { reason: withdrawReason || undefined },
            {
                onFinish: () => {
                    setBusy(false);
                    setWithdrawOpen(false);
                },
            },
        );
    };

    const handleStartRevision = () => {
        router.post(startRevisionRoute.url(property.id));
    };

    const handleCancelAmendment = () => {
        setBusy(true);
        router.post(
            cancelAmendmentRoute.url(property.id),
            {},
            {
                onFinish: () => {
                    setBusy(false);
                    setCancelAmendmentOpen(false);
                },
            },
        );
    };

    return (
        <>
            <Head title={`Property Verification · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 6 & 7 · ${property.property_reference}`}
                    title={`Property Verification — ${property.name}`}
                    description="Independent property verification operates separately from Phase 05 partner approval. Upload supporting property documents, review readiness checks, and submit for administrative approval."
                    badges={
                        application && (
                            <>
                                <Badge variant="outline">
                                    {application.application_number} · Rev #
                                    {application.revision_number}
                                </Badge>
                                <StatusBadge
                                    status={
                                        propertyVerificationStatusMap[
                                            application.status
                                        ]
                                    }
                                    label={application.status_label}
                                />
                            </>
                        )
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            {application?.can_withdraw && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setWithdrawOpen(true)}
                                >
                                    Withdraw Application
                                </Button>
                            )}
                            {application?.can_cancel_amendment && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setCancelAmendmentOpen(true)}
                                >
                                    Cancel Amendment Draft
                                </Button>
                            )}
                            {application?.can_start_revision && (
                                <Button
                                    type="button"
                                    variant="plum"
                                    onClick={handleStartRevision}
                                    data-test="start-property-revision-btn"
                                >
                                    <RefreshCw aria-hidden="true" />
                                    <span>
                                        {property.has_approved_baseline
                                            ? 'Revise Amendment'
                                            : 'Start New Revision Application'}
                                    </span>
                                </Button>
                            )}
                        </div>
                    }
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="verification"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                {application?.status === 'needs_information' &&
                    application.requested_information && (
                        <Alert variant="warning">
                            <AlertTriangle aria-hidden="true" />
                            <AlertTitle>
                                Clarifications Requested by TIJUM Reviewers
                            </AlertTitle>
                            <AlertDescription className="space-y-1">
                                <p>{application.requested_information}</p>
                                <p className="text-xs">
                                    Update flagged details, photographs, or
                                    documents, then resubmit this application
                                    below.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                {application?.status === 'rejected' &&
                    application.decision_reason && (
                        <Alert variant="destructive">
                            <AlertTitle>
                                Property Application Rejected (
                                {application.application_number})
                            </AlertTitle>
                            <AlertDescription className="space-y-2">
                                <p>{application.decision_reason}</p>
                                {property.has_approved_baseline && (
                                    <p className="text-xs font-medium">
                                        Your previously approved snapshot from
                                        the prior revision remains preserved.
                                    </p>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                {application?.status === 'approved' && (
                    <Alert variant="success">
                        <ShieldCheck aria-hidden="true" />
                        <AlertTitle>
                            Property Verified &amp; Approved
                        </AlertTitle>
                        <AlertDescription>
                            This property has passed TIJUM property verification
                            and approved photographs are published cleanly. Food
                            packages, amenities, pricing, and customer
                            availability launch in upcoming phases.
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Submission Readiness Summary</CardTitle>
                        <CardDescription>
                            Every criterion below is validated server-side
                            before acceptance into the verification review
                            queue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                {
                                    label: 'Partner Account Active',
                                    ok: evaluation.owner_active,
                                },
                                {
                                    label: 'Property Overview & Location',
                                    ok: evaluation.identity_complete,
                                },
                                {
                                    label: `Room Types (${evaluation.room_types_count})`,
                                    ok: evaluation.room_types_count > 0,
                                },
                                {
                                    label: `Physical Rooms (${evaluation.rooms_count})`,
                                    ok: evaluation.rooms_count > 0,
                                },
                                {
                                    label: `Property Photos (${evaluation.property_photos_count}/${evaluation.min_property_photos}) + Cover`,
                                    ok: evaluation.media_complete,
                                },
                                {
                                    label: 'Required Verification Documents',
                                    ok: evaluation.documents_complete,
                                },
                            ].map((row) => (
                                <div
                                    key={row.label}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface bg-tijum-cream/30 px-3.5 py-2.5 text-sm dark:border-border dark:bg-muted/35"
                                >
                                    <span className="font-medium text-tijum-plum dark:text-foreground">
                                        {row.label}
                                    </span>
                                    {row.ok ? (
                                        <CheckCircle2
                                            className="size-4 shrink-0 text-status-success-fg"
                                            aria-label="Complete"
                                        />
                                    ) : (
                                        <Clock
                                            className="size-4 shrink-0 text-status-warning-fg"
                                            aria-label="Pending"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {evaluation.missing_requirements.length > 0 && (
                            <div className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-fg">
                                <p className="mb-1.5 font-heading font-semibold">
                                    Missing Before Submission:
                                </p>
                                <ul className="list-disc space-y-1 pl-4">
                                    {evaluation.missing_requirements.map(
                                        (req) => (
                                            <li key={req}>{req}</li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    {evaluation.checklist.map((item) => (
                        <PropertyChecklistDocCard
                            key={item.type}
                            propertyId={property.id}
                            item={item}
                            isEditable={isEditable}
                            maxDocumentSizeMb={maxDocumentSizeMb}
                        />
                    ))}
                </div>

                {application?.can_submit && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Step 7 · Property Verification Declaration
                            </CardTitle>
                            <CardDescription>
                                Declaration version {declarationVersion} ·
                                Confirms authentic property representation,
                                accurate AC/room configurations, and lawful
                                operating authority.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSubmitApplication}
                                className="space-y-4"
                            >
                                <div className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-4 dark:border-border dark:bg-muted/45">
                                    <Checkbox
                                        id="property-declaration-accepted"
                                        checked={
                                            submitForm.data.declaration_accepted
                                        }
                                        disabled={
                                            !evaluation.ready_for_submission ||
                                            submitForm.processing
                                        }
                                        onCheckedChange={(checked) =>
                                            submitForm.setData(
                                                'declaration_accepted',
                                                checked === true,
                                            )
                                        }
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="property-declaration-accepted"
                                            className="cursor-pointer font-heading text-sm font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            I confirm all property details, room
                                            configurations, physical room
                                            counts, photographs, and legal
                                            verification documents are true and
                                            accurate.
                                        </Label>
                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Submitting moves this revision to
                                            TIJUM administrative verification.
                                            Customer booking eligibility awaits
                                            property approval and future Phase
                                            07–09 meal, amenity, and pricing
                                            setup.
                                        </p>
                                    </div>
                                </div>

                                {(submitForm.errors.declaration_accepted ||
                                    submitForm.errors.application) && (
                                    <p className="text-sm font-medium text-status-error-fg">
                                        {submitForm.errors
                                            .declaration_accepted ??
                                            submitForm.errors.application}
                                    </p>
                                )}

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={
                                            !evaluation.ready_for_submission ||
                                            submitForm.processing
                                        }
                                        loading={submitForm.processing}
                                        data-test="submit-property-verification-btn"
                                    >
                                        <ShieldCheck aria-hidden="true" />
                                        <span>
                                            {application.status ===
                                            'needs_information'
                                                ? 'Resubmit Updated Property Application'
                                                : application.is_amendment
                                                  ? 'Submit Re-Verification Amendment'
                                                  : 'Submit Property for Verification'}
                                        </span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <History
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Verification Audit Timeline</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-2.5">
                                {events.map((evt) => (
                                    <li
                                        key={evt.id}
                                        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-tijum-surface bg-tijum-cream/25 px-3 py-2 text-xs dark:border-border dark:bg-muted/35"
                                    >
                                        <div>
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Revision &amp; Replaced Document History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            {applicationsHistory.map((rev) => (
                                <div
                                    key={rev.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface px-3 py-2 dark:border-border dark:bg-muted/35"
                                >
                                    <div>
                                        <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                            {rev.application_number} (Rev #
                                            {rev.revision_number}
                                            {rev.is_amendment
                                                ? ' · Amendment'
                                                : ''}
                                            )
                                        </p>
                                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                            {rev.submitted_at
                                                ? `Submitted ${formatIsoDateTime(rev.submitted_at)}`
                                                : 'Draft'}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={
                                            propertyVerificationStatusMap[
                                                rev.status
                                            ]
                                        }
                                        label={rev.status_label}
                                    />
                                </div>
                            ))}

                            {replacedDocuments.length > 0 && (
                                <div className="border-t border-tijum-surface pt-3 dark:border-border">
                                    <p className="mb-1.5 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                        Replaced Document History
                                    </p>
                                    {replacedDocuments.map((d) => (
                                        <p
                                            key={d.id}
                                            className="text-tijum-plum-muted dark:text-muted-foreground"
                                        >
                                            {d.document_type_label}:{' '}
                                            {d.original_filename}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <ConfirmationDialog
                    open={withdrawOpen}
                    onOpenChange={setWithdrawOpen}
                    tone="destructive"
                    title="Withdraw Property Application?"
                    description="Withdrawing archives the active application. You can start a new revision later."
                    confirmLabel="Withdraw Application"
                    loading={busy}
                    onConfirm={handleWithdraw}
                />

                <ConfirmationDialog
                    open={cancelAmendmentOpen}
                    onOpenChange={setCancelAmendmentOpen}
                    tone="destructive"
                    title="Cancel Amendment Draft?"
                    description="Discards unsubmitted revision edits and restores the previous approved property snapshot."
                    confirmLabel="Discard Amendment"
                    loading={busy}
                    onConfirm={handleCancelAmendment}
                />

                {withdrawOpen && (
                    <div className="sr-only">
                        <FormField id="withdraw-reason" label="Reason">
                            {(a11y) => (
                                <Textarea
                                    {...a11y}
                                    value={withdrawReason}
                                    onChange={(e) =>
                                        setWithdrawReason(e.target.value)
                                    }
                                />
                            )}
                        </FormField>
                    </div>
                )}
            </div>
        </>
    );
}

PropertyVerificationPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Verification', href: verificationShowRoute(1) },
    ],
};
