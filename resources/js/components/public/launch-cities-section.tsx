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
            className="tijum-anchor-target bg-tijum-cream py-16 sm:py-20"
        >
            <ResponsiveContainer
                width="wide"
                className="space-y-9 sm:space-y-10"
            >
                <ScrollReveal direction="up" distance={18} duration={0.6}>
                    <SectionHeading
                        id="launch-cities-heading"
                        title="Explore stays by city"
                        description="Find verified stays near tech parks, universities, and transit corridors across our active cities."
                    />
                </ScrollReveal>

                <ScrollReveal
                    direction="up"
                    distance={22}
                    stagger={0.09}
                    className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
                >
                    {LAUNCH_CITIES.map((city) => (
                        <Link
                            key={city.slug}
                            href={cityShow(city.slug)}
                            className="group relative flex aspect-[16/10] flex-col justify-between overflow-hidden rounded-[26px] bg-tijum-plum shadow-tijum-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-tijum-soft focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:aspect-[4/5]"
                        >
                            <div className="absolute inset-0 h-full w-full">
                                <CityPicture city={city} />
                            </div>

                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#241522]/92 via-[#241522]/32 to-[#241522]/10"
                            />

                            <div className="relative z-10 flex items-center justify-between p-4 sm:p-5">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#241522]/55 px-3 py-1 text-[11px] font-semibold text-tijum-cream backdrop-blur-md">
                                    <MapPin
                                        className="size-3.5 shrink-0 text-[#ff7a67]"
                                        style={{ color: '#ff7a67' }}
                                        aria-hidden="true"
                                    />
                                    <span>{city.state}</span>
                                </span>

                                <span className="flex size-8.5 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-tijum-coral group-hover:bg-tijum-coral">
                                    <ArrowUpRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                            </div>

                            <div className="relative z-10 space-y-1.5 p-4 pt-0 sm:p-5 sm:pt-0">
                                <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
                                    {city.name}
                                </h3>
                                <p className="line-clamp-2 text-xs leading-relaxed text-tijum-cream/80 sm:text-[13px]">
                                    {city.context}
                                </p>
                            </div>
                        </Link>
                    ))}
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
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
        </picture>
    );
}
