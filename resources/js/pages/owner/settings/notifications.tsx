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
    owner: {
        name: string;
        email: string;
        phone: string | null;
    };
}

export default function OwnerNotificationSettings({
    preferences,
    owner,
}: Props) {
    const { data, setData, put, processing, recentlySuccessful } = useForm({
        in_app_operational: preferences.in_app_operational,
        email_operational: preferences.email_operational,
        sms_operational: preferences.sms_operational,
        whatsapp_opted_in: preferences.whatsapp_opted_in,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put('/owner/settings/notifications', {
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-6">
            <Head title="Partner Notification Preferences" />

            <div className="space-y-6">
                <PageHeader
                    title="Partner Notification Settings"
                    description="Configure how you receive booking requests, reservation confirmations, settlement reports, and guest reviews."
                />

                {recentlySuccessful && (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <AlertTitle>Preferences updated</AlertTitle>
                        <AlertDescription>
                            Your communication preferences and channel consent
                            records have been saved.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit} className="space-y-6">
                    {/* Mandatory Partner Notices */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-coral/15 text-tijum-coral">
                                    <ShieldCheck className="h-5 w-5" />
                                </span>
                                <CardTitle className="text-base font-semibold text-tijum-plum dark:text-foreground">
                                    Mandatory Partner Transactional
                                    Communications
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Essential operational notices delivered to
                                protect guest stays and financial settlements.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>
                                Critical partner communications include:{' '}
                                <strong className="text-tijum-plum dark:text-foreground">
                                    Incoming customer reservation requests
                                    (action required), customer payment
                                    confirmations, guest cancellation notices,
                                    settlement batch completions, and customer
                                    grievance notifications
                                </strong>
                                .
                            </p>
                            <p className="text-xs text-muted-foreground">
                                In accordance with the TIJUM Partner Agreement,
                                core booking dispatch notices cannot be turned
                                off.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Operational Channels */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-tijum-plum dark:text-foreground">
                                Channel Preferences for Updates
                            </CardTitle>
                            <CardDescription>
                                Select which auxiliary channels you want enabled
                                for daily operational digests and new reviews.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* In-App */}
                            <div className="flex items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/35">
                                <div className="space-y-0.5 pr-4">
                                    <label
                                        htmlFor="in_app_operational"
                                        className="cursor-pointer text-sm font-medium text-foreground"
                                    >
                                        In-App Partner Inbox
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Receive unread bell badges and activity
                                        alerts inside your Partner Portal.
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

                            {/* Email */}
                            <div className="flex items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/35">
                                <div className="space-y-0.5 pr-4">
                                    <label
                                        htmlFor="email_operational"
                                        className="cursor-pointer text-sm font-medium text-foreground"
                                    >
                                        Email Reports ({owner.email})
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Receive monthly commission statements,
                                        settlement payout summaries, and review
                                        alerts.
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

                            {/* SMS */}
                            <div className="flex items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/35">
                                <div className="space-y-0.5 pr-4">
                                    <label
                                        htmlFor="sms_operational"
                                        className="cursor-pointer text-sm font-medium text-foreground"
                                    >
                                        SMS Alerts{' '}
                                        {owner.phone
                                            ? `(${owner.phone})`
                                            : '(Mobile required)'}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Urgent SMS alerts for time-sensitive
                                        reservation requests.
                                    </p>
                                </div>
                                <Switch
                                    id="sms_operational"
                                    checked={data.sms_operational}
                                    onCheckedChange={(checked) =>
                                        setData('sms_operational', checked)
                                    }
                                    disabled={!owner.phone}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* WhatsApp */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2.5">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                    <MessageSquare className="h-5 w-5" />
                                </span>
                                <CardTitle className="text-base font-semibold text-tijum-plum dark:text-foreground">
                                    WhatsApp Partner Alerts (Meta Cloud API)
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Instant booking alerts on WhatsApp to respond
                                quickly to prospective guests.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!owner.phone ? (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>
                                        Registered phone number required
                                    </AlertTitle>
                                    <AlertDescription>
                                        Please update your partner profile with
                                        a valid 10-digit Indian mobile number to
                                        enable WhatsApp alerts.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                                                    WhatsApp to {owner.phone}
                                                </span>
                                            </div>
                                            <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                                                Receive instant notifications
                                                when guests request stays or
                                                complete payments.
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

                                    <div className="rounded-xl border border-tijum-surface/70 bg-tijum-cream/55 p-3.5 text-xs leading-relaxed text-muted-foreground dark:border-border dark:bg-muted/45">
                                        <strong className="text-foreground">
                                            Explicit Opt-in Notice:
                                        </strong>{' '}
                                        By enabling this toggle, you consent to
                                        receive approved WhatsApp Utility
                                        notifications from TIJUM Stays &amp;
                                        Meals regarding your property listings,
                                        booking requests, and guest arrivals.
                                        You can withdraw consent at any time
                                        here or by replying <code>STOP</code> on
                                        WhatsApp.
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="px-6"
                        >
                            {processing ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </div>
                </form>

                <WebPushToggle />
            </div>
        </div>
    );
}
