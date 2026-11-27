import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    Building2,
    Calendar,
    CalendarCheck,
    ChevronRight,
    CreditCard,
    DollarSign,
    Download,
    FileSpreadsheet,
    HelpCircle,
    LifeBuoy,
    MapPin,
    Percent,
    Receipt,
    Search,
    Server,
    ShieldAlert,
    ShieldCheck,
    TrendingUp,
    UserCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StatCard } from '@/components/shared/info-card';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface FilterMetadata {
    range: string;
    range_label: string;
    period_start: string;
    period_end: string;
    period_start_formatted: string;
    period_end_formatted: string;
    city_id: number | null;
    category_id: number | null;
    timezone: string;
}

interface MarketplaceOverview {
    total_customers: number;
    active_customers: number;
    verified_partners: number;
    pending_partners: number;
    active_properties: number;
    pending_properties: number;
    suspended_properties: number;
    total_reservations: number;
    pending_reservations: number;
    confirmed_reservations: number;
    completed_reservations: number;
    cancelled_reservations: number;
}

interface ReservationMetrics {
    new_in_period: number;
    awaiting_payment: number;
    confirmed_in_period: number;
    completed_in_period: number;
    cancelled_in_period: number;
    expired_in_period: number;
    active_stays_in_period: number;
}

interface PaymentMetrics {
    captured_count: number;
    captured_amount_minor: number;
    failed_count: number;
    refunds_processed_count: number;
    refunds_processed_amount_minor: number;
    refunds_pending_count: number;
    refunds_failed_count: number;
}

interface RevenueBreakdown {
    gross_booking_value_minor: number;
    captured_payment_amount_minor: number;
    commission_earned_minor: number;
    commission_gst_minor: number;
    platform_revenue_minor: number;
    net_partner_payable_minor: number;
    completed_transfers_minor: number;
    relocation_subsidies_minor: number;
    completed_refunds_minor: number;
    definition_notes: {
        revenue_disclosure: string;
        currency: string;
    };
}

interface CustomerProtectionMetrics {
    open_cases_count: number;
    urgent_cases_count: number;
    safety_cases_count: number;
    overdue_acknowledgement_count: number;
    overdue_resolution_count: number;
    pending_relocations_count: number;
    resolved_in_period_count: number;
}

interface FinancialOperations {
    draft_settlements: number;
    pending_approval_settlements: number;
    approved_settlements: number;
    processing_settlements: number;
    completed_settlements: number;
    failed_transfers: number;
    pending_subsidies: number;
    pending_financial_kyc: number;
}

interface TrendPoint {
    date: string;
    formatted_date: string;
    bookings_count: number;
    payments_amount_minor: number;
    commission_amount_minor: number;
}

interface CityDistributionItem {
    city_id: number;
    city_name: string;
    active_properties: number;
    bookings_count: number;
    payments_amount_minor: number;
}

interface QueueItem {
    id: number | string;
    title?: string;
    name?: string;
    email?: string;
    property_name?: string;
    booking_reference?: string;
    case_reference?: string;
    reference?: string;
    city?: string;
    category?: string;
    category_label?: string;
    owner_name?: string;
    business_name?: string;
    guest_name?: string;
    status: string;
    status_label?: string;
    type?: string;
    badge?: string;
    priority?: string;
    priority_label?: string;
    customer_name?: string;
    partner_name?: string;
    amount_formatted?: string;
    stay_dates?: string;
    is_urgent?: boolean;
    is_ack_overdue?: boolean;
    is_resolution_overdue?: boolean;
    created_formatted?: string;
    submitted_formatted?: string;
    deadline_formatted?: string;
    action_url: string;
    reason?: string;
}

interface ActivityItem {
    id: string;
    type: string;
    reference: string;
    title: string;
    description: string;
    actor_label: string;
    created_at: string;
    created_formatted: string;
    action_url: string;
    badge_variant: string;
}

interface SystemHealth {
    overall_status: 'healthy' | 'warning' | 'critical';
    queue: {
        status: string;
        failed_jobs_count: number;
        pending_jobs_count: number;
    };
    webhooks: {
        status: string;
        total_count: number;
        pending_count: number;
        failed_count: number;
        processed_count: number;
        last_processed_at: string | null;
    };
    scheduler: {
        status: string;
        command: string;
        last_run_at: string | null;
        duration_ms: number | null;
        message: string;
    };
    providers: {
        gateway_mode: string;
        settlements_enabled: boolean;
        route_enabled: boolean;
    };
    checked_at_formatted: string;
}

