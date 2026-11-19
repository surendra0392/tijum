import { ArrowRight, Clock3, ShieldCheck, Sunrise } from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { createCheckinRules } from '@/data/public-content';
import type { StayTimingData } from '@/types/public-search';

export function CheckinFlexibilitySection({
    timing,
}: {
    timing: StayTimingData;
}) {
    const rules = createCheckinRules(timing);
    const checkoutTimeClean = rules.standardCheckout
        .replace(/\s*\(stay end date\)/i, '')
        .trim();

    const scheduleSteps = [
        {
            id: 'early-arrival',
            icon: Sunrise,
            label: 'Early arrival request',
            time: rules.earliestEarlyCheckin,
            detail: 'Requestable subject to room readiness',
        },
        {
            id: 'standard-checkin',
            icon: Clock3,
            label: 'Standard check-in',
            time: rules.standardCheckin,
            detail: 'Guaranteed window on your arrival date',
        },
        {
            id: 'standard-checkout',
            icon: ArrowRight,
            label: 'Standard checkout',
            time: checkoutTimeClean,
            detail: 'Departure time on your stay end date',
        },
    ];

    return (
        <section
            aria-labelledby="checkin-flexibility-heading"
            className="border-b border-tijum-surface/80 bg-white pt-2 pb-16 sm:pb-20"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={18} duration={0.6}>
                    <div className="overflow-hidden rounded-[26px] border border-tijum-surface/90 bg-tijum-cream/55 shadow-tijum-card">
                        <div className="flex flex-col gap-3 border-b border-tijum-surface/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                            <div>
                                <h2
                                    id="checkin-flexibility-heading"
                                    className="font-heading text-lg font-bold text-tijum-plum sm:text-xl"
                                >
                                    Consistent arrival &amp; checkout schedule
                                </h2>
                                <p className="mt-0.5 text-xs text-tijum-lavender sm:text-sm">
                                    One clear check-in standard across TIJUM
                                    stays, with zero extra charge for early
                                    arrival requests.
                                </p>
                            </div>
                            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-heading text-xs font-semibold text-emerald-800">
                                <ShieldCheck
                                    className="size-3.5 text-emerald-600"
                                    aria-hidden="true"
                                />
                                <span>₹0 early arrival fee</span>
                            </span>
                        </div>

                        <div className="grid divide-y divide-tijum-surface/75 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                            {scheduleSteps.map((step) => {
                                const Icon = step.icon;

                                return (
                                    <article
                                        key={step.id}
                                        className="flex items-start gap-4 p-6 sm:px-8 sm:py-6"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-tijum-plum shadow-2xs">
                                            <Icon
                                                className="size-4.5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-heading text-2xl font-bold tracking-tight tabular-nums text-tijum-plum">
                                                {step.time}
                                            </p>
                                            <p className="mt-0.5 font-heading text-sm font-semibold text-tijum-plum">
                                                {step.label}
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-tijum-lavender">
                                                {step.detail}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
