import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { PARTNER_BENEFITS, PUBLIC_IMAGES } from '@/data/public-content';
import { register as ownerRegister } from '@/routes/owner';
import { becomeAPartner } from '@/routes/public';

export function PartnerCtaSection() {
    const image = PUBLIC_IMAGES.partnerHospitality;

    return (
        <section
            aria-labelledby="partner-cta-heading"
            className="tijum-section overflow-hidden bg-tijum-cream"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={25} duration={0.8}>
                    <div className="grid overflow-hidden rounded-[28px] bg-tijum-plum text-tijum-cream shadow-tijum-soft lg:grid-cols-12">
                        <picture className="block min-h-80 overflow-hidden bg-tijum-surface lg:col-span-5 lg:min-h-[34rem]">
                            <source
                                srcSet={image.webpSrcSet}
                                sizes="(min-width: 1024px) 42vw, 100vw"
                                type="image/webp"
                            />
                            <source
                                srcSet={image.jpgSrcSet}
                                sizes={image.sizes}
                                type="image/jpeg"
                            />
                            <img
                                src={image.fallbackSrc}
                                alt={image.alt}
                                width={image.width}
                                height={image.height}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105"
                            />
                        </picture>

                        <div className="flex flex-col justify-center gap-7 p-7 sm:p-10 lg:col-span-7 lg:p-14 xl:p-16">
                            <div className="space-y-4">
                                <p className="font-heading text-sm font-semibold text-tijum-peach">
                                    For accommodation owners
                                </p>
                                <h2
                                    id="partner-cta-heading"
                                    className="tijum-section-title max-w-2xl text-tijum-cream"
                                >
                                    Have accommodation? Let&rsquo;s grow
                                    together.
                                </h2>
                                <p className="max-w-2xl text-base leading-relaxed text-tijum-cream/72 sm:text-lg">
                                    Present your Hostel/PG, Homestay, or
                                    Co-Living property with structured room
                                    types, exact meal information, live
                                    availability, and clear confirmed-booking
                                    management.
                                </p>
                            </div>

                            <ul className="grid gap-3 sm:grid-cols-2">
                                {PARTNER_BENEFITS.slice(0, 4).map((benefit) => (
                                    <li
                                        key={benefit}
                                        className="flex items-start gap-2.5 text-sm leading-relaxed text-tijum-cream/78"
                                    >
                                        <CheckCircle2
                                            className="mt-0.5 size-4 shrink-0 text-tijum-peach"
                                            aria-hidden="true"
                                        />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <Button
                                    size="lg"
                                    className="transition-transform duration-200 active:scale-95"
                                    asChild
                                >
                                    <Link href={ownerRegister()}>
                                        List your property
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
                                        Partner details
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
