import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    MessageSquare,
    Paperclip,
    Send,
    ShieldAlert,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface OwnerCaseShowProps {
    case: {
        id: number;
        case_reference: string;
        category_label: string;
        status: string;
        status_label: string;
        priority: string;
        description: string;
        created_at: string;
    };
    reservation: {
        id: number;
        booking_reference: string;
        property_name: string;
        room_type_name?: string | null;
        check_in_date: string;
        checkout_date: string;
        quantity: number;
        status_label: string;
    };
    messages: Array<{
        id: number;
        sender_type: 'customer' | 'owner' | 'admin' | 'system';
        sender_name: string;
        message: string;
        attachment_path?: string | null;
        attachment_name?: string | null;
        created_at: string;
    }>;
}

export default function OwnerCaseShow({
    case: ticket,
    reservation,
    messages,
}: OwnerCaseShowProps) {
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

    const handleMessageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        messageForm.post(`/owner/cases/${ticket.case_reference}/messages`, {
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

    return (
        <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <Head
                title={`Ticket ${ticket.case_reference} — Partner Response`}
            />

            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                    <Link href="/owner/cases">
                        <ArrowLeft className="size-3.5" />
                        <span>Back to all guest cases</span>
                    </Link>
                </Button>
            </div>

            {/* Header info */}
            <div className="rounded-2xl border border-tijum-surface/80 bg-card p-5 shadow-tijum-card sm:p-6 dark:border-border">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-tijum-coral">
                                {ticket.case_reference}
                            </span>
                            <Badge variant="outline">
                                {ticket.status_label}
                            </Badge>
                            <Badge variant="secondary">
                                {ticket.category_label}
                            </Badge>
                        </div>

                        <h1 className="font-heading text-xl font-bold text-tijum-plum dark:text-foreground">
                            Guest Reported: {ticket.category_label}
                        </h1>

                        <p className="max-w-2xl text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            {ticket.description}
                        </p>
                    </div>

                    <div className="min-w-[200px] space-y-1 self-start rounded-xl border border-tijum-surface/70 bg-tijum-cream/60 p-3 text-right text-xs tabular-nums sm:self-auto dark:border-border dark:bg-muted/45">
                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                            Booking Reference:{' '}
                            <strong className="font-mono text-tijum-plum dark:text-foreground">
                                {reservation.booking_reference}
                            </strong>
                        </p>
                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                            Stay: {reservation.check_in_date} to{' '}
                            {reservation.checkout_date}
                        </p>
                    </div>
                </div>
            </div>

            {/* Discussion & Response */}
            <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-5">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                Booking Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-muted-foreground">
                                    Property
                                </span>
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.property_name}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-muted-foreground">
                                    Room Category
                                </span>
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.room_type_name ??
                                        'Standard Room'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                <span className="text-muted-foreground">
                                    Reserved Units
                                </span>
                                <span className="font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                    {reservation.quantity} unit(s)
                                </span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-muted-foreground">
                                    Booking Status
                                </span>
                                <Badge variant="outline">
                                    {reservation.status_label}
                                </Badge>
                            </div>

                            <div className="pt-3">
                                <Link
                                    href={`/owner/reservations/${reservation.id}`}
                                    className="block rounded-xl border border-tijum-surface/70 bg-tijum-cream/80 py-2 text-center text-xs font-semibold text-tijum-plum transition hover:bg-tijum-cream dark:border-border dark:bg-muted/45 dark:text-foreground dark:hover:bg-muted"
                                >
                                    Manage Reservation
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4 lg:col-span-7">
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/70 pb-3 dark:border-border">
                            <CardTitle className="flex items-center gap-2 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                <MessageSquare className="size-4 text-tijum-coral" />
                                <span>
                                    Communication Thread ({messages.length})
                                </span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="max-h-[500px] space-y-4 overflow-y-auto p-4">
                            {messages.map((msg) => {
                                const isOwner = msg.sender_type === 'owner';
                                const isAdmin = msg.sender_type === 'admin';

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col gap-1 rounded-xl p-3.5 text-xs leading-relaxed ${
                                            isOwner
                                                ? 'ml-6 border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100'
                                                : isAdmin
                                                  ? 'mr-6 bg-tijum-plum text-tijum-cream dark:border dark:border-tijum-coral/35 dark:bg-[#3a2438] dark:text-tijum-cream'
                                                  : 'mr-6 bg-muted text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-1 text-[11px]">
                                            <span className="font-semibold">
                                                {msg.sender_name}{' '}
                                                {isOwner && '(You - Partner)'}
                                                {isAdmin && '(TIJUM Admin)'}
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

                                        {msg.attachment_path && (
                                            <div className="mt-2 border-t border-current/10 pt-1">
                                                <a
                                                    href={msg.attachment_path}
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
                        <form
                            onSubmit={handleMessageSubmit}
                            className="space-y-3 border-t p-4"
                        >
                            <Textarea
                                rows={3}
                                placeholder="Write a response to the guest or TIJUM Support team..."
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
                                        <span>Attach Document</span>
                                    </Button>
                                    {selectedFileName && (
                                        <span className="max-w-[150px] truncate text-[11px] text-muted-foreground">
                                            {selectedFileName}
                                        </span>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="plum"
                                    disabled={messageForm.processing}
                                    className="text-xs"
                                >
                                    <Send className="mr-1 size-3.5" />
                                    <span>Send Response</span>
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}
