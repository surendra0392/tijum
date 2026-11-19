import { Link } from '@inertiajs/react';
import gsap from 'gsap';
import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    ShieldCheck,
    UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { SearchPanel } from '@/components/public/search-panel';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import { PUBLIC_IMAGES } from '@/data/public-content';
import { howItWorks, search as searchRoute } from '@/routes/public';
import type { MarketingBanner } from '@/types/marketing';
import type {
    SearchLocationOption,
    StayTimingData,
} from '@/types/public-search';

type SearchOption = {
    id: number;
    name: string;
    slug?: string;
    state?: string | null;
};

type SearchProps = {
    cities: SearchOption[];
    locations: SearchLocationOption[];
    categories?: { id: number; name: string; slug?: string }[];
    durations: Record<string, { days: number; label?: string }>;
    timing: StayTimingData;
    defaults: {
        city: number | null;
        check_in: string;
        duration_type: string;
        duration_count: number;
        guests: number;
    };
};

type HeroSectionProps = {
    search?: SearchProps;
    heroBanners?: MarketingBanner[];
};

export function HeroSection({ search, heroBanners = [] }: HeroSectionProps) {
    const heroRef = useRef<HTMLElement>(null);
    const activeBanner = heroBanners[0] ?? null;
    const stayImage = PUBLIC_IMAGES.heroStay;
    const mealImage = PUBLIC_IMAGES.heroMeal;

    useEffect(() => {
        if (!heroRef.current) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const ctx = gsap.context(() => {
            gsap.from('.hero-anim-item', {
                opacity: 0,
                y: 20,
                duration: 0.7,
                stagger: 0.08,
                ease: 'power3.out',
                clearProps: 'all',
            });

            gsap.from('.hero-visual-item', {
                opacity: 0,
                scale: 0.98,
                duration: 0.85,
                delay: 0.12,
                ease: 'power3.out',
                clearProps: 'all',
            });

            gsap.from('.hero-search-anim', {
                opacity: 0,
                y: 22,
                duration: 0.75,
                delay: 0.25,
                ease: 'power3.out',
                clearProps: 'all',
            });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={heroRef}
            className="relative z-20 bg-tijum-cream pt-8 pb-12 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16"
        >
            <ResponsiveContainer width="wide" className="relative z-10">
                <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                    {/* Left Editorial Column */}
                    <div className="space-y-6 lg:col-span-6">
                        <div className="hero-anim-item inline-flex items-center gap-2 rounded-full border border-tijum-surface bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-tijum-plum shadow-2xs">
                            <span className="size-2 rounded-full bg-tijum-coral" />
                            <span>
                                Verified Stays · Hyderabad, Vijayawada, Guntur
                                &amp; Vizag
                            </span>
                        </div>

                        <div className="space-y-4">
                            <h1 className="hero-anim-item tijum-display max-w-xl text-tijum-plum">
                                Stay easy.
                                <br />
                                <span
                                    style={{ color: '#FF7A67' }}
                                    className="text-[#FF7A67]"
                                >
                                    Eat well.
                                </span>
                                <br />
                                Spend less.
                            </h1>

                            <p className="hero-anim-item max-w-[54ch] text-base leading-relaxed text-tijum-lavender sm:text-lg">
                                Book clean Hostels/PG, Homestays, and Co-Living
                                spaces with upfront room pricing and exact meal
                                inclusions shown before you pay.
                            </p>
                        </div>

                        <div className="hero-anim-item flex flex-wrap items-center gap-4 pt-1">
                            <Button size="lg" asChild>
                                <Link href={searchRoute.url()}>
                                    Explore stays
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>

                            <Link
                                href={howItWorks()}
                                className="group inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-heading text-sm font-semibold text-tijum-plum transition-colors hover:text-[#D9523F] focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                            >
                                <span>How booking works</span>
                                <ArrowRight
                                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>

                        <div className="hero-anim-item flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-tijum-surface/85 pt-5 text-xs font-medium text-tijum-lavender sm:text-sm">
                            <span className="inline-flex items-center gap-2">
                                <UtensilsCrossed
                                    className="size-4 shrink-0 text-[#E05A47]"
                                    aria-hidden="true"
                                />
                                Meals shown upfront
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2
                                    className="size-4 shrink-0 text-[#E05A47]"
                                    aria-hidden="true"
                                />
                                Instant confirmation
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Clock3
                                    className="size-4 shrink-0 text-[#E05A47]"
                                    aria-hidden="true"
                                />
                                Daily, weekly &amp; monthly
                            </span>
                        </div>
                    </div>

                    {/* Right Architectural Visual Column */}
                    <div className="hero-visual-item relative lg:col-span-6">
                        <div className="relative overflow-hidden rounded-[28px] border border-tijum-surface/80 bg-tijum-surface shadow-tijum-soft">
                            <picture className="block">
                                <source
                                    srcSet={stayImage.webpSrcSet}
                                    sizes={stayImage.sizes}
                                    type="image/webp"
                                />
                                <source
                                    srcSet={stayImage.jpgSrcSet}
                                    sizes={stayImage.sizes}
                                    type="image/jpeg"
                                />
                                <img
                                    src={stayImage.fallbackSrc}
                                    alt={stayImage.alt}
                                    width={stayImage.width}
                                    height={stayImage.height}
                                    className="aspect-[16/11] max-h-[430px] w-full object-cover"
                                    loading="eager"
                                    fetchPriority="high"
                                />
                            </picture>

                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#241522]/70 via-[#241522]/25 to-transparent"
                            />

                            {activeBanner && (
                                <a
                                    href={activeBanner.cta_url}
                                    className="absolute top-4 right-4 max-w-64 rounded-2xl border border-white/25 bg-tijum-plum/92 p-4 text-tijum-cream shadow-tijum-card backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                >
                                    <span className="block font-heading text-sm font-semibold">
                                        {activeBanner.headline}
                                    </span>
                                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-tijum-peach">
                                        {activeBanner.cta_text}
                                        <ArrowRight
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </a>
                            )}

                            {/* Grounded Meal Transparency Inset */}
                            <div className="absolute right-4 bottom-4 left-4 flex items-center gap-3.5 rounded-2xl border border-white/60 bg-white/95 p-3 shadow-tijum-card backdrop-blur-md sm:right-auto sm:max-w-[23rem]">
                                <picture className="shrink-0 overflow-hidden rounded-xl">
                                    <source
                                        srcSet={mealImage.webpSrcSet}
                                        sizes="64px"
                                        type="image/webp"
                                    />
                                    <img
                                        src={mealImage.fallbackSrc}
                                        alt={mealImage.alt}
                                        width={mealImage.width}
                                        height={mealImage.height}
                                        className="size-14 rounded-xl object-cover sm:size-16"
                                        loading="eager"
                                    />
                                </picture>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck
                                            className="size-3.5 shrink-0 text-emerald-600"
                                            aria-hidden="true"
                                        />
                                        <p className="truncate font-heading text-xs font-bold text-tijum-plum sm:text-sm">
                                            Know your meals upfront
                                        </p>
                                    </div>
                                    <p className="mt-0.5 text-[11px] leading-snug text-tijum-lavender sm:text-xs">
                                        Breakfast, lunch &amp; dinner marked
                                        clearly per property.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integrated Search Dock */}
                {search && (
                    <div
                        id="home-search"
                        className="hero-search-anim tijum-anchor-target relative z-30 mt-8 sm:mt-10"
                    >
                        <SearchPanel
                            className="relative z-30 shadow-tijum-soft"
                            locations={search.locations}
                            cities={search.cities.map((city) => ({
                                id: city.id,
                                name: city.name,
                            }))}
                            categories={search.categories}
                            durations={Object.entries(search.durations).map(
                                ([value, duration]) => ({
                                    value,
                                    label:
                                        duration.label ??
                                        `${value.charAt(0).toUpperCase()}${value.slice(1)}`,
                                }),
                            )}
                            timing={{
                                default_check_in:
                                    search.timing.standard_check_in_time,
                                default_check_out:
                                    search.timing.standard_check_out_time,
                                earliest_check_in:
                                    search.timing.earliest_early_check_in_time,
                                early_check_in_fee_minor: 0,
                            }}
                            defaults={{
                                check_in: search.defaults.check_in,
                                duration_type: search.defaults.duration_type,
                                duration_count: search.defaults.duration_count,
                                guests: search.defaults.guests,
                            }}
                        />
                    </div>
                )}
            </ResponsiveContainer>
        </section>
    );
}
