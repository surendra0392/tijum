import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    LifeBuoy,
    MessageSquare,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    OWNER_SUPPORT_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
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

interface TicketItem {
    id: number;
    ticket_reference: string;
    subject: string;
    category: string;
    status: string;
    status_label: string;
    status_badge: 'default' | 'secondary' | 'outline' | 'destructive';
    priority: string;
    priority_label: string;
    property_name?: string | null;
    created_at: string;
    last_reply_at?: string | null;
}

interface OwnerSupportIndexProps {
    tickets: {
        data: TicketItem[];
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
    properties: Array<{ id: number; name: string }>;
    categories: Array<{ value: string; label: string }>;
}

export default function OwnerSupportIndex({
    tickets,
    filters,
    properties,
    categories,
}: OwnerSupportIndexProps) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState(
        categories[0]?.value || 'payout_settlement',
    );
    const [priority, setPriority] = useState('standard');
    const [propertyId, setPropertyId] = useState<string>('none');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFilterChange = (status: string) => {
        router.get(
            '/owner/support',
            { status: status === 'all' ? undefined : status },
            { preserveState: true, replace: true },
        );
    };

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) return;

        setIsSubmitting(true);
        router.post(
            '/owner/support',
            {
                subject,
                category,
                priority,
                property_id: propertyId === 'none' ? null : propertyId,
                message,
            },
            {
                onSuccess: () => {
                    setCreateModalOpen(false);
                    setSubject('');
                    setMessage('');
                    setPropertyId('none');
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Partner Support · TIJUM Partner Portal" />

            <OwnerSectionTabs
                items={OWNER_SUPPORT_TABS}
                ariaLabel="Reviews and support navigation"
            />

            <PageHeader
                eyebrow="Partner Success Desk"
                title="Partner Support & Helpdesk"
                description="Submit inquiries regarding property payouts, verification, inventory management, or platform assistance to TIJUM specialists."
                actions={
                    <Button
                        onClick={() => setCreateModalOpen(true)}
                        variant="plum"
                        size="sm"
                    >
                        <Plus className="mr-1.5 size-4" />
                        Create Support Ticket
                    </Button>
                }
            />

            {/* Quick Filter Tabs */}
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border">
                {[
                    { key: 'all', label: 'All Tickets' },
                    { key: 'open', label: 'Open' },
                    { key: 'in_progress', label: 'In Progress' },
                    { key: 'waiting_user', label: 'Action Required' },
                    { key: 'resolved', label: 'Resolved' },
                    { key: 'closed', label: 'Closed' },
                ].map((tab) => {
                    const isActive = (filters.status ?? 'all') === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleFilterChange(tab.key)}
                            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                                isActive
                                    ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                    : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tickets List */}
            {tickets.data.length === 0 ? (
                <EmptyState
                    icon={LifeBuoy}
                    title="No tickets found"
                    description="You don't have any support tickets under the selected filter. Create a new request if you need assistance with payouts, inventory, or guest disputes."
                    action={
                        <Button
                            onClick={() => setCreateModalOpen(true)}
                            size="sm"
                            variant="plum"
                            className="mt-2"
                        >
                            <Plus className="mr-1.5 size-4" />
                            Open First Ticket
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-3">
                    {tickets.data.map((ticket) => (
                        <Card
                            key={ticket.id}
                            className="border-tijum-surface/80 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:border-border"
                        >
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-semibold text-tijum-coral">
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
                                            {ticket.property_name && (
                                                <span className="truncate text-xs text-muted-foreground">
                                                    · {ticket.property_name}
                                                </span>
                                            )}
                                        </div>

                                        <Link
                                            href={`/owner/support/${ticket.ticket_reference}`}
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
                                            Opened on{' '}
                                            {new Date(
                                                ticket.created_at,
                                            ).toLocaleDateString()}
                                            {ticket.last_reply_at && (
                                                <>
                                                    {' · '}
                                                    Last reply{' '}
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
                                                href={`/owner/support/${ticket.ticket_reference}`}
                                            >
                                                <MessageSquare className="mr-1.5 size-3.5" />
                                                View Thread
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Pagination footer */}
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
                                    '/owner/support',
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

            {/* Create Ticket Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                            <LifeBuoy className="size-5 text-tijum-coral" />
                            Submit Partner Support Request
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Directly reach TIJUM partner operations. Standard
                            inquiries receive a response within 12 hours.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateTicket}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="ticket_subject"
                                className="text-xs font-semibold"
                            >
                                Subject *
                            </Label>
                            <Input
                                id="ticket_subject"
                                placeholder="Brief summary of your query or issue..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="text-xs"
                                required
                            />
                            <InputError message={errors?.subject} />
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
                                    <SelectTrigger size="sm" className="text-xs">
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
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Urgency / Priority
                                </Label>
                                <Select
                                    value={priority}
                                    onValueChange={setPriority}
                                >
                                    <SelectTrigger size="sm" className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">
                                            Low (General guidance)
                                        </SelectItem>
                                        <SelectItem value="standard">
                                            Standard (Within 12h)
                                        </SelectItem>
                                        <SelectItem value="high">
                                            High (Urgent payout/guest issue)
                                        </SelectItem>
                                        <SelectItem value="urgent">
                                            Urgent (Immediate critical block)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {properties.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    Related Property (Optional)
                                </Label>
                                <Select
                                    value={propertyId}
                                    onValueChange={setPropertyId}
                                >
                                    <SelectTrigger size="sm" className="text-xs">
                                        <SelectValue placeholder="Select property..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            General / Not property-specific
                                        </SelectItem>
                                        {properties.map((p) => (
                                            <SelectItem
                                                key={p.id}
                                                value={String(p.id)}
                                                className="text-xs"
                                            >
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="ticket_message"
                                className="text-xs font-semibold"
                            >
                                Message Details *
                            </Label>
                            <Textarea
                                id="ticket_message"
                                rows={4}
                                placeholder="Provide specific details, amounts, dates, or booking reference numbers..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="text-xs"
                                required
                            />
                            <InputError message={errors?.message} />
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
                                size="sm"
                                variant="plum"
                                disabled={
                                    isSubmitting ||
                                    !subject.trim() ||
                                    !message.trim()
                                }
                            >
                                {isSubmitting
                                    ? 'Submitting...'
                                    : 'Submit Support Ticket'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
