import {
    CheckCircle2,
    Clock,
    Headphones,
    ShieldCheck,
    Sparkles,
    Utensils,
    Wallet,
} from 'lucide-react';
import type { ElementType } from 'react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { WHY_CHOOSE_TIJUM } from '@/data/public-content';

const iconMap: Record<string, ElementType> = {
    'food-inclusive': Utensils,
    'affordable-choices': Wallet,
    'transparent-info': ShieldCheck,
    'convenient-booking': CheckCircle2,
    'flexible-arrival': Clock,
    'customer-support': Headphones,
};

export function WhyTijumSection() {
    return (
        <section
            aria-labelledby="why-tijum-heading"
            className="border-y border-tijum-surface bg-tijum-cream py-14 sm:py-16 lg:py-20"
        >
            <ResponsiveContainer width="wide">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
                    {/* Left Column: Focused Intro */}
                    <ScrollReveal
                        direction="up"
                        distance={20}
                        className="space-y-5 lg:sticky lg:top-24 lg:col-span-4"
                    >
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-tijum-peach bg-tijum-peach/25 px-3 py-1 font-heading text-xs font-semibold tracking-wider text-tijum-plum uppercase">
                            <Sparkles className="size-3" aria-hidden="true" />
                            <span>Why TIJUM</span>
                        </div>

                        <div className="space-y-3">
                            <h2
                                id="why-tijum-heading"
                                className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl lg:text-[34px] leading-tight text-balance"
                            >
                                The useful details belong up front
                            </h2>
                            <p className="max-w-[55ch] text-sm leading-relaxed text-tijum-lavender sm:text-base text-pretty">
                                TIJUM keeps discovery focused on the information a customer needs to compare a real stay—not on decorative claims.
                            </p>
                        </div>

                        {/* Value Reassurance Callout */}
                        <div className="rounded-[20px] border border-tijum-surface bg-white p-5 shadow-tijum-card">
                            <p className="font-heading text-xs font-bold tracking-wide text-tijum-plum uppercase">
                                Stay Easy · Eat Well · Spend Less
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                                Every listing displays clear meal inclusions, transparent room rates, and verified stay terms before you book.
                            </p>
                        </div>
                    </ScrollReveal>

                    {/* Right Column: Compact 2-Column Feature Cards */}
                    <div className="lg:col-span-8">
                        <ScrollReveal
                            direction="up"
                            distance={20}
                            stagger={0.06}
                            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                        >
                            {WHY_CHOOSE_TIJUM.map((item, index) => {
                                const Icon = iconMap[item.id] || Sparkles;

                                return (
                                    <article
                                        key={item.id}
                                        className="group relative flex flex-col justify-between rounded-[20px] border border-tijum-surface bg-white p-6 shadow-tijum-card transition-all duration-300 hover:-translate-y-0.5 hover:border-tijum-peach hover:shadow-tijum-soft"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/25 text-tijum-plum transition-colors duration-300 group-hover:bg-tijum-plum group-hover:text-tijum-cream">
                                                <Icon
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <span className="font-heading text-xs font-bold tabular-nums text-tijum-lavender transition-colors group-hover:text-tijum-plum">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-1.5">
                                            <h3 className="font-heading text-base font-bold text-tijum-plum">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm leading-relaxed text-tijum-lavender">
                                                {item.description}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </ScrollReveal>
                    </div>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
