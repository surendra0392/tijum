import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { becomeAPartner, search } from '@/routes/public';

export function FinalCtaSection() {
    return (
        <section
            aria-labelledby="final-cta-heading"
            className="bg-white pt-6 pb-16 sm:pt-8 sm:pb-20"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={20} duration={0.7}>
                    <div className="relative overflow-hidden rounded-[28px] border border-tijum-peach/55 bg-tijum-cream px-6 py-12 text-center shadow-tijum-card sm:px-10 sm:py-14 lg:px-16 lg:py-16">
                        <div className="relative z-10 mx-auto max-w-2xl space-y-5">
                            <h2
                                id="final-cta-heading"
                                className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-3xl lg:text-4xl"
                            >
                                Ready to find your next stay?
                            </h2>
                            <p className="mx-auto max-w-[54ch] text-base leading-relaxed text-tijum-lavender">
                                Compare verified rooms, upfront pricing, and
                                exact meal details across our launch cities in
                                minutes.
                            </p>
                            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap">
                                <Button size="lg" asChild>
                                    <Link href={search()}>
                                        <span>Explore stays</span>
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>

                                <Button variant="plum" size="lg" asChild>
                                    <Link href={becomeAPartner()}>
                                        List your property
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
