import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    Clock,
    Coins,
    HelpCircle,
    Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type {
    BreadcrumbItem,
    CustomerPointsWallet,
    PointsLedgerEntry,
} from '@/types';

interface Props {
    wallet: CustomerPointsWallet;
    ledger:
        | {
              data: PointsLedgerEntry[];
              current_page?: number;
              last_page?: number;
              total?: number;
          }
        | PointsLedgerEntry[];
}

function formatDateSafe(val?: string | null): string {
    if (!val) return '—';
    try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
    } catch {
        return String(val);
    }
}

export default function PointsWalletPage({ wallet, ledger }: Props) {
    const [filter, setFilter] = useState<
        'all' | 'earned' | 'redeemed' | 'expired' | 'pending'
    >('all');
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const entries: PointsLedgerEntry[] = Array.isArray(ledger)
        ? ledger
        : (ledger?.data ?? []);

    const filteredEntries = useMemo(() => {
        if (filter === 'all') return entries;
        if (filter === 'earned') {
            return entries.filter((e) => {
                const isCred = (e as unknown as Record<string, unknown>)
                    .is_credit;
                if (typeof isCred === 'boolean') return isCred;
                const rawType = String(
                    e.transaction_type ??
                        (e as unknown as Record<string, unknown>).type ??
                        '',
                ).toLowerCase();
                return (
                    rawType.includes('earned') ||
                    rawType.includes('bonus') ||
                    rawType.includes('credit') ||
                    rawType.includes('reverse') ||
                    e.points > 0
                );
            });
        }
        if (filter === 'redeemed') {
            return entries.filter((e) => {
                const isDeb = (e as unknown as Record<string, unknown>)
                    .is_debit;
                if (typeof isDeb === 'boolean') return isDeb;
                const rawType = String(
                    e.transaction_type ??
                        (e as unknown as Record<string, unknown>).type ??
                        '',
                ).toLowerCase();
                return (
                    rawType.includes('redeem') ||
                    rawType.includes('debit') ||
                    e.points < 0
                );
            });
        }
        if (filter === 'expired') {
            return entries.filter((e) => {
                const rawType = String(
                    e.transaction_type ??
                        (e as unknown as Record<string, unknown>).type ??
                        '',
                ).toLowerCase();
                return rawType.includes('expire') || e.status === 'expired';
            });
        }
        if (filter === 'pending') {
            return entries.filter((e) => e.status === 'pending');
        }
        return entries;
    }, [entries, filter]);

    const isServerPaginated =
        !Array.isArray(ledger) && (ledger?.last_page ?? 1) > 1;
    const totalClientPages = Math.max(
        1,
        Math.ceil(filteredEntries.length / pageSize),
    );
    const safePage = Math.min(page, totalClientPages);
    const pagedEntries = isServerPaginated
        ? filteredEntries
        : filteredEntries.slice((safePage - 1) * pageSize, safePage * pageSize);

    const handlePageChange = (nextPage: number) => {
        if (isServerPaginated) {
            router.get(
                '/rewards/points',
                { page: nextPage },
                { preserveScroll: true },
            );
            return;
        }
        setPage(nextPage);
    };

    const maxRedemptionPercentage = wallet?.max_redemption_percentage ?? 20;

    const totalEarned =
        wallet?.total_earned_points ??
        (wallet as unknown as Record<string, unknown>)?.total_points_earned ??
        0;
    const totalRedeemed =
        wallet?.total_redeemed_points ??
        (wallet as unknown as Record<string, unknown>)?.redeemed_points ??
        0;

    return (
        <>
            <Head title="Loyalty Points Wallet & Ledger — TIJUM" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="space-y-8 pb-12">
                    <PageHeader
                        eyebrow="Rewards & Loyalty"
                        title="Loyalty Points Wallet"
                        description="Every point converts cleanly at checkout (1 pt = ₹1). Accruals qualify automatically after verified stay checkout."
                        actions={
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/rewards/referrals">
                                    <Sparkles
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Earn More via Referrals</span>
                                </Link>
                            </Button>
                        }
                    />

                    {/* Balances Card Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-tijum-peach/70 dark:border-tijum-coral/35">
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide text-tijum-coral uppercase">
                                    Available Balance
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold tabular-nums">
                                    {wallet?.available_points?.toLocaleString() ??
                                        0}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Equivalent Value:</span>
                                    <span className="font-heading font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                                        ₹
                                        {(
                                            wallet?.estimated_inr_value ??
                                            wallet?.available_points ??
                                            0
                                        ).toLocaleString()}
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Redeem up to {maxRedemptionPercentage}% on
                                    any stay checkout.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide uppercase">
                                    Pending Verification
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold tabular-nums">
                                    {wallet?.pending_points?.toLocaleString() ??
                                        0}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                                    <span>Qualifies on stay checkout</span>
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Credited once stay checkout is confirmed.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-rose-200 dark:border-rose-900/60">
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide text-rose-700 uppercase dark:text-rose-300">
                                    Expiring in 30 Days
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold text-rose-700 tabular-nums dark:text-rose-400">
                                    {wallet?.expiring_points_30d?.toLocaleString() ??
                                        0}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <AlertCircle className="size-3.5 text-rose-500" />
                                    <span>FEFO (First-Expiring Out)</span>
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Book before expiry to preserve credit.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide uppercase">
                                    Lifetime Stats
                                </CardDescription>
                                <div className="space-y-1 pt-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Total Earned:
                                        </span>
                                        <span className="font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                                            +
                                            {Number(
                                                totalEarned,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Total Redeemed:
                                        </span>
                                        <span className="font-bold text-foreground tabular-nums">
                                            -
                                            {Number(
                                                totalRedeemed,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <p className="text-[11px] text-muted-foreground">
                                    Points remain active for 365 days per grant.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ledger & Transactions */}
                    <div className="space-y-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="font-heading text-xl font-bold text-foreground">
                                    Transaction History
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Detailed double-entry audit trail of all
                                    points events.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 rounded-xl border border-tijum-surface/80 bg-white p-1 dark:border-border dark:bg-card">
                                {(
                                    [
                                        { key: 'all', label: 'All' },
                                        { key: 'earned', label: 'Earned' },
                                        { key: 'redeemed', label: 'Redeemed' },
                                        { key: 'pending', label: 'Pending' },
                                        { key: 'expired', label: 'Expired' },
                                    ] as const
                                ).map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setFilter(tab.key)}
                                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition ${
                                            filter === tab.key
                                                ? 'bg-tijum-plum text-tijum-cream shadow-2xs dark:bg-tijum-coral dark:text-white'
                                                : 'text-muted-foreground hover:bg-tijum-cream hover:text-foreground dark:hover:bg-accent'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredEntries.length === 0 ? (
                            <div className="rounded-[22px] border border-dashed border-tijum-surface/80 bg-white p-12 text-center dark:border-border dark:bg-card">
                                <Coins className="mx-auto size-10 text-muted-foreground/40" />
                                <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
                                    No records found
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {filter === 'all'
                                        ? 'You do not have any points transactions yet.'
                                        : `No ${filter} transactions matching this filter.`}
                                </p>
                                {filter !== 'all' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => setFilter('all')}
                                    >
                                        Reset Filter
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[22px] border border-tijum-surface/80 bg-white shadow-tijum-card dark:border-border dark:bg-card">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-tijum-surface/80 bg-tijum-cream/60 font-heading font-semibold text-muted-foreground dark:border-border dark:bg-muted/50">
                                            <tr>
                                                <th className="py-3.5 pr-4 pl-6">
                                                    Date
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Transaction
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Reference
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Expiry Date
                                                </th>
                                                <th className="py-3.5 pr-6 pl-4 text-right">
                                                    Points / Value
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-tijum-surface/70 dark:divide-border">
                                            {pagedEntries.map((item) => {
                                                const rawType = String(
                                                    item.transaction_type ??
                                                        (
                                                            item as unknown as Record<
                                                                string,
                                                                unknown
                                                            >
                                                        ).type ??
                                                        '',
                                                ).toLowerCase();
                                                const isCredit =
                                                    (
                                                        item as unknown as Record<
                                                            string,
                                                            unknown
                                                        >
                                                    ).is_credit === true ||
                                                    rawType.includes(
                                                        'earned',
                                                    ) ||
                                                    rawType.includes('bonus') ||
                                                    rawType.includes(
                                                        'credit',
                                                    ) ||
                                                    rawType.includes(
                                                        'reverse',
                                                    ) ||
                                                    item.points > 0;
                                                const pointsVal = Math.abs(
                                                    item.points || 0,
                                                );
                                                const inrVal =
                                                    item.inr_value_minor
                                                        ? item.inr_value_minor /
                                                          100
                                                        : pointsVal;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="transition hover:bg-tijum-cream/35 dark:hover:bg-muted/30"
                                                    >
                                                        <td className="py-3.5 pr-4 pl-6 whitespace-nowrap text-muted-foreground">
                                                            {formatDateSafe(
                                                                item.created_at,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-medium text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                {isCredit ? (
                                                                    <ArrowDownLeft className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                                ) : (
                                                                    <ArrowUpRight className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                                                                )}
                                                                <span>
                                                                    {item.description ||
                                                                        item.type_label ||
                                                                        'Points Activity'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                                                            {item.reference_code ??
                                                                '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] capitalize ${
                                                                    item.status ===
                                                                    'available'
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                        : item.status ===
                                                                            'pending'
                                                                          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                                          : item.status ===
                                                                              'redeemed'
                                                                            ? 'border-tijum-peach bg-tijum-peach/20 text-tijum-plum dark:border-tijum-coral/40 dark:bg-tijum-coral/15 dark:text-tijum-peach'
                                                                            : 'border-tijum-surface bg-tijum-cream text-muted-foreground dark:border-border dark:bg-muted'
                                                                }`}
                                                            >
                                                                {item.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-muted-foreground">
                                                            {formatDateSafe(
                                                                item.expires_at,
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 pr-6 pl-4 text-right tabular-nums">
                                                            <span
                                                                className={`font-heading text-sm font-bold ${
                                                                    isCredit
                                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                                        : 'text-rose-700 dark:text-rose-400'
                                                                }`}
                                                            >
                                                                {isCredit
                                                                    ? '+'
                                                                    : '-'}
                                                                {pointsVal.toLocaleString()}{' '}
                                                                pts
                                                            </span>
                                                            <span className="block text-[10px] text-muted-foreground">
                                                                ≈ ₹
                                                                {inrVal.toLocaleString()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-6 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                                    <span>
                                        {isServerPaginated && !Array.isArray(ledger) ? (
                                            <>
                                                Showing {pagedEntries.length} of{' '}
                                                {ledger.total ??
                                                    filteredEntries.length}{' '}
                                                transaction
                                                {(ledger.total ??
                                                    filteredEntries.length) ===
                                                1
                                                    ? ''
                                                    : 's'}
                                            </>
                                        ) : (
                                            <>
                                                Showing{' '}
                                                {(safePage - 1) * pageSize + 1}–
                                                {Math.min(
                                                    safePage * pageSize,
                                                    filteredEntries.length,
                                                )}{' '}
                                                of {filteredEntries.length}{' '}
                                                transaction
                                                {filteredEntries.length === 1
                                                    ? ''
                                                    : 's'}
                                            </>
                                        )}
                                    </span>
                                    <Pagination
                                        currentPage={
                                            isServerPaginated &&
                                            !Array.isArray(ledger)
                                                ? (ledger.current_page ?? 1)
                                                : safePage
                                        }
                                        totalPages={
                                            isServerPaginated &&
                                            !Array.isArray(ledger)
                                                ? (ledger.last_page ?? 1)
                                                : totalClientPages
                                        }
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FAQ Snippet */}
                    <div className="rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-2xs dark:border-border dark:bg-card">
                        <h3 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
                            <HelpCircle className="size-4 text-tijum-coral" />
                            Frequently Asked Questions about Points
                        </h3>
                        <div className="mt-4 grid gap-4 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
                            <div>
                                <p className="font-semibold text-foreground">
                                    When do earned points become available?
                                </p>
                                <p className="mt-1">
                                    Points remain pending while your stay is
                                    active and transition to available
                                    automatically upon confirmed checkout.
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    How is the rupee conversion calculated?
                                </p>
                                <p className="mt-1">
                                    Points convert at the platform rate towards
                                    your accommodation total, capped at{' '}
                                    {maxRedemptionPercentage}% of subtotal per
                                    booking.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </ResponsiveContainer>
        </>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Rewards & Loyalty', href: '/rewards' },
    { title: 'Points Wallet', href: '/rewards/points' },
];

PointsWalletPage.layout = {
    breadcrumbs,
};
