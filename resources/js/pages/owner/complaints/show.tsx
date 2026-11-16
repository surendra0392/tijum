import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    Clock,
    FileText,
    KeyRound,
    MessageSquare,
    Paperclip,
    Send,
    ShieldAlert,
    ShieldCheck,
    User,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type MessageItem = {
    id: number;
    sender_type: string;
    sender_name: string;
    message: string;
    attachment_path?: string | null;
    attachment_name?: string | null;
    created_at: string;
};

type Props = {
    case: {
        id: number;
        case_reference: string;
        category: string;
        category_label: string;
        status: string;
        status_label: string;
        priority: string;
        description: string;
        created_at: string;
        sla_due_at?: string | null;
        is_sla_breached: boolean;
        sla_remaining_human?: string | null;
    };
    reservation: {
        id: number;
        booking_reference: string;
        property_name: string;
        room_type_name?: string | null;
        guest_name: string;
        guest_phone?: string | null;
        guest_email?: string | null;
        check_in_date: string;
        checkout_date: string;
        quantity: number;
        status_label: string;
    };
    messages: MessageItem[];
    status?: string;
};

export default function OwnerComplaintShow({
    case: caseData,
    reservation,
    messages,
    status,
}: Props) {
    const messageForm = useForm<{
        message: string;
        attachment: File | null;
    }>({
        message: '',
        attachment: null,
    });

    const submitMessage = (e: FormEvent) => {
        e.preventDefault();
        messageForm.post(
            `/owner/complaints/${caseData.case_reference}/messages`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    messageForm.reset('message', 'attachment');
                },
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head
                title={`Complaint ${caseData.case_reference} · Resolution Desk`}
            />

            {/* Back button and header */}
            <div className="space-y-2">
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1.5 text-xs"
                >
                    <Link href="/owner/complaints">
                        <ArrowLeft className="size-4" /> Back to Complaints List
                    </Link>
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading text-xl font-bold text-tijum-plum dark:text-foreground">
                                {caseData.category_label}
                            </span>
                            <Badge
                                variant="outline"
                                className="font-mono text-xs font-semibold"
                            >
                                {caseData.case_reference}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                {caseData.status_label}
                            </Badge>
                            {caseData.is_sla_breached && (
                                <Badge
                                    variant="destructive"
                                    className="text-xs"
                                >
                                    SLA Overdue
                                </Badge>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Opened on{' '}
                            {new Date(caseData.created_at).toLocaleString()}
                        </p>
                    </div>

                    {caseData.sla_remaining_human &&
                        !['resolved', 'closed'].includes(caseData.status) && (
                            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/45 dark:text-amber-200">
                                <Clock className="size-4 text-amber-700 dark:text-amber-300" />
                                <span className="tabular-nums">
                                    Response SLA Target:{' '}
                                    {caseData.sla_remaining_human}
                                </span>
                            </div>
                        )}
                </div>
            </div>

            {status === 'message-sent' && (
                <Alert variant="success">
                    <ShieldCheck className="size-4" />
                    <AlertTitle>Response Recorded</AlertTitle>
                    <AlertDescription>
                        Your message and documents have been posted to the
                        resolution thread and shared with the guest and TIJUM
                        Care team.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left side: Complaint summary & stay details */}
                <div className="space-y-6 lg:col-span-5">
                    {/* Guest problem statement card */}
                    <Card className="border-tijum-surface/80 dark:border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <ShieldAlert className="size-4 text-tijum-coral" />
                                Guest Grievance Statement
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-xl border border-rose-200/70 bg-rose-50/45 p-3 text-xs leading-relaxed text-rose-950 dark:border-rose-500/35 dark:bg-rose-950/35 dark:text-rose-100">
                                &quot;{caseData.description}&quot;
                            </div>
                            <div className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                Reported Priority:{' '}
                                <strong className="text-tijum-plum capitalize dark:text-foreground">
                                    {caseData.priority}
                                </strong>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stay & Reservation card */}
                    <Card className="border-tijum-surface/80 dark:border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                                Stay &amp; Booking Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Property
                                </span>
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.property_name}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Room Type
                                </span>
                                <span className="font-medium text-tijum-plum dark:text-foreground">
                                    {reservation.room_type_name || 'Standard'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Guest Name
                                </span>
                                <span className="font-medium text-tijum-plum dark:text-foreground">
                                    {reservation.guest_name}
                                </span>
                            </div>
                            {reservation.guest_phone && (
                                <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                    <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Guest Phone
                                    </span>
                                    <span className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                        {reservation.guest_phone}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Dates
                                </span>
                                <span className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                    {reservation.check_in_date} to{' '}
                                    {reservation.checkout_date}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Booking Reference
                                </span>
                                <Button
                                    variant="link"
                                    size="sm"
                                    asChild
                                    className="h-auto p-0 font-mono text-xs"
                                >
                                    <Link
                                        href={`/owner/reservations/${reservation.booking_reference}`}
                                    >
                                        #{reservation.booking_reference}
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: Interactive message thread */}
                <div className="space-y-6 lg:col-span-7">
                    <Card className="border-tijum-surface/80 dark:border-border">
                        <CardHeader className="border-b border-tijum-surface/70 pb-3 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <MessageSquare className="size-4 text-tijum-coral" />
                                Resolution Conversation ({messages.length})
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Public messages exchanged between Host, Guest,
                                and TIJUM Customer Protection.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                            {messages.length === 0 ? (
                                <p className="py-6 text-center text-xs text-tijum-plum-muted italic dark:text-muted-foreground">
                                    No follow-up messages yet. Use the box below
                                    to provide clarification or propose a host
                                    resolution.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((msg) => {
                                        const isOwner =
                                            msg.sender_type === 'owner';
                                        const isAdmin =
                                            msg.sender_type === 'admin';

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`rounded-xl border p-3.5 text-xs ${
                                                    isOwner
                                                        ? 'border-emerald-200 bg-emerald-50/45 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/35 dark:text-emerald-100'
                                                        : isAdmin
                                                          ? 'border-blue-200 bg-blue-50/45 text-blue-950 dark:border-blue-500/35 dark:bg-blue-950/35 dark:text-blue-100'
                                                          : 'border-tijum-surface bg-tijum-cream/30 text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground'
                                                }`}
                                            >
                                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                                                    <span className="flex items-center gap-1.5">
                                                        {msg.sender_name}
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[9px] tracking-wider uppercase ${
                                                                isOwner
                                                                    ? 'border-emerald-300 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200'
                                                                    : isAdmin
                                                                      ? 'border-blue-300 text-blue-800 dark:border-blue-500/40 dark:text-blue-200'
                                                                      : 'text-tijum-plum-muted dark:text-muted-foreground'
                                                            }`}
                                                        >
                                                            {msg.sender_type}
                                                        </Badge>
                                                    </span>
                                                    <span className="font-normal text-tijum-plum-muted dark:text-muted-foreground">
                                                        {new Date(
                                                            msg.created_at,
                                                        ).toLocaleString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            day: 'numeric',
                                                            month: 'short',
                                                        })}
                                                    </span>
                                                </div>

                                                <p className="leading-relaxed whitespace-pre-line">
                                                    {msg.message}
                                                </p>

                                                {msg.attachment_path && (
                                                    <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-tijum-surface/60 bg-card/85 px-2.5 py-1.5 text-[11px] dark:border-border">
                                                        <Paperclip className="size-3 text-tijum-coral" />
                                                        <a
                                                            href={`/storage/${msg.attachment_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="truncate font-medium text-tijum-coral underline dark:text-tijum-peach"
                                                        >
                                                            {msg.attachment_name ||
                                                                'View Attachment'}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>

                        {/* Host reply form */}
                        <CardFooter className="border-t border-tijum-surface/70 bg-tijum-cream/25 p-4 dark:border-border dark:bg-muted/25">
                            <form
                                onSubmit={submitMessage}
                                className="w-full space-y-3"
                            >
                                <Label
                                    htmlFor="reply-message"
                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Post Host Reply or Resolution Offer
                                </Label>
                                <Textarea
                                    id="reply-message"
                                    rows={3}
                                    placeholder="Explain property perspective, offer room reassignment, or provide resolution details..."
                                    value={messageForm.data.message}
                                    onChange={(e) =>
                                        messageForm.setData(
                                            'message',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className="text-xs"
                                />

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Label
                                            htmlFor="attachment"
                                            className="inline-flex cursor-pointer items-center gap-1 text-xs text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                        >
                                            <Paperclip className="size-3.5" />
                                            <span>
                                                {messageForm.data.attachment
                                                    ? messageForm.data
                                                          .attachment.name
                                                    : 'Attach proof or photo (optional)'}
                                            </span>
                                        </Label>
                                        <Input
                                            id="attachment"
                                            type="file"
                                            className="hidden"
                                            onChange={(e) =>
                                                messageForm.setData(
                                                    'attachment',
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={messageForm.processing}
                                    >
                                        <Send className="mr-1.5 size-4" /> Send
                                        Host Reply
                                    </Button>
                                </div>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
