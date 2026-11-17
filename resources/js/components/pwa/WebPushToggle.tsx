import { usePage } from '@inertiajs/react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    getWebPushStatus,
    subscribeToWebPush,
    unsubscribeFromWebPush,
    type WebPushStatus,
} from '@/lib/pwa';

export function WebPushToggle({ compact = false }: { compact?: boolean }) {
    const pwa = usePage().props.pwa;
    const webPushEnabled = Boolean(pwa?.webPushEnabled);
    const webPushPublicKey = String(pwa?.webPushPublicKey ?? '');

    const [status, setStatus] = useState<WebPushStatus>('default');
    const [busy, setBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        void getWebPushStatus(webPushEnabled, webPushPublicKey)
            .then((result) => {
                if (mounted) {
                    setStatus(result);
                }
            })
            .catch(() => {});

        return () => {
            mounted = false;
        };
    }, [webPushEnabled, webPushPublicKey]);

    const handleEnable = async () => {
        setBusy(true);
        setErrorMessage(null);
        try {
            const nextStatus = await subscribeToWebPush(webPushPublicKey);
            setStatus(nextStatus);
        } catch (err) {
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : 'Unable to enable browser notifications right now.',
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDisable = async () => {
        setBusy(true);
        setErrorMessage(null);
        try {
            const nextStatus = await unsubscribeFromWebPush();
            setStatus(nextStatus);
        } finally {
            setBusy(false);
        }
    };

    const statusBadge =
        status === 'subscribed' ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Enabled on this browser
            </Badge>
        ) : status === 'denied' ? (
            <Badge variant="destructive">Blocked in browser</Badge>
        ) : status === 'unconfigured' ? (
            <Badge variant="outline">Server key pending</Badge>
        ) : null;

    if (compact) {
        if (status === 'unsupported' || status === 'unconfigured') {
            return null;
        }

        return (
            <div className="flex flex-wrap items-center gap-2">
                {status === 'subscribed' ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={handleDisable}
                        className="gap-1.5"
                    >
                        <BellOff className="size-3.5" aria-hidden="true" />
                        <span>{busy ? 'Updating...' : 'Disable browser alerts'}</span>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || status === 'denied'}
                        onClick={handleEnable}
                        className="gap-1.5 border-tijum-coral/40 text-tijum-plum hover:bg-tijum-cream dark:text-foreground"
                    >
                        <BellRing className="size-3.5 text-tijum-coral" aria-hidden="true" />
                        <span>
                            {busy
                                ? 'Enabling...'
                                : status === 'denied'
                                  ? 'Notifications blocked'
                                  : 'Enable browser alerts'}
                        </span>
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Bell
                            className="size-5 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <CardTitle className="text-base">
                            Browser &amp; PWA Push Notifications
                        </CardTitle>
                    </div>
                    {statusBadge}
                </div>
                <CardDescription>
                    Receive real-time reservation, payment, check-in, and support updates directly on this device even when TIJUM is closed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {status === 'unsupported' && (
                    <p className="text-sm text-muted-foreground">
                        This browser does not support Web Push notifications. On iPhone or iPad, add TIJUM to your Home Screen (iOS 16.4+) first to enable app notifications.
                    </p>
                )}

                {status === 'unconfigured' && (
                    <p className="text-sm text-muted-foreground">
                        Browser push credentials (VAPID keys) are not yet configured in the environment. In-app and email alerts continue to operate normally.
                    </p>
                )}

                {status === 'denied' && (
                    <p className="text-sm text-muted-foreground">
                        Browser notification permission is currently blocked for TIJUM. Open your browser site settings and allow notifications, then try again.
                    </p>
                )}

                {(status === 'default' ||
                    status === 'unsubscribed' ||
                    status === 'subscribed') && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            {status === 'subscribed'
                                ? 'This browser is registered to receive instant TIJUM alerts.'
                                : 'Opt in at any time. TIJUM never enables browser alerts without your permission.'}
                        </p>
                        {status === 'subscribed' ? (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={handleDisable}
                            >
                                <BellOff className="mr-2 size-4" aria-hidden="true" />
                                {busy ? 'Updating...' : 'Disable on this browser'}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                disabled={busy}
                                onClick={handleEnable}
                            >
                                <BellRing className="mr-2 size-4" aria-hidden="true" />
                                {busy ? 'Enabling...' : 'Enable TIJUM notifications'}
                            </Button>
                        )}
                    </div>
                )}

                {errorMessage && (
                    <p className="text-xs font-medium text-destructive">
                        {errorMessage}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
