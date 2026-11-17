import { Head, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    MessageSquare,
    Phone,
    ShieldCheck,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import { WebPushToggle } from '@/components/pwa/WebPushToggle';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { NotificationPreferences } from '@/types/notifications';

interface Props {
    preferences: NotificationPreferences;
    user: {
        name: string;
        email: string;
        phone: string | null;
    };
}

export default function NotificationSettings({ preferences, user }: Props) {
    const { data, setData, put, processing, recentlySuccessful } = useForm({
        in_app_operational: preferences.in_app_operational,
        email_operational: preferences.email_operational,
        sms_operational: preferences.sms_operational,
        whatsapp_opted_in: preferences.whatsapp_opted_in,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put('/settings/notifications', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Notification Preferences" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Communication"
                    title="Notification Preferences"
                    description="Control how and where TIJUM contacts you about your stays and reservations."
                />

                {recentlySuccessful && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>Preferences saved</AlertTitle>
                        <AlertDescription>
                            Your communication and channel consent settings have
                            been updated.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <ShieldCheck
                                    className="size-5 text-tijum-plum dark:text-foreground"
                                    aria-hidden="true"
                                />
                                <CardTitle className="text-base">
                                    Mandatory transactional notices
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Essential booking updates are required and
                                delivered over in-app and email/SMS for every
                                confirmed reservation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                            <p>
                                These include reservation submissions, host
                                acceptances and declines, the 15-minute payment
                                window, booking receipts, cancellation and
                                refund notices, and urgent safety
                                communications.
                            </p>
                            <p className="text-xs text-muted-foreground/80">
                                Essential transactional notices cannot be
                                deactivated.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Operational reminders &amp; updates
                            </CardTitle>
                            <CardDescription>
                                Choose the channels for stay reminders and
                                post-stay review invitations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 space-y-0.5">
                                    <label
                                        htmlFor="in_app_operational"
                                        className="cursor-pointer font-heading text-sm font-medium text-tijum-plum dark:text-foreground"
                                    >
                                        In-app notifications
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Receive inbox messages while signed in
                                        to your TIJUM dashboard.
                                    </p>
                                </div>
                                <Switch
                                    id="in_app_operational"
                                    checked={data.in_app_operational}
                                    onCheckedChange={(checked) =>
                                        setData('in_app_operational', checked)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 space-y-0.5">
                                    <label
                                        htmlFor="email_operational"
                                        className="cursor-pointer font-heading text-sm font-medium text-tijum-plum dark:text-foreground"
                                    >
                                        Email updates
                                        <span className="ml-1 font-body text-xs font-normal text-muted-foreground">
                                            ({user.email})
                                        </span>
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Check-in instructions and post-stay
                                        review invitations.
                                    </p>
                                </div>
                                <Switch
                                    id="email_operational"
                                    checked={data.email_operational}
                                    onCheckedChange={(checked) =>
                                        setData('email_operational', checked)
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 space-y-0.5">
                                    <label
                                        htmlFor="sms_operational"
                                        className="cursor-pointer font-heading text-sm font-medium text-tijum-plum dark:text-foreground"
                                    >
                                        SMS notifications
                                        <span className="ml-1 font-body text-xs font-normal text-muted-foreground">
                                            {user.phone
                                                ? `(${user.phone})`
                                                : '(mobile required)'}
                                        </span>
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Time-sensitive deadline and
                                        payment-window alerts by text message.
                                    </p>
                                </div>
                                <Switch
                                    id="sms_operational"
                                    checked={data.sms_operational}
                                    onCheckedChange={(checked) =>
                                        setData('sms_operational', checked)
                                    }
                                    disabled={!user.phone}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <MessageSquare
                                    className="size-5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <CardTitle className="text-base">
                                    WhatsApp updates
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Receive booking vouchers, payment links, and
                                meal schedules in WhatsApp.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!user.phone ? (
                                <Alert variant="destructive">
                                    <AlertCircle aria-hidden="true" />
                                    <AlertTitle>
                                        Mobile number required
                                    </AlertTitle>
                                    <AlertDescription>
                                        Add your mobile number in Profile
                                        settings before enabling WhatsApp
                                        notifications.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-4 rounded-xl border border-tijum-peach bg-tijum-cream/60 p-4 dark:border-border dark:bg-muted/30">
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Phone
                                                    className="size-4 text-tijum-coral"
                                                    aria-hidden="true"
                                                />
                                                <span className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                    WhatsApp to {user.phone}
                                                </span>
                                            </div>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                A quick channel for payment
                                                countdowns, accepted bookings,
                                                and stay details.
                                            </p>
                                        </div>
                                        <Switch
                                            id="whatsapp_opted_in"
                                            checked={data.whatsapp_opted_in}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'whatsapp_opted_in',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="rounded-lg border border-tijum-surface bg-tijum-cream/40 p-3 text-xs leading-relaxed text-muted-foreground dark:border-border dark:bg-muted/20">
                                        <strong className="font-heading text-tijum-plum dark:text-foreground">
                                            Explicit opt-in:
                                        </strong>{' '}
                                        Enabling this toggle confirms you want
                                        TIJUM to send approved transactional
                                        WhatsApp messages to your registered
                                        number. You can revoke consent at any
                                        time here or by replying{' '}
                                        <code className="rounded bg-tijum-surface px-1 py-0.5 font-heading text-[11px] text-tijum-plum dark:bg-muted dark:text-foreground">
                                            STOP
                                        </code>{' '}
                                        to any message.
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" loading={processing}>
                            {processing
                                ? 'Saving preferences…'
                                : 'Save preferences'}
                        </Button>
                    </div>
                </form>

                <WebPushToggle />
            </div>
        </>
    );
}

NotificationSettings.layout = {
    breadcrumbs: [
        {
            title: 'Notification Settings',
            href: '/settings/notifications',
        },
    ],
};
