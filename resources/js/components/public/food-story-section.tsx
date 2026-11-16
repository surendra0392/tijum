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
        title: 'Food provided',
        detail: 'The property offers a food arrangement for eligible stays.',
    },
    {
        icon: Coffee,
        title: 'Breakfast included',
        detail: 'Breakfast is part of the displayed stay price.',
    },
    {
        icon: CookingPot,
        title: 'Lunch included',
        detail: 'Lunch is part of the displayed stay price.',
    },
    {
        icon: MoonStar,
        title: 'Dinner included',
        detail: 'Dinner is part of the displayed stay price.',
    },
];

export function FoodStorySection() {
    const diningImage = PUBLIC_IMAGES.foodDining;
    const breakfastImage = PUBLIC_IMAGES.foodBreakfast;

    return (
        <section
            id="food-and-stays"
            aria-labelledby="food-story-heading"
            className="tijum-anchor-target tijum-section overflow-hidden bg-tijum-plum text-tijum-cream"
        >
            <ResponsiveContainer width="wide">
                <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                    <ScrollReveal
                        direction="left"
                        distance={30}
                        className="relative lg:col-span-7"
                    >
                        <picture className="block overflow-hidden rounded-[28px] bg-tijum-surface shadow-tijum-soft">
                            <source
                                srcSet={diningImage.webpSrcSet}
                                sizes="(min-width: 1024px) 58vw, 100vw"
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
                                className="aspect-[16/11] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02]"
                            />
                        </picture>
                        <picture className="animate-float-slow absolute -right-3 -bottom-6 hidden w-44 overflow-hidden rounded-[20px] border-4 border-tijum-plum shadow-tijum-card sm:block lg:w-52">
                            <source
                                srcSet={breakfastImage.webpSrcSet}
                                sizes="208px"
                                type="image/webp"
                            />
                            <img
                                src={breakfastImage.fallbackSrc}
                                alt={breakfastImage.alt}
                                width={breakfastImage.width}
                                height={breakfastImage.height}
                                loading="lazy"
                                className="aspect-square w-full object-cover"
                            />
                        </picture>
                    </ScrollReveal>

                    <ScrollReveal
                        direction="right"
                        distance={30}
                        className="space-y-7 lg:col-span-5"
                    >
                        <div className="space-y-4">
                            <p className="font-heading text-sm font-semibold text-tijum-peach">
                                Food is part of the decision
                            </p>
                            <h2
                                id="food-story-heading"
                                className="tijum-section-title text-tijum-cream"
                            >
                                Know exactly which meals come with your stay
                            </h2>
                            <p className="text-base leading-relaxed text-tijum-cream/72 sm:text-lg">
                                Meal arrangements vary by property. TIJUM keeps
                                four separate flags visible so a general food
                                offering never becomes an all-meals promise.
                            </p>
                        </div>

                        <div className="divide-y divide-tijum-cream/15 border-y border-tijum-cream/15">
                            {foodDetails.map((item) => (
                                <div
                                    key={item.title}
                                    className="group flex gap-4 py-4 transition-colors duration-200"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral text-tijum-plum shadow-xs transition-transform duration-300 group-hover:scale-110">
                                        <item.icon
                                            className="size-4.5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <h3 className="font-heading text-sm font-semibold text-tijum-cream transition-colors duration-200 group-hover:text-tijum-peach">
                                            {item.title}
                                        </h3>
                                        <p className="mt-1 text-sm leading-relaxed text-tijum-cream/65">
                                            {item.detail}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            className="transition-transform duration-200 active:scale-95"
                            asChild
                        >
                            <Link href={search()}>
                                Explore food-inclusive stays
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    </ScrollReveal>
                </div>
            </ResponsiveContainer>
        </section>
    );
}
