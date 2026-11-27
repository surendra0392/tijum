import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileText,
    Lock,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
    User,
} from 'lucide-react';
import { useState } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

interface MessageItem {
    id: number;
    sender_type: string;
    sender_name: string;
    message: string;
    is_internal_note: boolean;
    created_at: string;
}

interface AdminCustomerTicketDetailProps {
    ticket: {
        id: number;
        ticket_reference: string;
        subject: string;
        category: string;
        status: string;
        status_label: string;
        priority: string;
        priority_label: string;
        message: string;
        customer_name: string;
        customer_email?: string | null;
        customer_phone?: string | null;
        booking_reference?: string | null;
        reservation_status?: string | null;
        reservation_status_label?: string | null;
        property_name?: string | null;
        city_name?: string | null;
        assigned_admin_id?: number | null;
        assigned_admin_name?: string | null;
        sla_due_at?: string | null;
        is_overdue: boolean;
        resolved_at?: string | null;
        resolution_summary?: string | null;
        closed_at?: string | null;
        created_at: string;
    };
    messages: MessageItem[];
    admins: Array<{ id: number; name: string }>;
}

function getTicketSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'resolved':
            return 'completed';
        case 'closed':
            return 'neutral';
        case 'in_progress':
            return 'processing';
        case 'waiting_user':
            return 'pending';
        case 'open':
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

