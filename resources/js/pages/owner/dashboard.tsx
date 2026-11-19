import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    DoorClosed,
    DoorOpen,
    FileCheck2,
    MailCheck,
    MessageSquareWarning,
    PlusCircle,
    ShieldCheck,
    Star,
    Users,
    Wallet,
} from 'lucide-react';
import { CorrectionRequestPanel } from '@/components/owner/onboarding/correction-request-panel';
import { VerificationStatusPanel } from '@/components/owner/onboarding/verification-status-panel';
import { InfoPanel, StatCard } from '@/components/shared/info-card';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
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
import { dashboard } from '@/routes/owner';
import {
    index as onboardingIndex,
    status as onboardingStatus,
} from '@/routes/owner/onboarding';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/owner/properties';
import type {
    CityOption,
    OwnerBusinessProfileData,
    OwnerStatus,
    OwnerVerificationApplicationData,
    PartnerOnboardingEvaluation,
} from '@/types';

type OnboardingStep = {
    key: string;
    label: string;
    completed: boolean;
};

type OwnerDashboardProps = {
    status?: string;
    operationsSummary?: {
        todayArrivals: number;
        todayDepartures: number;
        inHouseGuests: number;
        activeReservations: number;
        pendingReviews: number;
        openComplaints: number;
        unsettledPayoutMinor: number;
    };
    propertySummary?: {
        propertiesTotal: number;
        verifiedProperties: number;
        roomTypesTotal: number;
        roomsTotal: number;
    };
    onboarding: {
        emailVerified: boolean;
        accountStatus: OwnerStatus;
        accountStatusLabel: string;
        canPublishProperties: boolean;
        propertyApprovalStatus: string;
        nextAction: {
            title: string;
            description: string;
            actionLabel: string;
            actionHref: string;
        };
        steps: OnboardingStep[];
    };
    application: OwnerVerificationApplicationData | null;
    evaluation: PartnerOnboardingEvaluation;
    businessProfile: OwnerBusinessProfileData | null;
    operatingCities: CityOption[];
};

const ownerStatusMap: Record<string, SemanticStatus> = {
    active: 'active',
    pending_verification: 'pending',
    pending_review: 'processing',
    rejected: 'rejected',
    suspended: 'suspended',
};

