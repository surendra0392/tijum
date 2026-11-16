import { ArrowRight, Clock3, Info, ShieldCheck, Sunrise } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
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
    // Strip redundant parenthetical text from the raw timing string for a clean digit display
    const checkoutTimeClean = rules.standardCheckout
        .replace(/\s*\(stay end date\)/i, '')
        .trim();

    const scheduleSteps = [
        {
            id: 'early-arrival',
            icon: Sunrise,
            label: 'Earliest Early Arrival',
            time: rules.earliestEarlyCheckin,
            statusBadge: 'Request Only',
            detail: 'Subject to room availability & readiness',
            iconBg: 'bg-tijum-peach/30 text-tijum-plum',
        },
        {
            id: 'standard-checkin',
            icon: Clock3,
            label: 'Standard Check-in',
            time: rules.standardCheckin,
            statusBadge: 'Official Time',
            detail: 'Guaranteed arrival window on start date',
            iconBg: 'bg-tijum-plum text-tijum-cream',
        },
        {
            id: 'standard-checkout',
            icon: ArrowRight,
            label: 'Standard Checkout',
            time: checkoutTimeClean,
            statusBadge: 'Departure Day',
            detail: 'Checkout on your calculated stay end date',
            iconBg: 'bg-tijum-cream text-tijum-plum border border-tijum-surface',
        },
    ];

    return (
        <section
            aria-labelledby="checkin-flexibility-heading"
            className="border-y border-tijum-surface bg-white py-14 sm:py-16"
        >
            <ResponsiveContainer width="wide" className="space-y-8 sm:space-y-10">
                <ScrollReveal direction="up" distance={20} duration={0.6}>
                    <SectionHeading
                        id="checkin-flexibility-heading"
                        badge
                        eyebrow="Arrival & Schedules"
                        title="Plan your arrival without guesswork"
                        description="TIJUM uses one transparent schedule across all properties. Earlier arrival is an eligible request, not an automatic entitlement."
                    />
                </ScrollReveal>

                <div className="grid gap-5 lg:grid-cols-12 lg:items-stretch">
                    {/* Left: 3 Compact, Balanced Schedule Cards */}
                    <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
                        {scheduleSteps.map((step, idx) => {
                            const Icon = step.icon;
                            return (
                                <article
                                    key={step.id}
                                    className="group relative flex flex-col justify-between rounded-[20px] border border-tijum-surface bg-tijum-cream/55 p-5 shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach hover:bg-tijum-cream"
                                >
                                    <div className="flex items-center justify-between gap-2 border-b border-tijum-surface pb-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${step.iconBg}`}
                                            >
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <span className="font-heading text-xs font-semibold tabular-nums text-tijum-lavender">
                                                0{idx + 1}
                                            </span>
                                        </div>
                                        <span className="rounded-full bg-tijum-peach/30 px-2.5 py-0.5 font-heading text-[10px] font-semibold text-tijum-plum">
                                            {step.statusBadge}
                                        </span>
                                    </div>

                                    <div className="space-y-1 py-4">
                                        <p className="font-heading text-2xl font-bold tracking-tight tabular-nums text-tijum-plum sm:text-[26px]">
                                            {step.time}
                                        </p>
                                        <p className="font-heading text-xs font-bold text-tijum-plum sm:text-sm">
                                            {step.label}
                                        </p>
                                    </div>

                                    <p className="border-t border-tijum-surface pt-3 text-xs leading-relaxed text-tijum-lavender">
                                        {step.detail}
                                    </p>
                                </article>
                            );
                        })}
                    </div>

                    {/* Right: Policy & Fee Clarity Card */}
                    <aside className="flex flex-col justify-between rounded-[20px] bg-tijum-plum p-6 text-tijum-cream shadow-tijum-card lg:col-span-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-tijum-peach/20 px-2.5 py-0.5 text-[11px] font-semibold text-tijum-peach">
                                    <Info className="size-3" aria-hidden="true" />
                                    <span>Early Arrival Policy</span>
                                </span>
                                <span className="rounded-full border border-tijum-emerald/40 bg-tijum-emerald/15 px-2.5 py-0.5 text-[10px] font-semibold text-tijum-cream">
                                    ₹0 Fee
                                </span>
                            </div>

                            <h3 className="font-heading text-base font-bold text-white">
                                Requesting Earlier Arrival?
                            </h3>

                            <p className="text-xs leading-relaxed text-tijum-cream/80 sm:text-sm">
                                Early check-in depends on room enablement, availability, and housekeeping readiness. Earliest supported request is{' '}
                                <strong className="text-white">
                                    {rules.earliestEarlyCheckin}
                                </strong>
                                .
                            </p>
                        </div>

                        <div className="mt-5 flex items-center gap-2 border-t border-tijum-cream/15 pt-4 text-xs font-semibold text-tijum-peach">
                            <ShieldCheck
                                className="size-4 shrink-0 text-tijum-emerald"
                                aria-hidden="true"
                            />
                            <span>Zero Early Arrival Charges on TIJUM</span>
                        </div>
                    </aside>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
