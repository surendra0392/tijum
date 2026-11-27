import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Home,
    MessageSquare,
    Paperclip,
    Send,
    ShieldCheck,
    Utensils,
    XCircle,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    acknowledgement as supportAcknowledgement,
    index as supportIndex,
} from '@/routes/support/cases';
import type { ReservationDetail } from '@/types';

interface CaseDetailProps {
    case: {
        id: number;
        case_reference: string;
        category: string;
        category_label: string;
        status: string;
        status_label: string;
        priority: string;
        description: string;
        acknowledged_at?: string | null;
        sla_due_at?: string | null;
        resolved_at?: string | null;
        resolution_type?: string | null;
        resolution_summary?: string | null;
        created_at: string;
    };
    reservation: ReservationDetail;
    messages: Array<{
        id: number;
        sender_type: 'customer' | 'owner' | 'admin' | 'system';
        sender_name: string;
        message: string;
        attachment_url?: string | null;
        attachment_path?: string | null;
        attachment_name?: string | null;
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
        destination_is_air_conditioned: boolean;
        destination_food_provided: boolean;
        destination_breakfast_included: boolean;
        destination_lunch_included: boolean;
        destination_dinner_included: boolean;
        original_amount_minor: number;
        alternative_amount_minor: number;
        price_difference_minor: number;
        refund_due_to_customer_minor: number;
        customer_additional_cost_minor: number;
        offer_expires_at: string;
        is_expired: boolean;
    }>;
    grievanceOfficer?: {
        name: string;
        designation: string;
        email: string;
        phone: string;
    };
}

const statusBadgeVariant: Record<
    string,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    submitted: 'outline',
    acknowledged: 'secondary',
    under_review: 'secondary',
    awaiting_owner: 'outline',
    awaiting_customer: 'destructive',
    relocation_offered: 'default',
    refund_pending: 'outline',
    resolved: 'secondary',
    closed: 'outline',
};

