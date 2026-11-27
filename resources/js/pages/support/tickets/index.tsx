import { Head, Link, router } from '@inertiajs/react';
import {
    Headphones,
    MessageSquare,
    Plus,
    Shield,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { getSupportTicketStatusBadgeClass } from '@/lib/support-ticket-status';

interface CustomerTicketItem {
    id: number;
    ticket_reference: string;
    subject: string;
    category: string;
    status: string;
    status_label: string;
    status_badge: 'default' | 'secondary' | 'outline' | 'destructive';
    priority: string;
    priority_label: string;
    booking_reference?: string | null;
    property_name?: string | null;
    city_name?: string | null;
    created_at: string;
    last_reply_at?: string | null;
}

interface CustomerTicketsIndexProps {
    tickets: {
        data: CustomerTicketItem[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
    };
    filters: {
        status: string;
    };
    reservations: Array<{
        id: number;
        booking_reference: string;
        property_name?: string | null;
    }>;
    categories: Array<{ value: string; label: string }>;
    casesCount: number;
    grievanceOfficer?: {
        name: string;
        designation: string;
        email: string;
        phone: string;
    };
}

export default function CustomerTicketsIndex({
    tickets,
    filters,
    reservations,
    categories,
    casesCount,
    grievanceOfficer,
}: CustomerTicketsIndexProps) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState(
        categories[0]?.value || 'booking_assistance',
    );
    const [priority, setPriority] = useState('standard');
    const [bookingRef, setBookingRef] = useState<string>('none');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleFilterChange = (status: string) => {
        router.get(
            '/support/tickets',
            { status: status === 'all' ? undefined : status },
            { preserveState: true, replace: true },
        );
    };

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        setIsSubmitting(true);
        setFormErrors({});
        router.post(
            '/support/tickets',
            {
                subject,
                category,
                priority,
                booking_reference: bookingRef === 'none' ? null : bookingRef,
                message,
            },
            {
                onSuccess: () => {
                    setCreateModalOpen(false);
                    setSubject('');
                    setMessage('');
                    setBookingRef('none');
                    setFormErrors({});
                },
                onError: (errors) => {
                    setFormErrors(errors as Record<string, string>);
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <ResponsiveContainer className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title="Customer Support Tickets · TIJUM" />

            <PageHeader
                breadcrumbs={[
                    { title: 'Home', href: '/' },
                    { title: 'Customer Support', href: '/support/tickets' },
                ]}
                eyebrow="Helpdesk & Inquiries"
                title="Customer Support Tickets"
                description="Get fast assistance with bookings, payments, check-in, or general questions from our 24/7 advocate team."
                actions={
                    <Button
                        variant="plum"
                        onClick={() => setCreateModalOpen(true)}
                        size="sm"
                    >
                        <Plus className="mr-1.5 size-4" />
                        New Support Request
                    </Button>
                }
            />

            {/* Portal Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tijum-surface/80 pb-3 dark:border-border">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-xl bg-tijum-plum px-3.5 py-2 text-xs font-semibold text-tijum-cream shadow-2xs dark:bg-tijum-coral dark:text-white">
                        <Headphones className="size-3.5" />
                        Support Inquiries ({tickets.meta.total})
                    </span>
                    <Link
                        href="/my-support"
                        className="flex items-center gap-1.5 rounded-xl border border-tijum-surface/80 bg-white px-3.5 py-2 text-xs font-semibold text-tijum-plum-muted transition-colors hover:bg-tijum-cream/60 hover:text-tijum-plum dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
                    >
                        <Shield className="size-3.5 text-tijum-coral" />
                        Stay Grievances & Protection{' '}
                        {casesCount > 0 && `(${casesCount})`}
                    </Link>
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-tijum-surface/80 bg-white p-1 text-xs dark:border-border dark:bg-card">
                    {['all', 'open', 'in_progress', 'resolved', 'closed'].map(
                        (key) => {
                            const isActive = (filters.status ?? 'all') === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleFilterChange(key)}
                                    className={`cursor-pointer rounded-lg px-3 py-1.5 capitalize transition-colors ${
                                        isActive
                                            ? 'bg-tijum-plum font-semibold text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                            : 'text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground'
                                    }`}
                                >
                                    {key.replace('_', ' ')}
                                </button>
                            );
                        },
                    )}
                </div>
            </div>

            {/* Tickets List */}
            {tickets.data.length === 0 ? (
                <EmptyState
                    icon={Headphones}
                    title="No support tickets found"
                    description="You don't have any open support inquiries under this filter. If you have questions about a reservation, payment, or stay amenity, submit a new request."
                    action={
                        <Button
                            variant="plum"
                            onClick={() => setCreateModalOpen(true)}
                            size="sm"
                            className="mt-2"
                        >
                            <Plus className="mr-1.5 size-4" />
                            Open Support Request
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-3">
                    {tickets.data.map((ticket) => (
                        <Card
                            key={ticket.id}
                            className="border-tijum-surface/80 bg-white shadow-tijum-card transition-all hover:border-tijum-coral/40 hover:shadow-md dark:border-border dark:bg-card dark:hover:border-tijum-coral/40"
                        >
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-semibold text-tijum-plum dark:text-tijum-peach">
                                                {ticket.ticket_reference}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] ${getSupportTicketStatusBadgeClass(ticket.status)}`}
                                            >
                                                {ticket.status_label}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px]"
                                            >
                                                {ticket.priority_label}
                                            </Badge>
                                            {ticket.booking_reference && (
                                                <span className="text-xs text-muted-foreground">
                                                    · Booking:{' '}
                                                    {ticket.booking_reference}
                                                </span>
                                            )}
                                        </div>

                                        <Link
                                            href={`/support/tickets/${ticket.ticket_reference}`}
                                            className="block font-heading text-sm font-semibold text-tijum-plum transition-colors hover:text-tijum-coral dark:text-foreground dark:hover:text-tijum-peach"
                                        >
                                            {ticket.subject}
                                        </Link>

                                        <p className="text-xs text-muted-foreground">
                                            Category:{' '}
                                            <span className="font-medium capitalize">
                                                {ticket.category.replace(
                                                    /_/g,
                                                    ' ',
                                                )}
                                            </span>
                                            {' · '}
                                            Submitted{' '}
                                            {new Date(
                                                ticket.created_at,
                                            ).toLocaleDateString()}
                                            {ticket.last_reply_at && (
                                                <>
                                                    {' · '}
                                                    Latest reply{' '}
                                                    {new Date(
                                                        ticket.last_reply_at,
                                                    ).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                        >
                                            <Link
                                                href={`/support/tickets/${ticket.ticket_reference}`}
                                            >
                                                <MessageSquare className="mr-1.5 size-3.5" />
                                                View Discussion
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-4 dark:border-border">
                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {tickets.data.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {tickets.meta.total}
                            </span>{' '}
                            ticket{tickets.meta.total === 1 ? '' : 's'}
                        </p>
                        <Pagination
                            currentPage={tickets.meta.current_page}
                            totalPages={tickets.meta.last_page}
                            onPageChange={(page) =>
                                router.get(
                                    '/support/tickets',
                                    {
                                        status:
                                            filters.status === 'all'
                                                ? undefined
                                                : filters.status,
                                        page,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                    },
                                )
                            }
                        />
                    </div>
                </div>
            )}

            {/* Grievance Officer Support Card */}
            {grievanceOfficer && (
                <div className="flex flex-col gap-3 rounded-2xl border border-tijum-surface/80 bg-white p-4 text-xs text-muted-foreground shadow-tijum-card sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-card">
                    <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5 font-semibold text-tijum-plum dark:text-foreground">
                            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                            Official Customer Grievance Cell
                        </p>
                        <p>
                            Grievance Redressal Officer:{' '}
                            <span className="font-medium text-tijum-plum dark:text-foreground">
                                {grievanceOfficer.name}
                            </span>{' '}
                            ({grievanceOfficer.designation})
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            href={`mailto:${grievanceOfficer.email}`}
                            className="font-medium text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach"
                        >
                            {grievanceOfficer.email}
                        </a>
                        <span className="text-muted-foreground">·</span>
                        <a
                            href={`tel:${grievanceOfficer.phone}`}
                            className="font-medium text-tijum-plum hover:underline dark:text-foreground"
                        >
                            {grievanceOfficer.phone}
                        </a>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                            <Headphones className="size-5 text-tijum-coral" />
                            Submit Support Request
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Ask a question about a stay, payment refund,
                            check-in arrival, or account security. Our support
                            team is here to help.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateTicket}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="cust_ticket_subject"
                                className="text-xs font-semibold"
                            >
                                Subject *
                            </Label>
                            <Input
                                id="cust_ticket_subject"
                                placeholder="e.g. Need assistance with room check-in timing..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="text-xs"
                                required
                            />
                            <InputError message={formErrors.subject} />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Category *
                                </Label>
                                <Select
                                    value={category}
                                    onValueChange={setCategory}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-tijum-surface/80 bg-white text-xs dark:border-border dark:bg-card">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem
                                                key={c.value}
                                                value={c.value}
                                                className="text-xs"
                                            >
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={formErrors.category} />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Priority
                                </Label>
                                <Select
                                    value={priority}
                                    onValueChange={setPriority}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-tijum-surface/80 bg-white text-xs dark:border-border dark:bg-card">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">
                                            Low (General guidance)
                                        </SelectItem>
                                        <SelectItem value="standard">
                                            Standard (Within 24h)
                                        </SelectItem>
                                        <SelectItem value="high">
                                            High (Upcoming check-in)
                                        </SelectItem>
                                        <SelectItem value="urgent">
                                            Urgent (Current stay issue)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={formErrors.priority} />
                            </div>
                        </div>

                        {reservations.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Related Booking (Optional)
                                </Label>
                                <Select
                                    value={bookingRef}
                                    onValueChange={setBookingRef}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-tijum-surface/80 bg-white text-xs dark:border-border dark:bg-card">
                                        <SelectValue placeholder="Select booking..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            General / None
                                        </SelectItem>
                                        {reservations.map((r) => (
                                            <SelectItem
                                                key={r.id}
                                                value={r.booking_reference}
                                                className="text-xs"
                                            >
                                                {r.booking_reference}{' '}
                                                {r.property_name
                                                    ? `(${r.property_name})`
                                                    : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={formErrors.booking_reference}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="cust_ticket_message"
                                className="text-xs font-semibold"
                            >
                                How can we help? *
                            </Label>
                            <Textarea
                                id="cust_ticket_message"
                                rows={4}
                                placeholder="Please describe what you need assistance with..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="text-xs"
                                required
                            />
                            <InputError message={formErrors.message} />
                        </div>

                        <DialogFooter className="gap-2 pt-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCreateModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                size="sm"
                                disabled={
                                    isSubmitting ||
                                    !subject.trim() ||
                                    !message.trim()
                                }
                            >
                                {isSubmitting
                                    ? 'Submitting...'
                                    : 'Send Request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            </div>
        </ResponsiveContainer>
    );
}
