import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    DoorClosed,
    DoorOpen,
    MailCheck,
    MessageSquareWarning,
    ShieldAlert,
    ShieldCheck,
    Star,
    Users,
    Wallet,
} from 'lucide-react';
import { CorrectionRequestPanel } from '@/components/owner/onboarding/correction-request-panel';
import { VerificationStatusPanel } from '@/components/owner/onboarding/verification-status-panel';
import { InfoPanel, StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
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
import { index as onboardingIndex } from '@/routes/owner/onboarding';
import { edit as profileEdit } from '@/routes/owner/profile';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/owner/properties';
import { notice as verificationNotice } from '@/routes/owner/verification';
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

    const isActivePartner =
        onboarding.accountStatus === 'active' ||
        propertySummary.propertiesTotal > 0;

    return (
        <>
            <Head title="Partner Onboarding Dashboard" />

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
                        <div className="max-w-2xl space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-heading text-xs font-semibold tracking-[0.16em] text-tijum-peach uppercase">
                                    TIJUM Property Partner Portal
                                </span>
                                <StatusBadge
                                    status={statusBadgeType}
                                    label={onboarding.accountStatusLabel}
                                />
                                <StatusBadge
                                    status={
                                        onboarding.emailVerified
                                            ? 'verified'
                                            : 'pending'
                                    }
                                    label={
                                        onboarding.emailVerified
                                            ? 'Email Verified'
                                            : 'Email Unverified'
                                    }
                                />
                            </div>
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-cream sm:text-3xl">
                                Welcome back, {owner?.name ?? 'Partner'}
                            </h1>
                            <p className="text-sm leading-relaxed text-tijum-cream/80">
                                Complete your operator verification and manage
                                Hostels/PG, Homestays, and Co-Living properties
                                across Hyderabad, Guntur, Vijayawada, and
                                Visakhapatnam.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
                            <Button
                                variant="outline"
                                asChild
                                className="border-white/25 bg-white/10 text-tijum-cream hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10 dark:text-tijum-cream dark:hover:bg-white/20"
                            >
                                <Link href={profileEdit()}>
                                    Partner Profile Settings
                                </Link>
                            </Button>
                            {onboarding.canPublishProperties ? (
                                <>
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
                                            <span>Add Property</span>
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <Button asChild>
                                    <Link href={onboardingIndex()}>
                                        <ClipboardCheck aria-hidden="true" />
                                        <span>Open Onboarding</span>
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

                {/* Active Partner Operations Dashboard */}
                {isActivePartner && operationsSummary && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="font-heading text-lg font-bold text-foreground">
                                    Today's Front Desk &amp; Live Operations
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Daily reception arrivals, departures, guest occupancy, and financial balances across your properties.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/owner/front-desk">
                                        <DoorOpen className="mr-1.5 size-4 text-tijum-coral" />
                                        <span>Front Desk</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/owner/availability">
                                        <CalendarDays className="mr-1.5 size-4 text-tijum-coral" />
                                        <span>Availability</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/owner/settlements">
                                        <Wallet className="mr-1.5 size-4 text-tijum-coral" />
                                        <span>Settlements</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label="Today's Arrivals"
                                value={String(operationsSummary.todayArrivals)}
                                helperText={
                                    operationsSummary.todayArrivals > 0
                                        ? 'Scheduled check-ins at front desk today'
                                        : 'No pending arrivals remaining today'
                                }
                                icon={DoorOpen}
                                badge={
                                    <Badge variant={operationsSummary.todayArrivals > 0 ? 'default' : 'outline'}>
                                        {operationsSummary.todayArrivals > 0 ? 'Check-ins' : 'Clear'}
                                    </Badge>
                                }
                            />

                            <StatCard
                                label="Today's Departures"
                                value={String(operationsSummary.todayDepartures)}
                                helperText={
                                    operationsSummary.todayDepartures > 0
                                        ? 'Guests scheduled to check out today'
                                        : 'No checkout handovers remaining'
                                }
                                icon={DoorClosed}
                                badge={
                                    <Badge variant={operationsSummary.todayDepartures > 0 ? 'secondary' : 'outline'}>
                                        {operationsSummary.todayDepartures > 0 ? 'Check-outs' : 'Done'}
                                    </Badge>
                                }
                            />

                            <StatCard
                                label="In-House Guests"
                                value={String(operationsSummary.inHouseGuests)}
                                helperText={`${operationsSummary.activeReservations} total active confirmed bookings`}
                                icon={Users}
                                badge={
                                    <Badge variant="plum">
                                        Occupied
                                    </Badge>
                                }
                            />

                            <StatCard
                                label="Unsettled Payouts"
                                value={formatInr(operationsSummary.unsettledPayoutMinor)}
                                helperText="Pending / approved settlement balances"
                                icon={Wallet}
                                badge={
                                    <Badge variant="outline">
                                        Gross to Net
                                    </Badge>
                                }
                            />
                        </div>

                        {/* Action Alerts Row */}
                        {(operationsSummary.pendingReviews > 0 || operationsSummary.openComplaints > 0) && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {operationsSummary.pendingReviews > 0 && (
                                    <Alert variant="warning" className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Star className="size-4 text-amber-500" />
                                            <div>
                                                <AlertTitle className="text-xs font-bold">
                                                    {operationsSummary.pendingReviews} Guest {operationsSummary.pendingReviews === 1 ? 'Review' : 'Reviews'} Awaiting Reply
                                                </AlertTitle>
                                                <AlertDescription className="text-xs">
                                                    Prompt responses improve your property ranking and guest trust.
                                                </AlertDescription>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
                                            <Link href="/owner/reviews">Reply</Link>
                                        </Button>
                                    </Alert>
                                )}

                                {operationsSummary.openComplaints > 0 && (
                                    <Alert variant="destructive" className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquareWarning className="size-4" />
                                            <div>
                                                <AlertTitle className="text-xs font-bold">
                                                    {operationsSummary.openComplaints} Open Guest {operationsSummary.openComplaints === 1 ? 'Complaint' : 'Complaints'}
                                                </AlertTitle>
                                                <AlertDescription className="text-xs">
                                                    Review customer protection issues to maintain high partner ratings.
                                                </AlertDescription>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
                                            <Link href="/owner/complaints">Resolve</Link>
                                        </Button>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                    <StatCard
                        label="Partner account status"
                        value={onboarding.accountStatusLabel}
                        helperText={
                            businessProfile
                                ? `${businessProfile.display_business_name} (${businessProfile.entity_type_label})`
                                : 'Operator business profile not saved yet'
                        }
                        icon={ShieldCheck}
                        badge={
                            <StatusBadge
                                status={statusBadgeType}
                                label={onboarding.accountStatusLabel}
                            />
                        }
                    />

                    <StatCard
                        label="Email verification"
                        value={
                            onboarding.emailVerified
                                ? 'Verified'
                                : 'Verification Pending'
                        }
                        helperText={
                            onboarding.emailVerified
                                ? `Confirmed for ${owner?.email ?? 'partner email'}`
                                : 'Required before partner application submission'
                        }
                        icon={
                            onboarding.emailVerified ? MailCheck : ShieldAlert
                        }
                        badge={
                            onboarding.emailVerified ? (
                                <StatusBadge status="verified" />
                            ) : (
                                <Link
                                    href={verificationNotice()}
                                    className="font-heading font-semibold text-tijum-plum underline underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                                >
                                    Verify email now
                                </Link>
                            )
                        }
                    />

                    <StatCard
                        label="Properties & Inventory"
                        value={
                            onboarding.canPublishProperties
                                ? `${propertySummary.propertiesTotal} Properties (${propertySummary.verifiedProperties} Verified)`
                                : 'Partner Verification Pending'
                        }
                        helperText={
                            onboarding.canPublishProperties
                                ? `${propertySummary.roomTypesTotal} room types · ${propertySummary.roomsTotal} physical rooms`
                                : onboarding.propertyApprovalStatus
                        }
                        icon={Building2}
                        badge={
                            <StatusBadge
                                status={
                                    onboarding.canPublishProperties
                                        ? 'active'
                                        : 'pending'
                                }
                                label={
                                    onboarding.canPublishProperties
                                        ? 'Active Partner'
                                        : 'Locked'
                                }
                            />
                        }
                    />
                </div>

                <VerificationStatusPanel
                    application={application}
                    evaluation={evaluation}
                    canPublishProperties={onboarding.canPublishProperties}
                />

                <div className="grid gap-6 lg:grid-cols-5">
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <CardTitle>
                                        5-Step Partner Verification Checklist
                                    </CardTitle>
                                    <CardDescription>
                                        Real readiness tracked directly from
                                        your account, profile, cities, and
                                        documents
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
                            description={onboarding.nextAction.description}
                            action={
                                <Button className="w-full" asChild>
                                    <Link
                                        href={onboarding.nextAction.actionHref}
                                    >
                                        <span>
                                            {onboarding.nextAction.actionLabel}
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
                                    <Badge variant="outline">Hostels/PG</Badge>
                                    <Badge variant="outline">Homestays</Badge>
                                    <Badge variant="outline">Co-Living</Badge>
                                </div>
                            </div>
                        </InfoPanel>
                    </div>
                </div>
            </div>
        </>
    );
}

OwnerDashboard.layout = {
    breadcrumbs: [{ title: 'Partner Overview', href: dashboard() }],
};
