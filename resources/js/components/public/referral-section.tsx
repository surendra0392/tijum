import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Coins,
    Copy,
    Gift,
    MessageCircle,
    Share2,
    Sparkles,
    UserPlus,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';

export function ReferralSection() {
    const page = usePage();
    const user = page.props.auth?.user as { name?: string; referral_code?: string } | null;
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // If logged in, each user has their own personal referral code
    const personalReferralCode = user?.referral_code ?? '';
    const shareUrl =
        personalReferralCode && typeof window !== 'undefined'
            ? `${window.location.origin}/r/${personalReferralCode}`
            : '';

    const handleCopyCode = () => {
        if (!personalReferralCode) return;
        navigator.clipboard.writeText(personalReferralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyLink = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const whatsappShareUrl = personalReferralCode
        ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Hey! Join me on TIJUM to find comfortable Hostels, PGs, and Stays. Use my invite code ${personalReferralCode} or sign up here: ${shareUrl} to get ₹250 stay credits instantly!`
          )}`
        : '';

    return (
        <section
            aria-labelledby="referral-section-heading"
            className="tijum-section border-y border-tijum-surface bg-tijum-cream py-16 sm:py-20 lg:py-24"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={25} duration={0.8}>
                    <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
                        {/* Left Column: Heading & Value Proposition */}
                        <div className="space-y-6 lg:col-span-7">
                            <div className="inline-flex items-center gap-2 rounded-full border border-tijum-peach bg-tijum-peach/25 px-3.5 py-1 font-heading text-xs font-semibold text-tijum-plum">
                                <Sparkles className="size-3.5" aria-hidden="true" />
                                <span>TIJUM Rewards Program · Refer &amp; Earn</span>
                            </div>

                            <div className="space-y-3">
                                <h2
                                    id="referral-section-heading"
                                    className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl lg:text-[34px] leading-tight text-balance"
                                >
                                    Invite friends to TIJUM.{' '}
                                    <span style={{ color: '#FF7A67' }}>
                                        Earn up to ₹2,500 in stay credits.
                                    </span>
                                </h2>
                                <p className="max-w-[65ch] text-base leading-relaxed text-tijum-lavender sm:text-lg text-pretty">
                                    Know friends, classmates, or colleagues looking for a comfortable Hostel, PG, Homestay, or Co-Living? Share your personal invite code. They get ₹250 welcome points instantly, and you earn ₹500 (500 points) on every completed booking — up to 5 friends!
                                </p>
                            </div>

                            {/* 3 Steps Grid */}
                            <div className="grid gap-4 pt-2 sm:grid-cols-3">
                                <div className="rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                        <Share2 className="size-4.5" aria-hidden="true" />
                                    </div>
                                    <p className="mt-3.5 font-heading text-sm font-bold text-tijum-plum">
                                        1. Share Your Code
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-tijum-lavender">
                                        Each member gets a unique personal code to share with friends.
                                    </p>
                                </div>

                                <div className="rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                        <Gift className="size-4.5" aria-hidden="true" />
                                    </div>
                                    <p className="mt-3.5 font-heading text-sm font-bold text-tijum-plum">
                                        2. Friend Gets ₹250
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-tijum-lavender">
                                        Your friend receives 250 bonus points immediately upon signing up.
                                    </p>
                                </div>

                                <div className="rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream">
                                        <Coins className="size-4.5" aria-hidden="true" />
                                    </div>
                                    <p className="mt-3.5 font-heading text-sm font-bold text-tijum-plum">
                                        3. You Earn ₹500
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-tijum-lavender">
                                        Earn 500 points (₹500 value) per completed stay, up to 5 referrals.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    size="lg"
                                    variant="plum"
                                    asChild
                                >
                                    <Link href={user ? '/rewards/referrals' : '/register'}>
                                        <span>
                                            {user ? 'Open Refer & Earn Hub' : 'Register to Get Your Code'}
                                        </span>
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                    </Link>
                                </Button>

                                {!user && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        asChild
                                    >
                                        <Link href="/login">
                                            Already have an account? Sign In
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Right Column: User-Specific Personal Code or Guest Sign-up Card */}
                        <div className="space-y-4 lg:col-span-5">
                            <div className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8">
                                <div className="flex items-center justify-between gap-3 border-b border-tijum-surface pb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                            <Wallet className="size-4.5" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-tijum-lavender">
                                                Loyalty Program
                                            </p>
                                            <p className="font-heading text-sm font-bold text-tijum-plum">
                                                1 Point = ₹1.00 INR
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-tijum-peach bg-tijum-peach/25 px-2.5 py-0.5 text-[11px] font-semibold text-tijum-plum">
                                        Max 5 Referrals (₹2,500)
                                    </span>
                                </div>

                                {user && personalReferralCode ? (
                                    /* User is logged in: show their personal code and share tools */
                                    <div className="mt-5 space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                                Your Unique Referral Code
                                            </label>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <div className="relative flex-1 rounded-xl border border-tijum-coral/35 bg-tijum-cream px-4 py-3 font-mono text-base font-bold tracking-widest text-tijum-plum select-all">
                                                    {personalReferralCode}
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={copiedCode ? 'default' : 'outline'}
                                                    onClick={handleCopyCode}
                                                    className="h-11 shrink-0 gap-1.5 px-4 text-xs font-semibold"
                                                >
                                                    {copiedCode ? (
                                                        <>
                                                            <Check className="size-4 text-white" aria-hidden="true" />
                                                            <span>Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="size-4" aria-hidden="true" />
                                                            <span>Copy Code</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                                            <a
                                                href={whatsappShareUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-tijum-emerald px-4 text-xs font-semibold text-white shadow-xs transition hover:opacity-90"
                                            >
                                                <MessageCircle className="size-4" aria-hidden="true" />
                                                <span>Share on WhatsApp</span>
                                            </a>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCopyLink}
                                                className="h-10 gap-1.5 text-xs font-medium"
                                            >
                                                <Share2 className="size-3.5" aria-hidden="true" />
                                                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : user ? (
                                    /* User is logged in but profile code loading */
                                    <div className="mt-5 space-y-3">
                                        <p className="text-xs text-tijum-lavender">
                                            Welcome, <span className="font-semibold text-tijum-plum">{user.name}</span>! Visit your customer rewards portal to view and manage your referral code.
                                        </p>
                                        <Button size="sm" variant="plum" className="w-full" asChild>
                                            <Link href="/rewards/referrals">Go to Rewards Portal</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    /* Guest user: NO website code shown! Prompt user to get their personal code */
                                    <div className="mt-5 space-y-4">
                                        <div className="rounded-2xl border border-dashed border-tijum-coral/40 bg-tijum-cream/65 p-5 text-center">
                                            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-tijum-peach/35 text-tijum-plum">
                                                <UserPlus className="size-5" aria-hidden="true" />
                                            </div>
                                            <p className="mt-3 font-heading text-sm font-bold text-tijum-plum">
                                                Each Member Has a Unique Code
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-tijum-lavender">
                                                Register your free TIJUM account to receive your personal referral code, share it with friends, and start earning up to ₹2,500.
                                            </p>
                                            <div className="mt-4">
                                                <Button
                                                    size="sm"
                                                    variant="plum"
                                                    className="w-full"
                                                    asChild
                                                >
                                                    <Link href="/register">
                                                        <span>Get Your Referral Code</span>
                                                        <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <ul className="mt-6 space-y-2.5 border-t border-tijum-surface pt-5 text-xs text-tijum-lavender">
                                    <li className="flex items-center gap-2">
                                        <Check className="size-4 shrink-0 text-tijum-coral" aria-hidden="true" />
                                        <span>Capped at 5 successful referrals (maximum ₹2,500 points).</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="size-4 shrink-0 text-tijum-coral" aria-hidden="true" />
                                        <span>Your referee gets 250 welcome points credited upon registration.</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="size-4 shrink-0 text-tijum-coral" aria-hidden="true" />
                                        <span>Redeemable 1:1 on daily, weekly, or monthly bookings in verified stays.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