export default function SupportShow({
    case: ticket,
    reservation,
    messages,
    relocations,
    grievanceOfficer,
}: CaseDetailProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(
        null,
    );

    const messageForm = useForm<{
        message: string;
        attachment?: File | null;
    }>({
        message: '',
        attachment: null,
    });

    const decisionForm = useForm<{
        decision: 'accepted' | 'declined';
        reason?: string;
    }>({
        decision: 'accepted',
        reason: '',
    });

    const handleMessageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        messageForm.post(`/my-support/${ticket.case_reference}/messages`, {
            preserveScroll: true,
            onSuccess: () => {
                messageForm.reset();
                setSelectedFileName(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const handleRelocationDecision = (
        relocationId: number,
        decision: 'accepted' | 'declined',
    ) => {
        decisionForm.setData('decision', decision);
        decisionForm.post(`/relocations/${relocationId}/decision`, {
            preserveScroll: true,
        });
    };

    const activeOffer = relocations.find(
        (r) => r.status === 'offered' && !r.is_expired,
    );

    return (
        <ResponsiveContainer className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title={`Ticket ${ticket.case_reference} — TIJUM Support`} />

            <Breadcrumbs
                breadcrumbs={[
                    { title: 'Dashboard', href: '/dashboard' },
                    { title: 'Support & Grievances', href: '/my-support' },
                    {
                        title: ticket.case_reference,
                        href: `/my-support/${ticket.case_reference}`,
                    },
                ]}
                className="mb-2"
            />

            {/* Top Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href={supportIndex()}>
                        <ArrowLeft className="mr-1.5 size-3.5" />
                        <span>Back to all support cases</span>
                    </Link>
                </Button>

                <Button asChild variant="outline" size="sm">
                    <Link href={supportAcknowledgement(ticket.case_reference)}>
                        <FileText className="mr-1.5 size-3.5" />
                        <span>Statutory Grievance Copy (Printable)</span>
                    </Link>
                </Button>
            </div>

            {/* Ticket Header Card */}
            <div className="rounded-[20px] border border-tijum-surface/80 bg-white p-5 shadow-tijum-card sm:p-6 dark:border-border dark:bg-card">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-tijum-plum dark:text-tijum-peach">
                                {ticket.case_reference}
                            </span>
                            <Badge
                                variant={
                                    statusBadgeVariant[ticket.status] ??
                                    'outline'
                                }
                            >
                                {ticket.status_label}
                            </Badge>
                            <Badge variant="outline">
                                {ticket.category_label}
                            </Badge>
                            <span className="text-xs text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                Priority: <strong>{ticket.priority}</strong>
                            </span>
                        </div>

                        <h1 className="font-heading text-xl font-bold text-tijum-plum sm:text-2xl dark:text-foreground">
                            Reported Issue: {ticket.category_label}
                        </h1>

                        <p className="max-w-2xl text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            {ticket.description}
                        </p>
                    </div>

                    <div className="min-w-[200px] space-y-1 self-start rounded-xl border border-tijum-surface/70 bg-tijum-cream/55 p-3.5 text-left text-xs sm:self-auto sm:text-right dark:border-border dark:bg-muted/45">
                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                            Submitted:{' '}
                            <strong className="text-tijum-plum dark:text-foreground">
                                {new Date(ticket.created_at).toLocaleString(
                                    'en-IN',
                                    {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    },
                                )}
                            </strong>
                        </p>
                        {ticket.sla_due_at && (
                            <p className="flex items-center gap-1 text-tijum-plum-muted sm:justify-end dark:text-muted-foreground">
                                <Clock className="size-3 text-tijum-coral" />
                                <span>
                                    SLA Target:{' '}
                                    <strong className="text-tijum-plum dark:text-foreground">
                                        {new Date(
                                            ticket.sla_due_at,
                                        ).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </strong>
                                </span>
                            </p>
                        )}
                        {ticket.resolved_at && (
                            <p className="flex items-center gap-1 font-semibold text-emerald-700 sm:justify-end dark:text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                <span>Resolved</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Resolution Summary if Resolved */}
                {ticket.resolved_at && ticket.resolution_summary && (
                    <div className="mt-4 rounded-xl border border-tijum-peach bg-tijum-peach/15 p-4 text-xs dark:border-tijum-coral/40 dark:bg-tijum-coral/12">
                        <p className="font-heading font-bold text-tijum-plum dark:text-foreground">
                            Resolution:{' '}
                            {ticket.resolution_type ?? 'Case Completed'}
                        </p>
                        <p className="mt-1 leading-relaxed text-tijum-plum/80 dark:text-muted-foreground">
                            {ticket.resolution_summary}
                        </p>
                    </div>
                )}
            </div>

            {/* Active Relocation Offer Card */}
            {activeOffer && (
                <div className="rounded-[20px] border-2 border-tijum-coral/50 bg-white p-5 shadow-tijum-card sm:p-6 dark:border-tijum-coral/60 dark:bg-card">
                    <div className="mb-4 flex items-start gap-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral/15 text-tijum-coral">
                            <Home className="size-5" />
                        </span>
                        <div>
                            <span className="inline-block rounded-full bg-tijum-coral/15 px-2.5 py-0.5 font-heading text-[11px] font-bold tracking-wide text-tijum-plum uppercase dark:text-tijum-peach">
                                Alternative Accommodation Offered
                            </span>
                            <h2 className="mt-1 font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                                Relocation to{' '}
                                {activeOffer.destination_property_name}
                            </h2>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Destination confirmed by host. TIJUM Customer
                                Protection covers any pricing difference.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 rounded-xl border border-tijum-surface/70 bg-tijum-cream/55 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4 dark:border-border dark:bg-muted/45">
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                Destination Location
                            </span>
                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                {activeOffer.destination_locality ?? 'Central'},{' '}
                                {activeOffer.destination_city_name}
                            </p>
                        </div>
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                Room Category
                            </span>
                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                {activeOffer.destination_room_type_name}{' '}
                                {activeOffer.destination_is_air_conditioned
                                    ? '(AC)'
                                    : '(Non-AC)'}
                            </p>
                        </div>
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                Meal Inclusions
                            </span>
                            <p className="flex items-center gap-1 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                <Utensils className="size-3 text-tijum-coral" />
                                <span>
                                    {activeOffer.destination_food_provided
                                        ? [
                                              activeOffer.destination_breakfast_included &&
                                                  'Breakfast',
                                              activeOffer.destination_lunch_included &&
                                                  'Lunch',
                                              activeOffer.destination_dinner_included &&
                                                  'Dinner',
                                          ]
                                              .filter(Boolean)
                                              .join(' + ')
                                        : 'No food included'}
                                </span>
                            </p>
                        </div>
                        <div>
                            <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                Your Additional Cost
                            </span>
                            <p className="font-heading text-sm font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                ₹0.00 (Protected)
                            </p>
                            {activeOffer.refund_due_to_customer_minor > 0 && (
                                <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                    + ₹
                                    {(
                                        activeOffer.refund_due_to_customer_minor /
                                        100
                                    ).toFixed(2)}{' '}
                                    refund difference
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/60 pt-4 dark:border-border">
                        <div className="flex items-center gap-1.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            <Clock className="size-3.5 text-tijum-coral" />
                            <span>
                                Offer expires:{' '}
                                <strong className="text-tijum-plum dark:text-foreground">
                                    {new Date(
                                        activeOffer.offer_expires_at,
                                    ).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </strong>
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={decisionForm.processing}
                                onClick={() =>
                                    handleRelocationDecision(
                                        activeOffer.id,
                                        'declined',
                                    )
                                }
                                className="text-xs text-destructive hover:bg-destructive/10"
                            >
                                <XCircle className="mr-1 size-3.5" />
                                Decline &amp; Request Full Refund
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                disabled={decisionForm.processing}
                                onClick={() =>
                                    handleRelocationDecision(
                                        activeOffer.id,
                                        'accepted',
                                    )
                                }
                                className="text-xs"
                            >
                                <CheckCircle2 className="mr-1 size-3.5" />
                                Accept Alternative Stay
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Grid: Linked Reservation Info & Message Thread */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Left Column: Linked Reservation Card & Grievance Info */}
                <div className="space-y-6 lg:col-span-5">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                Booked Stay Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex justify-between border-b border-tijum-surface/60 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Booking Reference
                                </span>
                                <Link
                                    href={`/reservations/${reservation.booking_reference}`}
                                    className="font-mono font-bold text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach"
                                >
                                    {reservation.booking_reference}
                                </Link>
                            </div>

                            <div className="flex justify-between border-b border-tijum-surface/60 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Property
                                </span>
                                <span className="text-right font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.property_name}
                                </span>
                            </div>

                            <div className="flex justify-between border-b border-tijum-surface/60 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Stay Dates
                                </span>
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.check_in_date} to{' '}
                                    {reservation.checkout_date}
                                </span>
                            </div>

                            <div className="flex justify-between border-b border-tijum-surface/60 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Total Paid
                                </span>
                                <span className="font-bold tabular-nums text-tijum-plum dark:text-foreground">
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

                            <div className="flex items-center justify-between pt-1">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Cancellation Terms
                                </span>
                                <span className="text-right text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                    {reservation.cancellation_policy?.name ??
                                        'Standard Guest Guarantee'}
                                </span>
                            </div>

                            <div className="pt-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    <Link
                                        href={`/reservations/${reservation.booking_reference}`}
                                    >
                                        View Full Reservation
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Grievance Redressal Officer card */}
                    {grievanceOfficer && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-1.5 font-heading text-xs font-bold text-tijum-plum dark:text-foreground">
                                    <ShieldCheck className="size-4 text-tijum-coral" />
                                    <span>Grievance Officer Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                <p>
                                    <strong className="text-tijum-plum dark:text-foreground">
                                        {grievanceOfficer.name}
                                    </strong>
                                    , {grievanceOfficer.designation}
                                </p>
                                <p>
                                    Email:{' '}
                                    <a
                                        href={`mailto:${grievanceOfficer.email}`}
                                        className="font-medium text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach"
                                    >
                                        {grievanceOfficer.email}
                                    </a>
                                </p>
                                <p>Phone: {grievanceOfficer.phone}</p>
                                <p className="pt-1 text-[11px] leading-normal text-tijum-plum-muted dark:text-muted-foreground">
                                    Compliant with Rule 4(4) and Rule 5(3)(b) of
                                    the Consumer Protection (E-Commerce) Rules,
                                    2020.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Case Discussion & Timeline */}
                <div className="space-y-4 lg:col-span-7">
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/60 pb-3 dark:border-border">
                            <CardTitle className="flex items-center gap-2 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                <MessageSquare className="size-4 text-tijum-coral" />
                                <span>
                                    Support Discussion &amp; Updates (
                                    {messages.length})
                                </span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="max-h-[500px] space-y-4 overflow-y-auto p-4">
                            {messages.map((msg) => {
                                const isCustomer =
                                    msg.sender_type === 'customer';
                                const isAdmin = msg.sender_type === 'admin';
                                const isOwner = msg.sender_type === 'owner';

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col gap-1 rounded-xl p-3.5 text-xs leading-relaxed ${
                                            isCustomer
                                                ? 'ml-6 border border-tijum-coral/25 bg-tijum-coral/12 text-tijum-plum dark:text-foreground'
                                                : isAdmin
                                                  ? 'mr-6 bg-tijum-plum text-tijum-cream dark:border dark:border-tijum-coral/35 dark:bg-[#3a2438]'
                                                  : isOwner
                                                    ? 'mr-6 border border-tijum-peach bg-tijum-peach/15 text-tijum-plum dark:border-border dark:bg-muted/60 dark:text-foreground'
                                                    : 'mx-4 bg-muted text-center text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-1 text-[11px]">
                                            <span className="font-semibold">
                                                {msg.sender_name}{' '}
                                                {isAdmin && '(TIJUM Support)'}
                                                {isOwner && '(Property Host)'}
                                            </span>
                                            <span className="opacity-75">
                                                {new Date(
                                                    msg.created_at,
                                                ).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                        </div>

                                        <p className="pt-1 whitespace-pre-wrap">
                                            {msg.message}
                                        </p>

                                        {(msg.attachment_url ||
                                            msg.attachment_path) && (
                                            <div className="mt-2 border-t border-current/10 pt-1">
                                                <a
                                                    href={
                                                        msg.attachment_url ??
                                                        msg.attachment_path ??
                                                        '#'
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80"
                                                >
                                                    <Paperclip className="size-3" />
                                                    <span>
                                                        {msg.attachment_name ??
                                                            'View Attachment'}
                                                    </span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>

                        {/* Send Message Form */}
                        {ticket.status !== 'resolved' &&
                        ticket.status !== 'closed' ? (
                            <form
                                onSubmit={handleMessageSubmit}
                                className="space-y-3 border-t border-tijum-surface/60 p-4 dark:border-border"
                            >
                                <Textarea
                                    rows={3}
                                    placeholder="Write a message to TIJUM Support or provide additional evidence…"
                                    value={messageForm.data.message}
                                    onChange={(e) =>
                                        messageForm.setData(
                                            'message',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className="resize-none text-xs"
                                />
                                <InputError
                                    message={
                                        messageForm.errors.message ??
                                        messageForm.errors.attachment
                                    }
                                />

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
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
                                            className="text-xs"
                                        >
                                            <Paperclip className="mr-1 size-3.5" />
                                            <span>Attach Photo / PDF</span>
                                        </Button>
                                        {selectedFileName && (
                                            <span className="max-w-[150px] truncate text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                {selectedFileName}
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="plum"
                                        size="sm"
                                        disabled={messageForm.processing}
                                        className="text-xs"
                                    >
                                        <Send className="mr-1 size-3.5" />
                                        <span>Send Message</span>
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="border-t border-tijum-surface/60 p-4 text-center text-xs text-tijum-plum-muted dark:border-border dark:text-muted-foreground">
                                This support ticket is closed. For new
                                inquiries, submit a ticket from your
                                reservation.
                            </div>
                        )}
                    </Card>
                </div>
            </div>
            </div>
        </ResponsiveContainer>
    );
}
