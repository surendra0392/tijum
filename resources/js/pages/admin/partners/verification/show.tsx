import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Download,
    ExternalLink,
    FileCheck2,
    FileText,
    History,
    Lock,
    MapPin,
    PlayCircle,
    ShieldCheck,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    applicationStatusBadgeMap,
    documentStatusBadgeMap,
    formatIsoDateTime,
} from '@/components/owner/onboarding/status-helpers';
import { EmptyState } from '@/components/shared/empty-state';
import { FormField } from '@/components/shared/form-field';
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
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/admin';
import {
    approve,
    assign,
    history as historyRoute,
    index as partnersIndex,
    reject,
    requestInformation,
    show as showRoute,
    startReview,
} from '@/routes/admin/partners';
import type {
    CityOption,
    OwnerBusinessProfileData,
    OwnerVerificationDocumentData,
    OwnerVerificationDocumentType,
    OwnerVerificationStatus,
    VerificationEventData,
} from '@/types';

type AdminShowProps = {
    application: {
        id: number;
        application_number: string;
        status: OwnerVerificationStatus;
        status_label: string;
        revision_number: number;
        declaration_version: string | null;
        declaration_accepted_at: string | null;
        submitted_at: string | null;
        reviewed_at: string | null;
        requested_information: string | null;
        requested_changes: {
            required_profile_changes?: string[];
            required_document_types?: OwnerVerificationDocumentType[];
        };
        decision_reason: string | null;
        internal_reviewer_notes: string | null;
        assigned_admin_id: number | null;
        assigned_reviewer_name: string | null;
        reviewed_by_name: string | null;
        created_at: string | null;
        updated_at: string | null;
        owner: {
            id: number;
            name: string;
            email: string;
            phone: string | null;
            status: string;
            status_label: string;
            email_verified: boolean;
            email_verified_at: string | null;
            approved_at: string | null;
            created_at: string | null;
        };
        active_documents_count: number;
    };
    businessProfile: OwnerBusinessProfileData | null;
    operatingCities: CityOption[];
    evaluation: {
        email_verified: boolean;
        business_profile_complete: boolean;
        operating_cities_complete: boolean;
        documents_complete: boolean;
        ready_for_submission: boolean;
        missing_requirements: string[];
        checklist: {
            type: OwnerVerificationDocumentType;
            label: string;
            required: boolean;
            fulfilled: boolean;
        }[];
    };
    documents: OwnerVerificationDocumentData[];
    events: VerificationEventData[];
    assignableAdmins: {
        id: number;
        name: string;
        role: string;
        role_label: string;
    }[];
    documentTypes: { value: OwnerVerificationDocumentType; label: string }[];
    capabilities: {
        canAssign: boolean;
        canStartReview: boolean;
        canRequestInformation: boolean;
        canApprove: boolean;
        canReject: boolean;
        canViewDocuments: boolean;
    };
    status?: string;
};

