import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    MessageSquare,
    Send,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/shared/page-header';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getSupportTicketStatusBadgeClass } from '@/lib/support-ticket-status';

interface MessageItem {
    id: number;
    sender_type: string;
    sender_name: string;
    message: string;
    created_at: string;
}

interface CustomerTicketShowProps {
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
        booking_reference?: string | null;
        property_name?: string | null;
        city_name?: string | null;
        sla_due_at?: string | null;
        resolved_at?: string | null;
        resolution_summary?: string | null;
        closed_at?: string | null;
        created_at: string;
    };
    messages: MessageItem[];
    grievanceOfficer?: {
        name: string;
        designation: string;
        email: string;
        phone: string;
    };
}

export default function CustomerTicketShow({
    ticket,
    messages,
    grievanceOfficer,
}: CustomerTicketShowProps) {
    const [replyText, setReplyText] = useState('');
    const [replyError, setReplyError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setIsSending(true);
        setReplyError(null);
        router.post(
            `/support/tickets/${ticket.ticket_reference}/messages`,
            { message: replyText },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReplyText('');
                    setReplyError(null);
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    setReplyError(
                        typeof first === 'string'
                            ? first
                            : 'Unable to send reply. Please check your message.',
                    );
                },
                onFinish: () => setIsSending(false),
            },
        );
    };

    const handleCloseTicket = () => {
        setIsClosing(true);
        router.post(
            `/support/tickets/${ticket.ticket_reference}/close`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setCloseModalOpen(false),
                onFinish: () => setIsClosing(false),
            },
        );
    };

    return (
        <ResponsiveContainer className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title={`${ticket.ticket_reference} · Customer Support`} />

            <PageHeader
                breadcrumbs={[
                    { title: 'Home', href: '/' },
                    { title: 'Customer Support', href: '/support/tickets' },
                    {
                        title: ticket.ticket_reference,
                        href: `/support/tickets/${ticket.ticket_reference}`,
                    },
                ]}
                eyebrow="Support Request"
                title={ticket.subject}
                description={`Reference ${ticket.ticket_reference} · Submitted on ${new Date(ticket.created_at).toLocaleDateString()}`}
                actions={
                    <div className="flex items-center gap-2">
                        {ticket.status !== 'closed' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCloseModalOpen(true)}
                                className="text-muted-foreground hover:text-destructive dark:hover:text-destructive"
                            >
                                <XCircle className="mr-1.5 size-4" />
                                Close Ticket
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                            <Link href="/support/tickets">
                                <ArrowLeft className="mr-1.5 size-4" />
                                All Inquiries
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* Left: Message Thread */}
                <div className="space-y-6">
                    {/* Resolution Banner if resolved */}
                    {ticket.status === 'resolved' && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/35">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                                        TIJUM Support has resolved this ticket
                                    </p>
                                    {ticket.resolution_summary ? (
                                        <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
                                            {ticket.resolution_summary}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                            If you have further questions, reply
                                            below to reopen this conversation.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Closed Notice if closed */}
                    {ticket.status === 'closed' && (
                        <div className="rounded-2xl border border-tijum-surface/80 bg-tijum-cream/55 p-4 dark:border-border dark:bg-muted/45">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                This support ticket was closed on{' '}
                                {ticket.closed_at
                                    ? new Date(
                                          ticket.closed_at,
                                      ).toLocaleDateString()
                                    : 'recently'}
                                . If you need further help, you can send a
                                message below to reopen it or start a new
                                inquiry.
                            </p>
                        </div>
                    )}

                    {/* Messages List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                <MessageSquare className="size-4 text-tijum-coral" />
                                Conversation ({messages.length})
                            </h3>
                        </div>

                        {messages.map((msg) => {
                            const isAdmin = msg.sender_type === 'admin';

                            return (
                                <div
                                    key={msg.id}
                                    className={`rounded-2xl border p-4 shadow-2xs transition-all ${
                                        isAdmin
                                            ? 'border-tijum-coral/35 bg-tijum-cream/55 dark:border-tijum-coral/35 dark:bg-tijum-coral/10'
                                            : 'border-tijum-surface/80 bg-white dark:border-border dark:bg-card'
                                    }`}
                                >
                                    <div className="flex items-center justify-between border-b border-tijum-surface/60 pb-2 dark:border-border">
                                        <div className="flex items-center gap-2">
                                            <span className="font-heading text-xs font-bold text-tijum-plum dark:text-foreground">
                                                {msg.sender_name}
                                            </span>
                                            <Badge
                                                variant={
                                                    isAdmin
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                className={`text-[10px] ${
                                                    isAdmin
                                                        ? 'bg-tijum-plum text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                                        : ''
                                                }`}
                                            >
                                                {isAdmin
                                                    ? 'TIJUM Customer Advocate'
                                                    : 'You'}
                                            </Badge>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">
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
                                    <div className="pt-2.5 text-xs leading-relaxed whitespace-pre-wrap text-tijum-plum dark:text-foreground">
                                        {msg.message}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Reply Form */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                Reply to Support Advocate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSendMessage}
                                className="space-y-3"
                            >
                                <Textarea
                                    placeholder="Type your reply or additional information..."
                                    value={replyText}
                                    onChange={(e) =>
                                        setReplyText(e.target.value)
                                    }
                                    rows={4}
                                    className="resize-none text-xs"
                                    required
                                />
                                <InputError message={replyError ?? undefined} />

                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        size="sm"
                                        disabled={
                                            isSending || !replyText.trim()
                                        }
                                    >
                                        <Send className="mr-1.5 size-3.5" />
                                        {isSending
                                            ? 'Sending...'
                                            : 'Send Message'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Ticket Summary Card */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-heading text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Ticket Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Status:
                                </span>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${getSupportTicketStatusBadgeClass(ticket.status)}`}
                                >
                                    {ticket.status_label}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Priority:
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                >
                                    {ticket.priority_label}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Category:
                                </span>
                                <span className="font-medium text-tijum-plum capitalize dark:text-foreground">
                                    {ticket.category.replace(/_/g, ' ')}
                                </span>
                            </div>

                            {ticket.booking_reference && (
                                <div className="space-y-1 border-t border-tijum-surface/60 pt-2 dark:border-border">
                                    <span className="block text-[11px] text-muted-foreground">
                                        Linked Booking:
                                    </span>
                                    <p className="font-mono font-semibold text-tijum-plum dark:text-tijum-peach">
                                        {ticket.booking_reference}
                                    </p>
                                    {ticket.property_name && (
                                        <p className="text-[11px] text-muted-foreground">
                                            {ticket.property_name}{' '}
                                            {ticket.city_name
                                                ? `· ${ticket.city_name}`
                                                : ''}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1 border-t border-tijum-surface/60 pt-2 text-[11px] text-muted-foreground dark:border-border">
                                <div className="flex justify-between">
                                    <span>Created:</span>
                                    <span>
                                        {new Date(
                                            ticket.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                {ticket.sla_due_at && (
                                    <div className="flex justify-between">
                                        <span>Target Resolution:</span>
                                        <span>Within SLA</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {grievanceOfficer && (
                        <Card>
                            <CardContent className="space-y-2 p-4 text-xs">
                                <p className="flex items-center gap-1.5 font-semibold text-tijum-plum dark:text-foreground">
                                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    Grievance Redressal
                                </p>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    TIJUM maintains a dedicated grievance cell
                                    for escalation under IT & Consumer
                                    Protection Rules.
                                </p>
                                <div className="pt-1 text-[11px]">
                                    <Link
                                        href="/my-support"
                                        className="block font-semibold text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach"
                                    >
                                        View Stay Grievances →
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Close Ticket Confirmation Modal */}
            <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                            Close Support Request
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Are you sure you want to close ticket{' '}
                            {ticket.ticket_reference}? You can reopen it at any
                            time by sending another message.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 pt-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCloseModalOpen(false)}
                            disabled={isClosing}
                        >
                            Keep Open
                        </Button>
                        <Button
                            variant="plum"
                            size="sm"
                            onClick={handleCloseTicket}
                            disabled={isClosing}
                        >
                            {isClosing ? 'Closing...' : 'Close Ticket'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </ResponsiveContainer>
    );
}