export default function OwnerDashboard({
    status,
    operationsSummary,
    propertySummary = {
        propertiesTotal: 0,
        verifiedProperties: 0,
        roomTypesTotal: 0,
        roomsTotal: 0,
    },
    onboarding,
    application,
    evaluation,
    businessProfile,
    operatingCities,
}: OwnerDashboardProps) {
    const owner = usePage().props.auth?.owner;
    const completedCount = evaluation.steps.filter(
        (step) => step.completed,
    ).length;

    const statusBadgeType =
        ownerStatusMap[onboarding.accountStatus] ?? 'neutral';

    const formatInr = (minor: number): string =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(minor / 100);

    const isVerifiedPartner =
        onboarding.accountStatus === 'active' &&
        onboarding.canPublishProperties;
    const showOperationsOverview =
        Boolean(operationsSummary) &&
        (isVerifiedPartner || propertySummary.propertiesTotal > 0);

    return (
        <>
            <Head title="Partner Overview" />

            <div className="space-y-6">
                {status === 'email-verified' && (
                    <Alert variant="success">
                        <MailCheck aria-hidden="true" />
                        <AlertTitle>Partner email verified</AlertTitle>
                        <AlertDescription>
                            Your email address is verified. Complete your
                            business profile, intended cities, and verification
                            documents to submit your TIJUM partner application.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Partner Portal Hero */}
                <section className="relative overflow-hidden rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-soft sm:p-8 dark:border dark:border-border dark:bg-[#2b1b29]">
                    <div
                        className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-tijum-coral/15 blur-3xl"
                        aria-hidden="true"
                    />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-heading text-xs font-semibold tracking-[0.16em] text-tijum-peach uppercase">
                                    TIJUM Partner Portal
                                </span>
                                <StatusBadge
                                    status={statusBadgeType}
                                    label={onboarding.accountStatusLabel}
                                />
                                {!onboarding.emailVerified && (
                                    <StatusBadge
                                        status="pending"
                                        label="Email Unverified"
                                    />
                                )}
                            </div>
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-cream sm:text-3xl">
                                Welcome back, {owner?.name ?? 'Partner'}
                            </h1>
                            <p className="text-sm leading-relaxed text-tijum-cream/80">
                                {isVerifiedPartner
                                    ? 'Manage daily check-ins, room inventory, meal plans, and settlements across your verified properties.'
                                    : 'Complete your partner verification steps below to start publishing properties and receiving guest bookings.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
                            {onboarding.canPublishProperties ? (
                                <>
                                    <Button
                                        variant="outline"
                                        asChild
                                        className="border-white/25 bg-white/10 text-tijum-cream hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10 dark:text-tijum-cream dark:hover:bg-white/20"
                                    >
                                        <Link href="/owner/front-desk">
                                            <DoorOpen aria-hidden="true" />
                                            <span>Front Desk</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        asChild
                                        className="border-white/25 bg-white/10 text-tijum-cream hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10 dark:text-tijum-cream dark:hover:bg-white/20"
                                    >
                                        <Link href={propertiesIndex()}>
                                            <Building2 aria-hidden="true" />
                                            <span>My Properties</span>
                                        </Link>
                                    </Button>
                                    <Button asChild>
                                        <Link href={propertyCreate()}>
                                            <PlusCircle aria-hidden="true" />
                                            <span>Add Property</span>
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <Button asChild>
                                    <Link href={onboardingIndex()}>
                                        <ClipboardCheck aria-hidden="true" />
                                        <span>Complete Verification</span>
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                {application && (
                    <CorrectionRequestPanel
                        application={application}
                        checklist={evaluation.checklist}
                    />
                )}

                {/* Stage 2: Active Partner Operations View */}
                {showOperationsOverview && operationsSummary && (
                    <div className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label="Today's Arrivals"
                                value={String(operationsSummary.todayArrivals)}
                                helperText={
                                    operationsSummary.todayArrivals > 0
                                        ? 'Scheduled check-ins today'
                                        : 'No pending arrivals today'
                                }
                                icon={DoorOpen}
                                badge={
                                    <Badge
                                        variant={
                                            operationsSummary.todayArrivals > 0
                                                ? 'default'
                                                : 'outline'
                                        }
                                    >
                                        {operationsSummary.todayArrivals > 0
                                            ? 'Check-ins'
                                            : 'Clear'}
                                    </Badge>
                                }
                            />

                            <StatCard
                                label="Today's Departures"
                                value={String(
                                    operationsSummary.todayDepartures,
                                )}
                                helperText={
                                    operationsSummary.todayDepartures > 0
                                        ? 'Guests checking out today'
                                        : 'No checkouts remaining'
                                }
                                icon={DoorClosed}
                                badge={
                                    <Badge
                                        variant={
                                            operationsSummary.todayDepartures >
                                            0
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {operationsSummary.todayDepartures > 0
                                            ? 'Check-outs'
                                            : 'Done'}
                                    </Badge>
                                }
                            />

                            <StatCard
                                label="In-House Guests"
                                value={String(operationsSummary.inHouseGuests)}
                                helperText={`${operationsSummary.activeReservations} active confirmed bookings`}
                                icon={Users}
                                badge={<Badge variant="plum">Occupied</Badge>}
                            />

                            <StatCard
                                label="Unsettled Payouts"
                                value={formatInr(
                                    operationsSummary.unsettledPayoutMinor,
                                )}
                                helperText="Pending & approved settlements"
                                icon={Wallet}
                                badge={
                                    <Badge variant="outline">Net Balance</Badge>
                                }
                            />
                        </div>

                        {(operationsSummary.pendingReviews > 0 ||
                            operationsSummary.openComplaints > 0) && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {operationsSummary.pendingReviews > 0 && (
                                    <Alert
                                        variant="warning"
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Star className="size-4 text-amber-500" />
                                            <div>
                                                <AlertTitle className="text-xs font-bold">
                                                    {
                                                        operationsSummary.pendingReviews
                                                    }{' '}
                                                    Guest{' '}
                                                    {operationsSummary.pendingReviews ===
                                                    1
                                                        ? 'Review'
                                                        : 'Reviews'}{' '}
                                                    Awaiting Reply
                                                </AlertTitle>
                                                <AlertDescription className="text-xs">
                                                    Prompt responses improve
                                                    guest trust.
                                                </AlertDescription>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="shrink-0 text-xs"
                                        >
                                            <Link href="/owner/reviews">
                                                Reply
                                            </Link>
                                        </Button>
                                    </Alert>
                                )}

                                {operationsSummary.openComplaints > 0 && (
                                    <Alert
                                        variant="destructive"
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MessageSquareWarning className="size-4" />
                                            <div>
                                                <AlertTitle className="text-xs font-bold">
                                                    {
                                                        operationsSummary.openComplaints
                                                    }{' '}
                                                    Open Guest{' '}
                                                    {operationsSummary.openComplaints ===
                                                    1
                                                        ? 'Issue'
                                                        : 'Issues'}
                                                </AlertTitle>
                                                <AlertDescription className="text-xs">
                                                    Respond promptly to resolve
                                                    stay issues.
                                                </AlertDescription>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="shrink-0 text-xs"
                                        >
                                            <Link href="/owner/complaints">
                                                Resolve
                                            </Link>
                                        </Button>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {/* Compact Property & Quick Actions Summary for Verified Partners */}
                        <div className="grid gap-4 lg:grid-cols-3">
                            <StatCard
                                label="Properties & Inventory"
                                value={`${propertySummary.propertiesTotal} Properties (${propertySummary.verifiedProperties} Verified)`}
                                helperText={`${propertySummary.roomTypesTotal} room types · ${propertySummary.roomsTotal} physical rooms`}
                                icon={Building2}
                                badge={
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={propertiesIndex()}>
                                            Manage
                                        </Link>
                                    </Button>
                                }
                            />

                            <StatCard
                                label="Rates, Meals & Blocks"
                                value="Daily · Weekly · Monthly"
                                helperText="Update room rates, meal flags, or maintenance blocks"
                                icon={CalendarDays}
                                badge={
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/owner/availability">
                                            Open
                                        </Link>
                                    </Button>
                                }
                            />

                            <StatCard
                                label="Partner Verification"
                                value={onboarding.accountStatusLabel}
                                helperText={
                                    businessProfile
                                        ? `${businessProfile.display_business_name} · ${businessProfile.entity_type_label}`
                                        : 'Operator profile verified'
                                }
                                icon={ShieldCheck}
                                badge={
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={onboardingStatus()}>
                                            <FileCheck2 className="mr-1 size-3.5" />
                                            <span>View Record</span>
                                        </Link>
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                )}

                {/* Stage 1: Partner Verification & Onboarding View (shown only until verified) */}
                {!isVerifiedPartner && (
                    <>
                        <VerificationStatusPanel
                            application={application}
                            evaluation={evaluation}
                            canPublishProperties={
                                onboarding.canPublishProperties
                            }
                        />

                        <div className="grid gap-6 lg:grid-cols-5">
                            <Card className="lg:col-span-3">
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <CardTitle>
                                                5-Step Partner Verification
                                                Checklist
                                            </CardTitle>
                                            <CardDescription>
                                                Complete each step below to
                                                unlock property publishing
                                            </CardDescription>
                                        </div>
                                        <StatusBadge
                                            status={
                                                completedCount ===
                                                evaluation.steps.length
                                                    ? 'completed'
                                                    : 'info'
                                            }
                                            label={`${completedCount} of ${evaluation.steps.length} complete`}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ol className="space-y-3">
                                        {evaluation.steps.map((step) => (
                                            <li
                                                key={step.key}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/50 px-4 py-3 dark:border-border dark:bg-muted/45"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    {step.completed ? (
                                                        <CheckCircle2
                                                            className="size-5 shrink-0 text-status-success-fg"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Clock
                                                            className="size-5 shrink-0 text-status-warning-fg"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                            Step {step.number}:{' '}
                                                            {step.title}
                                                        </p>
                                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                            {step.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <StatusBadge
                                                    status={
                                                        step.completed
                                                            ? 'completed'
                                                            : 'pending'
                                                    }
                                                    label={
                                                        step.completed
                                                            ? 'Complete'
                                                            : 'Pending'
                                                    }
                                                />
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>

                            <div className="space-y-6 lg:col-span-2">
                                <InfoPanel
                                    title={onboarding.nextAction.title}
                                    description={
                                        onboarding.nextAction.description
                                    }
                                    action={
                                        <Button className="w-full" asChild>
                                            <Link
                                                href={
                                                    onboarding.nextAction
                                                        .actionHref
                                                }
                                            >
                                                <span>
                                                    {
                                                        onboarding.nextAction
                                                            .actionLabel
                                                    }
                                                </span>
                                                <ArrowRight aria-hidden="true" />
                                            </Link>
                                        </Button>
                                    }
                                >
                                    <div className="space-y-3 text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                        <p>
                                            Operating cities selected:{' '}
                                            <strong className="text-tijum-plum dark:text-foreground">
                                                {operatingCities.length > 0
                                                    ? operatingCities
                                                          .map((c) => c.name)
                                                          .join(', ')
                                                    : 'None selected yet'}
                                            </strong>
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge variant="outline">
                                                Hostels/PG
                                            </Badge>
                                            <Badge variant="outline">
                                                Homestays
                                            </Badge>
                                            <Badge variant="outline">
                                                Co-Living
                                            </Badge>
                                        </div>
                                    </div>
                                </InfoPanel>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

OwnerDashboard.layout = {
    breadcrumbs: [{ title: 'Partner Overview', href: dashboard() }],
};