interface AdminDashboardProps {
    filters: {
        range: string;
        city_id: number | null;
        category_id: number | null;
        from: string | null;
        to: string | null;
    };
    filterMetadata: FilterMetadata;
    marketplaceOverview: MarketplaceOverview;
    reservationMetrics: ReservationMetrics;
    paymentMetrics: PaymentMetrics | null;
    revenueBreakdown: RevenueBreakdown | null;
    customerProtectionMetrics: CustomerProtectionMetrics;
    financialOperations: FinancialOperations | null;
    trends: TrendPoint[];
    cityDistribution: CityDistributionItem[];
    queues: {
        partner_onboarding: QueueItem[];
        property_approval: QueueItem[];
        reservation_operations: QueueItem[];
        customer_protection: QueueItem[];
        payment_operations: QueueItem[];
        financial_operations: QueueItem[];
    };
    recentActivities: ActivityItem[];
    systemHealth: SystemHealth;
    cities: Array<{ id: number; name: string; state: string }>;
    categories: Array<{ id: number; name: string }>;
    securitySummary: {
        twoFactorEnabled: boolean;
        twoFactorConfirmedAt: string | null;
        recoveryCodesRemaining: number;
        guard: string;
    };
    capabilities: {
        canViewFinance: boolean;
        canViewOperations: boolean;
        canViewProtection: boolean;
        canViewReservations: boolean;
        canViewPartners: boolean;
        canViewProperties: boolean;
    };
}

function formatInr(minor: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(minor / 100);
}

function resolveDefaultQueueTab(
    capabilities: AdminDashboardProps['capabilities'],
    queues: AdminDashboardProps['queues'],
): string {
    const candidates: Array<{
        key: string;
        visible: boolean;
        count: number;
    }> = [
        {
            key: 'protection',
            visible: capabilities.canViewProtection,
            count: queues.customer_protection.length,
        },
        {
            key: 'properties',
            visible: capabilities.canViewProperties,
            count: queues.property_approval.length,
        },
        {
            key: 'partners',
            visible: capabilities.canViewPartners,
            count: queues.partner_onboarding.length,
        },
        {
            key: 'reservations',
            visible: capabilities.canViewReservations,
            count: queues.reservation_operations.length,
        },
        {
            key: 'finance',
            visible: capabilities.canViewFinance,
            count: queues.financial_operations.length,
        },
        {
            key: 'payments',
            visible: capabilities.canViewFinance,
            count: queues.payment_operations.length,
        },
    ];

    const authorized = candidates.filter((c) => c.visible);
    const firstNonEmpty = authorized.find((c) => c.count > 0);

    return firstNonEmpty?.key ?? authorized[0]?.key ?? 'properties';
}

function QueueItemRow({
    heading,
    badges,
    meta,
    actionUrl,
    actionLabel,
}: {
    heading: string | undefined;
    badges?: ReactNode;
    meta: ReactNode;
    actionUrl: string;
    actionLabel: string;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3.5 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75">
            <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                        {heading}
                    </span>
                    {badges}
                </div>
                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    {meta}
                </p>
            </div>

            <Button
                size="sm"
                variant="outline"
                asChild
                className="shrink-0 text-xs font-semibold"
            >
                <Link href={actionUrl}>
                    <span>{actionLabel}</span>
                    <ChevronRight className="ml-1 size-3.5" />
                </Link>
            </Button>
        </div>
    );
}

function EmptyQueueState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-7 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
            {message}
        </div>
    );
}

