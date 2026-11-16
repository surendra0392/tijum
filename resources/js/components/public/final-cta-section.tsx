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
            className="overflow-hidden bg-tijum-cream py-14 sm:py-16 lg:py-20"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={25} duration={0.75}>
                    <div className="rounded-[28px] bg-tijum-plum px-6 py-12 text-center text-tijum-cream shadow-tijum-soft sm:px-10 sm:py-14 lg:px-16 lg:py-16">
                        <div className="mx-auto max-w-2xl space-y-5">
                            <h2
                                id="final-cta-heading"
                                className="tijum-section-title text-tijum-cream"
                            >
                                Your next stay starts with TIJUM.
                            </h2>
                            <p className="text-base leading-relaxed text-tijum-cream/85">
                                Compare real room types, exact meal inclusions,
                                and supported stay durations before you hold
                                inventory and pay.
                            </p>
                            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap">
                                <Button
                                    size="lg"
                                    className="transition-transform duration-200 active:scale-95"
                                    asChild
                                >
                                    <Link href={search()}>
                                        <span>Explore stays</span>
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="border-tijum-cream/45 bg-transparent text-tijum-cream transition-transform duration-200 hover:bg-tijum-cream/10 hover:text-tijum-cream active:scale-95"
                                    asChild
                                >
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
