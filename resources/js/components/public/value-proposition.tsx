import { Building2, CalendarClock, FileCheck2, Utensils } from 'lucide-react';
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
    shield: FileCheck2,
};

export function ValuePropositionSection() {
    return (
        <section
            aria-label="Key benefits of booking with TIJUM"
            className="bg-tijum-plum py-10 text-tijum-cream sm:py-12"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={20} stagger={0.1}>
                    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
                        {VALUE_PROPOSITIONS.map((item) => {
                            const Icon = iconMap[item.icon];

                            return (
                                <article
                                    key={item.id}
                                    className="group flex items-start gap-4 lg:border-r lg:border-tijum-cream/15 lg:px-7 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral text-tijum-plum shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#ff9584]">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="space-y-1">
                                        <h3 className="font-heading text-base font-bold text-tijum-cream transition-colors duration-200 group-hover:text-tijum-peach sm:text-lg">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-tijum-cream/70">
                                            {item.description}
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