export default function AdminPartnerVerificationShow({
    application,
    businessProfile,
    operatingCities,
    evaluation,
    documents,
    events,
    assignableAdmins,
    documentTypes,
    capabilities,
    status,
}: AdminShowProps) {
    const [requestInfoOpen, setRequestInfoOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [startingReview, setStartingReview] = useState(false);

    const requiredChecklistItems = evaluation.checklist.filter(
        (item) => item.required,
    );
    const fulfilledRequiredCount = requiredChecklistItems.filter(
        (item) => item.fulfilled,
    ).length;

    const assignForm = useForm<{ assigned_admin_id: string }>({
        assigned_admin_id: application.assigned_admin_id
            ? String(application.assigned_admin_id)
            : 'unassigned',
    });

    const requestInfoForm = useForm<{
        requested_information: string;
        required_profile_changes: string[];
        required_document_types: OwnerVerificationDocumentType[];
        internal_reviewer_notes: string;
    }>({
        requested_information: '',
        required_profile_changes: [],
        required_document_types: [],
        internal_reviewer_notes: '',
    });

    const approveForm = useForm<{
        decision_reason: string;
        internal_reviewer_notes: string;
    }>({
        decision_reason: '',
        internal_reviewer_notes: '',
    });

    const rejectForm = useForm<{
        decision_reason: string;
        internal_reviewer_notes: string;
    }>({
        decision_reason: '',
        internal_reviewer_notes: '',
    });

    const handleAssign = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextId =
            assignForm.data.assigned_admin_id === 'unassigned'
                ? null
                : Number(assignForm.data.assigned_admin_id);

        router.post(
            assign.url(application.id),
            { assigned_admin_id: nextId },
            { preserveScroll: true },
        );
    };

    const handleStartReview = () => {
        setStartingReview(true);
        router.post(
            startReview.url(application.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setStartingReview(false),
            },
        );
    };

    const handleRequestInfo = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        requestInfoForm.post(requestInformation.url(application.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRequestInfoOpen(false);
                requestInfoForm.reset();
            },
        });
    };

    const handleApprove = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        approveForm.post(approve.url(application.id), {
            preserveScroll: true,
            onSuccess: () => {
                setApproveOpen(false);
                approveForm.reset();
            },
        });
    };

    const handleReject = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        rejectForm.post(reject.url(application.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRejectOpen(false);
                rejectForm.reset();
            },
        });
    };

    const toggleProfileChangeItem = (label: string) => {
        const current = requestInfoForm.data.required_profile_changes;
        requestInfoForm.setData(
            'required_profile_changes',
            current.includes(label)
                ? current.filter((x) => x !== label)
                : [...current, label],
        );
    };

    const toggleRequiredDocType = (docType: OwnerVerificationDocumentType) => {
        const current = requestInfoForm.data.required_document_types;
        requestInfoForm.setData(
            'required_document_types',
            current.includes(docType)
                ? current.filter((x) => x !== docType)
                : [...current, docType],
        );
    };

    return (
        <>
            <Head
                title={`${application.application_number} · Partner Verification Review`}
            />

            <div className="space-y-6">
                {status === 'application-approved' && (
                    <Alert
                        variant="success"
                        className="border-l-4 border-l-emerald-500 shadow-tijum-card"
                    >
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>Partner application approved</AlertTitle>
                        <AlertDescription>
                            Owner account {application.owner.name} is now
                            Active. Individual properties will still require
                            separate property verification in Phase 06.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'application-rejected' && (
                    <Alert className="border-l-4 border-l-tijum-coral shadow-tijum-card">
                        <XCircle aria-hidden="true" />
                        <AlertTitle>Application rejected</AlertTitle>
                        <AlertDescription>
                            Documented rejection feedback has been saved and
                            sent to the owner without blocking portal sign-in.
                        </AlertDescription>
                    </Alert>
                )}

                <PageHeader
                    eyebrow="TIJUM Partner Verification Review"
                    title={
                        businessProfile?.display_business_name ??
                        application.owner.name
                    }
                    description={`Application ${application.application_number} · Revision #${application.revision_number} · Submitted ${formatIsoDateTime(application.submitted_at)}`}
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
                            <Badge variant="plum">
                                Owner Status: {application.owner.status_label}
                            </Badge>
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={historyRoute.url(application.id)}>
                                    <History aria-hidden="true" />
                                    <span>Full Audit History</span>
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={partnersIndex.url()}>
                                    <ArrowLeft aria-hidden="true" />
                                    <span>Back to Queue</span>
                                </Link>
                            </Button>
                        </div>
                    }
                />

                {!capabilities.canViewDocuments && (
                    <Alert
                        variant="warning"
                        className="border-l-4 border-l-amber-500 shadow-tijum-card"
                    >
                        <Lock aria-hidden="true" />
                        <AlertTitle>
                            Read-only verification summary view
                        </AlertTitle>
                        <AlertDescription>
                            Your administrator role permits inspecting partner
                            status and operating cities, while private
                            verification documents and decision actions require
                            Property Verification or Super Admin privileges.
                        </AlertDescription>
                    </Alert>
                )}

                <section
                    aria-label="Partner application readiness metrics"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        label="Application Revision"
                        value={`Rev #${application.revision_number}`}
                        helperText={
                            application.submitted_at
                                ? `Submitted ${formatIsoDateTime(application.submitted_at)}`
                                : 'Submission timestamp pending'
                        }
                        icon={FileCheck2}
                    />
                    <StatCard
                        label="Checklist Readiness"
                        value={`${fulfilledRequiredCount}/${requiredChecklistItems.length}`}
                        helperText={
                            evaluation.ready_for_submission
                                ? 'All required checks satisfied'
                                : `${evaluation.missing_requirements.length} requirement(s) open`
                        }
                        icon={ClipboardCheck}
                    />
                    <StatCard
                        label="Operating Cities"
                        value={operatingCities.length}
                        helperText={
                            evaluation.operating_cities_complete
                                ? 'Launch city coverage set'
                                : 'City selection incomplete'
                        }
                        icon={MapPin}
                    />
                    <StatCard
                        label="Active Documents"
                        value={application.active_documents_count}
                        helperText={
                            evaluation.documents_complete
                                ? 'Required documents uploaded'
                                : 'Documents incomplete'
                        }
                        icon={FileText}
                    />
                </section>

                <Card className="border-t-4 border-t-tijum-coral">
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                <ShieldCheck
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-1">
                                <CardTitle className="text-lg">
                                    Verification Review Workbench
                                </CardTitle>
                                <CardDescription>
                                    All transitions are validated server-side,
                                    transactional, and logged to the append-only
                                    audit history.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            {capabilities.canAssign && (
                                <form
                                    onSubmit={handleAssign}
                                    className="flex flex-wrap items-end gap-2.5"
                                >
                                    <div className="w-full space-y-1.5 sm:w-72">
                                        <Label
                                            htmlFor="assigned-admin-select"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Assigned Verification Reviewer
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
                                                id="assigned-admin-select"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Unassigned" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">
                                                    Unassigned
                                                </SelectItem>
                                                {assignableAdmins.map(
                                                    (candidate) => (
                                                        <SelectItem
                                                            key={candidate.id}
                                                            value={String(
                                                                candidate.id,
                                                            )}
                                                        >
                                                            {candidate.name} (
                                                            {
                                                                candidate.role_label
                                                            }
                                                            )
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        data-test="assign-reviewer-button"
                                    >
                                        Update Assignee
                                    </Button>
                                </form>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                                {capabilities.canStartReview && (
                                    <Button
                                        type="button"
                                        variant="plum"
                                        loading={startingReview}
                                        onClick={handleStartReview}
                                        data-test="start-review-button"
                                    >
                                        <PlayCircle aria-hidden="true" />
                                        <span>Start Review</span>
                                    </Button>
                                )}

                                {capabilities.canRequestInformation && (
                                    <Dialog
                                        open={requestInfoOpen}
                                        onOpenChange={setRequestInfoOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                data-test="open-request-info-dialog"
                                            >
                                                <AlertTriangle aria-hidden="true" />
                                                <span>Request Information</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                                            <form
                                                onSubmit={handleRequestInfo}
                                                className="space-y-4"
                                            >
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Request Additional
                                                        Information
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Notify{' '}
                                                        {application.owner.name}{' '}
                                                        with clear correction
                                                        items. Moves application
                                                        to Needs Information.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <FormField
                                                    id="requested_information"
                                                    label="Instructions for Partner"
                                                    required
                                                    error={
                                                        requestInfoForm.errors
                                                            .requested_information
                                                    }
                                                >
                                                    {(a11yProps) => (
                                                        <Textarea
                                                            {...a11yProps}
                                                            rows={3}
                                                            required
                                                            value={
                                                                requestInfoForm
                                                                    .data
                                                                    .requested_information
                                                            }
                                                            placeholder="Explain which profile field or document needs clarification or replacement."
                                                            onChange={(e) =>
                                                                requestInfoForm.setData(
                                                                    'requested_information',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </FormField>

                                                <div className="space-y-2">
                                                    <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                        Profile updates needed
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            'Business Legal Name',
                                                            'Correspondence Address',
                                                            'Authorised Contact Details',
                                                            'Operating Cities Selection',
                                                        ].map(
                                                            (label, index) => {
                                                                const fieldId = `req-profile-change-${index}`;
                                                                const checked =
                                                                    requestInfoForm.data.required_profile_changes.includes(
                                                                        label,
                                                                    );

                                                                return (
                                                                    <label
                                                                        key={
                                                                            label
                                                                        }
                                                                        htmlFor={
                                                                            fieldId
                                                                        }
                                                                        className={cn(
                                                                            'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                                                                            checked
                                                                                ? 'border-tijum-coral bg-tijum-cream text-tijum-plum dark:border-tijum-coral dark:bg-tijum-coral/15 dark:text-foreground'
                                                                                : 'border-tijum-surface/80 bg-tijum-cream/40 text-tijum-plum hover:border-tijum-coral/50 dark:border-border dark:bg-muted/45 dark:text-foreground dark:hover:border-tijum-coral/50',
                                                                        )}
                                                                    >
                                                                        <Checkbox
                                                                            id={
                                                                                fieldId
                                                                            }
                                                                            name="required_profile_changes[]"
                                                                            checked={
                                                                                checked
                                                                            }
                                                                            onCheckedChange={() =>
                                                                                toggleProfileChangeItem(
                                                                                    label,
                                                                                )
                                                                            }
                                                                        />
                                                                        <span>
                                                                            {
                                                                                label
                                                                            }
                                                                        </span>
                                                                    </label>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                        Flag document categories
                                                        for replacement
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {documentTypes.map(
                                                            (dt) => {
                                                                const docFieldId = `req-doc-type-${dt.value}`;
                                                                const checked =
                                                                    requestInfoForm.data.required_document_types.includes(
                                                                        dt.value,
                                                                    );

                                                                return (
                                                                    <label
                                                                        key={
                                                                            dt.value
                                                                        }
                                                                        htmlFor={
                                                                            docFieldId
                                                                        }
                                                                        className={cn(
                                                                            'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                                                                            checked
                                                                                ? 'border-tijum-coral bg-tijum-cream text-tijum-plum dark:border-tijum-coral dark:bg-tijum-coral/15 dark:text-foreground'
                                                                                : 'border-tijum-surface/80 bg-tijum-cream/40 text-tijum-plum hover:border-tijum-coral/50 dark:border-border dark:bg-muted/45 dark:text-foreground dark:hover:border-tijum-coral/50',
                                                                        )}
                                                                    >
                                                                        <Checkbox
                                                                            id={
                                                                                docFieldId
                                                                            }
                                                                            name="required_document_types[]"
                                                                            checked={
                                                                                checked
                                                                            }
                                                                            onCheckedChange={() =>
                                                                                toggleRequiredDocType(
                                                                                    dt.value,
                                                                                )
                                                                            }
                                                                        />
                                                                        <span>
                                                                            {
                                                                                dt.label
                                                                            }
                                                                        </span>
                                                                    </label>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>

                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            autoFocus
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        type="submit"
                                                        loading={
                                                            requestInfoForm.processing
                                                        }
                                                    >
                                                        Send Request
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                )}

                                {capabilities.canApprove && (
                                    <Dialog
                                        open={approveOpen}
                                        onOpenChange={setApproveOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                disabled={
                                                    !evaluation.ready_for_submission
                                                }
                                                data-test="open-approve-dialog"
                                            >
                                                <ShieldCheck aria-hidden="true" />
                                                <span>Approve Partner</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <form
                                                onSubmit={handleApprove}
                                                className="space-y-4"
                                            >
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Approve TIJUM Partner
                                                        Application?
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Approving transitions{' '}
                                                        {application.owner.name}{' '}
                                                        to Active partner
                                                        status. Individual
                                                        properties will still
                                                        require separate Phase
                                                        06 property
                                                        verification.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="rounded-xl border border-status-success-border bg-status-success-bg px-3.5 py-2.5 text-xs leading-relaxed text-status-success-fg">
                                                    <strong className="font-heading font-semibold">
                                                        {
                                                            application.application_number
                                                        }
                                                    </strong>{' '}
                                                    · All mandatory checklist
                                                    requirements are fulfilled
                                                    for{' '}
                                                    {businessProfile?.display_business_name ??
                                                        application.owner.name}
                                                    .
                                                </div>

                                                <FormField
                                                    id="approve_decision_reason"
                                                    label="Approval Note (Optional)"
                                                    error={
                                                        (
                                                            approveForm.errors as Record<
                                                                string,
                                                                | string
                                                                | undefined
                                                            >
                                                        ).application ??
                                                        approveForm.errors
                                                            .decision_reason
                                                    }
                                                >
                                                    {(a11yProps) => (
                                                        <Textarea
                                                            {...a11yProps}
                                                            rows={2}
                                                            value={
                                                                approveForm.data
                                                                    .decision_reason
                                                            }
                                                            placeholder="All partner identity, entity, city, and document checks verified."
                                                            onChange={(e) =>
                                                                approveForm.setData(
                                                                    'decision_reason',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </FormField>

                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            autoFocus
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        type="submit"
                                                        loading={
                                                            approveForm.processing
                                                        }
                                                        data-test="confirm-approve-partner"
                                                    >
                                                        Confirm Approval
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                )}

                                {capabilities.canReject && (
                                    <Dialog
                                        open={rejectOpen}
                                        onOpenChange={setRejectOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                data-test="open-reject-dialog"
                                            >
                                                <XCircle aria-hidden="true" />
                                                <span>Reject Application</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <form
                                                onSubmit={handleReject}
                                                className="space-y-4"
                                            >
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Reject Partner
                                                        Application?
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Requires a documented
                                                        reason visible to the
                                                        owner. Does not
                                                        automatically lock
                                                        portal login unless
                                                        account-level rejection
                                                        is applied separately.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="rounded-xl border border-status-error-border bg-status-error-bg px-3.5 py-2.5 text-xs leading-relaxed text-status-error-fg">
                                                    Rejecting{' '}
                                                    <strong className="font-heading font-semibold">
                                                        {
                                                            application.application_number
                                                        }
                                                    </strong>{' '}
                                                    records a formal decision
                                                    entry in the immutable
                                                    verification audit log.
                                                </div>

                                                <FormField
                                                    id="reject_decision_reason"
                                                    label="Documented Rejection Reason"
                                                    required
                                                    error={
                                                        rejectForm.errors
                                                            .decision_reason
                                                    }
                                                >
                                                    {(a11yProps) => (
                                                        <Textarea
                                                            {...a11yProps}
                                                            rows={3}
                                                            required
                                                            value={
                                                                rejectForm.data
                                                                    .decision_reason
                                                            }
                                                            placeholder="Explain clearly why this submission did not pass verification."
                                                            onChange={(e) =>
                                                                rejectForm.setData(
                                                                    'decision_reason',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </FormField>

                                                <FormField
                                                    id="reject_internal_notes"
                                                    label="Internal Reviewer Notes (Admin Only)"
                                                    error={
                                                        rejectForm.errors
                                                            .internal_reviewer_notes
                                                    }
                                                >
                                                    {(a11yProps) => (
                                                        <Textarea
                                                            {...a11yProps}
                                                            rows={2}
                                                            value={
                                                                rejectForm.data
                                                                    .internal_reviewer_notes
                                                            }
                                                            placeholder="Never shared with owners."
                                                            onChange={(e) =>
                                                                rejectForm.setData(
                                                                    'internal_reviewer_notes',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </FormField>

                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            autoFocus
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        type="submit"
                                                        variant="destructive"
                                                        loading={
                                                            rejectForm.processing
                                                        }
                                                        data-test="confirm-reject-partner"
                                                    >
                                                        Confirm Rejection
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </div>

                        {!evaluation.ready_for_submission && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs leading-relaxed text-status-warning-fg">
                                <AlertTriangle
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <p>
                                    <strong className="font-heading font-semibold">
                                        Completeness checks:
                                    </strong>{' '}
                                    {evaluation.missing_requirements.join(' ')}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList
                        variant="pill"
                        label="Application review sections"
                    >
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="business">
                            Business Profile
                        </TabsTrigger>
                        <TabsTrigger value="cities">
                            Operating Cities ({operatingCities.length})
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                            Documents ({documents.length})
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            Audit History ({events.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                            <UserCheck
                                                className="size-4.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <CardTitle className="text-base">
                                            Owner Identity
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <dl className="space-y-2.5 text-sm">
                                        <div className="flex justify-between gap-3 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Owner name
                                            </dt>
                                            <dd className="text-right font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {application.owner.name}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Email
                                            </dt>
                                            <dd className="text-right break-all text-tijum-plum dark:text-foreground">
                                                {application.owner.email}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Email verification
                                            </dt>
                                            <dd className="text-right">
                                                <StatusBadge
                                                    status={
                                                        application.owner
                                                            .email_verified
                                                            ? 'verified'
                                                            : 'pending'
                                                    }
                                                    label={
                                                        application.owner
                                                            .email_verified
                                                            ? 'Verified'
                                                            : 'Unverified'
                                                    }
                                                />
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Phone
                                            </dt>
                                            <dd className="text-right text-tijum-plum tabular-nums dark:text-foreground">
                                                {application.owner.phone ?? '—'}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Assigned reviewer
                                            </dt>
                                            <dd className="text-right font-medium text-tijum-plum dark:text-foreground">
                                                {application.assigned_reviewer_name ??
                                                    'Unassigned'}
                                            </dd>
                                        </div>
                                    </dl>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                            <ClipboardCheck
                                                className="size-4.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <CardTitle className="text-base">
                                            Verification Checklist Status
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2.5 text-sm">
                                    {evaluation.checklist.map((item) => (
                                        <div
                                            key={item.type}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 dark:border-border dark:bg-muted/45"
                                        >
                                            <span className="font-medium text-tijum-plum dark:text-foreground">
                                                {item.label}{' '}
                                                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    (
                                                    {item.required
                                                        ? 'Required'
                                                        : 'Optional'}
                                                    )
                                                </span>
                                            </span>
                                            <StatusBadge
                                                status={
                                                    item.fulfilled
                                                        ? 'verified'
                                                        : item.required
                                                          ? 'pending'
                                                          : 'neutral'
                                                }
                                                label={
                                                    item.fulfilled
                                                        ? 'Uploaded'
                                                        : item.required
                                                          ? 'Missing'
                                                          : 'Not Provided'
                                                }
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {(application.declaration_accepted_at ||
                            application.reviewed_at ||
                            application.requested_information ||
                            application.decision_reason ||
                            application.internal_reviewer_notes) && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                            <FileCheck2
                                                className="size-4.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <CardTitle className="text-base">
                                            Declaration &amp; Review Context
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Partner Declaration
                                            </p>
                                            <p className="mt-1 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                {application.declaration_accepted_at
                                                    ? `Accepted ${formatIsoDateTime(application.declaration_accepted_at)}`
                                                    : 'Not yet accepted'}
                                                {application.declaration_version
                                                    ? ` (${application.declaration_version})`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Last Decision / Review
                                            </p>
                                            <p className="mt-1 font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                {application.reviewed_by_name ??
                                                    'Pending'}{' '}
                                                {application.reviewed_at
                                                    ? `· ${formatIsoDateTime(application.reviewed_at)}`
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {application.requested_information && (
                                        <div className="rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs leading-relaxed text-status-warning-fg">
                                            <p className="font-heading font-semibold">
                                                Requested Information
                                            </p>
                                            <p className="mt-1">
                                                {
                                                    application.requested_information
                                                }
                                            </p>
                                            {(application.requested_changes
                                                ?.required_profile_changes
                                                ?.length ||
                                                application.requested_changes
                                                    ?.required_document_types
                                                    ?.length) && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {application.requested_changes.required_profile_changes?.map(
                                                        (change) => (
                                                            <Badge
                                                                key={change}
                                                                variant="outline"
                                                                className="text-[11px]"
                                                            >
                                                                {change}
                                                            </Badge>
                                                        ),
                                                    )}
                                                    {application.requested_changes.required_document_types?.map(
                                                        (docType) => (
                                                            <Badge
                                                                key={docType}
                                                                variant="outline"
                                                                className="text-[11px]"
                                                            >
                                                                {docType}
                                                            </Badge>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {application.decision_reason && (
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-4 py-3 text-xs leading-relaxed text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                            <p className="font-heading font-semibold">
                                                Decision Note
                                            </p>
                                            <p className="mt-1">
                                                {application.decision_reason}
                                            </p>
                                        </div>
                                    )}

                                    {application.internal_reviewer_notes && (
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-4 py-3 text-xs leading-relaxed text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                Internal Reviewer Notes (Admin
                                                Only)
                                            </p>
                                            <p className="mt-1">
                                                {
                                                    application.internal_reviewer_notes
                                                }
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="business">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                        <Building2
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <CardTitle className="text-base">
                                        Business Profile Details
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!businessProfile ? (
                                    <EmptyState
                                        icon={Building2}
                                        title="No business profile submitted"
                                        description="The partner owner has not saved a business profile for this verification application yet."
                                        className="shadow-none"
                                    />
                                ) : (
                                    <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Entity Structure
                                            </dt>
                                            <dd className="mt-1 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {
                                                    businessProfile.entity_type_label
                                                }
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Display Business Name
                                            </dt>
                                            <dd className="mt-1 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {
                                                    businessProfile.display_business_name
                                                }
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Legal Business Name
                                            </dt>
                                            <dd className="mt-1 text-tijum-plum dark:text-foreground">
                                                {businessProfile.legal_business_name ??
                                                    '—'}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Authorised Contact
                                            </dt>
                                            <dd className="mt-1 text-tijum-plum dark:text-foreground">
                                                {
                                                    businessProfile.primary_contact_name
                                                }
                                                {businessProfile.primary_contact_designation
                                                    ? ` (${businessProfile.primary_contact_designation})`
                                                    : ''}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Business Email
                                            </dt>
                                            <dd className="mt-1 break-all text-tijum-plum dark:text-foreground">
                                                {businessProfile.business_email ??
                                                    '—'}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Website
                                            </dt>
                                            <dd className="mt-1 break-all text-tijum-plum dark:text-foreground">
                                                {businessProfile.website_url ??
                                                    '—'}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 sm:col-span-2 lg:col-span-3 dark:border-border dark:bg-muted/45">
                                            <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Correspondence Address
                                            </dt>
                                            <dd className="mt-1 text-tijum-plum dark:text-foreground">
                                                {[
                                                    businessProfile.business_address_line_1,
                                                    businessProfile.business_address_line_2,
                                                    businessProfile.locality,
                                                    businessProfile.city,
                                                    businessProfile.state,
                                                    businessProfile.postal_code,
                                                    businessProfile.country_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </dd>
                                        </div>
                                        {businessProfile.description && (
                                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 sm:col-span-2 lg:col-span-3 dark:border-border dark:bg-muted/45">
                                                <dt className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                    Business Description
                                                </dt>
                                                <dd className="mt-1 leading-relaxed text-tijum-plum dark:text-foreground">
                                                    {
                                                        businessProfile.description
                                                    }
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cities">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                        <MapPin
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <CardTitle className="text-base">
                                        Intended Launch Operating Cities
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {operatingCities.length === 0 ? (
                                    <EmptyState
                                        icon={MapPin}
                                        title="No operating cities selected"
                                        description="No launch operating cities have been selected by this partner account."
                                        className="shadow-none"
                                    />
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        {operatingCities.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-4 py-3 dark:border-border dark:bg-muted/45"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                        {c.name}
                                                    </p>
                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        {c.state}
                                                    </p>
                                                </div>
                                                <Badge variant="peach">
                                                    {c.state_code ??
                                                        c.country_code}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documents">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                        <FileText
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">
                                            Private Verification Documents
                                        </CardTitle>
                                        <CardDescription>
                                            Every admin document access is
                                            recorded in verification history.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!capabilities.canViewDocuments ? (
                                    <EmptyState
                                        icon={Lock}
                                        title="Restricted Document Access"
                                        description="Document viewing and downloading are restricted to Super Admin and Property Verification roles."
                                        className="shadow-none"
                                    />
                                ) : documents.length === 0 ? (
                                    <EmptyState
                                        icon={FileText}
                                        title="No documents uploaded"
                                        description="No documents have been uploaded for this verification application yet."
                                        className="shadow-none"
                                    />
                                ) : (
                                    <ul className="space-y-3">
                                        {documents.map((doc) => (
                                            <li
                                                key={doc.id}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-4 py-3.5 text-sm dark:border-border dark:bg-muted/45"
                                            >
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                                        <FileText
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                    <div className="min-w-0 space-y-1">
                                                        <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                            {
                                                                doc.document_type_label
                                                            }
                                                        </p>
                                                        <p className="truncate text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                            {
                                                                doc.original_filename
                                                            }{' '}
                                                            · {doc.mime_type} ·{' '}
                                                            {
                                                                doc.file_size_label
                                                            }
                                                        </p>
                                                        {doc.reviewer_note && (
                                                            <p className="rounded-lg border border-status-error-border bg-status-error-bg px-2.5 py-1.5 text-xs text-status-error-fg">
                                                                <strong>
                                                                    Note:
                                                                </strong>{' '}
                                                                {
                                                                    doc.reviewer_note
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge
                                                        status={
                                                            documentStatusBadgeMap[
                                                                doc.status
                                                            ] ?? 'neutral'
                                                        }
                                                        label={doc.status_label}
                                                    />
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
                                                                rel="noopener noreferrer"
                                                            >
                                                                <span>
                                                                    View
                                                                </span>
                                                                <ExternalLink aria-hidden="true" />
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
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
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
                                        <CardTitle className="text-base">
                                            Verification Audit Log
                                        </CardTitle>
                                        <CardDescription>
                                            Chronological trail of submissions,
                                            reviewer actions, document views,
                                            and status transitions.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {events.length === 0 ? (
                                    <EmptyState
                                        icon={History}
                                        title="No audit events recorded yet"
                                        description="Submission, assignment, document access, and decision events will appear here chronologically."
                                        className="shadow-none"
                                    />
                                ) : (
                                    <ol className="relative space-y-4 before:absolute before:top-4 before:bottom-4 before:left-4 before:w-px before:bg-tijum-surface/80 dark:before:bg-border">
                                        {events.map((ev) => (
                                            <li
                                                key={ev.id}
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
                                                        <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                            {ev.event_label}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-surface/80 bg-card px-2.5 py-0.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-card dark:text-muted-foreground">
                                                            <Clock
                                                                className="size-3.5 text-tijum-coral"
                                                                aria-hidden="true"
                                                            />
                                                            {formatIsoDateTime(
                                                                ev.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {ev.notes && (
                                                        <p className="mt-2 rounded-lg border border-tijum-surface/70 bg-card px-3 py-2 text-xs leading-relaxed text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                            {ev.notes}
                                                        </p>
                                                    )}
                                                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                        <span className="rounded-md border border-tijum-surface/80 bg-card px-2 py-0.5 font-medium text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                            Actor:{' '}
                                                            {ev.actor_name ??
                                                                'System'}{' '}
                                                            ({ev.actor_type})
                                                        </span>
                                                        {(ev.previous_status ||
                                                            ev.new_status) && (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-tijum-surface/80 bg-card px-2 py-0.5 font-medium text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                                                <span>
                                                                    {ev.previous_status ??
                                                                        'none'}
                                                                </span>
                                                                <ArrowRight
                                                                    className="size-3 text-tijum-coral"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    {ev.new_status ??
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
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

AdminPartnerVerificationShow.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard() },
        { title: 'Partner Verification', href: partnersIndex() },
        { title: 'Review Application', href: showRoute.url(0) },
    ],
};
