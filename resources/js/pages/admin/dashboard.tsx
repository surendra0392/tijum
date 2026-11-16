import { Head, Link, router } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    Calendar,
    CalendarCheck,
    CheckCircle2,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    FileSpreadsheet,
    FileText,
    HelpCircle,
    Info,
    KeyRound,
    Layers,
    LifeBuoy,
    Lock,
    MapPin,
    Percent,
    Receipt,
    RefreshCw,
    Search,
    Server,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    TrendingUp,
    UserCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
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

export default function AdminDashboard({
    filters,
    filterMetadata,
    marketplaceOverview,
    reservationMetrics,
    paymentMetrics,
    revenueBreakdown,
    customerProtectionMetrics,
    financialOperations,
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
    // Search state
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

    // Filter controls state
    const [selectedRange, setSelectedRange] = useState(filters.range);
    const [selectedCity, setSelectedCity] = useState(
        filters.city_id ? String(filters.city_id) : 'all',
    );
    const [selectedCategory, setSelectedCategory] = useState(
        filters.category_id ? String(filters.category_id) : 'all',
    );
    const [customFrom, setCustomFrom] = useState(filters.from ?? '');
    const [customTo, setCustomTo] = useState(filters.to ?? '');

    // Debounced search
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

    // Close search dropdown on click outside
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

    // Apply filters via Inertia visit
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

    const formatCurrency = (minor: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(minor / 100);
    };

    // Calculate maximum trend value for scale
    const maxTrendBooking = Math.max(...trends.map((t) => t.bookings_count), 1);

    const hasSearchResults =
        searchResults &&
        Object.values(searchResults).some((arr) => arr.length > 0);

    return (
        <TooltipProvider>
            <Head title="Operations Command Centre" />

            <div className="space-y-6 pb-12">
                {/* 1. Deep Plum Executive Command Hero + Global Search */}
                <section className="relative overflow-hidden rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-soft sm:p-8 dark:border dark:border-border dark:bg-[#2b1b29]">
                    <div
                        className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-tijum-coral/15 blur-3xl"
                        aria-hidden="true"
                    />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-heading text-[11px] font-semibold tracking-[0.14em] text-tijum-peach uppercase">
                                    <span className="inline-flex size-2 animate-pulse rounded-full bg-emerald-400" />
                                    Marketplace Command Centre
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
                                        recovery codes
                                    </span>
                                </span>
                            </div>

                            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                Operations &amp; Administration
                            </h1>
                            <p className="text-sm leading-relaxed text-tijum-cream/85">
                                Central operational oversight across Hyderabad,
                                Guntur, Vijayawada, and Visakhapatnam.
                            </p>
                        </div>

                        {/* Global Search Bar */}
                        <div
                            className="relative w-full lg:max-w-md"
                            ref={searchRef}
                        >
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-cream/70"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    placeholder="Search booking ref, case, partner, property..."
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

                            {/* Search Results Dropdown */}
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

                {/* Filters & Export Toolbar */}
                <Card className="py-4">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Date Range Selector */}
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
                                    <SelectTrigger className="h-9.5 w-[145px] rounded-xl text-xs font-medium">
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

                            {/* Custom Date Inputs */}
                            {selectedRange === 'custom' && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Input
                                        type="date"
                                        value={customFrom}
                                        onChange={(e) =>
                                            setCustomFrom(e.target.value)
                                        }
                                        className="h-9.5 w-36 rounded-xl text-xs"
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
                                        className="h-9.5 w-36 rounded-xl text-xs"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => applyFilters('custom')}
                                        className="h-9.5 text-xs"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            )}

                            {/* City Filter */}
                            <div className="flex items-center gap-1.5">
                                <MapPin className="size-4 text-tijum-coral" />
                                <Select
                                    value={selectedCity}
                                    onValueChange={(val) => {
                                        setSelectedCity(val);
                                        applyFilters(undefined, val);
                                    }}
                                >
                                    <SelectTrigger className="h-9.5 w-[135px] rounded-xl text-xs font-medium">
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

                            {/* Category Filter */}
                            <div className="flex items-center gap-1.5">
                                <Building2 className="size-4 text-tijum-coral" />
                                <Select
                                    value={selectedCategory}
                                    onValueChange={(val) => {
                                        setSelectedCategory(val);
                                        applyFilters(undefined, undefined, val);
                                    }}
                                >
                                    <SelectTrigger className="h-9.5 w-[145px] rounded-xl text-xs font-medium">
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

                        {/* CSV Export & Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Period:{' '}
                                <strong className="font-semibold text-tijum-plum dark:text-foreground">
                                    {filterMetadata.period_start_formatted} –{' '}
                                    {filterMetadata.period_end_formatted}
                                </strong>
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9.5 gap-1.5 text-xs font-semibold"
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

                {/* 2. Primary Marketplace Overview KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="py-5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Active Properties
                            </CardTitle>
                            <span className="flex size-9 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <Building2 className="size-4" />
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="font-heading text-3xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                {marketplaceOverview.active_properties}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                <span>
                                    Awaiting Review:{' '}
                                    <strong className="text-tijum-plum dark:text-foreground">
                                        {marketplaceOverview.pending_properties}
                                    </strong>
                                </span>
                                {marketplaceOverview.suspended_properties >
                                    0 && (
                                    <span className="font-medium text-status-error-fg">
                                        Suspended:{' '}
                                        {
                                            marketplaceOverview.suspended_properties
                                        }
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="py-5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Verified Partners
                            </CardTitle>
                            <span className="flex size-9 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <UserCheck className="size-4" />
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="font-heading text-3xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                {marketplaceOverview.verified_partners}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                <span>
                                    Pending Verification:{' '}
                                    <strong className="text-tijum-plum dark:text-foreground">
                                        {marketplaceOverview.pending_partners}
                                    </strong>
                                </span>
                                <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                >
                                    Independent
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="py-5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Marketplace Guests
                            </CardTitle>
                            <span className="flex size-9 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <Users className="size-4" />
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="font-heading text-3xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                {marketplaceOverview.total_customers}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                <span>
                                    Active / Verified:{' '}
                                    <strong className="text-tijum-plum dark:text-foreground">
                                        {marketplaceOverview.active_customers}
                                    </strong>
                                </span>
                                <span className="text-[11px] font-medium text-status-success-fg">
                                    KYC / Email Verified
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="py-5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Reservations (Period)
                            </CardTitle>
                            <span className="flex size-9 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <CalendarCheck className="size-4" />
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="font-heading text-3xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                {reservationMetrics.new_in_period}
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                <span className="font-medium text-status-success-fg">
                                    Confirmed:{' '}
                                    {reservationMetrics.confirmed_in_period}
                                </span>
                                <span>
                                    Awaiting:{' '}
                                    {reservationMetrics.awaiting_payment}
                                </span>
                                <span>
                                    Cancelled:{' '}
                                    {reservationMetrics.cancelled_in_period}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Operational Attention Queues (Core Command Centre) */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                                    <AlertCircle className="size-5 text-tijum-coral" />
                                    <span>Operational Attention Queues</span>
                                </CardTitle>
                                <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Pending tasks requiring administrator
                                    review, verification, or customer
                                    assistance.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6">
                        <Tabs
                            defaultValue={
                                queues.customer_protection.length > 0
                                    ? 'protection'
                                    : 'properties'
                            }
                            className="w-full"
                        >
                            <TabsList
                                variant="pill"
                                label="Operational Attention Queues"
                                className="mb-5"
                            >
                                {capabilities.canViewProtection && (
                                    <TabsTrigger
                                        value="protection"
                                        className="gap-1.5 text-xs"
                                    >
                                        <ShieldAlert className="size-3.5" />
                                        <span>Customer Protection</span>
                                        {queues.customer_protection.length >
                                            0 && (
                                            <Badge
                                                variant="plum"
                                                className="ml-1 px-1.5 py-0 text-[10px]"
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
                                        <span>Property Approvals</span>
                                        {queues.property_approval.length >
                                            0 && (
                                            <Badge
                                                variant="outline"
                                                className="ml-1 px-1.5 py-0 text-[10px]"
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
                                        <span>Partner Onboarding</span>
                                        {queues.partner_onboarding.length >
                                            0 && (
                                            <Badge
                                                variant="outline"
                                                className="ml-1 px-1.5 py-0 text-[10px]"
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
                                        <span>Reservations Oversight</span>
                                        {queues.reservation_operations.length >
                                            0 && (
                                            <Badge
                                                variant="outline"
                                                className="ml-1 px-1.5 py-0 text-[10px]"
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
                                            <span>
                                                Settlements &amp; Transfers
                                            </span>
                                            {queues.financial_operations
                                                .length > 0 && (
                                                <Badge
                                                    variant="plum"
                                                    className="ml-1 px-1.5 py-0 text-[10px]"
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
                                            <span>Payment Exceptions</span>
                                            {queues.payment_operations.length >
                                                0 && (
                                                <Badge
                                                    variant="outline"
                                                    className="ml-1 px-1.5 py-0 text-[10px]"
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

                            {/* Customer Protection Queue */}
                            {capabilities.canViewProtection && (
                                <TabsContent
                                    value="protection"
                                    className="space-y-2.5"
                                >
                                    {queues.customer_protection.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
                                            Zero open customer protection or
                                            grievance issues pending.
                                        </div>
                                    ) : (
                                        queues.customer_protection.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                {
                                                                    item.case_reference
                                                                }
                                                            </span>
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
                                                        </div>
                                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                            Guest:{' '}
                                                            <strong className="text-tijum-plum dark:text-foreground">
                                                                {
                                                                    item.customer_name
                                                                }
                                                            </strong>{' '}
                                                            • Property:{' '}
                                                            {item.property_name}{' '}
                                                            • Category:{' '}
                                                            {
                                                                item.category_label
                                                            }
                                                        </p>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        className="shrink-0 text-xs font-semibold"
                                                    >
                                                        <Link
                                                            href={
                                                                item.action_url
                                                            }
                                                        >
                                                            <span>
                                                                Resolve Case
                                                            </span>
                                                            <ChevronRight className="ml-1 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {/* Property Approvals Queue */}
                            {capabilities.canViewProperties && (
                                <TabsContent
                                    value="properties"
                                    className="space-y-2.5"
                                >
                                    {queues.property_approval.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
                                            No properties currently awaiting
                                            verification review.
                                        </div>
                                    ) : (
                                        queues.property_approval.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                            {item.property_name}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            {item.category} in{' '}
                                                            {item.city}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Owner:{' '}
                                                        {item.owner_name} •
                                                        Submitted:{' '}
                                                        {
                                                            item.submitted_formatted
                                                        }
                                                    </p>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                    className="shrink-0 text-xs font-semibold"
                                                >
                                                    <Link
                                                        href={item.action_url}
                                                    >
                                                        <span>
                                                            Review Property
                                                        </span>
                                                        <ChevronRight className="ml-1 size-3.5" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </TabsContent>
                            )}

                            {/* Partner Onboarding Queue */}
                            {capabilities.canViewPartners && (
                                <TabsContent
                                    value="partners"
                                    className="space-y-2.5"
                                >
                                    {queues.partner_onboarding.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
                                            No partner registrations or bank KYC
                                            reviews pending.
                                        </div>
                                    ) : (
                                        queues.partner_onboarding.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                {item.name}
                                                            </span>
                                                            <Badge
                                                                variant="plum"
                                                                className="text-[10px]"
                                                            >
                                                                {item.badge}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                            {item.email} •{' '}
                                                            {item.business_name}{' '}
                                                            • Applied:{' '}
                                                            {
                                                                item.created_formatted
                                                            }
                                                        </p>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        className="shrink-0 text-xs font-semibold"
                                                    >
                                                        <Link
                                                            href={
                                                                item.action_url
                                                            }
                                                        >
                                                            <span>
                                                                Verify Partner
                                                            </span>
                                                            <ChevronRight className="ml-1 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {/* Reservations Queue */}
                            {capabilities.canViewReservations && (
                                <TabsContent
                                    value="reservations"
                                    className="space-y-2.5"
                                >
                                    {queues.reservation_operations.length ===
                                    0 ? (
                                        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
                                            All reservations are currently in
                                            steady state.
                                        </div>
                                    ) : (
                                        queues.reservation_operations.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                {
                                                                    item.booking_reference
                                                                }
                                                            </span>
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
                                                        </div>
                                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                            Guest:{' '}
                                                            {item.guest_name} •
                                                            Property:{' '}
                                                            {item.property_name}{' '}
                                                            ({item.city}) •
                                                            Stay:{' '}
                                                            {item.stay_dates}
                                                        </p>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        className="shrink-0 text-xs font-semibold"
                                                    >
                                                        <Link
                                                            href={
                                                                item.action_url
                                                            }
                                                        >
                                                            <span>
                                                                View Booking
                                                            </span>
                                                            <ChevronRight className="ml-1 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {/* Settlements Queue */}
                            {capabilities.canViewFinance && (
                                <TabsContent
                                    value="finance"
                                    className="space-y-2.5"
                                >
                                    {queues.financial_operations.length ===
                                    0 ? (
                                        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
                                            No partner settlements awaiting
                                            approval or release.
                                        </div>
                                    ) : (
                                        queues.financial_operations.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                {item.reference}
                                                            </span>
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
                                                        </div>
                                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                            Partner:{' '}
                                                            <strong className="text-tijum-plum dark:text-foreground">
                                                                {
                                                                    item.partner_name
                                                                }
                                                            </strong>{' '}
                                                            • Amount:{' '}
                                                            <strong className="tabular-nums text-tijum-plum dark:text-foreground">
                                                                {
                                                                    item.amount_formatted
                                                                }
                                                            </strong>
                                                        </p>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        className="shrink-0 text-xs font-semibold"
                                                    >
                                                        <Link
                                                            href={
                                                                item.action_url
                                                            }
                                                        >
                                                            <span>
                                                                Manage
                                                                Settlement
                                                            </span>
                                                            <ChevronRight className="ml-1 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}

                            {/* Payment Exceptions Queue */}
                            {capabilities.canViewFinance && (
                                <TabsContent
                                    value="payments"
                                    className="space-y-2.5"
                                >
                                    {queues.payment_operations.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-tijum-surface/90 bg-tijum-cream/35 py-8 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/35 dark:text-muted-foreground">
                                            Zero failed customer payments or
                                            refund exceptions.
                                        </div>
                                    ) : (
                                        queues.payment_operations.map(
                                            (item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/65 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/45 dark:hover:bg-muted/75"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                                {item.title}
                                                            </span>
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-[10px]"
                                                            >
                                                                {item.type ===
                                                                'failed_refund'
                                                                    ? 'Refund Failed'
                                                                    : 'Payment Failed'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                            Amount:{' '}
                                                            <strong className="tabular-nums text-tijum-plum dark:text-foreground">
                                                                {
                                                                    item.amount_formatted
                                                                }
                                                            </strong>{' '}
                                                            • Customer:{' '}
                                                            {item.customer_name}{' '}
                                                            • Reason:{' '}
                                                            {item.reason}
                                                        </p>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        className="shrink-0 text-xs font-semibold"
                                                    >
                                                        <Link
                                                            href={
                                                                item.action_url
                                                            }
                                                        >
                                                            <span>
                                                                Inspect
                                                                Transaction
                                                            </span>
                                                            <ChevronRight className="ml-1 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ),
                                        )
                                    )}
                                </TabsContent>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* 4. Financial Transparency & Marketplace Revenue (Finance & SuperAdmin only) */}
                {capabilities.canViewFinance && revenueBreakdown && (
                    <div className="space-y-4">
                        <Card className="border-l-4 border-l-tijum-coral py-4">
                            <CardContent className="flex items-start gap-3 px-5">
                                <Info className="mt-0.5 size-5 shrink-0 text-tijum-coral" />
                                <div className="space-y-1 text-xs leading-relaxed text-tijum-plum dark:text-foreground">
                                    <strong className="font-heading font-bold">
                                        Marketplace Revenue Transparency:
                                    </strong>{' '}
                                    {
                                        revenueBreakdown.definition_notes
                                            .revenue_disclosure
                                    }{' '}
                                    All funds collected from guests flow into
                                    Razorpay RBI-regulated escrow, and net host
                                    payouts are settled via approved linked
                                    accounts.
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Gross Customer Booking Value */}
                            <Card className="py-5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Gross Booking Value
                                        </CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                                Total price of accommodation
                                                booked by guests in the selected
                                                period. This is NOT platform
                                                revenue.
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <DollarSign className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                        {formatCurrency(
                                            revenueBreakdown.gross_booking_value_minor,
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Customer Escrow Receipts:{' '}
                                        {formatCurrency(
                                            revenueBreakdown.captured_payment_amount_minor,
                                        )}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* TIJUM Commission Earned */}
                            <Card className="py-5 ring-1 ring-tijum-coral/35 dark:ring-tijum-coral/40">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-coral uppercase">
                                            TIJUM Platform Revenue
                                        </CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="size-3.5 text-tijum-coral" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                                Contractual marketplace
                                                commission earned on confirmed
                                                &amp; completed guest stays.
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Percent className="size-4 text-tijum-coral" />
                                </CardHeader>
                                <CardContent>
                                    <div className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                        {formatCurrency(
                                            revenueBreakdown.commission_earned_minor,
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        +18% Commission GST:{' '}
                                        {formatCurrency(
                                            revenueBreakdown.commission_gst_minor,
                                        )}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Net Partner Payable */}
                            <Card className="py-5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Net Partner Payable
                                        </CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                                Accommodation payout due to
                                                partners after contractual
                                                commission, GST, and Section
                                                393(1) TDS withholdings.
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Wallet className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                        {formatCurrency(
                                            revenueBreakdown.net_partner_payable_minor,
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Completed Transfers:{' '}
                                        {formatCurrency(
                                            revenueBreakdown.completed_transfers_minor,
                                        )}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Subsidies & Refunds */}
                            <Card className="py-5">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-1.5">
                                        <CardTitle className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Refunds &amp; Subsidies
                                        </CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                                Customer refunds processed plus
                                                TIJUM platform price-guarantee
                                                relocation subsidies incurred.
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Receipt className="size-4 text-tijum-plum-muted dark:text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                        {formatCurrency(
                                            revenueBreakdown.completed_refunds_minor,
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Relocation Subsidies:{' '}
                                        {formatCurrency(
                                            revenueBreakdown.relocation_subsidies_minor,
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* 5. Performance Trends & City Distribution */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Activity Trends Visualizer */}
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
                                <div className="py-12 text-center text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    No booking activity recorded for this
                                    period.
                                </div>
                            ) : (
                                <div className="space-y-4">
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
                                        <span>Mid-period</span>
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

                    {/* Launch Cities Distribution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                <MapPin className="size-4 text-tijum-coral" />
                                <span>City Distribution</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Activity across launch cities.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {cityDistribution.map((city) => (
                                <div
                                    key={city.city_id}
                                    className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3.5 dark:border-border dark:bg-muted/45"
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
                                    <div className="mt-2 flex items-center justify-between text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        <span>
                                            Bookings:{' '}
                                            <strong className="tabular-nums text-tijum-plum dark:text-foreground">
                                                {city.bookings_count}
                                            </strong>
                                        </span>
                                        <span>
                                            Volume:{' '}
                                            <strong className="tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatCurrency(
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

                {/* 6. Activity Feed & System Health Side-by-Side */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Real Domain Activity Feed */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                    <Activity className="size-4 text-tijum-coral" />
                                    <span>Recent Operational Activity</span>
                                </CardTitle>
                                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Real domain events
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
                                {recentActivities.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        No recent marketplace activities.
                                    </div>
                                ) : (
                                    recentActivities.map((act) => (
                                        <div
                                            key={act.id}
                                            className="flex items-start justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/30 p-3.5 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/60 dark:border-border dark:bg-muted/40 dark:hover:bg-muted/70"
                                        >
                                            <div className="space-y-1">
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
                                                <div className="flex items-center gap-2 text-[10px] text-tijum-plum-muted dark:text-muted-foreground">
                                                    <span>
                                                        Actor: {act.actor_label}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {act.created_formatted}
                                                    </span>
                                                </div>
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

                    {/* System & Scheduled Operations Health */}
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
                                Automated queues, schedulers &amp; webhooks.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {/* Queue Worker Status */}
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
                                    Pending tasks in queue:{' '}
                                    {systemHealth.queue.pending_jobs_count}
                                </p>
                            </div>

                            {/* Webhooks Processing */}
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
                                    {systemHealth.webhooks.processed_count} •
                                    Pending:{' '}
                                    {systemHealth.webhooks.pending_count}
                                </p>
                            </div>

                            {/* Scheduler Heartbeat */}
                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        Scheduler Heartbeat
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

                            {/* Provider Settlement Gateway */}
                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        Razorpay Route Payouts
                                    </span>
                                    <span className="font-mono text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        {systemHealth.providers.gateway_mode.toUpperCase()}{' '}
                                        MODE
                                    </span>
                                </div>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Route Transfers:{' '}
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

AdminDashboard.layout = (page: React.ReactNode) => (
    <AdminLayout
        breadcrumbs={[
            {
                title: 'Operations Dashboard',
                href: '/admin/dashboard',
            },
        ]}
    >
        {page}
    </AdminLayout>
);
