import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarCheck,
    CheckCircle2,
    CreditCard,
    Search,
} from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { reviewPolicy } from '@/routes';
import { howItWorks } from '@/routes/public';

const BOOKING_STEPS = [
    {
        step: '01',
        title: 'Search & compare',
        description:
            'Filter by city, stay duration, gender preference, room type, and exact meal inclusions.',
        icon: Search,
    },
    {
        step: '02',
        title: 'Hold for 15 minutes',
        description:
            'Reserve your room type and locked rate with a 15-minute checkout hold while you review.',
        icon: CalendarCheck,
    },
    {
        step: '03',
        title: 'Pay securely online',
        description:
            'Complete payment through Razorpay with UPI, cards, or netbanking at the displayed price.',
        icon: CreditCard,
    },
    {
        step: '04',
        title: 'Instant confirmation',
        description:
            'Your booking confirms automatically with receipt, check-in details, and guest protection.',
        icon: CheckCircle2,
    },
];

export function HowItWorksSection() {
    return (
        <section
            aria-labelledby="how-it-works-heading"
            className="border-t border-tijum-surface/80 bg-white pt-16 pb-12 sm:pt-20 sm:pb-14"
        >
            <ResponsiveContainer
                width="wide"
                className="space-y-10 sm:space-y-12"
            >
                <ScrollReveal direction="up" distance={18} duration={0.6}>
                    <SectionHeading
                        id="how-it-works-heading"
                        title="From search to confirmed stay in minutes"
                        description="No waiting for manual approvals or unclear quotes. Every step is transparent and verified."
                        action={
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href={reviewPolicy()}
                                    className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 font-heading text-xs font-semibold text-tijum-lavender underline decoration-tijum-surface underline-offset-4 transition-colors hover:text-tijum-plum sm:text-sm"
                                >
                                    Review policy
                                </Link>
                                <Button variant="outline" asChild>
                                    <Link href={howItWorks()}>
                                        Full booking guide
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                            </div>
                        }
                    />
                </ScrollReveal>

                <ScrollReveal
                    direction="up"
                    distance={20}
                    stagger={0.09}
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {BOOKING_STEPS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <article
                                key={item.step}
                                className="group relative flex flex-col justify-between rounded-[22px] border border-tijum-surface/85 bg-tijum-cream/35 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach hover:bg-tijum-cream/65"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-tijum-plum shadow-2xs transition-colors duration-300 group-hover:bg-tijum-coral group-hover:text-white">
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="font-heading text-xs font-bold tracking-wider tabular-nums text-tijum-lavender">
                                            {item.step}
                                        </span>
                                    </div>

                                    <h3 className="mt-5 font-heading text-lg font-bold text-tijum-plum">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-tijum-lavender">
                                        {item.description}
                                    </p>
                                </div>
                            </article>
                        );
                    })}
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
