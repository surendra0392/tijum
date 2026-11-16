import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Layers,
    Lock,
    MessageSquare,
    Paperclip,
    Send,
    ShieldCheck,
    UserCheck,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ReservationDetail } from '@/types';

interface AdminCaseDetailProps {
    case: {
        id: number;
        case_reference: string;
        category: string;
        category_label: string;
        status: string;
        status_label: string;
        priority: string;
        priority_label: string;
        description: string;
        assigned_admin_id?: number | null;
        assigned_admin_name?: string | null;
        acknowledged_at?: string | null;
        sla_due_at?: string | null;
        is_overdue: boolean;
        resolved_at?: string | null;
        resolution_type?: string | null;
        resolution_summary?: string | null;
        closed_at?: string | null;
        created_at: string;
    };
    reservation: ReservationDetail;
    messages: Array<{
        id: number;
        sender_type: 'customer' | 'owner' | 'admin' | 'system';
        sender_name: string;
        message: string;
        attachment_path?: string | null;
        attachment_name?: string | null;
        is_internal_note: boolean;
        created_at: string;
    }>;
    relocations: Array<{
        id: number;
        status: string;
        status_label: string;
        destination_property_name: string;
        destination_locality?: string | null;
        destination_city_name?: string | null;
        destination_room_type_name: string;
        original_amount_minor: number;
        alternative_amount_minor: number;
        price_difference_minor: number;
        destination_owner_accepted_at?: string | null;
        customer_decision?: string | null;
        customer_decision_at?: string | null;
        offer_expires_at: string;
        is_expired: boolean;
    }>;
    admins: Array<{ id: number; name: string }>;
    statusOptions: Array<{ value: string; label: string }>;
    priorityOptions: Array<{ value: string; label: string }>;
}

function getCaseSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'resolved':
            return 'completed';
        case 'closed':
            return 'neutral';
        case 'acknowledged':
        case 'under_review':
            return 'processing';
        case 'awaiting_owner':
        case 'awaiting_customer':
            return 'pending';
        case 'refund_review':
        case 'refund_pending':
            return 'warning';
        case 'relocation_offered':
        case 'open':
        case 'submitted':
        default:
            return 'info';
    }
}

function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'urgent':
            return 'border-status-error-border bg-status-error-bg text-status-error-fg';
        case 'high':
            return 'border-status-warning-border bg-status-warning-bg text-status-warning-fg';
        default:
            return 'border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg';
    }
}