export default function AdminCustomerSupportShow({
    ticket,
    messages,
    admins,
}: AdminCustomerTicketDetailProps) {
    const [replyText, setReplyText] = useState('');
    const [isInternalNote, setIsInternalNote] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Resolve modal
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolutionSummary, setResolutionSummary] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setIsSending(true);
        router.post(
            `/admin/support/customers/${ticket.ticket_reference}/messages`,
            {
                message: replyText,
                is_internal_note: isInternalNote,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyText('');
                    setIsInternalNote(false);
                },
                onFinish: () => setIsSending(false),
            },
        );
    };

    const handleStatusChange = (newStatus: string) => {
        router.patch(
            `/admin/support/customers/${ticket.ticket_reference}/status`,
            { status: newStatus },
            { preserveScroll: true },
        );
    };

    const handleAssignChange = (adminId: string) => {
        router.patch(
            `/admin/support/customers/${ticket.ticket_reference}/assign`,
            { assigned_admin_id: adminId === 'unassigned' ? null : adminId },
            { preserveScroll: true },
        );
    };

    const handleConfirmResolve = () => {
        if (!resolutionSummary.trim()) return;
        setIsResolving(true);
        router.post(
            `/admin/support/customers/${ticket.ticket_reference}/resolve`,
            { resolution_summary: resolutionSummary },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResolveModalOpen(false);
                    setResolutionSummary('');
                },
                onFinish: () => setIsResolving(false),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head
                title={`${ticket.ticket_reference} · Customer Support · TIJUM Admin`}
            />

            <PageHeader
                eyebrow="Customer Support Desk"
                title={ticket.subject}
                description={`Ticket ${ticket.ticket_reference} · Filed on ${new Date(
                    ticket.created_at,
                ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })} by ${ticket.customer_name}`}
                badges={
                    <>
                        <Badge
                            variant="outline"
                            className="font-mono font-bold text-tijum-coral tabular-nums"
                        >
                            {ticket.ticket_reference}
                        </Badge>
                        <StatusBadge
                            status={getTicketSemanticStatus(ticket.status)}
                            label={ticket.status_label}
                        />
                        <Badge variant="secondary" className="capitalize">
                            {ticket.category.replace(/_/g, ' ')}
                        </Badge>
                        <span
                            className={cn(
                                'inline-flex items-center rounded-full border px-2.5 py-0.5 font-heading text-xs font-semibold uppercase',
                                getPriorityBadgeClass(ticket.priority),
                            )}
                        >
                            {ticket.priority_label}
                        </span>
                        {ticket.is_overdue && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertTriangle
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
                        {ticket.status !== 'resolved' &&
                            ticket.status !== 'closed' && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setResolveModalOpen(true)}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                                >
                                    <CheckCircle2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Mark Resolved</span>
                                </Button>
                            )}
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/support/customers">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>All Tickets</span>
                            </Link>
                        </Button>
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
                                    <AlertTriangle
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="space-y-0.5">
                                    <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        Ticket SLA Deadline Breached
                                    </p>
                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        This customer ticket has exceeded its
                                        target response SLA.
                                        {ticket.sla_due_at && (
                                            <span className="ml-1 font-medium tabular-nums">
                                                Deadline was{' '}
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
                            <Badge variant="destructive">SLA Overdue</Badge>
                        </CardContent>
                    </Card>
                )}

            {/* Resolution Summary Banner */}
            {ticket.status === 'resolved' && ticket.resolution_summary && (
                <Card className="border-l-4 border-l-emerald-500 py-4">
                    <CardContent className="flex items-start gap-3 px-5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                            <CheckCircle2
                                className="size-4"
                                aria-hidden="true"
                            />
                        </span>
                        <div className="space-y-1">
                            <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                Ticket Resolved{' '}
                                {ticket.resolved_at
                                    ? `on ${new Date(
                                          ticket.resolved_at,
                                      ).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      })}`
                                    : 'recently'}
                            </p>
                            <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                {ticket.resolution_summary}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* Left Column: Thread & Composer */}
                <div className="space-y-6">
                    {/* Messages Thread */}
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <CardTitle className="flex items-center gap-2.5 text-base">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <MessageSquare
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="tabular-nums">
                                    Conversation History ({messages.length})
                                </span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3.5 p-5">
                            {messages.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-tijum-surface/80 bg-tijum-cream/40 px-4 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                    No conversation messages recorded yet.
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isInternal = msg.is_internal_note;
                                    const isAdmin =
                                        !isInternal &&
                                        msg.sender_type === 'admin';

                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'rounded-2xl border p-4 shadow-2xs transition-all',
                                                isInternal
                                                    ? 'border-l-4 border-amber-300 border-l-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:border-l-amber-400 dark:bg-amber-950/55 dark:text-amber-100'
                                                    : isAdmin
                                                      ? 'ml-6 border-tijum-plum bg-tijum-plum text-tijum-cream dark:border-tijum-coral/35 dark:bg-[#362234] dark:text-foreground'
                                                      : 'mr-6 border-tijum-surface/80 bg-tijum-cream/55 text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'flex flex-wrap items-center justify-between gap-2 border-b pb-2',
                                                    isInternal
                                                        ? 'border-amber-300/60 dark:border-amber-500/30'
                                                        : isAdmin
                                                          ? 'border-white/15 dark:border-border'
                                                          : 'border-tijum-surface/70 dark:border-border',
                                                )}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-heading text-xs font-bold">
                                                        {msg.sender_name}
                                                    </span>
                                                    {isInternal ? (
                                                        <Badge className="gap-1 border-amber-300 bg-amber-200/80 text-[10px] text-amber-950 dark:border-amber-500/40 dark:bg-amber-900/70 dark:text-amber-200">
                                                            <Lock
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Internal Staff
                                                                Note
                                                            </span>
                                                        </Badge>
                                                    ) : isAdmin ? (
                                                        <Badge className="border-white/20 bg-white/15 text-[10px] text-white dark:border-tijum-coral/35 dark:bg-tijum-coral/20 dark:text-tijum-peach">
                                                            TIJUM Support
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            Customer
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span
                                                    className={cn(
                                                        'text-[11px] tabular-nums',
                                                        isInternal
                                                            ? 'text-amber-800 dark:text-amber-300'
                                                            : isAdmin
                                                              ? 'text-tijum-cream/80 dark:text-muted-foreground'
                                                              : 'text-tijum-plum-muted dark:text-muted-foreground',
                                                    )}
                                                >
                                                    {new Date(
                                                        msg.created_at,
                                                    ).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            <div className="pt-2.5 text-xs leading-relaxed whitespace-pre-wrap">
                                                {msg.message}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Reply Form */}
                    {ticket.status !== 'closed' && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                    Send Staff Reply or Add Internal Note
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Public replies notify the customer via email
                                    and advance ticket status to In Progress.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={handleSendMessage}
                                    className="space-y-4"
                                >
                                    <Textarea
                                        placeholder={
                                            isInternalNote
                                                ? 'Type an internal note visible ONLY to administrators...'
                                                : 'Type response to customer...'
                                        }
                                        value={replyText}
                                        onChange={(e) =>
                                            setReplyText(e.target.value)
                                        }
                                        rows={4}
                                        className={cn(
                                            'resize-none text-xs',
                                            isInternalNote &&
                                                'border-amber-400 bg-amber-50/40 dark:border-amber-500/50 dark:bg-amber-950/30',
                                        )}
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="internal_note"
                                                checked={isInternalNote}
                                                onCheckedChange={(checked) =>
                                                    setIsInternalNote(
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
                                                    Add as Internal Note
                                                    (Customer will not see this)
                                                </span>
                                            </Label>
                                        </div>

                                        <Button
                                            type="submit"
                                            size="sm"
                                            variant={
                                                isInternalNote
                                                    ? 'default'
                                                    : 'plum'
                                            }
                                            disabled={
                                                isSending || !replyText.trim()
                                            }
                                            className={
                                                isInternalNote
                                                    ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500'
                                                    : undefined
                                            }
                                        >
                                            <Send
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {isSending
                                                    ? 'Posting...'
                                                    : isInternalNote
                                                      ? 'Save Staff Note'
                                                      : 'Send Reply to Customer'}
                                            </span>
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Ticket Controls & Context */}
                <div className="space-y-5">
                    {/* Status & Priority Control Card */}
                    <Card className="gap-4">
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <CardTitle className="text-xs tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Ticket Controls
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="customer-show-status"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Current Status
                                </Label>
                                <Select
                                    value={ticket.status}
                                    onValueChange={handleStatusChange}
                                >
                                    <SelectTrigger
                                        id="customer-show-status"
                                        size="sm"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">
                                            Open
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                            In Progress
                                        </SelectItem>
                                        <SelectItem value="waiting_user">
                                            Waiting for Customer
                                        </SelectItem>
                                        <SelectItem value="resolved">
                                            Resolved
                                        </SelectItem>
                                        <SelectItem value="closed">
                                            Closed
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="customer-show-admin"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Assigned Staff Member
                                </Label>
                                <Select
                                    value={
                                        ticket.assigned_admin_id
                                            ? String(ticket.assigned_admin_id)
                                            : 'unassigned'
                                    }
                                    onValueChange={handleAssignChange}
                                >
                                    <SelectTrigger
                                        id="customer-show-admin"
                                        size="sm"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">
                                            Unassigned
                                        </SelectItem>
                                        {admins.map((admin) => (
                                            <SelectItem
                                                key={admin.id}
                                                value={String(admin.id)}
                                            >
                                                {admin.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Priority:
                                    </span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-full border px-2.5 py-0.5 font-heading text-[10px] font-semibold uppercase',
                                            getPriorityBadgeClass(
                                                ticket.priority,
                                            ),
                                        )}
                                    >
                                        {ticket.priority_label}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                        SLA Deadline:
                                    </span>
                                    <span
                                        className={cn(
                                            'font-medium tabular-nums',
                                            ticket.is_overdue
                                                ? 'font-bold text-status-error-fg'
                                                : 'text-tijum-plum dark:text-foreground',
                                        )}
                                    >
                                        {ticket.sla_due_at
                                            ? new Date(
                                                  ticket.sla_due_at,
                                              ).toLocaleTimeString([], {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : 'Standard'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Profile Card */}
                    <Card className="gap-4">
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-xs tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                <User
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Customer Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-xs">
                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                {ticket.customer_name}
                            </p>
                            {ticket.customer_phone && (
                                <a
                                    href={`tel:${ticket.customer_phone}`}
                                    className="flex items-center gap-2 text-tijum-plum tabular-nums hover:text-tijum-coral dark:text-foreground dark:hover:text-tijum-coral"
                                >
                                    <Phone
                                        className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <span>{ticket.customer_phone}</span>
                                </a>
                            )}
                            {ticket.customer_email && (
                                <a
                                    href={`mailto:${ticket.customer_email}`}
                                    className="flex items-center gap-2 truncate text-tijum-plum-muted hover:text-tijum-coral dark:text-muted-foreground dark:hover:text-tijum-coral"
                                >
                                    <Mail
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">
                                        {ticket.customer_email}
                                    </span>
                                </a>
                            )}
                        </CardContent>
                    </Card>

                    {/* Linked Stay Card if applicable */}
                    {ticket.booking_reference && (
                        <Card className="gap-4">
                            <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-xs tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                    <FileText
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Linked Reservation</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <Link
                                        href={`/admin/reservations/${ticket.booking_reference}`}
                                        className="font-mono text-xs font-bold text-tijum-coral tabular-nums hover:underline"
                                    >
                                        {ticket.booking_reference}
                                    </Link>
                                    {ticket.reservation_status_label && (
                                        <Badge
                                            variant="outline"
                                            className="text-[10px]"
                                        >
                                            {ticket.reservation_status_label}
                                        </Badge>
                                    )}
                                </div>
                                {ticket.property_name && (
                                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                        {ticket.property_name}
                                    </p>
                                )}
                                {ticket.city_name && (
                                    <p className="flex items-center gap-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                        <MapPin
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>{ticket.city_name}</span>
                                    </p>
                                )}
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    <Link
                                        href={`/admin/reservations/${ticket.booking_reference}`}
                                    >
                                        Inspect Reservation
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Resolve Modal */}
            <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
                <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-md dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg text-tijum-plum dark:text-foreground">
                            <CheckCircle2
                                className="size-5 text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                            />
                            <span>Resolve Customer Support Ticket</span>
                        </DialogTitle>
                        <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                            Document the resolution summary for ticket{' '}
                            <strong className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                {ticket.ticket_reference}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        <Label
                            htmlFor="resolution_summary"
                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                        >
                            Resolution Summary &amp; Action Taken
                        </Label>
                        <Textarea
                            id="resolution_summary"
                            placeholder="E.g. Verified guest payment issue with gateway, issued refund, confirmed stay booking with host."
                            value={resolutionSummary}
                            onChange={(e) =>
                                setResolutionSummary(e.target.value)
                            }
                            rows={4}
                            className="border-tijum-surface/80 bg-white text-xs text-tijum-plum dark:border-border dark:bg-card dark:text-foreground"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResolveModalOpen(false)}
                            disabled={isResolving}
                            className="dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-accent"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmResolve}
                            disabled={isResolving || !resolutionSummary.trim()}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                        >
                            {isResolving
                                ? 'Resolving...'
                                : 'Confirm Resolution'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
