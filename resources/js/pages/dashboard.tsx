import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarClock,
    Check,
    CheckCircle2,
    Coins,
    Compass,
    Copy,
    FileText,
    Gift,
    Heart,
    HelpCircle,
    KeyRound,
    LifeBuoy,
    MailCheck,
    Phone,
    Settings,
    Share2,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { ReservationSummaryCard } from '@/components/reservations/reservation-summary-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard, home } from '@/routes';
import { edit as appearanceEdit } from '@/routes/appearance';
import { edit as profileEdit } from '@/routes/profile';
import { faqs, howItWorks } from '@/routes/public';
import {
    index as reservationsIndex,
    show as reservationShow,
} from '@/routes/reservations';
import { edit as securityEdit } from '@/routes/security';
import { send } from '@/routes/verification';
import type { CustomerAccount, ReservationSummary } from '@/types';

type ReferralData = {
    referral_code: string;
    share_url: string;
    total_referrals: number;
    successful_referrals: number;
    total_points_earned: number;
    referrer_reward: number;
    referred_reward: number;
};

type WalletData = {
    available_points: number;
    estimated_inr_value: number;
};

type DashboardProps = {
    customer: CustomerAccount;
    activeStay?: ReservationSummary | null;
    accountOverview: {
        emailVerified: boolean;
        phoneAdded: boolean;
        phoneVerified: boolean;
        incompleteFields: string[];
        profileComplete: boolean;
    };
    securitySummary: {
        passwordConfigured: boolean;
        twoFactorSupported: boolean;
        twoFactorEnabled: boolean;
        twoFactorConfirmed: boolean;
        passkeysSupported: boolean;
        passkeyCount: number;
    };
    reservationSummary?: {
        total: number;
        pending: number;
        confirmed: number;
    };
    referral?: ReferralData;
    wallet?: WalletData;
    recentReservations?: ReservationSummary[];
    status?: string;
};

function formatDateLabel(isoDate: string | null): string {
    if (!isoDate) {
        return 'Not recorded';
    }

    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
        return 'Not recorded';
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(parsed);
}

