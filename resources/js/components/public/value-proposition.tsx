import { Building2, CalendarClock, ShieldCheck, Utensils } from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import {
    VALUE_PROPOSITIONS,
    type ValuePropositionItem,
} from '@/data/public-content';

const iconMap: Record<ValuePropositionItem['icon'], typeof Utensils> = {
    utensils: Utensils,
    wallet: Building2,
    calendar: CalendarClock,
    shield: ShieldCheck,
};

const conciseDescriptions: Record<string, string> = {
    'food-included':
        'See exact breakfast, lunch, and dinner inclusions before booking.',
    'transparent-pricing':
        'Real room rates for Hostels/PG, Homestays, and Co-Living.',
    'stay-durations':
        'Switch cleanly between daily, weekly, and monthly stay plans.',
    'clear-information':
        'Amenities, availability, and check-in rules verified upfront.',
};

export function ValuePropositionSection() {
    return (
        <section
            aria-label="Key benefits of booking with TIJUM"
            className="border-y border-tijum-surface/80 bg-white py-7 sm:py-8"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal
                    direction="up"
                    distance={16}
                    stagger={0.07}
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0"
                >
                    {VALUE_PROPOSITIONS.map((item) => {
                        const Icon = iconMap[item.icon];

                        return (
                            <article
                                key={item.id}
                                className="flex items-start gap-3.5 lg:border-r lg:border-tijum-surface/75 lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-cream text-[#E05A47]">
                                    <Icon
                                        className="size-4.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="font-heading text-sm font-bold text-tijum-plum sm:text-[15px]">
                                        {item.title}
                                    </h2>
                                    <p className="mt-0.5 text-xs leading-relaxed text-tijum-lavender sm:text-[13px]">
                                        {conciseDescriptions[item.id] ??
                                            item.description}
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
