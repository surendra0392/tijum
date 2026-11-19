import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    CheckCircle2,
    HelpCircle,
    MessageSquare,
    Send,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    OWNER_SUPPORT_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { PageHeader } from '@/components/shared/page-header';
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

interface OwnerSupportShowProps {
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
        property_name?: string | null;
        sla_due_at?: string | null;
        resolved_at?: string | null;
        resolution_summary?: string | null;
        closed_at?: string | null;
        created_at: string;
    };
    messages: MessageItem[];
}

export default function OwnerSupportShow({
    ticket,
    messages,
}: OwnerSupportShowProps) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setIsSending(true);
        router.post(
            `/owner/support/${ticket.ticket_reference}/messages`,
            { message: replyText },
            {
                preserveScroll: true,
                onSuccess: () => setReplyText(''),
                onFinish: () => setIsSending(false),
            },
        );
    };

    const handleCloseTicket = () => {
        setIsClosing(true);
        router.post(
            `/owner/support/${ticket.ticket_reference}/close`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setCloseModalOpen(false),
                onFinish: () => setIsClosing(false),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title={`${ticket.ticket_reference} · Partner Support`} />

            <OwnerSectionTabs
                items={OWNER_SUPPORT_TABS}
                ariaLabel="Reviews and support navigation"
            />

            <PageHeader
                eyebrow="Partner Support Ticket"
                title={ticket.subject}
                description={`Reference ${ticket.ticket_reference} · Created ${new Date(ticket.created_at).toLocaleDateString()}`}
                actions={
                    <div className="flex items-center gap-2">
                        {ticket.status !== 'closed' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCloseModalOpen(true)}
                                className="text-muted-foreground hover:text-status-error-fg"
                            >
                                <XCircle className="mr-1.5 size-4" />
                                Close Ticket
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                            <Link href="/owner/support">
                                <ArrowLeft className="mr-1.5 size-4" />
                                All Tickets
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
                        <div className="rounded-[20px] border border-emerald-200 border-l-4 border-l-emerald-500 bg-card p-4 shadow-tijum-card dark:border-emerald-500/35">
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
                                        <p className="text-xs text-emerald-800 dark:text-emerald-200">
                                            If you have further questions, reply
                                            below to reopen the conversation.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Closed Notice if closed */}
                    {ticket.status === 'closed' && (
                        <div className="rounded-2xl border border-tijum-surface/80 bg-card p-4 shadow-tijum-card dark:border-border">
                            <p className="text-xs text-muted-foreground">
                                This support ticket was closed on{' '}
                                {ticket.closed_at
                                    ? new Date(
                                          ticket.closed_at,
                                      ).toLocaleDateString()
                                    : 'recently'}
                                . If you still need help, you can send a message
                                below to reopen it or create a new ticket.
                            </p>
                        </div>
                    )}

                    {/* Messages List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                <MessageSquare className="size-4 text-tijum-coral" />
                                Messages ({messages.length})
                            </h3>
                        </div>

                        {messages.length === 0 && ticket.message && (
                            <div className="rounded-2xl border border-tijum-surface/80 bg-card p-4 shadow-tijum-card dark:border-border">
                                <div className="flex items-center justify-between border-b border-tijum-surface/60 pb-2 dark:border-border">
                                    <span className="font-heading text-xs font-bold text-tijum-plum dark:text-foreground">
                                        Initial Request
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {new Date(
                                            ticket.created_at,
                                        ).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-2.5 text-xs leading-relaxed whitespace-pre-wrap text-tijum-plum dark:text-foreground">
                                    {ticket.message}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isAdmin = msg.sender_type === 'admin';

                            return (
                                <div
                                    key={msg.id}
                                    className={`rounded-2xl border p-4 shadow-tijum-card transition-all ${
                                        isAdmin
                                            ? 'border-tijum-coral/35 border-l-4 border-l-tijum-coral bg-card dark:border-tijum-coral/40'
                                            : 'border-tijum-surface/80 bg-card dark:border-border'
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
                                                className={`text-[10px] ${isAdmin ? 'bg-tijum-plum text-tijum-cream dark:bg-[#3a2438]' : ''}`}
                                            >
                                                {isAdmin
                                                    ? 'TIJUM Partner Desk'
                                                    : 'You (Partner)'}
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
                    <Card className="border-tijum-surface dark:border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                Reply to Support Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSendMessage}
                                className="space-y-3"
                            >
                                <Textarea
                                    placeholder="Type your message, query update, or additional details..."
                                    value={replyText}
                                    onChange={(e) =>
                                        setReplyText(e.target.value)
                                    }
                                    rows={4}
                                    className="resize-none text-xs"
                                    required
                                />
                                <InputError message={errors?.message} />

                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        variant="plum"
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
                    <Card className="border-tijum-surface dark:border-border lg:sticky lg:top-24">
                        <CardHeader className="pb-3">
                            <CardTitle className="font-heading text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Ticket Details
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

                            {ticket.property_name && (
                                <div className="border-t border-tijum-surface/60 pt-2 dark:border-border">
                                    <span className="mb-0.5 block text-muted-foreground">
                                        Related Property:
                                    </span>
                                    <p className="flex items-center gap-1.5 font-semibold text-tijum-plum dark:text-foreground">
                                        <Building2 className="size-3.5 text-tijum-coral" />
                                        {ticket.property_name}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1 border-t border-tijum-surface/60 pt-2 text-[11px] tabular-nums text-muted-foreground dark:border-border">
                                <div className="flex justify-between">
                                    <span>Submitted:</span>
                                    <span>
                                        {new Date(
                                            ticket.created_at,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                                {ticket.sla_due_at && (
                                    <div className="flex justify-between">
                                        <span>Target Response:</span>
                                        <span>Within SLA</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-tijum-surface/80 dark:border-border">
                        <CardContent className="space-y-2 p-4 text-xs">
                            <p className="flex items-center gap-1.5 font-semibold text-tijum-plum dark:text-foreground">
                                <HelpCircle className="size-4 text-tijum-coral" />
                                Need Immediate Assistance?
                            </p>
                            <p className="leading-relaxed text-muted-foreground">
                                For urgent check-in conflicts or guest
                                emergencies at your properties, you can also
                                reach the Partner Emergency Operations desk
                                directly.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Close Ticket Confirmation Modal */}
            <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                            Close Support Ticket
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Are you sure you want to close ticket{' '}
                            {ticket.ticket_reference}? You can reopen it at any
                            time by posting a new message in this thread.
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
                            size="sm"
                            variant="plum"
                            onClick={handleCloseTicket}
                            disabled={isClosing}
                        >
                            {isClosing ? 'Closing...' : 'Confirm & Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
