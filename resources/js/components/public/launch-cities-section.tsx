import { Link } from '@inertiajs/react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { LAUNCH_CITIES } from '@/data/public-content';
import { show as cityShow } from '@/routes/public/cities';

export function LaunchCitiesSection() {
    return (
        <section
            id="launch-cities"
            aria-labelledby="launch-cities-heading"
            className="tijum-anchor-target tijum-section bg-tijum-cream"
        >
            <ResponsiveContainer
                width="wide"
                className="space-y-10 lg:space-y-12"
            >
                <ScrollReveal direction="up" distance={20} duration={0.6}>
                    <SectionHeading
                        id="launch-cities-heading"
                        eyebrow="Explore Locations"
                        title="Destinations across our first markets"
                        description="Explore the cities currently represented by TIJUM data. Property availability depends on live eligibility for your dates and stay needs."
                    />
                </ScrollReveal>

                <ScrollReveal direction="up" distance={24} stagger={0.12}>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                        {LAUNCH_CITIES.map((city) => (
                            <Link
                                key={city.slug}
                                href={cityShow(city.slug)}
                                className="group flex flex-col overflow-hidden rounded-[24px] border border-tijum-surface bg-white shadow-tijum-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-tijum-peach hover:shadow-tijum-soft focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                            >
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-tijum-surface">
                                    <CityPicture city={city} />
                                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-tijum-plum/90 px-2.5 py-1 text-[11px] font-semibold text-tijum-cream shadow-2xs backdrop-blur-xs transition-transform duration-300 group-hover:scale-105">
                                        <MapPin
                                            className="size-3.5 shrink-0 text-[#ff7a67]"
                                            style={{ color: '#ff7a67' }}
                                            aria-hidden="true"
                                        />
                                        <span>{city.state}</span>
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col justify-between p-5 sm:p-5.5">
                                    <div>
                                        <h3 className="font-heading text-xl font-bold text-tijum-plum transition-colors duration-300 group-hover:text-tijum-coral">
                                            {city.name}
                                        </h3>
                                        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                                            {city.context}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-tijum-surface pt-3.5">
                                        <span className="font-heading text-xs font-semibold text-tijum-coral">
                                            Explore city
                                        </span>
                                        <span className="flex size-7.5 items-center justify-center rounded-lg bg-tijum-coral/15 text-tijum-coral transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-tijum-coral group-hover:text-white">
                                            <ArrowUpRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}

type City = (typeof LAUNCH_CITIES)[number];

function CityPicture({ city }: { city: City }) {
    return (
        <picture className="block h-full w-full overflow-hidden bg-tijum-surface">
            <source
                srcSet={city.image.webpSrcSet}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                type="image/webp"
            />
            <source
                srcSet={city.image.jpgSrcSet}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                type="image/jpeg"
            />
            <img
                src={city.image.fallbackSrc}
                alt={city.image.alt}
                width={city.image.width}
                height={city.image.height}
                loading="lazy"
                className="tijum-image-zoom h-full w-full object-cover"
            />
        </picture>
    );
}
