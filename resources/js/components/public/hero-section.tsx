import { useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import gsap from 'gsap';
import { ArrowRight, Clock3, UtensilsCrossed } from 'lucide-react';
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
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;

        const ctx = gsap.context(() => {
            gsap.from('.hero-anim-item', {
                opacity: 0,
                y: 22,
                duration: 0.8,
                stagger: 0.08,
                ease: 'power3.out',
                clearProps: 'all',
            });

            gsap.from('.hero-visual-item', {
                opacity: 0,
                scale: 0.97,
                duration: 0.9,
                delay: 0.15,
                ease: 'power3.out',
                clearProps: 'all',
            });

            gsap.from('.hero-search-anim', {
                opacity: 0,
                y: 28,
                duration: 0.85,
                delay: 0.35,
                ease: 'power3.out',
                clearProps: 'all',
            });
        }, heroRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={heroRef}
            className="relative z-20 bg-tijum-cream pt-8 pb-14 sm:pt-10 lg:pt-12 lg:pb-20"
        >
            <ResponsiveContainer width="wide" className="relative z-10">
                <div className="grid items-center gap-9 lg:grid-cols-12 lg:gap-10 xl:gap-12">
                    <div className="space-y-6 lg:col-span-6 xl:col-span-6">
                        <p className="hero-anim-item font-heading text-sm font-semibold text-tijum-coral">
                            Accommodation that tells you what is included
                        </p>
                        <div className="space-y-5">
                            <h1 className="hero-anim-item tijum-display max-w-2xl text-tijum-plum">
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
                            <p className="hero-anim-item tijum-body-lead max-w-xl">
                                Discover Hostels/PG, Homestays, and Co-Living
                                accommodation with clear room pricing and meal
                                arrangements shown for each property.
                            </p>
                        </div>

                        <div className="hero-anim-item flex flex-wrap items-center gap-3">
                            <Button
                                size="lg"
                                className="transition-transform duration-200 active:scale-95"
                                asChild
                            >
                                <Link href={searchRoute.url()}>
                                    Explore stays
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="transition-transform duration-200 active:scale-95"
                                asChild
                            >
                                <Link href={howItWorks()}>
                                    See how it works
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>

                        <div className="hero-anim-item flex flex-wrap gap-x-6 gap-y-2 border-t border-tijum-surface pt-5 text-sm text-tijum-lavender">
                            <span className="flex items-center gap-2">
                                <UtensilsCrossed
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                Meal-by-meal clarity
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock3
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                Backend-verified instant booking
                            </span>
                        </div>
                    </div>

                    <div className="hero-visual-item relative lg:col-span-6 xl:col-span-6">
                        <div className="relative overflow-hidden rounded-[24px] bg-tijum-surface shadow-tijum-soft transition-transform duration-500 hover:scale-[1.01]">
                            <picture>
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
                                    className="aspect-[16/10] max-h-[360px] w-full object-cover sm:max-h-[380px] lg:aspect-[16/11] lg:max-h-[390px] xl:max-h-[410px]"
                                    loading="eager"
                                    fetchPriority="high"
                                />
                            </picture>

                            {activeBanner && (
                                <a
                                    href={activeBanner.cta_url}
                                    className="absolute top-4 right-4 max-w-64 rounded-2xl border border-tijum-cream/45 bg-tijum-plum/92 p-4 text-tijum-cream shadow-tijum-card backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                >
                                    <span className="block font-heading text-sm font-semibold">
                                        {activeBanner.headline}
                                    </span>
                                    <span className="mt-1 flex items-center gap-1 text-xs text-tijum-peach">
                                        {activeBanner.cta_text}
                                        <ArrowRight
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </a>
                            )}
                        </div>

                        <div className="animate-float-reverse relative z-20 mt-3 ml-auto flex max-w-md items-center gap-3 rounded-[20px] border border-tijum-surface bg-tijum-cream/98 p-3 shadow-tijum-card backdrop-blur-xs transition-transform duration-300 hover:-translate-y-1 sm:-mt-12 sm:mr-4 sm:w-[24rem] lg:mr-0 xl:mr-4">
                            <picture className="shrink-0 overflow-hidden rounded-xl">
                                <source
                                    srcSet={mealImage.webpSrcSet}
                                    sizes="80px"
                                    type="image/webp"
                                />
                                <img
                                    src={mealImage.fallbackSrc}
                                    alt={mealImage.alt}
                                    width={mealImage.width}
                                    height={mealImage.height}
                                    className="size-16 rounded-lg object-cover sm:size-20"
                                    loading="eager"
                                />
                            </picture>
                            <div className="min-w-0">
                                <p className="font-heading text-sm font-semibold text-tijum-plum">
                                    Know your meals before you book
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-tijum-lavender">
                                    Breakfast, lunch, and dinner are shown as
                                    separate inclusion states for every listing.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {search && (
                    <div
                        id="home-search"
                        className="hero-search-anim tijum-anchor-target relative z-30 mt-8 sm:mt-10 lg:mt-12"
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
