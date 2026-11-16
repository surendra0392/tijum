import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Clock,
    Eye,
    RotateCcw,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PartnerFinancialRow {
    owner_id: number;
    name: string;
    email: string;
    phone: string;
    legal_business_name?: string;
    business_constitution?: string;
    pan_number?: string;
    gst_registered: boolean;
    gstin?: string;
    supplier_classification?: string;
    razorpay_account_id?: string;
    linked_account_status: string;
    linked_account_label: string;
    onboarding_status: string;
    onboarding_label: string;
    is_eligible: boolean;
    verified_at?: string;
}

interface Props {
    partners: {
        data: PartnerFinancialRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        status?: string;
        search?: string;
    };
}

function getOnboardingSemantic(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'submitted':
        case 'under_review':
            return 'processing';
        case 'rejected':
            return 'rejected';
        case 'suspended':
            return 'suspended';
        default:
            return 'pending';
    }
}

export default function AdminFinancialProfilesIndex({
    partners,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const activeStatus = filters.status || 'all';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/partners/financial',
            {
                ...(filters.status ? { status: filters.status } : {}),
                ...(search.trim() ? { search: search.trim() } : {}),
            },
            { preserveState: true },
        );
    };

    const handleFilter = (status?: string) => {
        router.get(
            '/admin/partners/financial',
            {
                ...(status ? { status } : {}),
                ...(search.trim() ? { search: search.trim() } : {}),
            },
            { preserveState: true },
        );
    };

    const handleReset = () => {
        setSearch('');
        router.get('/admin/partners/financial', {}, { preserveState: true });
    };

    const handlePageChange = (page: number) => {
        router.get(
            '/admin/partners/financial',
            {
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.search ? { search: filters.search } : {}),
                page,
            },
            { preserveState: true },
        );
    };

    const eligibleOnPage = partners.data.filter((p) => p.is_eligible).length;
    const gstRegisteredOnPage = partners.data.filter(
        (p) => p.gst_registered,
    ).length;
    const pendingOnPage = partners.data.filter((p) => !p.is_eligible).length;

    return (
        <div className="space-y-6">
            <Head title="Partner Financial Onboarding" />

            <PageHeader
                eyebrow="Partner Financials"
                title="Partner Financial Onboarding & KYC"
                description="Review accommodation operators' legal business entities, PAN/GSTIN compliance, and Razorpay Route linked-account readiness."
                badges={
                    <>
                        <Badge variant="plum">Partner Financials</Badge>
                        <Badge variant="outline" className="gap-1.5">
                            <ShieldCheck
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>TOTP Guarded</span>
                        </Badge>
                    </>
                }
            />

            {/* KPI Summary Row */}
            <section
                aria-label="Partner financial onboarding metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Matching Partner Entities"
                    value={partners.total}
                    helperText="Across selected filter scope"
                    icon={Building2}
                />
                <StatCard
                    label="Payout Eligible (Page)"
                    value={eligibleOnPage}
                    helperText="Active Route linked accounts"
                    icon={UserCheck}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Pending KYC / Blocked (Page)"
                    value={pendingOnPage}
                    helperText="Awaiting tax or bank verification"
                    icon={ShieldAlert}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="GSTIN Registered (Page)"
                    value={gstRegisteredOnPage}
                    helperText="GST-verified partner profiles"
                    icon={ShieldCheck}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Search Card (Separate from Status Pill Tabs) */}
            <Card className="py-4">
                <CardContent>
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                        <div className="relative flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search partner name, legal entity, PAN, GSTIN, or email…"
                                className="h-10 pl-10 text-sm"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="submit"
                                size="sm"
                                variant="default"
                            >
                                Search
                            </Button>
                            {(filters.search || filters.status) && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleReset}
                                >
                                    <RotateCcw
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Clear</span>
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Standalone Status Filter Pill Tabs */}
            <Tabs
                value={activeStatus}
                onValueChange={(value) =>
                    handleFilter(value === 'all' ? undefined : value)
                }
                className="max-w-full space-y-0"
            >
                <TabsList
                    variant="pill"
                    label="Filter partner financial profiles by status"
                    className="max-w-full"
                >
                    <TabsTrigger value="all">
                        All ({partners.total})
                    </TabsTrigger>
                    <TabsTrigger value="submitted">
                        Pending Review
                    </TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Partner Entities Ledger */}
            {partners.data.length === 0 ? (
                <EmptyState
                    icon={Building2}
                    title="No partner financial profiles found"
                    description="No partner financial profiles match the current search or status filter."
                    action={
                        (filters.search || filters.status) && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                            >
                                Clear filters
                            </Button>
                        )
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Registered Partner Entities
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {partners.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-5">
                                        Partner / Email
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Legal Business Entity
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Tax Identification
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Route Account
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Onboarding Status
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Settlement Readiness
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {partners.data.map((p) => (
                                    <TableRow key={p.owner_id}>
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                {p.name}
                                            </span>
                                            <span className="block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {p.email}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-medium text-tijum-plum dark:text-foreground">
                                                {p.legal_business_name ??
                                                    'Not submitted'}
                                            </span>
                                            <span className="block text-xs text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                                {p.business_constitution
                                                    ? p.business_constitution.replace(
                                                          '_',
                                                          ' ',
                                                      )
                                                    : '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-mono text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                {p.pan_number
                                                    ? `PAN: ${p.pan_number}`
                                                    : 'No PAN'}
                                            </span>
                                            <span className="mt-0.5 block font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {p.gst_registered
                                                    ? `GSTIN: ${p.gstin}`
                                                    : 'GST Unregistered'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-mono text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                {p.razorpay_account_id ??
                                                    'Unlinked'}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {p.linked_account_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <StatusBadge
                                                status={getOnboardingSemantic(
                                                    p.onboarding_status,
                                                )}
                                                label={p.onboarding_label}
                                            />
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            {p.is_eligible ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success-fg">
                                                    <CheckCircle2
                                                        className="size-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Payout Eligible</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-warning-fg">
                                                    <Clock
                                                        className="size-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Pending Verification
                                                    </span>
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={`/admin/partners/financial/${p.owner_id}`}
                                                >
                                                    <Eye
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Audit</span>
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {partners.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {partners.total}
                                </span>{' '}
                                partner profile
                                {partners.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={partners.current_page}
                                totalPages={partners.last_page}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
