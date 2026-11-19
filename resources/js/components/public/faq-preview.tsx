import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { FaqAccordion } from '@/components/public/faq-accordion';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { createHomeFaqs } from '@/data/public-content';
import { faqs } from '@/routes/public';
import type { StayTimingData } from '@/types/public-search';

export function FaqPreviewSection({ timing }: { timing: StayTimingData }) {
    const homeFaqs = createHomeFaqs(timing);

    return (
        <section
            aria-labelledby="faq-preview-heading"
            className="bg-tijum-cream py-16 sm:py-20"
        >
            <ResponsiveContainer width="wide">
                <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-14">
                    <ScrollReveal
                        direction="up"
                        distance={18}
                        className="space-y-4 lg:sticky lg:top-24 lg:col-span-4"
                    >
                        <h2
                            id="faq-preview-heading"
                            className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-3xl lg:text-[34px] lg:leading-tight"
                        >
                            Common questions, answered clearly
                        </h2>
                        <p className="text-sm leading-relaxed text-tijum-lavender sm:text-base">
                            Quick answers on meals, stay durations, check-in
                            windows, payments, and listing your property.
                        </p>
                        <div className="pt-2">
                            <Button variant="outline" asChild>
                                <Link href={faqs()}>
                                    <span>View all FAQs</span>
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal
                        direction="up"
                        distance={20}
                        className="lg:col-span-8"
                    >
                        <FaqAccordion
                            items={homeFaqs}
                            labelledBy="faq-preview-heading"
                            openFirst
                        />
                    </ScrollReveal>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
