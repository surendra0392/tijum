import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Coins,
    Copy,
    Gift,
    Info,
    Share2,
    Sparkles,
    Tag,
    TicketPercent,
    Users,
} from 'lucide-react';
import { useState } from 'react';
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
    CouponCode,
    CustomerPointsWallet,
    CustomerReferralProfile,
    PointsLedgerEntry,
} from '@/types';

interface Props {
    wallet: CustomerPointsWallet;
    referral: CustomerReferralProfile;
    activeCoupons: CouponCode[];
    recentActivity: PointsLedgerEntry[];
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

export default function RewardsIndex({
    wallet,
    referral,
    activeCoupons,
    recentActivity,
}: Props) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    const referralCode = referral?.referral_code ?? 'TIJUMGUEST';
    const shareUrl =
        referral?.share_url ||
        (typeof window !== 'undefined'
            ? `${window.location.origin}/r/${referralCode}`
            : `https://tijum.com/r/${referralCode}`);

    const copyToClipboard = (text: string, type: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(text).catch(() => {});
            if (type === 'link') {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2500);
            } else {
                setCopiedCode(type);
                setTimeout(() => setCopiedCode(null), 2500);
            }
        }
    };

    return (
        <>
            <Head title="TIJUM Rewards & Loyalty Hub" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="space-y-8 pb-12">
                    {/* Hero Banner */}
                    <section className="relative overflow-hidden rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-soft sm:p-10 dark:border dark:border-border dark:bg-[#2b1b29]">
                        <div className="max-w-2xl space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 px-3 py-1 font-heading text-xs font-semibold text-tijum-peach">
                                <Sparkles
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>TIJUM Loyalty &amp; Rewards Program</span>
                            </div>
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-cream sm:text-4xl">
                                Earn More. Stay Smarter.
                            </h1>
                            <p className="text-sm leading-relaxed text-tijum-cream/80 sm:text-base">
                                Redeem loyalty points like real cash on future
                                bookings, invite friends for instant rewards,
                                and unlock exclusive promotional coupons.
                            </p>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-tijum-cream/15 pt-6 sm:grid-cols-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-tijum-peach">
                                    Available Points
                                </p>
                                <p className="font-heading text-2xl font-bold text-white tabular-nums sm:text-3xl">
                                    {wallet?.available_points?.toLocaleString() ??
                                        0}
                                </p>
                                <p className="text-xs text-tijum-cream/75">
                                    ≈ ₹
                                    {(
                                        wallet?.estimated_inr_value ??
                                        wallet?.available_points ??
                                        0
                                    ).toLocaleString()}{' '}
                                    discount
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-tijum-peach">
                                    Pending Verification
                                </p>
                                <p className="font-heading text-2xl font-bold text-white tabular-nums sm:text-3xl">
                                    {wallet?.pending_points?.toLocaleString() ??
                                        0}
                                </p>
                                <p className="text-xs text-tijum-cream/75">
                                    Credited upon stay checkout
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-tijum-peach">
                                    Active Coupons
                                </p>
                                <p className="font-heading text-2xl font-bold text-white tabular-nums sm:text-3xl">
                                    {activeCoupons.length}
                                </p>
                                <p className="text-xs text-tijum-cream/75">
                                    Ready for checkout
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-tijum-peach">
                                    Referral Earnings
                                </p>
                                <p className="font-heading text-2xl font-bold text-white tabular-nums sm:text-3xl">
                                    {(
                                        referral?.points_earned ??
                                        referral?.total_points_earned ??
                                        0
                                    ).toLocaleString()}
                                </p>
                                <p className="text-xs text-tijum-cream/75">
                                    From {referral?.successful_referrals ?? 0}{' '}
                                    stays
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Quick Navigation Cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Link
                            href="/rewards/points"
                            className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card transition hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card"
                        >
                            <div className="space-y-2.5">
                                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                    <Coins
                                        className="size-6"
                                        aria-hidden="true"
                                    />
                                </div>
                                <h3 className="font-heading text-lg font-bold text-foreground transition-colors group-hover:text-tijum-coral">
                                    Points Wallet &amp; Ledger
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    View full transaction history, FEFO points
                                    expiry dates, and pending stay accruals.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground transition-colors group-hover:text-tijum-coral">
                                <span>Open wallet history</span>
                                <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                            </div>
                        </Link>

                        <Link
                            href="/rewards/referrals"
                            className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card transition hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card"
                        >
                            <div className="space-y-2.5">
                                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-tijum-coral/15 text-tijum-coral dark:bg-tijum-coral/20 dark:text-tijum-peach">
                                    <Users
                                        className="size-6"
                                        aria-hidden="true"
                                    />
                                </div>
                                <h3 className="font-heading text-lg font-bold text-foreground transition-colors group-hover:text-tijum-coral">
                                    Refer &amp; Earn
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Share your personal referral code. When
                                    friends complete their verified stay, both
                                    get rewarded.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground transition-colors group-hover:text-tijum-coral">
                                <span>Invite friends &amp; track</span>
                                <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                            </div>
                        </Link>

                        <Link
                            href="/rewards/coupons"
                            className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card transition hover:-translate-y-0.5 hover:border-tijum-coral/50 dark:border-border dark:bg-card"
                        >
                            <div className="space-y-2.5">
                                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <TicketPercent
                                        className="size-6"
                                        aria-hidden="true"
                                    />
                                </div>
                                <h3 className="font-heading text-lg font-bold text-foreground transition-colors group-hover:text-tijum-coral">
                                    Promo Coupons
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Discover active promotional discount codes
                                    for Hostels/PG, Homestays, and Co-Living
                                    stays.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground transition-colors group-hover:text-tijum-coral">
                                <span>Browse all coupons</span>
                                <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                            </div>
                        </Link>
                    </div>

                    {/* Referral Quick Share Card */}
                    <Card className="border-tijum-peach/65 dark:border-border">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Gift className="size-5 text-tijum-coral" />
                                        Your Referral Code &amp; Link
                                    </CardTitle>
                                    <CardDescription>
                                        Give friends{' '}
                                        {(
                                            referral?.referred_reward_points ??
                                            250
                                        ).toLocaleString()}{' '}
                                        loyalty points on their first stay, and
                                        you earn{' '}
                                        {(
                                            referral?.referrer_reward_points ??
                                            250
                                        ).toLocaleString()}{' '}
                                        points when they complete check-out.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-xl border border-tijum-peach/70 bg-tijum-cream/65 px-4 py-2 font-mono text-base font-bold tracking-wider text-foreground dark:border-border dark:bg-muted">
                                        {referralCode}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            copyToClipboard(
                                                referralCode,
                                                'code',
                                            )
                                        }
                                        className="gap-1.5"
                                    >
                                        {copiedCode === 'code' ? (
                                            <>
                                                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-3.5" />
                                                <span>Copy Code</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="flex flex-col gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/40">
                                <span className="truncate font-mono text-xs text-muted-foreground">
                                    {shareUrl}
                                </span>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="plum"
                                        onClick={() =>
                                            copyToClipboard(shareUrl, 'link')
                                        }
                                    >
                                        {copiedLink ? (
                                            <>
                                                <Check className="size-3.5" />
                                                <span>Link Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Share2 className="size-3.5" />
                                                <span>Copy Invite Link</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Coupons Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="font-heading text-xl font-bold text-foreground">
                                    Active Promotional Coupons
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Apply these codes during checkout to deduct
                                    immediate discounts.
                                </p>
                            </div>
                            <Link
                                href="/rewards/coupons"
                                className="font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                            >
                                View all coupons &rarr;
                            </Link>
                        </div>

                        {activeCoupons.length === 0 ? (
                            <div className="rounded-[22px] border border-dashed border-tijum-surface/80 bg-white p-8 text-center dark:border-border dark:bg-card">
                                <Tag className="mx-auto size-8 text-muted-foreground/60" />
                                <p className="mt-2 font-heading text-sm font-semibold text-foreground">
                                    No active coupons at the moment
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Check back regularly for seasonal flash
                                    sales and city launches.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {activeCoupons.slice(0, 3).map((coupon) => (
                                    <div
                                        key={coupon.id}
                                        className="relative flex flex-col justify-between rounded-[22px] border border-dashed border-emerald-300 bg-white p-5 shadow-tijum-card dark:border-emerald-700/60 dark:bg-card"
                                    >
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                >
                                                    {coupon.offer_type ===
                                                    'percentage'
                                                        ? `${coupon.discount_percentage ?? 0}% OFF`
                                                        : coupon.offer_type ===
                                                            'bonus_points'
                                                          ? `+${(coupon.bonus_points ?? 0).toLocaleString()} PTS`
                                                          : coupon.offer_type ===
                                                              'combined'
                                                            ? [
                                                                  coupon.discount_percentage
                                                                      ? `${coupon.discount_percentage}% OFF`
                                                                      : coupon.discount_amount_minor
                                                                        ? `₹${(coupon.discount_amount_minor / 100).toLocaleString()} OFF`
                                                                        : null,
                                                                  coupon.bonus_points
                                                                      ? `+${coupon.bonus_points.toLocaleString()} PTS`
                                                                      : null,
                                                              ]
                                                                  .filter(
                                                                      Boolean,
                                                                  )
                                                                  .join(
                                                                      ' + ',
                                                                  ) ||
                                                              'SPECIAL OFFER'
                                                            : `₹${((coupon.discount_amount_minor ?? 0) / 100).toLocaleString()} OFF`}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Valid until{' '}
                                                    {formatDateSafe(
                                                        coupon.valid_to ??
                                                            coupon.expires_at,
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-heading text-base font-bold text-foreground">
                                                    {coupon.title ||
                                                        coupon.description ||
                                                        coupon.code}
                                                </h4>
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                    {coupon.description ||
                                                        'Exclusive TIJUM promotional offer'}
                                                </p>
                                            </div>
                                            {coupon.min_booking_amount_minor ? (
                                                <p className="text-[11px] text-muted-foreground tabular-nums">
                                                    Min. stay amount: ₹
                                                    {(
                                                        coupon.min_booking_amount_minor /
                                                        100
                                                    ).toLocaleString()}
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-emerald-200/70 pt-3 dark:border-emerald-900/60">
                                            <span className="font-mono text-xs font-bold tracking-wider text-emerald-900 dark:text-emerald-300">
                                                {coupon.code}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 gap-1 text-xs text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                                onClick={() =>
                                                    copyToClipboard(
                                                        coupon.code,
                                                        String(coupon.id),
                                                    )
                                                }
                                            >
                                                {copiedCode ===
                                                String(coupon.id) ? (
                                                    <>
                                                        <Check className="size-3 text-emerald-700 dark:text-emerald-300" />
                                                        <span>Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="size-3" />
                                                        <span>Copy</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Points Activity */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="font-heading text-xl font-bold text-foreground">
                                    Recent Points Activity
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Last 5 points ledger events across accruals
                                    and redemptions.
                                </p>
                            </div>
                            <Link
                                href="/rewards/points"
                                className="font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                            >
                                Full transaction ledger &rarr;
                            </Link>
                        </div>

                        {recentActivity.length === 0 ? (
                            <div className="rounded-[22px] border border-dashed border-tijum-surface/80 bg-white p-8 text-center dark:border-border dark:bg-card">
                                <Coins className="mx-auto size-8 text-muted-foreground/60" />
                                <p className="mt-2 font-heading text-sm font-semibold text-foreground">
                                    No points activity yet
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Book your first stay or invite friends to
                                    start earning loyalty points.
                                </p>
                            </div>
                        ) : (
                            <Card className="overflow-hidden py-0">
                                <div className="divide-y divide-tijum-surface/80 dark:divide-border">
                                    {recentActivity.slice(0, 5).map((item) => {
                                        const rawType = String(
                                            item.transaction_type ??
                                                item.type ??
                                                '',
                                        ).toLowerCase();
                                        const isCredit =
                                            (
                                                item as unknown as Record<
                                                    string,
                                                    unknown
                                                >
                                            ).is_credit === true ||
                                            rawType.includes('earned') ||
                                            rawType.includes('bonus') ||
                                            rawType.includes('credit') ||
                                            rawType.includes('reverse') ||
                                            item.points > 0;
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-4 transition hover:bg-tijum-cream/40 sm:px-6 dark:hover:bg-muted/40"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                                                            isCredit
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        <Coins className="size-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {item.description ||
                                                                item.type_label ||
                                                                'Points Transaction'}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {formatDateSafe(
                                                                    item.created_at,
                                                                )}
                                                            </span>
                                                            {item.reference_code && (
                                                                <>
                                                                    <span>
                                                                        ·
                                                                    </span>
                                                                    <span className="font-mono">
                                                                        {
                                                                            item.reference_code
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p
                                                        className={`font-heading text-base font-bold tabular-nums ${
                                                            isCredit
                                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                                : 'text-rose-700 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {isCredit ? '+' : '-'}
                                                        {Math.abs(
                                                            item.points,
                                                        )}{' '}
                                                        pts
                                                    </p>
                                                    <span className="text-[11px] text-muted-foreground capitalize">
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Program Terms & Notice */}
                    <div className="flex items-start gap-3 rounded-2xl border border-tijum-surface/80 bg-white p-4 text-xs text-muted-foreground shadow-2xs sm:p-5 dark:border-border dark:bg-card">
                        <Info className="mt-0.5 size-4 shrink-0 text-tijum-coral" />
                        <div className="space-y-1">
                            <p className="font-heading font-semibold text-foreground">
                                Platform Guarantees &amp; Policy
                            </p>
                            <p className="leading-relaxed">
                                TIJUM Loyalty Points expire on a First-Earned,
                                First-Out (FEFO) basis 365 days after issuance.
                                Referral points qualify strictly upon verified
                                stay completion and checkout. Platform coupons
                                never reduce partner payouts. See our{' '}
                                <Link
                                    href="/terms#promotions-referrals-points"
                                    className="font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                                >
                                    Terms of Service (Section 7)
                                </Link>{' '}
                                for full details.
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
];

RewardsIndex.layout = {
    breadcrumbs,
};
