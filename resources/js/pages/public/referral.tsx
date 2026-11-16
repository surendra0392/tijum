import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Check,
    Coins,
    Copy,
    Gift,
    Home,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { search as publicSearch } from '@/routes/public';

interface Props {
    referralCode: string;
    referrerName?: string;
    rewardPoints?: number;
}

const STAY_FORMATS = [
    {
        slug: 'hostels-pg',
        title: 'Hostels / PG',
        description:
            'Budget-friendly student & working stays with transparent daily or monthly rates.',
        icon: Building2,
    },
    {
        slug: 'homestays',
        title: 'Homestays',
        description:
            'Warm hospitality, private rooms, and regional meal inclusions clearly stated.',
        icon: Home,
    },
    {
        slug: 'co-living',
        title: 'Co-Living',
        description:
            'Modern community stays with high-speed WiFi, work setups, and clear house rules.',
        icon: Users,
    },
];

export default function PublicReferralPage({
    referralCode,
    referrerName = 'A friend',
    rewardPoints = 250,
}: Props) {
    const [copiedCode, setCopiedCode] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && referralCode) {
            try {
                localStorage.setItem('tijum_referral_code', referralCode);
                document.cookie = `tijum_referral_code=${encodeURIComponent(referralCode)}; path=/; max-age=2592000; SameSite=Lax`;
            } catch {
                // Ignore storage errors in restrictive environments
            }
        }
    }, [referralCode]);

    const registerUrl = `/register?ref=${encodeURIComponent(referralCode)}`;

    const handleCopyCode = async () => {
        if (typeof window === 'undefined' || !referralCode) {
            return;
        }
        try {
            await navigator.clipboard.writeText(referralCode);
            setCopiedCode(true);
            window.setTimeout(() => setCopiedCode(false), 2000);
        } catch {
            // Clipboard fallback
        }
    };

    return (
        <section className="bg-tijum-cream py-8 text-tijum-plum sm:py-12 lg:py-16">
            <Head
                title={`You're invited to TIJUM — Get ₹${rewardPoints} Stay Credit`}
            />

            <ResponsiveContainer width="narrow" className="space-y-10">
                <Breadcrumbs
                    items={[{ label: 'Referral Invitation', current: true }]}
                    tone="dark"
                    showHome
                />

                {/* Architectural Invite Card */}
                <div className="rounded-[28px] bg-tijum-plum p-8 text-center text-tijum-cream shadow-tijum-soft sm:p-12">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-tijum-peach/25 bg-tijum-peach/15 px-3.5 py-1 font-heading text-xs font-semibold text-tijum-peach">
                        <Gift className="size-3.5" aria-hidden="true" />
                        <span>Exclusive Invitation</span>
                    </div>

                    <h1 className="mt-5 font-heading text-2xl leading-[1.12] font-bold tracking-[-0.025em] text-white sm:text-4xl text-balance">
                        {referrerName} invited you to TIJUM
                    </h1>

                    <p className="mx-auto mt-4 max-w-[55ch] text-sm leading-relaxed text-tijum-cream/85 sm:text-base text-pretty">
                        Join TIJUM for transparent Hostels/PG, Homestays, and
                        Co-Living stays. Receive{' '}
                        <strong className="font-heading text-white">
                            {rewardPoints} loyalty points (₹{rewardPoints} value)
                        </strong>{' '}
                        toward eligible stays on TIJUM!
                    </p>

                    {/* Referral Code Pill */}
                    <div className="mx-auto mt-7 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-tijum-cream/20 bg-tijum-cream/10 px-5 py-3">
                        <span className="font-heading text-xs font-semibold text-tijum-peach">
                            Invite Code:
                        </span>
                        <span className="font-mono text-lg font-bold tracking-widest text-white">
                            {referralCode}
                        </span>
                        <Badge
                            variant="outline"
                            className="border-tijum-emerald/45 bg-tijum-emerald/20 text-xs font-semibold text-white"
                        >
                            Applied
                        </Badge>
                        <button
                            type="button"
                            onClick={handleCopyCode}
                            aria-label="Copy referral code"
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-tijum-cream/15 px-2.5 py-1 font-heading text-xs font-semibold text-tijum-cream hover:bg-tijum-cream/25"
                        >
                            {copiedCode ? (
                                <>
                                    <Check
                                        className="size-3.5 text-tijum-emerald"
                                        aria-hidden="true"
                                    />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button size="lg" className="w-full sm:w-auto" asChild>
                            <Link href={registerUrl}>
                                <span>Create Free Account</span>
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full border-tijum-cream/35 bg-transparent text-tijum-cream hover:bg-tijum-cream/10 hover:text-tijum-cream sm:w-auto"
                            asChild
                        >
                            <Link href={publicSearch()}>Browse Stays First</Link>
                        </Button>
                    </div>
                </div>

                {/* 3 Canonical Accommodation Categories */}
                <div className="space-y-5">
                    <div className="space-y-1.5 text-center">
                        <h2 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl">
                            Stay easy. Eat well. Spend less.
                        </h2>
                        <p className="text-sm text-tijum-lavender">
                            Discover verified properties with transparent pricing
                            and property-specific meal inclusions.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {STAY_FORMATS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.slug}
                                    href={publicSearch.url({
                                        query: { category: item.slug },
                                    })}
                                    className="group rounded-[24px] border border-tijum-surface bg-white p-6 text-center shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach"
                                >
                                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-tijum-peach/30 text-tijum-plum transition-colors group-hover:bg-tijum-plum group-hover:text-tijum-cream">
                                        <Icon
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <h3 className="mt-4 font-heading text-base font-bold text-tijum-plum">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1.5 text-xs leading-relaxed text-tijum-lavender">
                                        {item.description}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Trust Guarantees */}
                <div className="grid gap-4 rounded-[20px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <ShieldCheck
                            className="size-5 shrink-0 text-tijum-emerald"
                            aria-hidden="true"
                        />
                        <span className="font-heading text-xs font-semibold text-tijum-plum">
                            Verified Booking stays &amp; meals
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Coins
                            className="size-5 shrink-0 text-tijum-plum"
                            aria-hidden="true"
                        />
                        <span className="font-heading text-xs font-semibold text-tijum-plum">
                            1 Point = ₹1.00 stay credit
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Sparkles
                            className="size-5 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span className="font-heading text-xs font-semibold text-tijum-plum">
                            Instant payment confirmation
                        </span>
                    </div>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
