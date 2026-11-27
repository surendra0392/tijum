import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Check,
    Copy,
    Info,
    Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem, CouponCode } from '@/types';

interface Props {
    coupons: CouponCode[];
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

export default function CouponsPage({ coupons }: Props) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const copyToClipboard = (code: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(code).catch(() => {});
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2500);
        }
    };

    const filteredCoupons = useMemo(() => {
        if (filter === 'all') return coupons;
        if (filter === 'active') {
            return coupons.filter((c) => c.status === 'active');
        }
        if (
            filter === 'hostels-pg' ||
            filter === 'homestays' ||
            filter === 'co-living'
        ) {
            return coupons.filter((c) => {
                const cats = (c as unknown as Record<string, unknown>)
                    .applicable_categories as string[] | undefined;
                if (!cats || cats.length === 0) {
                    return true;
                }
                const target = filter.toLowerCase();
                return cats.some((cat) => {
                    const normalized = cat.toLowerCase();
                    return (
                        normalized === target ||
                        normalized.includes(target.replace(/s$/, ''))
                    );
                });
            });
        }
        return coupons;
    }, [coupons, filter]);

    const formatDiscountBadge = (coupon: CouponCode): string => {
        if (coupon.offer_type === 'percentage') {
            return `${coupon.discount_percentage ?? 0}% OFF`;
        }
        if (coupon.offer_type === 'bonus_points') {
            const pts =
                (coupon as unknown as Record<string, unknown>).bonus_points ??
                0;
            return `+${Number(pts).toLocaleString()} PTS`;
        }
        if (coupon.offer_type === 'combined') {
            const parts: string[] = [];
            if (coupon.discount_percentage) {
                parts.push(`${coupon.discount_percentage}% OFF`);
            } else if (coupon.discount_amount_minor) {
                parts.push(
                    `₹${(coupon.discount_amount_minor / 100).toLocaleString()} OFF`,
                );
            }
            const pts =
                (coupon as unknown as Record<string, unknown>).bonus_points ??
                0;
            if (Number(pts) > 0) {
                parts.push(`+${Number(pts).toLocaleString()} PTS`);
            }
            return parts.join(' + ') || 'SPECIAL OFFER';
        }
        return `₹${((coupon.discount_amount_minor ?? 0) / 100).toLocaleString()} OFF`;
    };

    return (
        <>
            <Head title="Available Coupons & Discounts — TIJUM" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="space-y-8 pb-12">
                    <PageHeader
                        eyebrow="Rewards & Savings"
                        title="Promotional Coupons"
                        description="Copy coupon codes to save on upcoming Hostels/PG, Homestays, and Co-Living reservations."
                        actions={
                            <Button variant="plum" size="sm" asChild>
                                <Link href="/search">
                                    <Building2 className="size-3.5" />
                                    <span>Explore Stays</span>
                                </Link>
                            </Button>
                        }
                    />

                    {/* Filter Tabs */}
                    <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-tijum-surface/80 bg-white p-1.5 shadow-2xs dark:border-border dark:bg-card">
                        {[
                            { key: 'all', label: 'All Coupons' },
                            { key: 'active', label: 'Active Now' },
                            { key: 'hostels-pg', label: 'Hostels / PG' },
                            { key: 'homestays', label: 'Homestays' },
                            { key: 'co-living', label: 'Co-Living' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`cursor-pointer rounded-lg px-3.5 py-1.5 font-heading text-xs font-semibold transition ${
                                    filter === tab.key
                                        ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                        : 'text-muted-foreground hover:bg-tijum-cream hover:text-foreground dark:hover:bg-accent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Coupons Grid */}
                    {filteredCoupons.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-tijum-surface/80 bg-white p-12 text-center dark:border-border dark:bg-card">
                            <Tag className="mx-auto size-10 text-muted-foreground/40" />
                            <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
                                No coupons found
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                No promotional coupons currently match your
                                selection.
                            </p>
                            {filter !== 'all' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setFilter('all')}
                                >
                                    Show All Coupons
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredCoupons.map((coupon) => {
                                const isPercentage =
                                    coupon.offer_type === 'percentage' ||
                                    (coupon.offer_type === 'combined' &&
                                        Boolean(coupon.discount_percentage));
                                const discountLabel =
                                    formatDiscountBadge(coupon);

                                return (
                                    <div
                                        key={coupon.id}
                                        className="relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-dashed border-tijum-coral/45 bg-white p-6 shadow-tijum-card transition hover:border-tijum-coral dark:border-tijum-coral/50 dark:bg-card"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="border-tijum-peach bg-tijum-peach/25 px-2.5 py-1 text-xs font-bold text-tijum-plum dark:border-tijum-coral/40 dark:bg-tijum-coral/20 dark:text-tijum-peach"
                                                >
                                                    {discountLabel}
                                                </Badge>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Valid until{' '}
                                                    {formatDateSafe(
                                                        coupon.valid_to ??
                                                            coupon.expires_at,
                                                    )}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="font-heading text-lg font-bold text-foreground">
                                                    {coupon.title ||
                                                        coupon.description ||
                                                        coupon.code}
                                                </h3>
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                    {coupon.description ||
                                                        'Exclusive promotional discount on verified stays.'}
                                                </p>
                                            </div>

                                            <div className="space-y-1 rounded-xl bg-tijum-cream/55 p-3 text-[11px] text-muted-foreground dark:bg-muted/45">
                                                {coupon.min_booking_amount_minor ? (
                                                    <p className="tabular-nums">
                                                        · Minimum booking:{' '}
                                                        <span className="font-semibold text-foreground">
                                                            ₹
                                                            {(
                                                                coupon.min_booking_amount_minor /
                                                                100
                                                            ).toLocaleString()}
                                                        </span>
                                                    </p>
                                                ) : null}
                                                {coupon.max_discount_minor &&
                                                isPercentage ? (
                                                    <p className="tabular-nums">
                                                        · Maximum discount:{' '}
                                                        <span className="font-semibold text-foreground">
                                                            ₹
                                                            {(
                                                                coupon.max_discount_minor /
                                                                100
                                                            ).toLocaleString()}
                                                        </span>
                                                    </p>
                                                ) : null}
                                                <p>
                                                    · Funded by:{' '}
                                                    <span className="font-semibold text-foreground capitalize">
                                                        {coupon.funding_source}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between border-t border-dashed border-tijum-coral/35 pt-4 dark:border-tijum-coral/40">
                                            <div className="rounded-lg border border-dashed border-tijum-coral/45 bg-tijum-peach/20 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                                {coupon.code}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1 text-xs"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            coupon.code,
                                                        )
                                                    }
                                                >
                                                    {copiedCode ===
                                                    coupon.code ? (
                                                        <>
                                                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                                            <span>Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="size-3.5" />
                                                            <span>Copy</span>
                                                        </>
                                                    )}
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="plum"
                                                    asChild
                                                >
                                                    <Link href="/search">
                                                        <span>Use</span>
                                                        <ArrowRight className="size-3" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Terms Notice */}
                    <div className="flex items-start gap-3 rounded-2xl border border-tijum-surface/80 bg-white p-5 text-xs text-muted-foreground shadow-2xs dark:border-border dark:bg-card">
                        <Info className="mt-0.5 size-4 shrink-0 text-tijum-coral" />
                        <div className="space-y-1">
                            <p className="font-heading font-semibold text-foreground">
                                Coupon Rules &amp; Settlement Protection
                            </p>
                            <p className="leading-relaxed">
                                Only one coupon code may be applied per
                                reservation checkout. Coupons can be combined
                                with loyalty points. Platform-funded coupons are
                                100% subsidized by TIJUM and never reduce net
                                partner payouts.
                            </p>
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
    { title: 'Coupons', href: '/rewards/coupons' },
];

CouponsPage.layout = {
    breadcrumbs,
};
