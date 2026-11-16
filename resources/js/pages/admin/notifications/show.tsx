import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    RefreshCw,
    Send,
    Shield,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/layouts/admin-layout';
import type { NotificationDeliveryItem } from '@/types/notifications';

interface Props {
    delivery: NotificationDeliveryItem;
}

function getDeliverySemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'delivered':
        case 'read':
            return 'verified';
        case 'failed':
            return 'rejected';
        case 'suppressed':
            return 'neutral';
        case 'sending':
        case 'retrying':
            return 'processing';
        default:
            return 'info';
    }
}

export default function AdminNotificationDeliveryShow({ delivery }: Props) {
    const [retryDialogOpen, setRetryDialogOpen] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const handleRetry = () => {
        setRetryDialogOpen(true);
    };

    const confirmRetry = () => {
        setRetrying(true);
        router.post(
            `/admin/notifications/${delivery.id}/retry`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setRetrying(false);
                    setRetryDialogOpen(false);
                },
            },
        );
    };

    const canRetry = ['failed', 'suppressed'].includes(delivery.status);

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                {
                    title: 'Notification Deliveries',
                    href: '/admin/notifications',
                },
                {
                    title: `Delivery #${delivery.id}`,
                    href: `/admin/notifications/${delivery.id}`,
                },
            ]}
        >
            <Head title={`Notification Delivery #${delivery.id} Audit`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Delivery Audit"
                    title={`Delivery Audit: #${delivery.id}`}
                    description={`Dispatched via ${delivery.channel.toUpperCase()} for event ${delivery.template_code}`}
                    badges={
                        <>
                            <StatusBadge
                                status={getDeliverySemanticStatus(
                                    delivery.status,
                                )}
                                label={delivery.status}
                                className="capitalize"
                            />
                            <Badge
                                variant="outline"
                                className="text-xs uppercase"
                            >
                                {delivery.channel}
                            </Badge>
                        </>
                    }
                    actions={
                        <>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/notifications">
                                    <ArrowLeft
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Back to Deliveries</span>
                                </Link>
                            </Button>
                            {canRetry && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleRetry}
                                >
                                    <RefreshCw
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Retry Delivery</span>
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left: Main Details */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Status & Error Banner */}
                        {delivery.status === 'failed' && (
                            <Alert
                                variant="destructive"
                                className="border-l-4 border-l-rose-500"
                            >
                                <AlertCircle aria-hidden="true" />
                                <AlertTitle>
                                    Delivery Failure Recorded
                                </AlertTitle>
                                <AlertDescription>
                                    <p className="font-mono text-xs font-semibold tabular-nums">
                                        Code:{' '}
                                        {delivery.error_code ||
                                            'PROVIDER_ERROR'}
                                    </p>
                                    <p className="text-xs">
                                        {delivery.error_description ||
                                            'External provider rejected message delivery.'}
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}

                        {delivery.status === 'suppressed' && (
                            <Alert
                                variant="default"
                                className="border-l-4 border-l-tijum-plum-muted dark:border-l-muted-foreground"
                            >
                                <Shield aria-hidden="true" />
                                <AlertTitle>
                                    Delivery Suppressed by Policy
                                </AlertTitle>
                                <AlertDescription>
                                    <p className="text-xs">
                                        {delivery.error_description ||
                                            'Recipient opted out or prior explicit WhatsApp consent was missing.'}
                                    </p>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Dispatch Metadata */}
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <CardTitle className="text-sm font-semibold">
                                    Dispatch Metadata &amp; Channel Specifics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-tijum-surface/70 py-1 text-sm dark:divide-border">
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Event Code
                                    </span>
                                    <span className="col-span-2 font-mono text-xs font-semibold text-tijum-plum dark:text-foreground">
                                        {delivery.template_code}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Event ID
                                    </span>
                                    <span className="col-span-2 font-mono text-xs text-tijum-plum tabular-nums dark:text-foreground">
                                        {delivery.event_id}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Idempotency Key
                                    </span>
                                    <span className="col-span-2 font-mono text-xs break-all text-tijum-plum dark:text-foreground">
                                        {delivery.idempotency_key}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Delivery Channel
                                    </span>
                                    <span className="col-span-2 font-heading text-xs font-semibold text-tijum-plum uppercase dark:text-foreground">
                                        {delivery.channel}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Category
                                    </span>
                                    <span className="col-span-2 text-xs text-tijum-plum capitalize dark:text-foreground">
                                        {delivery.category.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Provider
                                    </span>
                                    <span className="col-span-2 font-mono text-xs text-tijum-plum dark:text-foreground">
                                        {delivery.provider || 'default'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Provider Message ID
                                    </span>
                                    <span className="col-span-2 font-mono text-xs break-all text-tijum-plum tabular-nums dark:text-foreground">
                                        {delivery.provider_message_id || '—'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 py-3">
                                    <span className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        Dispatch Attempts
                                    </span>
                                    <span className="col-span-2 font-mono text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                        {delivery.attempts}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Subject & Safe Variables Payload */}
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <CardTitle className="text-sm font-semibold">
                                    Payload &amp; Safe Variable Mapping
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 py-5">
                                {delivery.subject && (
                                    <div className="space-y-1.5">
                                        <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Email Subject
                                        </p>
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 text-xs font-medium text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                            {delivery.subject}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Template Variables (Sanitized)
                                    </p>
                                    <pre className="max-h-64 overflow-x-auto rounded-xl border border-tijum-surface/80 bg-tijum-plum p-4 font-mono text-xs leading-relaxed text-tijum-cream dark:border-border dark:bg-[#160e15] dark:text-tijum-cream">
                                        {JSON.stringify(
                                            delivery.payload || {},
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Recipient & Lifecycle */}
                    <div className="space-y-6">
                        {/* Recipient Profile */}
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <CardTitle className="text-sm font-semibold">
                                    Recipient Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-tijum-surface/70 py-1 text-xs dark:divide-border">
                                <div className="space-y-1 py-3">
                                    <div className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Recipient Name
                                    </div>
                                    <div className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        {delivery.recipient_name || 'Recipient'}
                                    </div>
                                </div>
                                <div className="space-y-1 py-3">
                                    <div className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Entity Type &amp; ID
                                    </div>
                                    <div className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                        {delivery.notifiable_type} #
                                        {delivery.notifiable_id}
                                    </div>
                                </div>
                                <div className="space-y-1 py-3">
                                    <div className="text-tijum-plum-muted dark:text-muted-foreground">
                                        Destination (Masked)
                                    </div>
                                    <div className="font-mono font-medium break-all text-tijum-plum dark:text-foreground">
                                        {delivery.recipient_destination}
                                    </div>
                                </div>
                                {delivery.related_reference && (
                                    <div className="space-y-1.5 py-3">
                                        <div className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Marketplace Reference
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-xs tabular-nums"
                                        >
                                            {delivery.related_reference}
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Lifecycle Timeline */}
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <CardTitle className="text-sm font-semibold">
                                    Delivery Lifecycle Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 py-5 text-xs">
                                <div className="flex items-start gap-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-tijum-surface/80 bg-tijum-cream text-tijum-plum-muted dark:border-border dark:bg-muted dark:text-muted-foreground">
                                        <Clock
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <div className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                            Created
                                        </div>
                                        <div className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {delivery.created_at}
                                        </div>
                                    </div>
                                </div>

                                {delivery.submitted_at && (
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-status-info-border bg-status-info-bg text-status-info-fg">
                                            <Send
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <div className="font-heading font-semibold text-status-info-fg">
                                                Submitted to Gateway
                                            </div>
                                            <div className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {delivery.submitted_at}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {delivery.delivered_at && (
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-status-success-border bg-status-success-bg text-status-success-fg">
                                            <CheckCircle2
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <div className="font-heading font-semibold text-status-success-fg">
                                                Delivered / Accepted
                                            </div>
                                            <div className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {delivery.delivered_at}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {delivery.read_at && (
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-status-success-border bg-status-success-bg text-status-success-fg">
                                            <CheckCircle2
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <div className="font-heading font-semibold text-status-success-fg">
                                                Read Receipt Confirmed
                                            </div>
                                            <div className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {delivery.read_at}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {delivery.failed_at && (
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-status-error-border bg-status-error-bg text-status-error-fg">
                                            <AlertCircle
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <div className="font-heading font-semibold text-status-error-fg">
                                                Failed
                                            </div>
                                            <div className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {delivery.failed_at}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <ConfirmationDialog
                    open={retryDialogOpen}
                    onOpenChange={(open) => {
                        if (!retrying) {
                            setRetryDialogOpen(open);
                        }
                    }}
                    title={`Requeue delivery #${delivery.id}?`}
                    description="This will dispatch an immediate retry attempt through the configured notification provider."
                    confirmLabel="Retry Delivery"
                    cancelLabel="Cancel"
                    loading={retrying}
                    onConfirm={confirmRetry}
                />
            </div>
        </AdminLayout>
    );
}
