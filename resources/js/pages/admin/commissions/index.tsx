import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    FileSignature,
    Percent,
    Plus,
    ShieldCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AgreementRow {
    id: number;
    agreement_reference: string;
    owner_name: string;
    owner_email: string;
    property_name: string;
    commission_rate_bps: number;
    commission_rate_percentage: number;
    commission_base_type: string;
    commission_base_label: string;
    commission_gst_type: string;
    commission_gst_label: string;
    status: string;
    status_label: string;
    effective_from: string;
    effective_until?: string;
    accepted_at?: string;
    created_by?: string;
}

interface Props {
    agreements: {
        data: AgreementRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        status?: string;
    };
}

function getStatusSemantic(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'pending_acceptance':
            return 'processing';
        case 'superseded':
            return 'neutral';
        case 'terminated':
            return 'rejected';
        default:
            return 'pending';
    }
}

export default function AdminCommissionAgreementsIndex({
    agreements,
    filters,
}: Props) {
    const activeFilter = filters.status || 'all';

    const handleFilter = (status?: string) => {
        router.get('/admin/partner-commissions', status ? { status } : {}, {
            preserveState: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get(
            '/admin/partner-commissions',
            {
                ...(filters.status ? { status: filters.status } : {}),
                page,
            },
            { preserveState: true },
        );
    };

    const activeOnPage = agreements.data.filter(
        (a) => a.status === 'active',
    ).length;
    const pendingOnPage = agreements.data.filter(
        (a) => a.status === 'pending_acceptance',
    ).length;
    const averageRatePct =
        agreements.data.length > 0
            ? (
                  agreements.data.reduce(
                      (sum, item) => sum + item.commission_rate_percentage,
                      0,
                  ) / agreements.data.length
              ).toFixed(2)
            : '0.00';

    return (
        <div className="space-y-6">
            <Head title="Commission Agreements Console" />

            <PageHeader
                eyebrow="Commercial Contracts"
                title="Partner Commission Agreements"
                description="Configure negotiated partner commission rates, send terms for explicit partner acceptance, and audit rate histories."
                badges={
                    <>
                        <Badge variant="plum">Commercial Contracts</Badge>
                        <Badge variant="outline" className="gap-1.5">
                            <ShieldCheck
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>TOTP Guarded</span>
                        </Badge>
                    </>
                }
                actions={
                    <Button variant="default" asChild>
                        <Link href="/admin/partner-commissions/create">
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Draft New Agreement</span>
                        </Link>
                    </Button>
                }
            />

            {/* KPI Summary Row */}
            <section
                aria-label="Commission agreement metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Matching Agreements"
                    value={agreements.total}
                    helperText="Across selected filter scope"
                    icon={FileSignature}
                />
                <StatCard
                    label="Active Contracts (Page)"
                    value={activeOnPage}
                    helperText="Live snapshot rate terms"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Pending Acceptance (Page)"
                    value={pendingOnPage}
                    helperText="Awaiting partner sign-off"
                    icon={Clock}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="Average Rate (Page)"
                    value={`${averageRatePct}%`}
                    helperText="Mean agreed commission"
                    icon={Percent}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Pill Status Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={activeFilter}
                    onValueChange={(value) =>
                        handleFilter(value === 'all' ? undefined : value)
                    }
                    className="max-w-full space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter commission agreements by status"
                        className="max-w-full"
                    >
                        <TabsTrigger value="all">
                            All ({agreements.total})
                        </TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="pending_acceptance">
                            Pending Partner Acceptance
                        </TabsTrigger>
                        <TabsTrigger value="draft">Draft</TabsTrigger>
                    </TabsList>
                </Tabs>

                {filters.status && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilter()}
                    >
                        Clear filter
                    </Button>
                )}
            </div>

            {/* Agreements Table or Empty State */}
            {agreements.data.length === 0 ? (
                <EmptyState
                    icon={FileSignature}
                    title="No commission agreements found"
                    description="No partner commission agreements match the selected filter criteria."
                    action={
                        filters.status ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleFilter()}
                            >
                                Clear status filter
                            </Button>
                        ) : (
                            <Button variant="default" asChild>
                                <Link href="/admin/partner-commissions/create">
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Draft New Agreement</span>
                                </Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-4 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Commission Agreements Ledger
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {agreements.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4 whitespace-nowrap">
                                        Agreement Reference
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Partner Entity
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Property Scope
                                    </TableHead>
                                    <TableHead className="px-3 text-right whitespace-nowrap">
                                        Agreed Rate
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Calculation Base
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Effective Dates
                                    </TableHead>
                                    <TableHead className="px-4 whitespace-nowrap">
                                        Status
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agreements.data.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="max-w-[185px] px-4 py-3">
                                            <span
                                                title={a.agreement_reference}
                                                className="block truncate font-mono text-xs font-bold whitespace-nowrap text-tijum-coral tabular-nums"
                                            >
                                                {a.agreement_reference}
                                            </span>
                                            <span
                                                title={`Created by ${a.created_by ?? 'Admin'}`}
                                                className="mt-0.5 block truncate text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                            >
                                                Created by{' '}
                                                {a.created_by ?? 'Admin'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[195px] px-3 py-3">
                                            <span
                                                title={a.owner_name}
                                                className="block truncate font-heading text-sm font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                {a.owner_name}
                                            </span>
                                            <span
                                                title={a.owner_email}
                                                className="block truncate text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                            >
                                                {a.owner_email}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] px-3 py-3 text-sm">
                                            <span
                                                title={a.property_name}
                                                className="block truncate text-tijum-plum dark:text-foreground"
                                            >
                                                {a.property_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-right whitespace-nowrap">
                                            <span className="block font-heading text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                                {a.commission_rate_percentage}%
                                            </span>
                                            <span className="block text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                ({a.commission_rate_bps} bps)
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[185px] px-3 py-3">
                                            <span
                                                title={a.commission_base_label}
                                                className="block truncate text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                {a.commission_base_label}
                                            </span>
                                            <span
                                                title={a.commission_gst_label}
                                                className="mt-0.5 block truncate text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                            >
                                                {a.commission_gst_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            <span>{a.effective_from}</span>
                                            {a.effective_until && (
                                                <span>
                                                    {' '}
                                                    to {a.effective_until}
                                                </span>
                                            )}
                                            {a.accepted_at && (
                                                <span className="mt-0.5 block font-semibold text-status-success-fg">
                                                    Accepted on{' '}
                                                    {new Date(
                                                        a.accepted_at,
                                                    ).toLocaleDateString(
                                                        'en-IN',
                                                    )}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                            <StatusBadge
                                                status={getStatusSemantic(
                                                    a.status,
                                                )}
                                                label={a.status_label}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {agreements.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {agreements.total}
                                </span>{' '}
                                agreement{agreements.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={agreements.current_page}
                                totalPages={agreements.last_page}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
