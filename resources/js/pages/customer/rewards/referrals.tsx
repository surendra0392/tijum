import { Head } from '@inertiajs/react';
import {
    Check,
    Copy,
    Gift,
    Mail,
    MessageCircle,
    Share2,
    ShieldAlert,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
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
    CustomerReferralProfile,
    ReferralInvite,
} from '@/types';

interface Props {
    profile: CustomerReferralProfile;
    invites: ReferralInvite[];
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

export default function ReferralsPage({ profile, invites }: Props) {
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const totalPages = Math.max(1, Math.ceil(invites.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedInvites = invites.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const referralCode = profile?.referral_code ?? 'TIJUMGUEST';
    const referrerRewardPoints = profile?.referrer_reward_points ?? 250;
    const referredRewardPoints = profile?.referred_reward_points ?? 250;
    const shareUrl =
        profile?.share_url ||
        (typeof window !== 'undefined'
            ? `${window.location.origin}/r/${referralCode}`
            : `https://tijum.com/r/${referralCode}`);

    const shareMessage = `Hey! I stay with TIJUM for verified Hostels/PG, Homestays, and Co-Living. Use my invite link to get ${referredRewardPoints.toLocaleString()} loyalty points on your first stay: ${shareUrl}`;

    const handleCopy = (text: string, type: 'code' | 'link') => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(text).catch(() => {});
            if (type === 'code') {
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2500);
            } else {
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2500);
            }
        }
    };

    const shareWhatsApp = () => {
        if (typeof window !== 'undefined') {
            window.open(
                `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
                '_blank',
                'noopener,noreferrer',
            );
        }
    };

    const shareEmail = () => {
        if (typeof window !== 'undefined') {
            window.open(
                `mailto:?subject=${encodeURIComponent(`Join TIJUM & get ${referredRewardPoints} stay points`)}&body=${encodeURIComponent(shareMessage)}`,
                '_blank',
            );
        }
    };

    const totalInvites =
        profile?.total_invites ??
        (profile as unknown as Record<string, unknown>)?.total_referrals ??
        0;
    const totalPointsEarned =
        profile?.points_earned ??
        (profile as unknown as Record<string, unknown>)?.total_points_earned ??
        0;

    return (
        <>
            <Head title="Refer & Earn — TIJUM Rewards" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="space-y-8 pb-12">
                    {/* Hero Referral Box */}
                    <section className="relative overflow-hidden rounded-[24px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-soft sm:p-10 dark:border dark:border-border dark:bg-[#2b1b29]">
                        <div className="max-w-2xl space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 px-3 py-1 font-heading text-xs font-semibold text-tijum-peach">
                                <Gift
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Referral Programme</span>
                            </div>
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-cream sm:text-4xl">
                                Give {referredRewardPoints.toLocaleString()} pts.
                                Get {referrerRewardPoints.toLocaleString()} pts.
                            </h1>
                            <p className="text-sm leading-relaxed text-tijum-cream/80 sm:text-base">
                                Invite friends to TIJUM. When they complete their
                                first verified stay in any Hostels/PG,
                                Homestays, or Co-Living space, they receive{' '}
                                {referredRewardPoints.toLocaleString()} points
                                and you receive{' '}
                                {referrerRewardPoints.toLocaleString()} points
                                directly in your Rewards Wallet.
                            </p>
                        </div>

                        {/* Share Widget */}
                        <div className="mt-8 rounded-2xl border border-tijum-cream/15 bg-white/8 p-4 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <span className="font-heading text-xs font-medium text-tijum-peach">
                                        Your Unique Referral Code
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-1 items-center justify-between rounded-xl border border-tijum-cream/20 bg-white/10 px-4 py-2.5 font-mono text-lg font-bold tracking-widest text-white">
                                            <span>{referralCode}</span>
                                        </div>
                                        <Button
                                            size="default"
                                            variant="secondary"
                                            onClick={() =>
                                                handleCopy(referralCode, 'code')
                                            }
                                            className="shrink-0 gap-1.5 bg-white text-tijum-plum hover:bg-tijum-cream dark:bg-white dark:text-tijum-plum dark:hover:bg-tijum-cream"
                                        >
                                            {copiedCode ? (
                                                <>
                                                    <Check className="size-4 text-emerald-600" />
                                                    <span>Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="size-4" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="font-heading text-xs font-medium text-tijum-peach">
                                        Direct Invite Link
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-tijum-cream/20 bg-white/10 px-3 py-2.5 font-mono text-xs text-tijum-cream/90">
                                            <span className="truncate">
                                                {shareUrl}
                                            </span>
                                        </div>
                                        <Button
                                            size="default"
                                            variant="secondary"
                                            onClick={() =>
                                                handleCopy(shareUrl, 'link')
                                            }
                                            className="shrink-0 gap-1.5 bg-white text-tijum-plum hover:bg-tijum-cream dark:bg-white dark:text-tijum-plum dark:hover:bg-tijum-cream"
                                        >
                                            {copiedLink ? (
                                                <>
                                                    <Check className="size-4 text-emerald-600" />
                                                    <span>Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Share2 className="size-4" />
                                                    <span>Copy Link</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-tijum-cream/15 pt-4">
                                <span className="font-heading text-xs font-medium text-tijum-peach">
                                    Share directly via:
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={shareWhatsApp}
                                    className="gap-1.5 border-emerald-400/40 bg-emerald-600/25 text-xs text-white hover:bg-emerald-600/40 hover:text-white dark:border-emerald-400/40 dark:bg-emerald-600/25 dark:text-white"
                                >
                                    <MessageCircle className="size-3.5 text-emerald-300" />
                                    <span>WhatsApp</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={shareEmail}
                                    className="gap-1.5 border-tijum-cream/25 bg-white/10 text-xs text-white hover:bg-white/20 hover:text-white dark:border-tijum-cream/25 dark:bg-white/10 dark:text-white"
                                >
                                    <Mail className="size-3.5" />
                                    <span>Email</span>
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* Referral Metrics */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide uppercase">
                                    Friends Invited
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold tabular-nums">
                                    {Number(totalInvites).toLocaleString()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    Signed up with your invite link
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide uppercase">
                                    Completed Stays
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold tabular-nums">
                                    {(
                                        profile?.successful_referrals ?? 0
                                    ).toLocaleString()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    Verified checkout &amp; rewarded
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide text-tijum-coral uppercase">
                                    Total Points Earned
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold text-tijum-coral tabular-nums">
                                    +
                                    {Number(totalPointsEarned).toLocaleString()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    ≈ ₹
                                    {Number(totalPointsEarned).toLocaleString()}{' '}
                                    in stay discounts
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="font-heading text-xs font-semibold tracking-wide uppercase">
                                    Per-Stay Reward
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                                    ₹{profile?.referrer_reward_points ?? 250}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    For each completed friend reservation
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* How It Works Steps */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="font-heading text-xl font-bold text-foreground">
                                How Referrals Work
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Simple 3-step qualification ensures rewards are
                                credited reliably.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card dark:border-border dark:bg-card">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/35 font-heading text-base font-bold text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                    1
                                </div>
                                <h3 className="mt-4 font-heading text-base font-bold text-foreground">
                                    Share Your Code
                                </h3>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    Send your personal link or code to friends
                                    looking for accommodation across India.
                                </p>
                            </div>

                            <div className="rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card dark:border-border dark:bg-card">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 font-heading text-base font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                    2
                                </div>
                                <h3 className="mt-4 font-heading text-base font-bold text-foreground">
                                    They Book A Stay
                                </h3>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    Your friend registers and completes an
                                    eligible stay in Hostels/PG, Homestays, or
                                    Co-Living.
                                </p>
                            </div>

                            <div className="rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card dark:border-border dark:bg-card">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 font-heading text-base font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    3
                                </div>
                                <h3 className="mt-4 font-heading text-base font-bold text-foreground">
                                    Both Get Rewarded
                                </h3>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    As soon as their stay completes and checkout
                                    is confirmed, you receive{' '}
                                    {referrerRewardPoints.toLocaleString()}{' '}
                                    points and your friend receives{' '}
                                    {referredRewardPoints.toLocaleString()}{' '}
                                    points.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Referral Tracking Table */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="font-heading text-xl font-bold text-foreground">
                                Your Referral Tracking
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Live status of friends invited and stay
                                progress.
                            </p>
                        </div>

                        {invites.length === 0 ? (
                            <div className="rounded-[22px] border border-dashed border-tijum-surface/80 bg-white p-12 text-center dark:border-border dark:bg-card">
                                <UserPlus className="mx-auto size-10 text-muted-foreground/40" />
                                <h3 className="mt-3 font-heading text-base font-semibold text-foreground">
                                    No referrals yet
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Copy your link above and share it with
                                    friends to start earning rewards!
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[22px] border border-tijum-surface/80 bg-white shadow-tijum-card dark:border-border dark:bg-card">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-tijum-surface/80 bg-tijum-cream/60 font-heading font-semibold text-muted-foreground dark:border-border dark:bg-muted/50">
                                            <tr>
                                                <th className="py-3.5 pr-4 pl-6">
                                                    Friend
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Invite Date
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3.5">
                                                    Stay Completed
                                                </th>
                                                <th className="py-3.5 pr-6 pl-4 text-right">
                                                    Reward Points
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-tijum-surface/60 text-foreground dark:divide-border">
                                            {pagedInvites.map((invite) => {
                                                const rawReferredName = (
                                                    invite as unknown as Record<
                                                        string,
                                                        unknown
                                                    >
                                                ).referred_name;
                                                const friendName: string =
                                                    invite.friend_name ||
                                                    (typeof rawReferredName ===
                                                    'string'
                                                        ? rawReferredName
                                                        : '') ||
                                                    'Friend';
                                                const emailMasked =
                                                    invite.friend_email_masked ||
                                                    '—';
                                                const pointsVal =
                                                    invite.points_awarded ??
                                                    (
                                                        invite as unknown as Record<
                                                            string,
                                                            unknown
                                                        >
                                                    ).reward_points ??
                                                    referrerRewardPoints;

                                                return (
                                                    <tr
                                                        key={invite.id}
                                                        className="transition hover:bg-tijum-cream/35 dark:hover:bg-muted/40"
                                                    >
                                                        <td className="py-3.5 pr-4 pl-6 font-medium whitespace-nowrap text-foreground">
                                                            <div>
                                                                <p className="font-semibold">
                                                                    {friendName}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {String(
                                                                        emailMasked,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-muted-foreground">
                                                            {formatDateSafe(
                                                                invite.created_at,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] capitalize ${
                                                                    invite.status ===
                                                                        'completed' ||
                                                                    invite.status ===
                                                                        'rewarded'
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                        : invite.status ===
                                                                            'booked'
                                                                          ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                                                          : invite.status ===
                                                                              'registered'
                                                                            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                                            : 'border-tijum-surface bg-tijum-cream text-muted-foreground dark:border-border dark:bg-muted'
                                                                }`}
                                                            >
                                                                {invite.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-muted-foreground">
                                                            {invite.stay_completed_at
                                                                ? formatDateSafe(
                                                                      invite.stay_completed_at,
                                                                  )
                                                                : 'Pending Stay'}
                                                        </td>
                                                        <td className="py-3.5 pr-6 pl-4 text-right tabular-nums">
                                                            <span className="font-heading text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                                                +
                                                                {Number(
                                                                    pointsVal,
                                                                ).toLocaleString()}{' '}
                                                                pts
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
                                        Showing {(safePage - 1) * pageSize + 1}–
                                        {Math.min(
                                            safePage * pageSize,
                                            invites.length,
                                        )}{' '}
                                        of {invites.length} referral
                                        {invites.length === 1 ? '' : 's'}
                                    </span>
                                    <Pagination
                                        currentPage={safePage}
                                        totalPages={totalPages}
                                        onPageChange={setPage}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fair Use Notice */}
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="space-y-1">
                            <p className="font-heading font-semibold text-amber-950 dark:text-amber-200">
                                Referral Integrity &amp; Anti-Fraud Policy
                            </p>
                            <p className="leading-relaxed">
                                Self-referrals (referring your own secondary
                                emails, phone numbers, or devices) are
                                prohibited and automatically detected. Rewards
                                are granted exclusively upon completed verified
                                stays with confirmed check-in and checkout.
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
    { title: 'Refer & Earn', href: '/rewards/referrals' },
];

ReferralsPage.layout = {
    breadcrumbs,
};
