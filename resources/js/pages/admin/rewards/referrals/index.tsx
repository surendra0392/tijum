import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Coins,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    Users,
    UserX,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/layouts/admin-layout';
import type {
    AdminReferralFraudCase,
    BreadcrumbItem,
    ReferralInvite,
} from '@/types';

interface Props {
    kpis: {
        total_invitations: number;
        total_registered: number;
        completed_stays: number;
        total_points_awarded: number;
        flagged_cases_count: number;
    };
    fraudQueue?: AdminReferralFraudCase[];
    referralLedger?: ReferralInvite[];
}

function getFraudCaseSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'cleared':
            return 'verified';
        case 'disqualified':
            return 'rejected';
        default:
            return 'warning';
    }
}

function getReferralSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'completed':
        case 'rewarded':
            return 'completed';
        case 'booked':
        case 'registered':
            return 'info';
        case 'invited':
            return 'pending';
        case 'disqualified':
            return 'rejected';
        default:
            return 'neutral';
    }
}

export default function AdminReferralsIndex({
    kpis,
    fraudQueue = [],
    referralLedger = [],
}: Props) {
    const [activeTab, setActiveTab] = useState<'queue' | 'all'>('queue');
    const [searchQuery, setSearchQuery] = useState('');
    const [ledgerPage, setLedgerPage] = useState(1);
    const ledgerPageSize = 15;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        { title: 'Rewards', href: '/admin/rewards' },
        { title: 'Referrals & Anti-Fraud', href: '/admin/rewards/referrals' },
    ];

    const handleAction = (
        caseId: number | string,
        action: 'clear' | 'disqualify',
    ) => {
        router.post(
            `/admin/rewards/referrals/${caseId}/${action}`,
            action === 'disqualify'
                ? { reason: 'Disqualified via admin anti-fraud review.' }
                : {},
            { preserveScroll: true },
        );
    };

    const filteredLedger = useMemo(() => {
        return referralLedger.filter((item) =>
            item.friend_name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [referralLedger, searchQuery]);

    const totalLedgerPages = Math.max(
        1,
        Math.ceil(filteredLedger.length / ledgerPageSize),
    );
    const safeLedgerPage = Math.min(ledgerPage, totalLedgerPages);
    const pagedLedger = filteredLedger.slice(
        (safeLedgerPage - 1) * ledgerPageSize,
        safeLedgerPage * ledgerPageSize,
    );

    const flaggedCount = kpis?.flagged_cases_count ?? 0;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Referral Attribution & Anti-Fraud — TIJUM Admin" />

            <div className="space-y-6 pb-16">
                <PageHeader
                    eyebrow="Attribution & Risk"
                    title="Referral Management & Anti-Fraud"
                    description="Monitor referral funnels, qualify stay completions, and adjudicate flagged self-referral attempts."
                    badges={
                        <>
                            <Badge variant="plum">Anti-Fraud Guard</Badge>
                            {flaggedCount > 0 ? (
                                <StatusBadge
                                    status="warning"
                                    label={`${flaggedCount} Flagged Cases`}
                                />
                            ) : (
                                <StatusBadge
                                    status="verified"
                                    label="Queue Clear"
                                />
                            )}
                        </>
                    }
                    actions={
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/rewards">
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Rewards Hub</span>
                            </Link>
                        </Button>
                    }
                />

                {/* KPI Cards */}
                <section
                    aria-label="Referral funnel and fraud metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                >
                    <StatCard
                        label="Invitations"
                        value={(kpis?.total_invitations ?? 0).toLocaleString()}
                        icon={Users}
                    />
                    <StatCard
                        label="Registered"
                        value={(kpis?.total_registered ?? 0).toLocaleString()}
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Completed Stays"
                        value={(kpis?.completed_stays ?? 0).toLocaleString()}
                        icon={CheckCircle2}
                        className="border-l-4 border-l-emerald-500"
                    />
                    <StatCard
                        label="Points Awarded"
                        value={(
                            kpis?.total_points_awarded ?? 0
                        ).toLocaleString()}
                        icon={Coins}
                        className="border-l-4 border-l-tijum-coral"
                    />
                    <StatCard
                        label="Fraud Alerts"
                        value={flaggedCount}
                        icon={ShieldAlert}
                        className={
                            flaggedCount > 0
                                ? 'border-l-4 border-l-rose-500'
                                : undefined
                        }
                    />
                </section>

                {/* Tabs Switcher */}
                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as 'queue' | 'all')
                    }
                >
                    <TabsList variant="pill" label="Referral management views">
                        <TabsTrigger value="queue">
                            <ShieldAlert
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <span>Fraud Review Queue</span>
                            {fraudQueue.length > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="ml-0.5 px-1.5 py-0 text-[10px] tabular-nums"
                                >
                                    {fraudQueue.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="all">
                            <Users className="size-3.5" aria-hidden="true" />
                            <span>All Referrals Ledger</span>
                            <Badge
                                variant="secondary"
                                className="ml-0.5 px-1.5 py-0 text-[10px] tabular-nums"
                            >
                                {referralLedger.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Fraud Review Queue */}
                    <TabsContent value="queue" className="space-y-4">
                        {fraudQueue.length === 0 ? (
                            <EmptyState
                                icon={ShieldCheck}
                                title="Fraud Queue is Clear"
                                description="No suspicious device, IP, or payment fingerprints currently flagged for manual review."
                            />
                        ) : (
                            <div className="space-y-4">
                                {fraudQueue.map((item) => (
                                    <Card
                                        key={item.id}
                                        className="border-l-4 border-l-amber-500 py-5"
                                    >
                                        <CardContent className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                                            <div className="min-w-0 flex-1 space-y-4">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <StatusBadge
                                                        status={getFraudCaseSemanticStatus(
                                                            item.status,
                                                        )}
                                                        label={item.status}
                                                        className="uppercase"
                                                    />
                                                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Code:{' '}
                                                        <strong className="inline-flex rounded-lg border border-tijum-surface/80 bg-tijum-cream/60 px-2 py-0.5 font-mono text-xs text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground">
                                                            {item.referral_code}
                                                        </strong>
                                                    </span>
                                                    <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        ·{' '}
                                                        {new Date(
                                                            item.created_at,
                                                        ).toLocaleString()}
                                                    </span>
                                                    {item.ip_similarity && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            IP Match
                                                        </Badge>
                                                    )}
                                                    {item.device_match && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            Device Match
                                                        </Badge>
                                                    )}
                                                    {item.payment_method_match && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            Payment Match
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="grid gap-3 text-xs sm:grid-cols-2">
                                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                        <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                            Referrer
                                                        </p>
                                                        <p className="mt-1 font-heading font-bold text-tijum-plum dark:text-foreground">
                                                            {item.referrer_name}
                                                        </p>
                                                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                                            {
                                                                item.referrer_email
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                                        <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                            Referred Guest
                                                        </p>
                                                        <p className="mt-1 font-heading font-bold text-tijum-plum dark:text-foreground">
                                                            {item.referred_name}
                                                        </p>
                                                        <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                                            {
                                                                item.referred_email
                                                            }
                                                        </p>
                                                    </div>
                                                </div>

                                                <Alert
                                                    variant="destructive"
                                                    className="py-2.5"
                                                >
                                                    <AlertTriangle aria-hidden="true" />
                                                    <AlertDescription className="text-xs">
                                                        <span>
                                                            <strong className="font-semibold">
                                                                Flag Reason:
                                                            </strong>{' '}
                                                            {
                                                                item.flagged_reason
                                                            }
                                                        </span>
                                                    </AlertDescription>
                                                </Alert>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:self-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleAction(
                                                            item.id,
                                                            'clear',
                                                        )
                                                    }
                                                    className="gap-1.5 border-status-success-border bg-status-success-bg/70 text-xs text-status-success-fg hover:bg-status-success-bg"
                                                >
                                                    <UserCheck
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Clear &amp; Approve
                                                    </span>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleAction(
                                                            item.id,
                                                            'disqualify',
                                                        )
                                                    }
                                                    className="gap-1.5 border-status-error-border bg-status-error-bg/70 text-xs text-status-error-fg hover:bg-status-error-bg"
                                                >
                                                    <UserX
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Disqualify</span>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab 2: All Referrals Ledger */}
                    <TabsContent value="all" className="space-y-4">
                        <Card className="py-4">
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                                <div className="relative w-full max-w-xs">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        placeholder="Search by friend name..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="h-10 pr-9 pl-9 text-xs"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            aria-label="Clear referral search"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-tijum-plum-muted transition-colors hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Showing {filteredLedger.length} of{' '}
                                    {referralLedger.length} records
                                </span>
                            </CardContent>
                        </Card>

                        {filteredLedger.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="No referral records found"
                                description={
                                    searchQuery
                                        ? 'No referred users matched your search filter.'
                                        : 'Referral invitations and completed stay rewards will appear here.'
                                }
                                action={
                                    searchQuery ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            Clear search
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <Card className="gap-0 overflow-hidden py-0">
                                <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base">
                                                All Referrals Ledger
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Complete invitation funnel and
                                                stay qualification history.
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="tabular-nums"
                                        >
                                            {filteredLedger.length} records
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="pl-6">
                                                    Referred User
                                                </TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>
                                                    Stay Completed
                                                </TableHead>
                                                <TableHead className="pr-6 text-right">
                                                    Points Awarded
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pagedLedger.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="pl-6">
                                                        <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                            {r.friend_name}
                                                        </p>
                                                        <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                            {
                                                                r.friend_email_masked
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {new Date(
                                                            r.created_at,
                                                        ).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge
                                                            status={getReferralSemanticStatus(
                                                                r.status,
                                                            )}
                                                            label={r.status}
                                                            className="capitalize"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {r.stay_completed_at
                                                            ? new Date(
                                                                  r.stay_completed_at,
                                                              ).toLocaleDateString()
                                                            : 'Pending'}
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right font-heading text-xs font-bold text-status-success-fg tabular-nums">
                                                        +{r.points_awarded} pts
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-6 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                                        <span>
                                            Showing{' '}
                                            {(safeLedgerPage - 1) *
                                                ledgerPageSize +
                                                1}
                                            –
                                            {Math.min(
                                                safeLedgerPage * ledgerPageSize,
                                                filteredLedger.length,
                                            )}{' '}
                                            of {filteredLedger.length} records
                                        </span>
                                        <Pagination
                                            currentPage={safeLedgerPage}
                                            totalPages={totalLedgerPages}
                                            onPageChange={setLedgerPage}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
