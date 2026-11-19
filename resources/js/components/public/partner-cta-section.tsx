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
            className="border-y border-tijum-surface/80 bg-white py-16 sm:py-20"
        >
            <ResponsiveContainer width="wide">
                <ScrollReveal direction="up" distance={22} duration={0.7}>
                    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                        <div className="overflow-hidden rounded-[28px] border border-tijum-surface bg-tijum-surface shadow-tijum-card lg:col-span-5">
                            <picture className="block">
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
                                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] lg:aspect-[5/4]"
                                />
                            </picture>
                        </div>

                        <div className="space-y-6 lg:col-span-7">
                            <div className="space-y-3.5">
                                <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                    For property owners
                                </p>
                                <h2
                                    id="partner-cta-heading"
                                    className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-3xl lg:text-4xl lg:leading-[1.12]"
                                >
                                    List your Hostel, PG, Homestay, or Co-Living
                                </h2>
                                <p className="max-w-[58ch] text-base leading-relaxed text-tijum-lavender">
                                    Showcase your rooms, meal inclusions, and
                                    live availability clearly so serious guests
                                    book faster with fewer phone calls.
                                </p>
                            </div>

                            <ul className="grid gap-3 sm:grid-cols-2">
                                {PARTNER_BENEFITS.slice(0, 4).map((benefit) => (
                                    <li
                                        key={benefit}
                                        className="flex items-start gap-2.5 text-sm leading-relaxed text-tijum-plum"
                                    >
                                        <CheckCircle2
                                            className="mt-0.5 size-4 shrink-0 text-[#E05A47]"
                                            aria-hidden="true"
                                        />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <Button size="lg" variant="plum" asChild>
                                    <Link href={ownerRegister()}>
                                        List your property
                                        <ArrowRight aria-hidden="true" />
                                    </Link>
                                </Button>
                                <Button variant="outline" size="lg" asChild>
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