export default function Dashboard({
    customer,
    activeStay,
    accountOverview,
    securitySummary,
    reservationSummary = { total: 0, pending: 0, confirmed: 0 },
    referral,
    wallet,
    recentReservations = [],
    status,
}: DashboardProps) {
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const emailVerified = accountOverview.emailVerified;
    const phoneAdded = accountOverview.phoneAdded;
    const twoFactorLabel = !securitySummary.twoFactorSupported
        ? 'Unavailable'
        : securitySummary.twoFactorEnabled
          ? securitySummary.twoFactorConfirmed
              ? 'Enabled & Confirmed'
              : 'Setup Pending'
          : 'Not Enabled';

    const referralCode = referral?.referral_code ?? '';
    const shareUrl =
        referral?.share_url ||
        (referralCode && typeof window !== 'undefined'
            ? `${window.location.origin}/r/${referralCode}`
            : '');

    const handleCopyCode = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(referralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyLink = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <>
            <Head title="Customer Dashboard" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="space-y-6 pb-8">
                    <section className="relative overflow-hidden rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-soft sm:p-8 dark:border dark:border-border dark:bg-[#2b1b29]">
                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0 space-y-2.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 px-3 py-1 font-heading text-[10px] font-semibold tracking-wider text-tijum-peach uppercase">
                                    <span
                                        className="size-1.5 rounded-full bg-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    Customer Account
                                </span>
                                <h1 className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-cream sm:text-3xl">
                                    Welcome back, {customer.name}
                                </h1>
                                <p className="max-w-xl text-sm leading-relaxed text-pretty text-tijum-cream/80">
                                    Manage your profile, security, rewards, and
                                    stays in one calm workspace.
                                </p>
                                <div className="pt-0.5">
                                    <StatusBadge
                                        status={
                                            emailVerified
                                                ? 'verified'
                                                : 'pending'
                                        }
                                        label={
                                            emailVerified
                                                ? 'Email Verified'
                                                : 'Verification Pending'
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <Button
                                    variant="outline"
                                    className="border-tijum-cream/30 bg-white/10 text-tijum-cream hover:border-tijum-cream/50 hover:bg-white/20 hover:text-white dark:border-tijum-cream/25 dark:bg-white/10 dark:text-tijum-cream dark:hover:bg-white/20"
                                    asChild
                                >
                                    <Link href={profileEdit()}>
                                        Edit Profile
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={`${home.url()}#launch-cities`}>
                                        <span>Explore TIJUM</span>
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>

                    {activeStay && (
                        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50/75 p-6 shadow-tijum-card sm:p-7 dark:border-emerald-800/60 dark:bg-emerald-950/30">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3 py-1 font-heading text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/70 dark:text-emerald-300">
                                            <CheckCircle2
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {activeStay.is_checked_in
                                                    ? 'Active In-House Stay'
                                                    : 'Upcoming Stay Pass'}
                                            </span>
                                        </span>
                                        <span className="font-mono text-xs font-bold text-tijum-plum-muted dark:text-muted-foreground">
                                            {activeStay.booking_reference}
                                        </span>
                                    </div>
                                    <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                        {activeStay.property_name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {activeStay.room_type_name} ·{' '}
                                        {activeStay.check_in_date} to{' '}
                                        {activeStay.checkout_date} (
                                        {activeStay.duration_label})
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                    <Button
                                        asChild
                                        size="sm"
                                        className="gap-2 bg-tijum-coral text-white hover:bg-tijum-coral/90"
                                    >
                                        <Link
                                            href={`/reservations/${activeStay.booking_reference}`}
                                        >
                                            <span>View Stay Pass</span>
                                            <ArrowRight
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <a
                                            href={`/reservations/${activeStay.booking_reference}/receipt`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <FileText
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>Print Receipt</span>
                                        </a>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        <Link href="/my-support">
                                            <span>Support &amp; Help</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </section>
                    )}

                    {!emailVerified && (
                        <Alert variant="warning">
                            <ShieldAlert aria-hidden="true" />
                            <AlertTitle>Email verification pending</AlertTitle>
                            <AlertDescription className="space-y-3">
                                <p>
                                    Your account email ({customer.email}) has
                                    not been verified yet. Confirm ownership via
                                    the verification link sent to your inbox to
                                    unlock all protected features.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Form {...send()}>
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="plum"
                                                loading={processing}
                                            >
                                                Resend Verification Email
                                            </Button>
                                        )}
                                    </Form>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={profileEdit()}>
                                            Change Email Address
                                        </Link>
                                    </Button>
                                </div>
                                {status === 'verification-link-sent' && (
                                    <p className="font-heading text-xs font-semibold text-status-success-fg">
                                        A fresh verification link has been sent
                                        to {customer.email}.
                                    </p>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Quick Portal Hubs */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            href={reservationsIndex()}
                            className="group flex items-start gap-3.5 rounded-[20px] border border-tijum-surface/80 bg-white p-5 shadow-tijum-card transition-all hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card dark:hover:border-tijum-coral/50"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/25 text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                <CalendarClock
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0">
                                <p className="font-heading text-xs font-semibold text-muted-foreground">
                                    My Reservations
                                </p>
                                <p className="mt-0.5 font-heading text-xl font-bold text-foreground tabular-nums">
                                    {reservationSummary.total}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {reservationSummary.confirmed} confirmed ·{' '}
                                    {reservationSummary.pending} pending
                                </p>
                            </div>
                        </Link>

                        <Link
                            href="/rewards"
                            className="group flex items-start gap-3.5 rounded-[20px] border border-tijum-surface/80 bg-white p-5 shadow-tijum-card transition-all hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card dark:hover:border-tijum-coral/50"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/25 text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                <Coins className="size-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                                <p className="font-heading text-xs font-semibold text-muted-foreground">
                                    Points Wallet
                                </p>
                                <p className="mt-0.5 font-heading text-xl font-bold text-foreground tabular-nums">
                                    {(wallet?.available_points ?? 0).toLocaleString()}{' '}
                                    <span className="text-xs font-semibold text-tijum-coral">
                                        pts
                                    </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ₹
                                    {(
                                        wallet?.estimated_inr_value ?? 0
                                    ).toLocaleString()}{' '}
                                    stay discount value
                                </p>
                            </div>
                        </Link>

                        <Link
                            href="/wishlist"
                            className="group flex items-start gap-3.5 rounded-[20px] border border-tijum-surface/80 bg-white p-5 shadow-tijum-card transition-all hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card dark:hover:border-tijum-coral/50"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/25 text-tijum-coral dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                <Heart
                                    className="size-5 fill-tijum-coral text-tijum-coral"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0">
                                <p className="font-heading text-xs font-semibold text-muted-foreground">
                                    Saved Stays
                                </p>
                                <p className="mt-0.5 font-heading text-base font-bold text-foreground group-hover:text-tijum-coral">
                                    My Wishlist
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Compare saved properties
                                </p>
                            </div>
                        </Link>

                        <Link
                            href="/support/tickets"
                            className="group flex items-start gap-3.5 rounded-[20px] border border-tijum-surface/80 bg-white p-5 shadow-tijum-card transition-all hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card dark:hover:border-tijum-coral/50"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/25 text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                <LifeBuoy
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0">
                                <p className="font-heading text-xs font-semibold text-muted-foreground">
                                    Customer Care
                                </p>
                                <p className="mt-0.5 font-heading text-base font-bold text-foreground group-hover:text-tijum-coral">
                                    Support &amp; Tickets
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Helpdesk &amp; grievances
                                </p>
                            </div>
                        </Link>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                        <Card className="flex flex-col justify-between">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-lg">
                                        Account Overview
                                    </CardTitle>
                                    <UserCheck
                                        className="size-5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </div>
                                <CardDescription>
                                    Your customer details saved on TIJUM
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                        <dt className="text-muted-foreground">
                                            Full name
                                        </dt>
                                        <dd className="font-heading font-semibold text-foreground">
                                            {customer.name}
                                        </dd>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                        <dt className="text-muted-foreground">
                                            Email
                                        </dt>
                                        <dd className="flex flex-wrap items-center justify-end gap-2 text-right font-medium text-foreground">
                                            <span className="break-all">
                                                {customer.email}
                                            </span>
                                            <StatusBadge
                                                status={
                                                    emailVerified
                                                        ? 'verified'
                                                        : 'pending'
                                                }
                                                label={
                                                    emailVerified
                                                        ? 'Verified'
                                                        : 'Pending'
                                                }
                                            />
                                        </dd>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                        <dt className="text-muted-foreground">
                                            Phone number
                                        </dt>
                                        <dd className="flex flex-wrap items-center justify-end gap-2 text-right font-medium text-foreground">
                                            <span>
                                                {customer.phone ??
                                                    'Not provided'}
                                            </span>
                                            <StatusBadge
                                                status={
                                                    phoneAdded
                                                        ? 'pending'
                                                        : 'neutral'
                                                }
                                                label={
                                                    phoneAdded
                                                        ? 'Not verified'
                                                        : 'Optional'
                                                }
                                            />
                                        </dd>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <dt className="text-muted-foreground">
                                            Member since
                                        </dt>
                                        <dd className="font-medium text-foreground">
                                            {formatDateLabel(
                                                customer.created_at,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>

                            <CardFooter className="border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href={profileEdit()}>
                                        Edit Personal Details
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="flex flex-col justify-between">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-lg">
                                        Profile Status
                                    </CardTitle>
                                    <MailCheck
                                        className="size-5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </div>
                                <CardDescription>
                                    Current state of your customer profile
                                    fields
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-3 text-sm">
                                <ul className="space-y-2.5">
                                    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/50 px-3.5 py-2.5 dark:border-border dark:bg-muted/40">
                                        <span className="font-medium text-foreground">
                                            Name &amp; email added
                                        </span>
                                        <StatusBadge
                                            status="completed"
                                            label="Ready"
                                        />
                                    </li>

                                    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/50 px-3.5 py-2.5 dark:border-border dark:bg-muted/40">
                                        <span className="font-medium text-foreground">
                                            Email verification
                                        </span>
                                        <StatusBadge
                                            status={
                                                emailVerified
                                                    ? 'verified'
                                                    : 'pending'
                                            }
                                            label={
                                                emailVerified
                                                    ? 'Verified'
                                                    : 'Verification pending'
                                            }
                                        />
                                    </li>

                                    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/50 px-3.5 py-2.5 dark:border-border dark:bg-muted/40">
                                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                            <Phone
                                                className="size-3.5 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <span>Phone number</span>
                                        </span>
                                        <StatusBadge
                                            status={
                                                phoneAdded ? 'info' : 'warning'
                                            }
                                            label={
                                                phoneAdded
                                                    ? 'Added · Not verified'
                                                    : 'Required · Not added'
                                            }
                                        />
                                    </li>
                                </ul>

                                {!accountOverview.profileComplete && (
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        {phoneAdded
                                            ? 'Complete email verification to keep your customer contact details verified.'
                                            : 'Adding your mobile phone number helps deliver instant booking confirmations and check-in alerts.'}
                                    </p>
                                )}
                            </CardContent>

                            <CardFooter className="border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href={profileEdit()}>
                                        {phoneAdded
                                            ? 'Review Profile & Status'
                                            : 'Add Phone Number'}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="flex flex-col justify-between lg:col-span-2 xl:col-span-1">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-lg">
                                        Account Security
                                    </CardTitle>
                                    <ShieldCheck
                                        className="size-5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </div>
                                <CardDescription>
                                    Live protection settings on your customer
                                    login
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                        <dt className="text-muted-foreground">
                                            Password
                                        </dt>
                                        <dd>
                                            <StatusBadge
                                                status={
                                                    securitySummary.passwordConfigured
                                                        ? 'verified'
                                                        : 'pending'
                                                }
                                                label={
                                                    securitySummary.passwordConfigured
                                                        ? 'Configured'
                                                        : 'Action Needed'
                                                }
                                            />
                                        </dd>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/70 pb-2.5 dark:border-border">
                                        <dt className="text-muted-foreground">
                                            Two-factor (2FA)
                                        </dt>
                                        <dd>
                                            <StatusBadge
                                                status={
                                                    securitySummary.twoFactorEnabled &&
                                                    securitySummary.twoFactorConfirmed
                                                        ? 'verified'
                                                        : securitySummary.twoFactorEnabled
                                                          ? 'pending'
                                                          : 'neutral'
                                                }
                                                label={twoFactorLabel}
                                            />
                                        </dd>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                                            <KeyRound
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>Passkeys</span>
                                        </dt>
                                        <dd className="font-heading text-xs font-semibold text-foreground">
                                            {!securitySummary.passkeysSupported
                                                ? 'Disabled'
                                                : securitySummary.passkeyCount >
                                                    0
                                                  ? `${securitySummary.passkeyCount} registered`
                                                  : 'None registered'}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>

                            <CardFooter className="border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <Button
                                    variant="plum"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href={securityEdit()}>
                                        Manage Account Security
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Refer & Earn Feature Section */}
                    <section className="rounded-[24px] border border-tijum-peach/70 bg-white p-6 shadow-tijum-card sm:p-8 dark:border-tijum-coral/35 dark:bg-card">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-tijum-peach/70 bg-tijum-peach/20 px-3 py-1 font-heading text-xs font-semibold text-tijum-plum dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                    <Sparkles
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        TIJUM Customer Rewards · Refer &amp; Earn
                                    </span>
                                </div>
                                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                    Invite friends to TIJUM &amp; earn ₹500 stay
                                    credits
                                </h2>
                                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                                    Give friends 250 welcome points on signup.
                                    When they complete their first verified stay
                                    at any verified hostel, PG, or homestay, you
                                    earn{' '}
                                    <strong className="font-semibold text-tijum-plum dark:text-tijum-peach">
                                        500 points (₹500 value)
                                    </strong>{' '}
                                    towards your next booking.
                                </p>

                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <div className="flex items-center gap-2.5 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/55 px-4 py-2.5 dark:border-border dark:bg-muted/50">
                                        <Coins
                                            className="size-5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground">
                                                Available Wallet
                                            </p>
                                            <p className="font-heading text-sm font-bold text-foreground tabular-nums">
                                                {wallet?.available_points ?? 0}{' '}
                                                pts{' '}
                                                <span className="text-xs font-semibold text-tijum-coral">
                                                    (₹
                                                    {wallet?.estimated_inr_value ??
                                                        0}
                                                    )
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/55 px-4 py-2.5 dark:border-border dark:bg-muted/50">
                                        <Users
                                            className="size-5 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground">
                                                Friends Joined
                                            </p>
                                            <p className="font-heading text-sm font-bold text-foreground tabular-nums">
                                                {referral?.successful_referrals ??
                                                    0}{' '}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    (
                                                    {referral?.total_points_earned ??
                                                        0}{' '}
                                                    pts earned)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full max-w-md space-y-4 rounded-2xl border border-tijum-surface/90 bg-tijum-cream/55 p-5 sm:p-6 dark:border-border dark:bg-muted/40">
                                <div>
                                    <span className="block font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Your Referral Code
                                    </span>
                                    <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-tijum-coral/35 bg-white px-4 py-2.5 dark:border-tijum-coral/40 dark:bg-card">
                                        <span className="font-mono text-lg font-bold tracking-widest text-foreground">
                                            {referralCode || 'TIJUMGUEST'}
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                copiedCode
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={handleCopyCode}
                                            className="h-8 gap-1.5 px-3 text-xs"
                                        >
                                            {copiedCode ? (
                                                <>
                                                    <Check
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Copy Code</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <span className="block font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Share Link
                                    </span>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <div className="relative min-w-0 flex-1 truncate rounded-xl border border-tijum-surface bg-white px-3 py-2 text-xs font-medium text-foreground select-all dark:border-border dark:bg-card">
                                            {shareUrl ||
                                                'Generating referral link...'}
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                copiedLink
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={handleCopyLink}
                                            className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                                        >
                                            {copiedLink ? (
                                                <>
                                                    <Check
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Copy Link</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {shareUrl && (
                                        <Button
                                            variant="plum"
                                            size="sm"
                                            className="flex-1 gap-2"
                                            asChild
                                        >
                                            <a
                                                href={`https://wa.me/?text=${encodeURIComponent(
                                                    `Join TIJUM with my referral code ${referralCode} and get 250 bonus points on your stay! Sign up here: ${shareUrl}`,
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Share2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>Share on WhatsApp</span>
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="shrink-0"
                                    >
                                        <Link href="/rewards/referrals">
                                            <Gift
                                                className="size-3.5 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <span>Full Rewards Hub</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="space-y-3 lg:col-span-8">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="font-heading text-lg font-bold text-foreground">
                                    Your TIJUM Reservations
                                </h2>
                                <Link
                                    href={reservationsIndex()}
                                    className="font-heading text-sm font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                                >
                                    View all ({reservationSummary.total})
                                </Link>
                            </div>

                            {recentReservations.length === 0 ? (
                                <EmptyState
                                    icon={CalendarClock}
                                    title="No reservations yet"
                                    description="Search eligible stays, hold inventory, and complete payment to see a confirmed booking here."
                                    action={
                                        <Button variant="outline" asChild>
                                            <Link
                                                href={`${home.url()}#launch-cities`}
                                            >
                                                Find a stay
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <div className="grid gap-4">
                                    {recentReservations.map((reservation) => (
                                        <ReservationSummaryCard
                                            key={reservation.booking_reference}
                                            reservation={reservation}
                                            href={
                                                reservationShow(
                                                    reservation.booking_reference,
                                                ).url
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <Card className="flex flex-col justify-between lg:col-span-4">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-lg">
                                        Help &amp; Account Tools
                                    </CardTitle>
                                    <CheckCircle2
                                        className="size-5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </div>
                                <CardDescription>
                                    Transparent meal disclosures and quick links
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4 text-sm text-muted-foreground">
                                <p>
                                    Every bookable stay on TIJUM displays its
                                    meal inclusions, stay timing, and a
                                    transparent reservation total.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                    >
                                        <Link href={appearanceEdit()}>
                                            <Settings aria-hidden="true" />
                                            <span>Appearance</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                    >
                                        <Link href="/rewards/coupons">
                                            <Gift
                                                className="size-3.5 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <span>My Coupons</span>
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-2 border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start"
                                    asChild
                                >
                                    <Link href={faqs()}>
                                        <HelpCircle aria-hidden="true" />
                                        <span>Read Customer FAQs</span>
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                    asChild
                                >
                                    <Link href={howItWorks()}>
                                        <BookOpen aria-hidden="true" />
                                        <span>How TIJUM Works</span>
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </ResponsiveContainer>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