export default function AdminDashboard({
    filters,
    filterMetadata,
    marketplaceOverview,
    reservationMetrics,
    revenueBreakdown,
    trends,
    cityDistribution,
    queues,
    recentActivities,
    systemHealth,
    cities,
    categories,
    securitySummary,
    capabilities,
}: AdminDashboardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Record<
        string,
        Array<{
            id: number;
            title: string;
            subtitle: string;
            url: string;
            badge: string;
        }>
    > | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [selectedRange, setSelectedRange] = useState(filters.range);
    const [selectedCity, setSelectedCity] = useState(
        filters.city_id ? String(filters.city_id) : 'all',
    );
    const [selectedCategory, setSelectedCategory] = useState(
        filters.category_id ? String(filters.category_id) : 'all',
    );
    const [customFrom, setCustomFrom] = useState(filters.from ?? '');
    const [customTo, setCustomTo] = useState(filters.to ?? '');

    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            fetch(`/admin/search?q=${encodeURIComponent(searchQuery)}`)
                .then((res) => res.json())
                .then((data) => {
                    setSearchResults(data.results);
                    setIsSearching(false);
                })
                .catch(() => setIsSearching(false));
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                searchRef.current &&
                !searchRef.current.contains(e.target as Node)
            ) {
                setSearchResults(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyFilters = (
        newRange?: string,
        newCity?: string,
        newCategory?: string,
    ) => {
        const r = newRange !== undefined ? newRange : selectedRange;
        const c = newCity !== undefined ? newCity : selectedCity;
        const cat = newCategory !== undefined ? newCategory : selectedCategory;

        router.get(
            '/admin/dashboard',
            {
                range: r,
                city_id: c === 'all' ? undefined : c,
                category_id: cat === 'all' ? undefined : cat,
                from: r === 'custom' && customFrom ? customFrom : undefined,
                to: r === 'custom' && customTo ? customTo : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const maxTrendBooking = Math.max(...trends.map((t) => t.bookings_count), 1);
    const hasSearchResults =
        searchResults &&
        Object.values(searchResults).some((arr) => arr.length > 0);
    const defaultQueueTab = resolveDefaultQueueTab(capabilities, queues);

    const totalAttentionCount =
        (capabilities.canViewProtection
            ? queues.customer_protection.length
            : 0) +
        (capabilities.canViewProperties ? queues.property_approval.length : 0) +
        (capabilities.canViewPartners ? queues.partner_onboarding.length : 0) +
        (capabilities.canViewReservations
            ? queues.reservation_operations.length
            : 0) +
        (capabilities.canViewFinance
            ? queues.financial_operations.length +
              queues.payment_operations.length
            : 0);

    return (
        <TooltipProvider>
            <Head title="Operations Overview" />

            <div className="space-y-6 pb-10">
                {/* 1. Executive Command Hero + Global Search + Quick Workspace Actions */}
                <section className="relative overflow-hidden rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-soft sm:p-7 dark:border dark:border-border dark:bg-[#2b1b29]">
                    <div
                        className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-tijum-coral/15 blur-3xl"
                        aria-hidden="true"
                    />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-heading text-[11px] font-semibold tracking-[0.14em] text-tijum-peach uppercase">
                                    <span className="inline-flex size-2 rounded-full bg-emerald-400" />
                                    Admin Overview
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-heading text-[11px] font-semibold text-tijum-cream">
                                    <ShieldCheck
                                        className="size-3.5 text-emerald-400"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {securitySummary.twoFactorEnabled
                                            ? 'TOTP Active'
                                            : 'TOTP Required'}
                                    </span>
                                    <span className="text-white/40">·</span>
                                    <span className="text-tijum-cream/80">
                                        {securitySummary.recoveryCodesRemaining}{' '}
                                        codes
                                    </span>
                                </span>
                            </div>

                            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                Operations &amp; Administration
                            </h1>
                            <p className="text-sm text-tijum-cream/80">
                                Marketplace oversight across Hyderabad, Guntur,
                                Vijayawada, and Visakhapatnam.
                            </p>

                            {/* Quick Role-Aware Jump Actions */}
                            <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                {capabilities.canViewReservations && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-8 border-white/25 bg-white/10 text-xs text-tijum-cream hover:bg-white/20 hover:text-white"
                                    >
                                        <Link href="/admin/reservations">
                                            <CalendarCheck className="size-3.5" />
                                            <span>Bookings</span>
                                        </Link>
                                    </Button>
                                )}
                                {capabilities.canViewProperties && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-8 border-white/25 bg-white/10 text-xs text-tijum-cream hover:bg-white/20 hover:text-white"
                                    >
                                        <Link href="/admin/properties">
                                            <Building2 className="size-3.5" />
                                            <span>Properties</span>
                                        </Link>
                                    </Button>
                                )}
                                {capabilities.canViewFinance && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-8 border-white/25 bg-white/10 text-xs text-tijum-cream hover:bg-white/20 hover:text-white"
                                    >
                                        <Link href="/admin/settlements">
                                            <Wallet className="size-3.5" />
                                            <span>Settlements</span>
                                        </Link>
                                    </Button>
                                )}
                                {capabilities.canViewProtection && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-8 border-white/25 bg-white/10 text-xs text-tijum-cream hover:bg-white/20 hover:text-white"
                                    >
                                        <Link href="/admin/support/customers">
                                            <LifeBuoy className="size-3.5" />
                                            <span>Support Desk</span>
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Global Search */}
                        <div
                            className="relative w-full lg:max-w-sm"
                            ref={searchRef}
                        >
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-cream/70"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    placeholder="Search booking, case, partner, property..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-11 rounded-xl border-white/20 bg-white/10 pr-9 pl-10 text-sm text-white placeholder:text-tijum-cream/65 hover:border-white/35 focus-visible:border-tijum-coral focus-visible:bg-white/15 focus-visible:ring-tijum-coral/35 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-tijum-cream/65"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        aria-label="Clear global search"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSearchResults(null);
                                        }}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-tijum-cream/75 transition-colors hover:text-white"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            {searchQuery.trim().length >= 2 && (
                                <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-tijum-surface/80 bg-white p-2 text-tijum-plum shadow-tijum-soft dark:border-border dark:bg-card dark:text-foreground">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Searching marketplace records...
                                        </div>
                                    ) : hasSearchResults ? (
                                        <div className="space-y-3">
                                            {Object.entries(searchResults!).map(
                                                ([category, items]) => {
                                                    if (items.length === 0)
                                                        return null;
                                                    return (
                                                        <div key={category}>
                                                            <div className="px-2 py-1 font-heading text-[11px] font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                                {category}
                                                            </div>
                                                            <div className="space-y-1">
                                                                {items.map(
                                                                    (item) => (
                                                                        <Link
                                                                            key={`${category}-${item.id}`}
                                                                            href={
                                                                                item.url
                                                                            }
                                                                            className="flex items-center justify-between rounded-xl p-2.5 text-sm transition-colors hover:bg-tijum-cream/70 dark:hover:bg-accent"
                                                                            onClick={() =>
                                                                                setSearchResults(
                                                                                    null,
                                                                                )
                                                                            }
                                                                        >
                                                                            <div className="min-w-0 pr-2">
                                                                                <div className="truncate font-semibold text-tijum-plum dark:text-foreground">
                                                                                    {
                                                                                        item.title
                                                                                    }
                                                                                </div>
                                                                                <div className="truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                                    {
                                                                                        item.subtitle
                                                                                    }
                                                                                </div>
                                                                            </div>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="shrink-0 text-[10px]"
                                                                            >
                                                                                {
                                                                                    item.badge
                                                                                }
                                                                            </Badge>
                                                                        </Link>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            No matching marketplace records
                                            found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 2. Compact Filters & CSV Export Toolbar */}
                <Card className="py-3.5">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="size-4 text-tijum-coral" />
                                <Select
                                    value={selectedRange}
                                    onValueChange={(val) => {
                                        setSelectedRange(val);
                                        if (val !== 'custom') {
                                            applyFilters(val);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs font-medium">
                                        <SelectValue placeholder="Date Range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">
                                            Today
                                        </SelectItem>
                                        <SelectItem value="last_7_days">
                                            Last 7 Days
                                        </SelectItem>
                                        <SelectItem value="last_30_days">
                                            Last 30 Days
                                        </SelectItem>
                                        <SelectItem value="this_month">
                                            This Month
                                        </SelectItem>
                                        <SelectItem value="previous_month">
                                            Previous Month
                                        </SelectItem>
                                        <SelectItem value="custom">
                                            Custom Range
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedRange === 'custom' && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Input
                                        type="date"
                                        value={customFrom}
                                        onChange={(e) =>
                                            setCustomFrom(e.target.value)
                                        }
                                        className="h-9 w-36 rounded-xl text-xs"
                                    />
                                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        to
                                    </span>
                                    <Input
                                        type="date"
                                        value={customTo}
                                        onChange={(e) =>
                                            setCustomTo(e.target.value)
                                        }
                                        className="h-9 w-36 rounded-xl text-xs"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => applyFilters('custom')}
                                        className="h-9 text-xs"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <MapPin className="size-4 text-tijum-coral" />
                                <Select
                                    value={selectedCity}
                                    onValueChange={(val) => {
                                        setSelectedCity(val);
                                        applyFilters(undefined, val);
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[132px] rounded-xl text-xs font-medium">
                                        <SelectValue placeholder="All Cities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Cities
                                        </SelectItem>
                                        {cities.map((city) => (
                                            <SelectItem
                                                key={city.id}
                                                value={String(city.id)}
                                            >
                                                {city.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Building2 className="size-4 text-tijum-coral" />
                                <Select
                                    value={selectedCategory}
                                    onValueChange={(val) => {
                                        setSelectedCategory(val);
                                        applyFilters(undefined, undefined, val);
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs font-medium">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Categories
                                        </SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem
                                                key={cat.id}
                                                value={String(cat.id)}
                                            >
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                {filterMetadata.period_start_formatted} –{' '}
                                {filterMetadata.period_end_formatted}
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-1.5 text-xs font-semibold"
                                    >
                                        <Download className="size-3.5 text-tijum-coral" />
                                        <span>Export CSV</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuLabel className="text-xs">
                                        Download Report (Filtered)
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {capabilities.canViewReservations && (
                                        <DropdownMenuItem asChild>
                                            <a
                                                href={`/admin/reports/export?report=reservations&range=${filterMetadata.range}&city_id=${filterMetadata.city_id ?? ''}&from=${filters.from ?? ''}&to=${filters.to ?? ''}`}
                                                className="cursor-pointer text-xs"
                                            >
                                                <FileSpreadsheet className="mr-2 size-3.5" />
                                                Reservations Report
                                            </a>
                                        </DropdownMenuItem>
                                    )}
                                    {capabilities.canViewFinance && (
                                        <>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={`/admin/reports/export?report=payments&range=${filterMetadata.range}&city_id=${filterMetadata.city_id ?? ''}&from=${filters.from ?? ''}&to=${filters.to ?? ''}`}
                                                    className="cursor-pointer text-xs"
                                                >
                                                    <CreditCard className="mr-2 size-3.5" />
                                                    Payments Report
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={`/admin/reports/export?report=refunds&range=${filterMetadata.range}&city_id=${filterMetadata.city_id ?? ''}&from=${filters.from ?? ''}&to=${filters.to ?? ''}`}
                                                    className="cursor-pointer text-xs"
                                                >
                                                    <ArrowDownRight className="mr-2 size-3.5" />
                                                    Refunds Report
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={`/admin/reports/export?report=settlements&range=${filterMetadata.range}`}
                                                    className="cursor-pointer text-xs"
                                                >
                                                    <Wallet className="mr-2 size-3.5" />
                                                    Settlements Report
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={`/admin/reports/export?report=partner-commissions&range=${filterMetadata.range}`}
                                                    className="cursor-pointer text-xs"
                                                >
                                                    <Percent className="mr-2 size-3.5" />
                                                    Commission Agreements
                                                </a>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {capabilities.canViewProtection && (
                                        <DropdownMenuItem asChild>
                                            <a
                                                href={`/admin/reports/export?report=customer-cases&range=${filterMetadata.range}&city_id=${filterMetadata.city_id ?? ''}&from=${filters.from ?? ''}&to=${filters.to ?? ''}`}
                                                className="cursor-pointer text-xs"
                                            >
                                                <ShieldAlert className="mr-2 size-3.5" />
                                                Customer Protection Cases
                                            </a>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Primary Marketplace Overview KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Active Properties"
                        value={marketplaceOverview.active_properties}
                        helperText={
                            marketplaceOverview.suspended_properties > 0
                                ? `${marketplaceOverview.pending_properties} pending · ${marketplaceOverview.suspended_properties} suspended`
                                : `${marketplaceOverview.pending_properties} awaiting review`
                        }
                        icon={Building2}
                    />

                    <StatCard
                        label="Verified Partners"
                        value={marketplaceOverview.verified_partners}
                        helperText={`${marketplaceOverview.pending_partners} pending verification`}
                        icon={UserCheck}
                    />

                    <StatCard
                        label="Marketplace Guests"
                        value={marketplaceOverview.total_customers}
                        helperText={`${marketplaceOverview.active_customers} verified & active`}
                        icon={Users}
                    />

                    <StatCard
                        label="Reservations (Period)"
                        value={reservationMetrics.new_in_period}
                        helperText={`${reservationMetrics.confirmed_in_period} confirmed · ${reservationMetrics.awaiting_payment} awaiting · ${reservationMetrics.cancelled_in_period} cancelled`}
                        icon={CalendarCheck}
                    />
                </div>

                {/* 4. Operational Attention Queues */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum sm:text-lg dark:text-foreground">
                                    <AlertCircle className="size-4.5 text-tijum-coral" />
                                    <span>Attention Queues</span>
                                </CardTitle>
                                <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Items requiring review, verification,
                                    payout action, or guest support.
                                </CardDescription>
                            </div>
                            <Badge
                                variant={
                                    totalAttentionCount > 0
                                        ? 'plum'
                                        : 'outline'
                                }
                                className="text-xs tabular-nums"
                            >
                                {totalAttentionCount} pending
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5">
                        <Tabs defaultValue={defaultQueueTab} className="w-full">
                            <TabsList
                                variant="pill"
                                label="Operational Attention Queues"
                                className="mb-4"
                            >
                                {capabilities.canViewProtection && (
                                    <TabsTrigger
                                        value="protection"
                                        className="gap-1.5 text-xs"
                                    >
                                        <ShieldAlert className="size-3.5" />
                                        <span>Protection</span>
                                        {queues.customer_protection.length >
                                            0 && (
                                            <Badge
                                                variant="plum"
                                                className="ml-0.5 px-1.5 py-0 text-[10px]"
                                            >
                                                {
                                                    queues.customer_protection
                                                        .length
                                                }
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                )}

                                {capabilities.canViewProperties && (
                                    <TabsTrigger
                                        value="properties"
                                        className="gap-1.5 text-xs"
                                    >
                                        <Building2 className="size-3.5" />
                                        <span>Properties</span>
                                        {queues.property_approval.length >
                                            0 && (
                                            <Badge
                                                variant="outline"
                                                className="ml-0.5 px-1.5 py-0 text-[10px]"
                                            >
                                                {
                                                    queues.property_approval
                                                        .length
                                                }
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                )}

                                {capabilities.canViewPartners && (
                                    <TabsTrigger
                                        value="partners"
                                        className="gap-1.5 text-xs"
                                    >
                                        <UserCheck className="size-3.5" />
                                        <span>Partners</span>
                                        {queues.partner_onboarding.length >
                                            0 && (
                                            <Badge
                                                variant="outline"
                                                className="ml-0.5 px-1.5 py-0 text-[10px]"
                                            >
                                                {
                                                    queues.partner_onboarding
                                                        .length
                                                }
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                )}

                                {capabilities.canViewReservations && (
                                    <TabsTrigger
                                        value="reservations"
                                        className="gap-1.5 text-xs"
                                    >
                                        <CalendarCheck className="size-3.5" />
                                        <span>Reservations</span>
                                        {queues.reservation_operations.length >
                                            0 && (
                                            <Badge
                                                variant="outline"
                                                className="ml-0.5 px-1.5 py-0 text-[10px]"
                                            >
                                                {
                                                    queues
                                                        .reservation_operations
                                                        .length
                                                }
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                )}

                                {capabilities.canViewFinance && (
                                    <>
                                        <TabsTrigger
                                            value="finance"
                                            className="gap-1.5 text-xs"
                                        >
                                            <Wallet className="size-3.5" />
                                            <span>Settlements</span>
                                            {queues.financial_operations
                                                .length > 0 && (
                                                <Badge
                                                    variant="plum"
                                                    className="ml-0.5 px-1.5 py-0 text-[10px]"
                                                >
                                                    {
                                                        queues
                                                            .financial_operations
                                                            .length
                                                    }
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="payments"
                                            className="gap-1.5 text-xs"
                                        >
                                            <CreditCard className="size-3.5" />
                                            <span>Payments</span>
                                            {queues.payment_operations.length >
                                                0 && (
                                                <Badge
                                                    variant="outline"
                                                    className="ml-0.5 px-1.5 py-0 text-[10px]"
                                                >
                                                    {
                                                        queues
                                                            .payment_operations
                                                            .length
                                                    }
                                                </Badge>
                                            )}
                                        </TabsTrigger>
                                    </>
                                )}
                            </TabsList>

                            {capabilities.canViewProtection && (
                                <TabsContent
                                    value="protection"
                                    className="space-y-2.5"
                                >
                                    {queues.customer_protection.length === 0 ? (
                                        <EmptyQueueState message="Zero open customer protection or grievance issues pending." />
                                    ) : (
                                        queues.customer_protection.map(
                                            (item) => (
                                                <QueueItemRow
                                                    key={item.id}
                                                    heading={
                                                        item.case_reference
                                                    }
                                                    badges={
                                                        <>
                                                            <Badge
                                                                variant={
                                                                    item.priority ===
                                                                    'urgent'
                                                                        ? 'destructive'
                                                                        : 'outline'
                                                                }
                                                                className="text-[10px]"
                                                            >
                                                                {
                                                                    item.priority_label
                                                                }
                                                            </Badge>
                                                            {item.is_ack_overdue && (
                                                                <Badge
                                                                    variant="destructive"
                                                                    className="text-[10px]"
                                                                >
                                                                    Overdue 48h
                                                                    Ack
                                                                </Badge>
                                                            )}
                                                        </>
                                                    }
                                                    meta={`Guest: ${item.customer_name} · Property: ${item.property_name} · ${item.category_label}`}
                                                    actionUrl={item.action_url}
                                                    actionLabel="Resolve Case"
                                                />
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {capabilities.canViewProperties && (
                                <TabsContent
                                    value="properties"
                                    className="space-y-2.5"
                                >
                                    {queues.property_approval.length === 0 ? (
                                        <EmptyQueueState message="No properties currently awaiting verification review." />
                                    ) : (
                                        queues.property_approval.map((item) => (
                                            <QueueItemRow
                                                key={item.id}
                                                heading={item.property_name}
                                                badges={
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        {item.category} ·{' '}
                                                        {item.city}
                                                    </Badge>
                                                }
                                                meta={`Owner: ${item.owner_name} · Submitted: ${item.submitted_formatted}`}
                                                actionUrl={item.action_url}
                                                actionLabel="Review Property"
                                            />
                                        ))
                                    )}
                                </TabsContent>
                            )}

                            {capabilities.canViewPartners && (
                                <TabsContent
                                    value="partners"
                                    className="space-y-2.5"
                                >
                                    {queues.partner_onboarding.length === 0 ? (
                                        <EmptyQueueState message="No partner registrations or bank KYC reviews pending." />
                                    ) : (
                                        queues.partner_onboarding.map(
                                            (item) => (
                                                <QueueItemRow
                                                    key={item.id}
                                                    heading={item.name}
                                                    badges={
                                                        <Badge
                                                            variant="plum"
                                                            className="text-[10px]"
                                                        >
                                                            {item.badge}
                                                        </Badge>
                                                    }
                                                    meta={`${item.email} · ${item.business_name} · Applied: ${item.created_formatted}`}
                                                    actionUrl={item.action_url}
                                                    actionLabel="Verify Partner"
                                                />
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {capabilities.canViewReservations && (
                                <TabsContent
                                    value="reservations"
                                    className="space-y-2.5"
                                >
                                    {queues.reservation_operations.length ===
                                    0 ? (
                                        <EmptyQueueState message="All reservations are currently in steady state." />
                                    ) : (
                                        queues.reservation_operations.map(
                                            (item) => (
                                                <QueueItemRow
                                                    key={item.id}
                                                    heading={
                                                        item.booking_reference
                                                    }
                                                    badges={
                                                        <>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px]"
                                                            >
                                                                {
                                                                    item.status_label
                                                                }
                                                            </Badge>
                                                            {item.is_urgent && (
                                                                <Badge
                                                                    variant="destructive"
                                                                    className="text-[10px]"
                                                                >
                                                                    Action
                                                                    Required
                                                                </Badge>
                                                            )}
                                                        </>
                                                    }
                                                    meta={`Guest: ${item.guest_name} · ${item.property_name} (${item.city}) · ${item.stay_dates}`}
                                                    actionUrl={item.action_url}
                                                    actionLabel="View Booking"
                                                />
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {capabilities.canViewFinance && (
                                <TabsContent
                                    value="finance"
                                    className="space-y-2.5"
                                >
                                    {queues.financial_operations.length ===
                                    0 ? (
                                        <EmptyQueueState message="No partner settlements awaiting approval or release." />
                                    ) : (
                                        queues.financial_operations.map(
                                            (item) => (
                                                <QueueItemRow
                                                    key={item.id}
                                                    heading={item.reference}
                                                    badges={
                                                        <Badge
                                                            variant={
                                                                item.type ===
                                                                'failed_transfer'
                                                                    ? 'destructive'
                                                                    : 'plum'
                                                            }
                                                            className="text-[10px]"
                                                        >
                                                            {item.title}
                                                        </Badge>
                                                    }
                                                    meta={`Partner: ${item.partner_name} · Amount: ${item.amount_formatted}`}
                                                    actionUrl={item.action_url}
                                                    actionLabel="Manage Settlement"
                                                />
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {capabilities.canViewFinance && (
                                <TabsContent
                                    value="payments"
                                    className="space-y-2.5"
                                >
                                    {queues.payment_operations.length === 0 ? (
                                        <EmptyQueueState message="Zero failed customer payments or refund exceptions." />
                                    ) : (
                                        queues.payment_operations.map(
                                            (item) => (
                                                <QueueItemRow
                                                    key={item.id}
                                                    heading={item.title}
                                                    badges={
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[10px]"
                                                        >
                                                            {item.type ===
                                                            'failed_refund'
                                                                ? 'Refund Failed'
                                                                : 'Payment Failed'}
                                                        </Badge>
                                                    }
                                                    meta={`Amount: ${item.amount_formatted} · Customer: ${item.customer_name} · ${item.reason}`}
                                                    actionUrl={item.action_url}
                                                    actionLabel="Inspect Transaction"
                                                />
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* 5. Financial Overview (Finance & SuperAdmin only) */}
                {capabilities.canViewFinance && revenueBreakdown && (
                    <section
                        aria-label="Financial overview"
                        className="space-y-3"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="font-heading text-sm font-bold tracking-wide text-tijum-plum uppercase dark:text-foreground">
                                Financial Overview
                            </h2>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help items-center gap-1.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        <HelpCircle className="size-3.5 text-tijum-coral" />
                                        <span>
                                            Escrow &amp; Commission Disclosure
                                        </span>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm text-xs">
                                    {
                                        revenueBreakdown.definition_notes
                                            .revenue_disclosure
                                    }{' '}
                                    Customer payments flow into RBI-regulated
                                    escrow and net payouts settle to verified
                                    partner accounts.
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label="Gross Booking Value"
                                value={formatInr(
                                    revenueBreakdown.gross_booking_value_minor,
                                )}
                                helperText={`Escrow receipts: ${formatInr(revenueBreakdown.captured_payment_amount_minor)}`}
                                icon={DollarSign}
                            />
                            <StatCard
                                label="TIJUM Platform Revenue"
                                value={formatInr(
                                    revenueBreakdown.commission_earned_minor,
                                )}
                                helperText={`+18% GST: ${formatInr(revenueBreakdown.commission_gst_minor)}`}
                                icon={Percent}
                                className="ring-1 ring-tijum-coral/35 dark:ring-tijum-coral/40"
                            />
                            <StatCard
                                label="Net Partner Payable"
                                value={formatInr(
                                    revenueBreakdown.net_partner_payable_minor,
                                )}
                                helperText={`Transferred: ${formatInr(revenueBreakdown.completed_transfers_minor)}`}
                                icon={Wallet}
                            />
                            <StatCard
                                label="Refunds & Subsidies"
                                value={formatInr(
                                    revenueBreakdown.completed_refunds_minor,
                                )}
                                helperText={`Relocation subsidies: ${formatInr(revenueBreakdown.relocation_subsidies_minor)}`}
                                icon={Receipt}
                            />
                        </div>
                    </section>
                )}

                {/* 6. Booking Trends & City Distribution */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                    <TrendingUp className="size-4 text-tijum-coral" />
                                    <span>Booking Activity Trends</span>
                                </CardTitle>
                                <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                >
                                    {filterMetadata.range_label}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Daily new reservations created during the
                                selected period.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {trends.length === 0 ? (
                                <div className="py-10 text-center text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    No booking activity recorded for this
                                    period.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex h-36 items-end gap-1.5 border-b border-tijum-surface/80 pt-6 pb-2 dark:border-border">
                                        {trends.map((point) => {
                                            const heightPct = Math.round(
                                                (point.bookings_count /
                                                    maxTrendBooking) *
                                                    100,
                                            );
                                            return (
                                                <div
                                                    key={point.date}
                                                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                                >
                                                    <div className="absolute -top-10 z-10 hidden rounded-lg border border-tijum-surface/20 bg-tijum-plum px-2.5 py-1 text-[10px] whitespace-nowrap text-tijum-cream shadow-md group-hover:block dark:border-border dark:bg-card dark:text-foreground">
                                                        {point.formatted_date}:{' '}
                                                        {point.bookings_count}{' '}
                                                        bookings (₹
                                                        {(
                                                            point.payments_amount_minor /
                                                            100
                                                        ).toLocaleString(
                                                            'en-IN',
                                                        )}
                                                        )
                                                    </div>
                                                    <div
                                                        style={{
                                                            height: `${Math.max(heightPct, 6)}%`,
                                                        }}
                                                        className="w-full rounded-t-md bg-tijum-coral/80 transition-all hover:bg-tijum-coral"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-tijum-plum-muted dark:text-muted-foreground">
                                        <span>{trends[0]?.formatted_date}</span>
                                        <span>
                                            {
                                                trends[trends.length - 1]
                                                    ?.formatted_date
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                <MapPin className="size-4 text-tijum-coral" />
                                <span>City Distribution</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Activity across operating cities.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-2.5">
                            {cityDistribution.map((city) => (
                                <div
                                    key={city.city_id}
                                    className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            {city.city_name}
                                        </span>
                                        <Badge
                                            variant="plum"
                                            className="text-[10px]"
                                        >
                                            {city.active_properties} stays
                                        </Badge>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        <span>
                                            Bookings:{' '}
                                            <strong className="tabular-nums text-tijum-plum dark:text-foreground">
                                                {city.bookings_count}
                                            </strong>
                                        </span>
                                        <span>
                                            Volume:{' '}
                                            <strong className="tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatInr(
                                                    city.payments_amount_minor,
                                                )}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* 7. Recent Activity & System Health */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                <Activity className="size-4 text-tijum-coral" />
                                <span>Recent Activity</span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                                {recentActivities.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        No recent marketplace activities.
                                    </div>
                                ) : (
                                    recentActivities.map((act) => (
                                        <div
                                            key={act.id}
                                            className="flex items-start justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/30 p-3 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/60 dark:border-border dark:bg-muted/40 dark:hover:bg-muted/70"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                        {act.title}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[9px]"
                                                    >
                                                        {act.reference}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    {act.description}
                                                </p>
                                                <p className="text-[10px] text-tijum-plum-muted dark:text-muted-foreground">
                                                    {act.actor_label} ·{' '}
                                                    {act.created_formatted}
                                                </p>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                                className="h-8 shrink-0 text-xs"
                                            >
                                                <Link href={act.action_url}>
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                    <Server className="size-4 text-tijum-coral" />
                                    <span>System Health</span>
                                </CardTitle>
                                <Badge
                                    variant={
                                        systemHealth.overall_status ===
                                        'healthy'
                                            ? 'food'
                                            : systemHealth.overall_status ===
                                                'warning'
                                              ? 'peach'
                                              : 'destructive'
                                    }
                                    className="text-[10px]"
                                >
                                    {systemHealth.overall_status.toUpperCase()}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Queues, schedulers &amp; payment gateways.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-2.5">
                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        Background Queue
                                    </span>
                                    <span
                                        className={
                                            systemHealth.queue
                                                .failed_jobs_count > 0
                                                ? 'font-bold text-status-error-fg'
                                                : 'font-medium text-status-success-fg'
                                        }
                                    >
                                        {systemHealth.queue.failed_jobs_count >
                                        0
                                            ? `${systemHealth.queue.failed_jobs_count} Failed`
                                            : 'Operational'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Pending tasks:{' '}
                                    {systemHealth.queue.pending_jobs_count}
                                </p>
                            </div>

                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        Payment Webhooks
                                    </span>
                                    <span
                                        className={
                                            systemHealth.webhooks.failed_count >
                                            0
                                                ? 'font-bold text-status-error-fg'
                                                : 'font-medium text-status-success-fg'
                                        }
                                    >
                                        {systemHealth.webhooks.failed_count > 0
                                            ? `${systemHealth.webhooks.failed_count} Failed`
                                            : 'Healthy'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Processed:{' '}
                                    {systemHealth.webhooks.processed_count} ·
                                    Pending:{' '}
                                    {systemHealth.webhooks.pending_count}
                                </p>
                            </div>

                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        Scheduler
                                    </span>
                                    <span
                                        className={
                                            systemHealth.scheduler.status ===
                                            'healthy'
                                                ? 'font-medium text-status-success-fg'
                                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                                        }
                                    >
                                        {systemHealth.scheduler.status ===
                                        'healthy'
                                            ? 'Active'
                                            : 'Standby'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    {systemHealth.scheduler.message}
                                </p>
                            </div>

                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        Razorpay Route
                                    </span>
                                    <span className="font-mono text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        {systemHealth.providers.gateway_mode.toUpperCase()}{' '}
                                        MODE
                                    </span>
                                </div>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Transfers:{' '}
                                    {systemHealth.providers.route_enabled
                                        ? 'Enabled'
                                        : 'Gated (Safe)'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Overview', href: '/admin/dashboard' }],
};
