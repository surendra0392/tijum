import { Link } from '@inertiajs/react';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { FaqAccordion } from '@/components/public/faq-accordion';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import { createHomeFaqs } from '@/data/public-content';
import { faqs } from '@/routes/public';
import type { StayTimingData } from '@/types/public-search';

export function FaqPreviewSection({ timing }: { timing: StayTimingData }) {
    const homeFaqs = createHomeFaqs(timing);

    return (
        <section
            aria-labelledby="faq-preview-heading"
            className="tijum-section bg-tijum-cream"
        >
            <ResponsiveContainer width="wide">
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                    <div className="space-y-4 lg:col-span-4">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-tijum-peach/35 text-tijum-plum">
                            <HelpCircle className="size-5" aria-hidden="true" />
                        </span>
                        <p className="font-heading text-xs font-semibold uppercase tracking-wider text-tijum-lavender sm:text-sm">
                            Got Questions?
                        </p>
                        <h2
                            id="faq-preview-heading"
                            className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl lg:text-[34px] leading-tight text-balance"
                        >
                            Clear answers before you book a stay
                        </h2>
                        <p className="text-base leading-relaxed text-tijum-lavender text-pretty">
                            Review meal inclusions, stay durations, arrival
                            windows, the inventory hold, payment, and partner
                            onboarding.
                        </p>
                        <div className="pt-2">
                            <Button variant="outline" asChild>
                                <Link href={faqs()}>
                                    <span>View all FAQs</span>
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <FaqAccordion
                            items={homeFaqs}
                            labelledBy="faq-preview-heading"
                            openFirst
                        />
                    </div>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
