import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Coins,
    Copy,
    Gift,
    MessageCircle,
    Share2,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';

export function ReferralSection() {
    const page = usePage();
    const user = page.props.auth?.user as {
        name?: string;
        referral_code?: string;
    } | null;
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const personalReferralCode = user?.referral_code ?? '';
    const shareUrl =
        personalReferralCode && typeof window !== 'undefined'
            ? `${window.location.origin}/r/${personalReferralCode}`
            : '';

    const handleCopyCode = async () => {
        if (!personalReferralCode) return;
        try {
            await navigator.clipboard.writeText(personalReferralCode);
            setCopiedCode(true);
            window.setTimeout(() => setCopiedCode(false), 2000);
        } catch {
            // Clipboard unavailable
        }
    };

    const handleCopyLink = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedLink(true);
            window.setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            // Clipboard unavailable
        }
    };

    const whatsappShareUrl = personalReferralCode
        ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Hey! Join me on TIJUM to find comfortable Hostels, PGs, and Stays. Use my invite code ${personalReferralCode} or sign up here: ${shareUrl} to get ₹250 stay credits instantly!`,
          )}`
        : '';

    return (
        <section
            aria-labelledby="referral-section-heading"
            className="bg-tijum-cream py-16 sm:py-20"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={20} duration={0.7}>
                    <div className="overflow-hidden rounded-[28px] border border-tijum-surface bg-white shadow-tijum-soft">
                        <div className="grid lg:grid-cols-12">
                            {/* Left Program Overview */}
                            <div className="flex flex-col justify-between gap-8 p-7 sm:p-10 lg:col-span-7 lg:p-12">
                                <div className="space-y-3.5">
                                    <h2
                                        id="referral-section-heading"
                                        className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-3xl lg:text-[34px] lg:leading-tight"
                                    >
                                        Invite friends and earn up to{' '}
                                        <span style={{ color: '#FF7A67' }}>
                                            ₹2,500 in stay credits
                                        </span>
                                    </h2>
                                    <p className="max-w-[56ch] text-sm leading-relaxed text-tijum-lavender sm:text-base">
                                        Share your personal invite code with
                                        classmates or colleagues. They receive
                                        ₹250 welcome points on sign-up, and you
                                        earn ₹500 on every completed stay for up
                                        to 5 friends.
                                    </p>
                                </div>

                                <div className="grid gap-4 border-t border-tijum-surface/80 pt-6 sm:grid-cols-3">
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-cream text-tijum-plum">
                                            <Share2
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="font-heading text-sm font-bold text-tijum-plum">
                                                Share your code
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-tijum-lavender">
                                                Unique invite link per member.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-cream text-tijum-plum">
                                            <Gift
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="font-heading text-sm font-bold text-tijum-plum">
                                                Friend gets ₹250
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-tijum-lavender">
                                                Instant welcome points on join.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream">
                                            <Coins
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="font-heading text-sm font-bold text-tijum-plum">
                                                You earn ₹500
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-tijum-lavender">
                                                Per completed stay, up to 5.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Action Panel */}
                            <div className="flex flex-col justify-between gap-6 border-t border-tijum-surface/80 bg-tijum-cream/55 p-7 sm:p-10 lg:col-span-5 lg:border-t-0 lg:border-l lg:p-12">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-white text-tijum-plum shadow-2xs">
                                            <Wallet
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="text-[11px] font-semibold tracking-wide text-tijum-lavender uppercase">
                                                Stay credits
                                            </p>
                                            <p className="font-heading text-sm font-bold text-tijum-plum">
                                                1 Point = ₹1.00 INR
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full border border-tijum-surface bg-white px-2.5 py-0.5 font-heading text-[11px] font-semibold text-tijum-plum">
                                        Up to 5 friends
                                    </span>
                                </div>

                                {user && personalReferralCode ? (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                                Your personal invite code
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="flex-1 rounded-xl border border-tijum-coral/35 bg-white px-4 py-2.5 font-mono text-base font-bold tracking-widest text-tijum-plum select-all">
                                                    {personalReferralCode}
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={
                                                        copiedCode
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={handleCopyCode}
                                                    className="h-11 shrink-0 gap-1.5 px-4"
                                                >
                                                    {copiedCode ? (
                                                        <>
                                                            <Check
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                            <span>Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                            <span>Copy</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <a
                                                href={whatsappShareUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-tijum-emerald px-4 font-heading text-xs font-semibold text-white shadow-xs transition hover:opacity-90"
                                            >
                                                <MessageCircle
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                                <span>Share on WhatsApp</span>
                                            </a>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCopyLink}
                                                className="h-10 gap-1.5 text-xs"
                                            >
                                                <Share2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {copiedLink
                                                        ? 'Link copied'
                                                        : 'Copy link'}
                                                </span>
                                            </Button>
                                        </div>

                                        <Link
                                            href="/rewards/referrals"
                                            className="inline-flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum underline underline-offset-4 hover:text-[#D9523F]"
                                        >
                                            <span>Open rewards hub</span>
                                            <ArrowRight
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </div>
                                ) : user ? (
                                    <div className="space-y-4">
                                        <p className="text-sm leading-relaxed text-tijum-lavender">
                                            Welcome,{' '}
                                            <span className="font-semibold text-tijum-plum">
                                                {user.name}
                                            </span>
                                            . Open your rewards portal to copy
                                            and track your invite code.
                                        </p>
                                        <Button
                                            size="lg"
                                            variant="plum"
                                            className="w-full"
                                            asChild
                                        >
                                            <Link href="/rewards/referrals">
                                                Open rewards hub
                                                <ArrowRight aria-hidden="true" />
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm leading-relaxed text-tijum-lavender">
                                            Create your free TIJUM account to
                                            unlock your personal referral code
                                            and redeem credits 1:1 on daily,
                                            weekly, or monthly bookings.
                                        </p>
                                        <div className="flex flex-col gap-2.5">
                                            <Button
                                                size="lg"
                                                variant="plum"
                                                className="w-full"
                                                asChild
                                            >
                                                <Link href="/register">
                                                    Get your referral code
                                                    <ArrowRight aria-hidden="true" />
                                                </Link>
                                            </Button>
                                            <Link
                                                href="/login"
                                                className="text-center font-heading text-xs font-semibold text-tijum-lavender underline underline-offset-4 transition-colors hover:text-tijum-plum"
                                            >
                                                Already have an account? Sign in
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