export default function AdminCaseShow({
    case: ticket,
    reservation,
    messages,
    relocations,
    admins,
    statusOptions,
    priorityOptions,
}: AdminCaseDetailProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(
        null,
    );
    const [showResolveForm, setShowResolveForm] = useState(false);

    // Form for posting messages or internal notes
    const messageForm = useForm<{
        message: string;
        is_internal_note: boolean;
        attachment?: File | null;
    }>({
        message: '',
        is_internal_note: false,
        attachment: null,
    });

    // Form for updating case status, priority, assignment
    const statusForm = useForm<{
        status?: string;
        priority?: string;
        assigned_admin_id?: string;
    }>({
        status: ticket.status,
        priority: ticket.priority,
        assigned_admin_id: ticket.assigned_admin_id
            ? String(ticket.assigned_admin_id)
            : 'unassigned',
    });

    // Form for formal resolution
    const resolveForm = useForm<{
        resolution_type: string;
        resolution_summary: string;
    }>({
        resolution_type: 'Relocated Successfully',
        resolution_summary: '',
    });

    const handleMessageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        messageForm.post(
            `/admin/customer-cases/${ticket.case_reference}/messages`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    messageForm.reset();
                    setSelectedFileName(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
            },
        );
    };

    const handleStatusUpdate = (
        key: 'status' | 'priority' | 'assigned_admin_id',
        val: string,
    ) => {
        statusForm.setData(key, val);
        statusForm.patch(
            `/admin/customer-cases/${ticket.case_reference}/status`,
            {
                preserveScroll: true,
            },
        );
    };

    const handleResolveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        resolveForm.post(
            `/admin/customer-cases/${ticket.case_reference}/resolve`,
            {
                preserveScroll: true,
                onSuccess: () => setShowResolveForm(false),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title={`Admin Case ${ticket.case_reference}`} />

            <PageHeader
                eyebrow="Customer Protection Case"
                title={`${ticket.category_label} Dispute`}
                description={`Case ${ticket.case_reference} · Reported on ${new Date(
                    ticket.created_at,
                ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })}`}
                badges={
                    <>
                        <Badge
                            variant="outline"
                            className="font-mono font-bold text-tijum-coral tabular-nums"
                        >
                            {ticket.case_reference}
                        </Badge>
                        <StatusBadge
                            status={getCaseSemanticStatus(ticket.status)}
                            label={ticket.status_label}
                        />
                        <Badge variant="secondary">
                            {ticket.category_label}
                        </Badge>
                        <span
                            className={cn(
                                'inline-flex items-center rounded-full border px-2.5 py-0.5 font-heading text-xs font-semibold',
                                getPriorityBadgeClass(ticket.priority),
                            )}
                        >
                            {ticket.priority_label}
                        </span>
                        {ticket.is_overdue && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertCircle
                                    className="size-3"
                                    aria-hidden="true"
                                />
                                <span>Overdue SLA</span>
                            </Badge>
                        )}
                    </>
                }
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/customer-cases">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Back to Cases</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/relocations">
                                <Layers className="size-4" aria-hidden="true" />
                                <span>Manage Relocations</span>
                            </Link>
                        </Button>
                        {ticket.status !== 'resolved' && (
                            <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() =>
                                    setShowResolveForm(!showResolveForm)
                                }
                            >
                                <CheckCircle2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Resolve Case</span>
                            </Button>
                        )}
                    </>
                }
            />

            {/* SLA Breached Banner */}
            {ticket.is_overdue &&
                ticket.status !== 'resolved' &&
                ticket.status !== 'closed' && (
                    <Card className="border-l-4 border-l-destructive py-4">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                            <div className="flex items-start gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-error-border bg-status-error-bg text-status-error-fg">
                                    <AlertCircle
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="space-y-0.5">
                                    <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        Statutory SLA Deadline Breached
                                    </p>
                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Immediate administrative review or
                                        relocation coordination is required.
                                        {ticket.sla_due_at && (
                                            <span className="ml-1 font-medium tabular-nums">
                                                Target was{' '}
                                                {new Date(
                                                    ticket.sla_due_at,
                                                ).toLocaleString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                .
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="destructive">Action Required</Badge>
                        </CardContent>
                    </Card>
                )}

            {/* Resolution Summary Banner */}
            {ticket.resolved_at && ticket.resolution_summary && (
                <Card className="border-l-4 border-l-emerald-500 py-4">
                    <CardContent className="flex items-start gap-3 px-5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                        </span>
                        <div className="space-y-1">
                            <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                Resolved: {ticket.resolution_type}
                            </p>
                            <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                {ticket.resolution_summary}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Case Header & Lifecycle Controls Card */}
            <Card>
                <CardContent className="space-y-5 px-6">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1 space-y-4">
                            <div className="space-y-1.5">
                                <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    Reported Issue Statement
                                </p>
                                <p className="max-w-3xl text-sm leading-relaxed text-tijum-plum dark:text-foreground">
                                    {ticket.description}
                                </p>
                            </div>

                            <div className="grid gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 sm:grid-cols-3 dark:border-border dark:bg-muted/45">
                                <div className="space-y-0.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        <UserCheck
                                            className="size-3.5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Assigned Owner
                                    </span>
                                    <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                        {ticket.assigned_admin_name ??
                                            'Unassigned'}
                                    </p>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        <Clock
                                            className="size-3.5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        SLA Deadline
                                    </span>
                                    <p
                                        className={cn(
                                            'font-heading text-xs font-semibold tabular-nums',
                                            ticket.is_overdue
                                                ? 'text-status-error-fg'
                                                : 'text-tijum-plum dark:text-foreground',
                                        )}
                                    >
                                        {ticket.sla_due_at
                                            ? new Date(
                                                  ticket.sla_due_at,
                                              ).toLocaleString('en-IN', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : 'Standard'}
                                    </p>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        <CheckCircle2
                                            className="size-3.5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Acknowledged
                                    </span>
                                    <p className="font-heading text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                        {ticket.acknowledged_at
                                            ? new Date(
                                                  ticket.acknowledged_at,
                                              ).toLocaleString('en-IN', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : 'Pending Ack'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Assignment, Status & Priority Dropdowns */}
                        <div className="grid shrink-0 gap-3 sm:grid-cols-3 lg:w-72 lg:grid-cols-1">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="case-lifecycle-status"
                                    className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground"
                                >
                                    Lifecycle Status
                                </Label>
                                <Select
                                    value={ticket.status}
                                    onValueChange={(val) =>
                                        handleStatusUpdate('status', val)
                                    }
                                >
                                    <SelectTrigger
                                        id="case-lifecycle-status"
                                        size="sm"
                                        className="w-full text-xs"
                                    >
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((opt) => (
                                            <SelectItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="case-priority-select"
                                    className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground"
                                >
                                    Case Priority
                                </Label>
                                <Select
                                    value={ticket.priority}
                                    onValueChange={(val) =>
                                        handleStatusUpdate('priority', val)
                                    }
                                >
                                    <SelectTrigger
                                        id="case-priority-select"
                                        size="sm"
                                        className="w-full text-xs"
                                    >
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorityOptions.map((opt) => (
                                            <SelectItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="case-assigned-admin"
                                    className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground"
                                >
                                    Assigned Admin
                                </Label>
                                <Select
                                    value={
                                        ticket.assigned_admin_id
                                            ? String(ticket.assigned_admin_id)
                                            : 'unassigned'
                                    }
                                    onValueChange={(val) =>
                                        handleStatusUpdate(
                                            'assigned_admin_id',
                                            val,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="case-assigned-admin"
                                        size="sm"
                                        className="w-full text-xs"
                                    >
                                        <SelectValue placeholder="Assigned Admin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">
                                            Unassigned
                                        </SelectItem>
                                        {admins.map((adm) => (
                                            <SelectItem
                                                key={adm.id}
                                                value={String(adm.id)}
                                            >
                                                {adm.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Inline Resolve Form */}
                    {showResolveForm && (
                        <form
                            onSubmit={handleResolveSubmit}
                            className="space-y-4 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-5 dark:border-border dark:bg-muted/45"
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle2
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                    Formal Case Resolution
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="res_type"
                                        className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Resolution Type
                                    </Label>
                                    <Input
                                        id="res_type"
                                        value={resolveForm.data.resolution_type}
                                        onChange={(e) =>
                                            resolveForm.setData(
                                                'resolution_type',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        className="h-10 text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label
                                        htmlFor="res_summary"
                                        className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Resolution Summary &amp; Outcome
                                    </Label>
                                    <Textarea
                                        id="res_summary"
                                        rows={3}
                                        required
                                        placeholder="Explain the resolution provided to the guest (e.g. relocation completed, refund authorized, host reprimanded)..."
                                        value={
                                            resolveForm.data.resolution_summary
                                        }
                                        onChange={(e) =>
                                            resolveForm.setData(
                                                'resolution_summary',
                                                e.target.value,
                                            )
                                        }
                                        className="resize-none text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowResolveForm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="default"
                                    disabled={
                                        resolveForm.processing ||
                                        !resolveForm.data.resolution_summary.trim()
                                    }
                                >
                                    <CheckCircle2
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Confirm Resolution</span>
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* Split layout: Stay & Relocations on Left, Thread on Right */}
            <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-5 lg:col-span-5">
                    {/* Reservation Summary Card */}
                    <Card className="gap-4">
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <FileText
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <CardTitle className="text-sm">
                                        Associated Reservation
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Linked stay snapshot &amp; guest contact
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center justify-between border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Booking Ref
                                </span>
                                <Link
                                    href={`/admin/reservations/${reservation.booking_reference}`}
                                    className="font-mono font-bold text-tijum-coral tabular-nums hover:underline"
                                >
                                    {reservation.booking_reference}
                                </Link>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Property
                                </span>
                                <span className="text-right font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.property_name}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Guest Contact
                                </span>
                                <span className="text-right font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                    {reservation.contact_name} (
                                    {reservation.contact_phone})
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Total Paid
                                </span>
                                <span className="font-heading font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                    {new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency:
                                            reservation.currency_code || 'INR',
                                        maximumFractionDigits: 0,
                                    }).format(
                                        reservation.total_amount_minor / 100,
                                    )}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Stay Status
                                </span>
                                <Badge variant="outline">
                                    {reservation.status_label}
                                </Badge>
                            </div>

                            <div className="pt-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    <Link
                                        href={`/admin/reservations/${reservation.booking_reference}`}
                                    >
                                        View Full Admin Reservation
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Relocation Offers Card */}
                    <Card className="gap-4">
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <Layers
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <CardTitle className="text-sm tabular-nums">
                                        Relocation Offers ({relocations.length})
                                    </CardTitle>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/admin/relocations">
                                        + Search Alternatives
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-3 text-xs">
                            {relocations.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-tijum-surface/80 bg-tijum-cream/40 px-4 py-6 text-center text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                    No relocation offers initiated yet for this
                                    case.
                                </div>
                            ) : (
                                relocations.map((reloc) => (
                                    <div
                                        key={reloc.id}
                                        className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                {
                                                    reloc.destination_property_name
                                                }
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                            >
                                                {reloc.status_label}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                            {reloc.destination_room_type_name} ·
                                            Host:{' '}
                                            <span className="font-medium text-tijum-plum dark:text-foreground">
                                                {reloc.destination_owner_accepted_at
                                                    ? 'Accepted'
                                                    : 'Pending'}
                                            </span>
                                        </p>
                                        <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                            Guest Decision:{' '}
                                            <span className="font-medium text-tijum-plum capitalize dark:text-foreground">
                                                {reloc.customer_decision ??
                                                    'Awaiting Decision'}
                                            </span>
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Case Discussion with Internal Notes */}
                <div className="lg:col-span-7">
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="flex items-center gap-2.5 text-base">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <MessageSquare
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="tabular-nums">
                                        Timeline &amp; Discussion (
                                        {messages.length})
                                    </span>
                                </CardTitle>
                            </div>
                        </CardHeader>

                        <CardContent className="max-h-[540px] space-y-3.5 overflow-y-auto p-5">
                            {messages.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-tijum-surface/80 bg-tijum-cream/40 px-4 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                    No timeline entries yet. Post a response or
                                    internal note below.
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isInternal = msg.is_internal_note;
                                    const isAdmin =
                                        !isInternal &&
                                        msg.sender_type === 'admin';
                                    const isOwner =
                                        !isInternal &&
                                        msg.sender_type === 'owner';

                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'flex flex-col gap-1.5 rounded-2xl border p-4 text-xs leading-relaxed shadow-2xs',
                                                isInternal
                                                    ? 'border-l-4 border-amber-300 border-l-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:border-l-amber-400 dark:bg-amber-950/55 dark:text-amber-100'
                                                    : isAdmin
                                                      ? 'ml-6 border-tijum-plum bg-tijum-plum text-tijum-cream dark:border-tijum-coral/35 dark:bg-[#362234] dark:text-foreground'
                                                      : isOwner
                                                        ? 'mr-6 border-tijum-peach/80 bg-tijum-cream text-tijum-plum dark:border-tijum-coral/30 dark:bg-muted dark:text-foreground'
                                                        : 'mr-6 border-tijum-surface/80 bg-muted/65 text-tijum-plum dark:border-border dark:bg-muted/85 dark:text-foreground',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-[11px]',
                                                    isInternal
                                                        ? 'border-amber-300/60 dark:border-amber-500/30'
                                                        : isAdmin
                                                          ? 'border-white/15 dark:border-border'
                                                          : 'border-tijum-surface/70 dark:border-border',
                                                )}
                                            >
                                                <span className="flex flex-wrap items-center gap-2 font-heading font-semibold">
                                                    <span>
                                                        {msg.sender_name}
                                                    </span>
                                                    {isInternal ? (
                                                        <Badge className="gap-1 border-amber-300 bg-amber-200/80 text-[10px] text-amber-950 dark:border-amber-500/40 dark:bg-amber-900/70 dark:text-amber-200">
                                                            <Lock
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Internal Admin
                                                                Note
                                                            </span>
                                                        </Badge>
                                                    ) : isAdmin ? (
                                                        <Badge className="border-white/20 bg-white/15 text-[10px] text-white dark:border-tijum-coral/35 dark:bg-tijum-coral/20 dark:text-tijum-peach">
                                                            Admin
                                                        </Badge>
                                                    ) : isOwner ? (
                                                        <Badge
                                                            variant="peach"
                                                            className="text-[10px]"
                                                        >
                                                            Partner Host
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            Guest
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'tabular-nums',
                                                        isInternal
                                                            ? 'text-amber-800 dark:text-amber-300'
                                                            : isAdmin
                                                              ? 'text-tijum-cream/80 dark:text-muted-foreground'
                                                              : 'text-tijum-plum-muted dark:text-muted-foreground',
                                                    )}
                                                >
                                                    {new Date(
                                                        msg.created_at,
                                                    ).toLocaleTimeString(
                                                        'en-IN',
                                                        {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            day: 'numeric',
                                                            month: 'short',
                                                        },
                                                    )}
                                                </span>
                                            </div>

                                            <p className="pt-1 whitespace-pre-wrap">
                                                {msg.message}
                                            </p>

                                            {msg.attachment_path && (
                                                <div
                                                    className={cn(
                                                        'mt-2 border-t pt-2',
                                                        isInternal
                                                            ? 'border-amber-300/60 dark:border-amber-500/30'
                                                            : isAdmin
                                                              ? 'border-white/15 dark:border-border'
                                                              : 'border-tijum-surface/70 dark:border-border',
                                                    )}
                                                >
                                                    <a
                                                        href={
                                                            msg.attachment_path
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 font-semibold underline hover:opacity-80"
                                                    >
                                                        <Paperclip
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {msg.attachment_name ??
                                                                'View Attachment'}
                                                        </span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>

                        {/* Send Message / Internal Note Form */}
                        <form
                            onSubmit={handleMessageSubmit}
                            className="space-y-4 border-t border-tijum-surface/80 p-5 dark:border-border"
                        >
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="case-reply-textarea"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    {messageForm.data.is_internal_note
                                        ? 'Internal Staff Note'
                                        : 'Case Timeline Entry'}
                                </Label>
                                <Textarea
                                    id="case-reply-textarea"
                                    rows={3}
                                    placeholder={
                                        messageForm.data.is_internal_note
                                            ? 'Write an internal note visible only to TIJUM administrators...'
                                            : 'Write message or update for guest and host...'
                                    }
                                    value={messageForm.data.message}
                                    onChange={(e) =>
                                        messageForm.setData(
                                            'message',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className={cn(
                                        'resize-none text-xs',
                                        messageForm.data.is_internal_note &&
                                            'border-amber-400 bg-amber-50/40 dark:border-amber-500/50 dark:bg-amber-950/30',
                                    )}
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="internal_note"
                                            checked={
                                                messageForm.data
                                                    .is_internal_note
                                            }
                                            onCheckedChange={(checked) =>
                                                messageForm.setData(
                                                    'is_internal_note',
                                                    Boolean(checked),
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor="internal_note"
                                            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300"
                                        >
                                            <Lock
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Internal Note (Hidden from Guest
                                                &amp; Host)
                                            </span>
                                        </Label>
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        id="file-attachment"
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        onChange={(e) => {
                                            const file =
                                                e.target.files?.[0] ?? null;
                                            messageForm.setData(
                                                'attachment',
                                                file,
                                            );
                                            setSelectedFileName(
                                                file?.name ?? null,
                                            );
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <Paperclip
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Attach</span>
                                    </Button>
                                    {selectedFileName && (
                                        <span className="max-w-[160px] truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {selectedFileName}
                                        </span>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    size="sm"
                                    variant={
                                        messageForm.data.is_internal_note
                                            ? 'default'
                                            : 'plum'
                                    }
                                    disabled={messageForm.processing}
                                    className={
                                        messageForm.data.is_internal_note
                                            ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500'
                                            : undefined
                                    }
                                >
                                    <Send
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Post Entry</span>
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}
