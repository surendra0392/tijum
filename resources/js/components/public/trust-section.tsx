import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    CreditCard,
    MessageSquareText,
} from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { reviewPolicy } from '@/routes';

const trustItems = [
    {
        icon: MessageSquareText,
        title: 'Verified Booking reviews',
        description:
            'Review eligibility is connected to an eligible paid reservation after checkout, not an identity-verification claim.',
    },
    {
        icon: CreditCard,
        title: 'Backend-verified payments',
        description:
            'A browser callback never confirms a reservation by itself. TIJUM verifies payment on the backend.',
    },
    {
        icon: BadgeCheck,
        title: 'Reservation state clarity',
        description:
            'Instant booking hold, payment window, automatic confirmation, cancellation, and expiry are shown as distinct states.',
    },
];

export function TrustSection() {
    return (
        <section
            aria-labelledby="trust-heading"
            className="border-y border-tijum-surface bg-tijum-peach/14 py-14 sm:py-16"
        >
            <ResponsiveContainer width="wide">
                <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
                    <div className="space-y-3.5 lg:col-span-4">
                        <p className="font-heading text-xs font-semibold uppercase tracking-wider text-tijum-lavender sm:text-sm">
                            Platform Integrity
                        </p>
                        <h2
                            id="trust-heading"
                            className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl lg:text-[34px] leading-tight text-balance"
                        >
                            Trust comes from precise language
                        </h2>
                        <p className="text-base leading-relaxed text-tijum-lavender text-pretty">
                            TIJUM explains what the platform can establish and
                            avoids promises the data cannot support.
                        </p>
                        <Link
                            href={reviewPolicy()}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg font-heading text-sm font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                        >
                            Read the review policy
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="divide-y divide-tijum-surface border-y border-tijum-surface lg:col-span-8">
                        {trustItems.map((item) => (
                            <article
                                key={item.title}
                                className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr_1.5fr] sm:items-start sm:gap-5 sm:py-6"
                            >
                                <span className="flex size-10 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream">
                                    <item.icon
                                        className="size-4.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h3 className="font-heading text-base font-semibold text-tijum-plum">
                                    {item.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-tijum-lavender">
                                    {item.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
