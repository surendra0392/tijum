import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
    Database,
    Layers,
    Mail,
    MessageSquare,
    RefreshCw,
    Send,
    Smartphone,
    XCircle,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import type {
    NotificationProviderItem,
    NotificationWebhookEventItem,
} from '@/types/notifications';

interface WebhookStats {
    total_24h: number;
    whatsapp_24h: number;
    sms_24h: number;
    failed_24h: number;
}

interface Props {
    providers: Record<string, NotificationProviderItem>;
    recentWebhooks: NotificationWebhookEventItem[];
    webhookStats: WebhookStats;
    globalEnabled: boolean;
}

export default function AdminNotificationProvidersIndex({
    providers: initialProviders,
    recentWebhooks,
    webhookStats,
    globalEnabled,
}: Props) {
    const [providers, setProviders] = useState(initialProviders);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const [testRecipient, setTestRecipient] = useState('admin@tijum.com');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
        sent_at?: string;
    } | null>(null);

    const getCsrfToken = () =>
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
            ?.content || '';

    const handleVerifySmtp = async () => {
        setIsVerifyingEmail(true);
        setVerifyMessage(null);
        try {
            const res = await fetch(
                '/admin/notifications/providers/email/verify',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                },
            );

            const data = await res.json();
            if (data.status === 'operational') {
                setVerifyMessage({
                    type: 'success',
                    text:
                        data.message ||
                        'SMTP server connection & authentication verified successfully!',
                });
                setProviders((prev) => ({
                    ...prev,
                    email: {
                        ...prev.email,
                        status: 'operational',
                        latency_ms: data.data?.latency_ms,
                        last_connection_at: data.data?.checked_at,
                        checks: data.data?.checks,
                        sanitized_error: null,
                    },
                }));
            } else {
                setVerifyMessage({
                    type: 'error',
                    text:
                        data.message || 'SMTP connection verification failed.',
                });
                setProviders((prev) => ({
                    ...prev,
                    email: {
                        ...prev.email,
                        status: 'failed',
                        sanitized_error: data.data?.sanitized_error,
                        checks: data.data?.checks,
                    },
                }));
            }
        } catch {
            setVerifyMessage({
                type: 'error',
                text: 'Network error communicating with the verification endpoint.',
            });
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testRecipient.trim()) return;

        setIsSendingTest(true);
        setTestResult(null);
        try {
            const res = await fetch(
                '/admin/notifications/providers/email/test-send',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        recipient_email: testRecipient.trim(),
                    }),
                },
            );

            const data = await res.json();
            if (res.ok && data.success) {
                setTestResult({
                    success: true,
                    message:
                        data.message ||
                        `Test email dispatched to ${testRecipient}!`,
                    sent_at: data.sent_at,
                });
                setProviders((prev) => ({
                    ...prev,
                    email: {
                        ...prev.email,
                        last_test_email: {
                            success: true,
                            recipient: testRecipient.trim(),
                            sent_at: data.sent_at,
                            message: data.message,
                        },
                    },
                }));
            } else {
                setTestResult({
                    success: false,
                    message:
                        data.message ||
                        data.error ||
                        'Failed to dispatch test email.',
                });
            }
        } catch {
            setTestResult({
                success: false,
                message: 'Network request failed while dispatching test email.',
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    const getProviderIcon = (channel: string) => {
        switch (channel) {
            case 'email':
                return (
                    <Mail
                        className="size-5 text-status-info-fg"
                        aria-hidden="true"
                    />
                );
            case 'sms':
                return (
                    <Smartphone
                        className="size-5 text-status-warning-fg"
                        aria-hidden="true"
                    />
                );
            case 'whatsapp':
                return (
                    <MessageSquare
                        className="size-5 text-status-success-fg"
                        aria-hidden="true"
                    />
                );
            default:
                return (
                    <Database
                        className="size-5 text-tijum-coral"
                        aria-hidden="true"
                    />
                );
        }
    };

    const getStatusPill = (status: string, enabled: boolean) => {
        if (!enabled) {
            return <StatusBadge status="neutral" label="Disabled by Config" />;
        }
        if (status === 'simulation') {
            return <StatusBadge status="warning" label="Simulation Active" />;
        }
        if (status === 'operational') {
            return <StatusBadge status="active" label="Operational Live" />;
        }
        if (status === 'untested') {
            return <StatusBadge status="info" label="Configured (Untested)" />;
        }
        return (
            <StatusBadge
                status="rejected"
                label={status}
                className="capitalize"
            />
        );
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Notifications', href: '/admin/notifications' },
                {
                    title: 'Gateway Readiness',
                    href: '/admin/notifications/providers',
                },
            ]}
        >
            <Head title="Channel Gateways & Provider Readiness" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Gateway Health & Compliance"
                    title="Channel Gateways & Provider Readiness"
                    description="Health, server SMTP diagnostics, simulation controls, and regulatory compliance status."
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
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/notifications/templates">
                                    <Layers
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Template Registry</span>
                                </Link>
                            </Button>
                        </>
                    }
                />

                {/* Global Kill Switch Banner */}
                {!globalEnabled && (
                    <Alert
                        variant="destructive"
                        className="border-l-4 border-l-rose-500"
                    >
                        <AlertCircle aria-hidden="true" />
                        <AlertTitle>
                            Global Notification System Kill Switch Active
                        </AlertTitle>
                        <AlertDescription>
                            <p className="text-xs">
                                <code className="font-mono font-semibold">
                                    TIJUM_NOTIFICATIONS_ENABLED=false
                                </code>{' '}
                                is set in environment. All outward dispatches
                                are suppressed.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {/* 4 Gateway Health Panels */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {Object.values(providers).map((prov) => (
                        <Card key={prov.channel} className="gap-4 py-6">
                            <CardHeader className="pb-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-tijum-surface/80 bg-tijum-cream dark:border-border dark:bg-muted">
                                            {getProviderIcon(prov.channel)}
                                        </span>
                                        <div>
                                            <CardTitle className="text-base font-semibold">
                                                {prov.name}
                                            </CardTitle>
                                            <CardDescription className="mt-0.5 font-mono text-xs">
                                                Driver: {prov.driver}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    {getStatusPill(
                                        prov.status,
                                        prov.is_enabled,
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
                                <p className="leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                    {prov.description}
                                </p>

                                <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <div className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum uppercase dark:text-foreground">
                                        Technical Specs &amp; Compliance
                                    </div>

                                    {prov.channel === 'email' && (
                                        <div className="space-y-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>
                                                    SMTP Host &amp; Port:
                                                </span>
                                                <code className="font-mono font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                    {prov.host ||
                                                        'mail.tijum.com'}
                                                    :{prov.port || 465} (
                                                    {prov.scheme || 'smtps'})
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>From Address:</span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    {prov.from_address}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>
                                                    Sender Display Name:
                                                </span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    {prov.from_name}
                                                </code>
                                            </div>
                                            {prov.latency_ms !== null &&
                                                prov.latency_ms !==
                                                    undefined && (
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span>
                                                            Verified Latency:
                                                        </span>
                                                        <span className="font-mono font-semibold text-status-success-fg tabular-nums">
                                                            {prov.latency_ms} ms
                                                        </span>
                                                    </div>
                                                )}
                                            {prov.last_connection_at && (
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                                    <span>Last Checked:</span>
                                                    <span className="tabular-nums">
                                                        {new Date(
                                                            prov.last_connection_at,
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {prov.channel === 'sms' && (
                                        <div className="space-y-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>
                                                    DLT Header / Sender ID:
                                                </span>
                                                <code className="font-mono font-semibold text-tijum-plum dark:text-foreground">
                                                    {prov.sender_id || 'TIJUMS'}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>DLT Entity ID:</span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    {prov.has_dlt_entity
                                                        ? 'Configured'
                                                        : 'Missing'}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>Simulation Mode:</span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    {prov.is_simulation
                                                        ? 'Enabled (Zero external charges)'
                                                        : 'Disabled'}
                                                </code>
                                            </div>
                                        </div>
                                    )}

                                    {prov.channel === 'whatsapp' && (
                                        <div className="space-y-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>
                                                    Meta Phone Number ID:
                                                </span>
                                                <code className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                                    {prov.phone_number_id}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>WABA ID:</span>
                                                <code className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                                    {prov.business_account_id}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>
                                                    Meta Graph Access Token:
                                                </span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    {prov.has_access_token
                                                        ? 'Configured'
                                                        : 'Missing'}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>Simulation Mode:</span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    {prov.is_simulation
                                                        ? 'Enabled (Simulates delivery)'
                                                        : 'Disabled'}
                                                </code>
                                            </div>
                                        </div>
                                    )}

                                    {prov.channel === 'in_app' && (
                                        <div className="space-y-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>Storage Engine:</span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    MySQL notifications table
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>Persistence:</span>
                                                <code className="font-mono text-tijum-plum dark:text-foreground">
                                                    Infinite retention with
                                                    read_at timestamp
                                                </code>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Email Interactive Diagnostics Panel */}
                                {prov.channel === 'email' && (
                                    <div className="space-y-3.5 rounded-xl border border-status-info-border bg-status-info-bg/55 p-4 dark:bg-status-info-bg">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 font-heading font-semibold text-status-info-fg">
                                                <Zap
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    SMTP Live Verification &amp;
                                                    Testing
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleVerifySmtp}
                                                disabled={isVerifyingEmail}
                                                className="h-8 text-xs"
                                            >
                                                <RefreshCw
                                                    className={`size-3 ${isVerifyingEmail ? 'animate-spin' : ''}`}
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {isVerifyingEmail
                                                        ? 'Testing Handshake...'
                                                        : 'Verify SMTP'}
                                                </span>
                                            </Button>
                                        </div>

                                        {verifyMessage && (
                                            <div
                                                className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                                                    verifyMessage.type ===
                                                    'success'
                                                        ? 'border-status-success-border bg-status-success-bg text-status-success-fg'
                                                        : 'border-status-error-border bg-status-error-bg text-status-error-fg'
                                                }`}
                                            >
                                                {verifyMessage.type ===
                                                'success' ? (
                                                    <CheckCircle2
                                                        className="mt-0.5 size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <XCircle
                                                        className="mt-0.5 size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <span>
                                                    {verifyMessage.text}
                                                </span>
                                            </div>
                                        )}

                                        {/* Sub-check badges */}
                                        {prov.checks &&
                                            Object.keys(prov.checks).length >
                                                0 && (
                                                <div className="grid grid-cols-2 gap-2 pt-0.5">
                                                    {Object.entries(
                                                        prov.checks,
                                                    ).map(([key, val]) => (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between rounded-lg border border-tijum-surface/80 bg-card px-2.5 py-1.5 text-[11px] dark:border-border"
                                                        >
                                                            <span className="text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                                                {key.replace(
                                                                    '_',
                                                                    ' ',
                                                                )}
                                                                :
                                                            </span>
                                                            <span
                                                                className={`font-semibold capitalize ${
                                                                    val.status ===
                                                                    'passed'
                                                                        ? 'text-status-success-fg'
                                                                        : 'text-status-error-fg'
                                                                }`}
                                                            >
                                                                {val.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                        {/* Send Test Email Form */}
                                        <form
                                            onSubmit={handleSendTestEmail}
                                            className="space-y-2 border-t border-status-info-border/60 pt-3"
                                        >
                                            <div className="text-[11px] font-semibold text-status-info-fg">
                                                Send Authenticated Test Email to
                                                Explicit Recipient:
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="email"
                                                    value={testRecipient}
                                                    onChange={(e) =>
                                                        setTestRecipient(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="recipient@example.com"
                                                    required
                                                    className="h-9 text-xs"
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    variant="plum"
                                                    disabled={
                                                        isSendingTest ||
                                                        !testRecipient
                                                    }
                                                    className="h-9 shrink-0 text-xs"
                                                >
                                                    {isSendingTest ? (
                                                        <RefreshCw
                                                            className="size-3.5 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Send
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span>
                                                        {isSendingTest
                                                            ? 'Sending...'
                                                            : 'Send Test'}
                                                    </span>
                                                </Button>
                                            </div>

                                            {testResult && (
                                                <div
                                                    className={`flex items-start gap-1.5 rounded-lg border p-2 text-xs ${
                                                        testResult.success
                                                            ? 'border-status-success-border bg-status-success-bg text-status-success-fg'
                                                            : 'border-status-error-border bg-status-error-bg text-status-error-fg'
                                                    }`}
                                                >
                                                    {testResult.success ? (
                                                        <Check
                                                            className="mt-0.5 size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <XCircle
                                                            className="mt-0.5 size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <span>
                                                        {testResult.message}
                                                    </span>
                                                </div>
                                            )}

                                            {prov.last_test_email && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    <Clock
                                                        className="size-3"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Last test sent to{' '}
                                                        {
                                                            prov.last_test_email
                                                                .recipient
                                                        }{' '}
                                                        at{' '}
                                                        {prov.last_test_email
                                                            .sent_at
                                                            ? new Date(
                                                                  prov
                                                                      .last_test_email
                                                                      .sent_at,
                                                              ).toLocaleTimeString()
                                                            : 'recent'}
                                                    </span>
                                                </div>
                                            )}
                                        </form>
                                    </div>
                                )}

                                <div>
                                    <div className="mb-1.5 font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Guaranteed Protections:
                                    </div>
                                    <ul className="space-y-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                        {prov.features.map((feat) => (
                                            <li
                                                key={feat}
                                                className="flex items-center gap-2"
                                            >
                                                <CheckCircle2
                                                    className="size-3.5 shrink-0 text-status-success-fg"
                                                    aria-hidden="true"
                                                />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Webhook Telemetry & Metrics */}
                <section className="space-y-4">
                    <div>
                        <h2 className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                            Gateway Webhook Telemetry &amp; Delivery Receipts
                        </h2>
                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Monotonic status updates from external provider
                            delivery reports and opt-out processing.
                        </p>
                    </div>

                    {/* Webhook Metrics KPIs */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatCard
                            label="Webhooks (24h)"
                            value={webhookStats.total_24h}
                            icon={Activity}
                        />
                        <StatCard
                            label="WhatsApp Receipts"
                            value={webhookStats.whatsapp_24h}
                            icon={MessageSquare}
                            className="border-l-4 border-l-emerald-500"
                        />
                        <StatCard
                            label="SMS DLT Receipts"
                            value={webhookStats.sms_24h}
                            icon={Smartphone}
                            className="border-l-4 border-l-amber-500"
                        />
                        <StatCard
                            label="Signature Rejections"
                            value={webhookStats.failed_24h}
                            icon={AlertCircle}
                            className="border-l-4 border-l-rose-500"
                        />
                    </div>

                    {/* Recent Webhook Events */}
                    {recentWebhooks.length === 0 ? (
                        <EmptyState
                            icon={Activity}
                            title="No webhook events recorded"
                            description="No webhook events recorded in the last 24 hours."
                        />
                    ) : (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <CardTitle className="text-base">
                                        Recent Gateway Webhooks
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        className="tabular-nums"
                                    >
                                        {recentWebhooks.length} recent
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="px-4">
                                                ID / Time
                                            </TableHead>
                                            <TableHead className="px-4">
                                                Channel
                                            </TableHead>
                                            <TableHead className="px-4">
                                                Event Type
                                            </TableHead>
                                            <TableHead className="px-4">
                                                Provider Msg ID
                                            </TableHead>
                                            <TableHead className="px-4">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentWebhooks.map((wh) => (
                                            <TableRow key={wh.id}>
                                                <TableCell className="px-4 py-3 font-mono text-xs tabular-nums">
                                                    <div className="font-semibold text-tijum-plum dark:text-foreground">
                                                        #{wh.id}
                                                    </div>
                                                    <div className="mt-0.5 font-sans text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                        {wh.created_at_human}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-xs font-medium capitalize">
                                                    {wh.channel}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 font-mono text-xs">
                                                    {wh.event_type}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {wh.provider_message_id}
                                                </TableCell>
                                                <TableCell className="px-4 py-3">
                                                    {wh.status ===
                                                    'processed' ? (
                                                        <StatusBadge
                                                            status="verified"
                                                            label="Processed"
                                                        />
                                                    ) : wh.status ===
                                                      'failed' ? (
                                                        <StatusBadge
                                                            status="rejected"
                                                            label="Failed"
                                                        />
                                                    ) : (
                                                        <StatusBadge
                                                            status="neutral"
                                                            label={wh.status}
                                                            className="capitalize"
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
