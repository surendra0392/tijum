import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarCheck,
    CreditCard,
    MapPinCheckInside,
    MessageSquare,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import {
    HOW_IT_WORKS_STEPS,
    type HowItWorksStepItem,
} from '@/data/public-content';
import { howItWorks } from '@/routes/public';

const stepIconMap: Record<HowItWorksStepItem['icon'], typeof Search> = {
    search: Search,
    sliders: SlidersHorizontal,
    'calendar-check': CalendarCheck,
    'message-check': MessageSquare,
    'credit-card': CreditCard,
    'map-pin': MapPinCheckInside,
};

export function HowItWorksSection() {
    return (
        <section
            aria-labelledby="how-it-works-heading"
            className="tijum-section bg-tijum-surface/25"
        >
            <ResponsiveContainer width="wide" className="space-y-12">
                <ScrollReveal direction="up" distance={20} duration={0.6}>
                    <SectionHeading
                        id="how-it-works-heading"
                        eyebrow="Simple Process"
                        title="A clear path from search to stay"
                        description="Selecting an eligible room starts a 15-minute inventory hold. Backend-verified payment confirms the booking automatically."
                        action={
                            <Button
                                variant="outline"
                                className="transition-transform duration-200 active:scale-95"
                                asChild
                            >
                                <Link href={howItWorks()}>
                                    Full booking guide
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        }
                    />
                </ScrollReveal>

                <ScrollReveal direction="up" distance={24} stagger={0.12}>
                    <ol className="relative border-l border-tijum-plum/20 pl-7 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-12 md:border-l-0 md:pl-0 xl:grid-cols-3">
                        {HOW_IT_WORKS_STEPS.map((item, index) => {
                            const Icon = stepIconMap[item.icon];

                            return (
                                <li
                                    key={item.step}
                                    className="group relative pb-10 last:pb-0 md:border-t md:border-tijum-plum/20 md:pt-7 md:pb-0"
                                >
                                    <span className="absolute top-0 -left-[2.45rem] flex size-6 items-center justify-center rounded-full bg-tijum-coral font-heading text-[10px] font-bold text-tijum-plum shadow-xs transition-transform duration-300 group-hover:scale-125 md:-top-3 md:left-0">
                                        {index + 1}
                                    </span>
                                    <div className="space-y-4">
                                        <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream transition-all duration-300 group-hover:scale-105 group-hover:bg-tijum-coral">
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="space-y-2">
                                            <h3 className="font-heading text-xl font-semibold text-tijum-plum transition-colors duration-200 group-hover:text-tijum-coral">
                                                {item.title}
                                            </h3>
                                            <p className="max-w-sm text-sm leading-relaxed text-tijum-lavender">
                                                {item.description}
                                            </p>
                                            <p className="font-heading text-xs font-semibold text-tijum-coral">
                                                {item.note}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
