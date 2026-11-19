import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    Coffee,
    CookingPot,
    MoonStar,
    UtensilsCrossed,
} from 'lucide-react';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { PUBLIC_IMAGES } from '@/data/public-content';
import { search } from '@/routes/public';

const foodDetails = [
    {
        icon: UtensilsCrossed,
        title: 'Food availability',
        detail: 'Clearly states whether meals are offered at the property.',
    },
    {
        icon: Coffee,
        title: 'Breakfast',
        detail: 'Marked separately when included in your stay rate.',
    },
    {
        icon: CookingPot,
        title: 'Lunch',
        detail: 'Shown upfront so working professionals and students can plan.',
    },
    {
        icon: MoonStar,
        title: 'Dinner',
        detail: 'Included evening meals displayed with zero hidden surprises.',
    },
];

export function FoodStorySection() {
    const diningImage = PUBLIC_IMAGES.foodDining;
    const breakfastImage = PUBLIC_IMAGES.foodBreakfast;

    return (
        <section
            id="food-and-stays"
            aria-labelledby="food-story-heading"
            className="tijum-anchor-target overflow-hidden bg-tijum-plum py-16 text-tijum-cream sm:py-20 lg:py-24"
        >
            <ResponsiveContainer width="wide">
                <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                    {/* Left Layered Photography */}
                    <ScrollReveal
                        direction="left"
                        distance={24}
                        className="relative lg:col-span-6"
                    >
                        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-tijum-plum shadow-tijum-soft">
                            <picture className="block">
                                <source
                                    srcSet={diningImage.webpSrcSet}
                                    sizes="(min-width: 1024px) 50vw, 100vw"
                                    type="image/webp"
                                />
                                <source
                                    srcSet={diningImage.jpgSrcSet}
                                    sizes={diningImage.sizes}
                                    type="image/jpeg"
                                />
                                <img
                                    src={diningImage.fallbackSrc}
                                    alt={diningImage.alt}
                                    width={diningImage.width}
                                    height={diningImage.height}
                                    loading="lazy"
                                    className="aspect-[16/11] w-full object-cover"
                                />
                            </picture>

                            <div className="absolute right-4 bottom-4 hidden w-44 overflow-hidden rounded-2xl border-2 border-tijum-plum bg-tijum-plum shadow-tijum-card sm:block lg:w-48">
                                <picture className="block">
                                    <source
                                        srcSet={breakfastImage.webpSrcSet}
                                        sizes="192px"
                                        type="image/webp"
                                    />
                                    <img
                                        src={breakfastImage.fallbackSrc}
                                        alt={breakfastImage.alt}
                                        width={breakfastImage.width}
                                        height={breakfastImage.height}
                                        loading="lazy"
                                        className="aspect-[4/3] w-full object-cover"
                                    />
                                </picture>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Right Meal Story & 2x2 Clarity Grid */}
                    <ScrollReveal
                        direction="right"
                        distance={24}
                        className="space-y-7 lg:col-span-6"
                    >
                        <div className="space-y-3.5">
                            <p className="font-heading text-xs font-semibold tracking-wider text-tijum-peach uppercase">
                                Meal-by-meal transparency
                            </p>
                            <h2
                                id="food-story-heading"
                                className="font-heading text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl lg:text-4xl lg:leading-[1.12]"
                            >
                                Know every meal before you move in
                            </h2>
                            <p className="max-w-[54ch] text-base leading-relaxed text-tijum-cream/75">
                                Every TIJUM listing displays food availability
                                and individual meal flags separately, so you
                                never have to guess what comes with your stay.
                            </p>
                        </div>

                        <div className="grid gap-3.5 sm:grid-cols-2">
                            {foodDetails.map((item) => (
                                <div
                                    key={item.title}
                                    className="flex items-start gap-3.5 rounded-2xl border border-white/12 bg-white/[0.06] p-4 transition-colors duration-200 hover:border-tijum-peach/35 hover:bg-white/[0.09]"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-coral text-white">
                                        <item.icon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="font-heading text-sm font-semibold text-white">
                                            {item.title}
                                        </h3>
                                        <p className="mt-1 text-xs leading-relaxed text-tijum-cream/70">
                                            {item.detail}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-1">
                            <Button size="lg" asChild>
                                <Link href={search()}>
                                    Explore stays with meals
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                    </ScrollReveal>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
