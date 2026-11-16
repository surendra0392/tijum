import { Link } from '@inertiajs/react';
import { ArrowUpRight, BedDouble, Building2, Home, Users } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import {
    ACCOMMODATION_CATEGORIES,
    type AccommodationCategoryItem,
} from '@/data/public-content';
import { cn } from '@/lib/utils';
import { search } from '@/routes/public';

const categoryIconMap: Record<
    AccommodationCategoryItem['icon'],
    typeof BedDouble
> = {
    bed: BedDouble,
    building: Building2,
    home: Home,
    users: Users,
};

export function AccommodationCategoriesSection() {
    return (
        <section
            aria-labelledby="categories-heading"
            className="tijum-section bg-tijum-cream"
        >
            <ResponsiveContainer
                width="wide"
                className="space-y-10 lg:space-y-12"
            >
                <ScrollReveal direction="up" distance={20} duration={0.6}>
                    <SectionHeading
                        id="categories-heading"
                        eyebrow="Stay Formats"
                        title="Discover your way to stay"
                        description="Compare real accommodation formats without losing sight of the details that matter: room type, duration, meals, and price."
                    />
                </ScrollReveal>

                <ScrollReveal direction="up" distance={24} stagger={0.14}>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {ACCOMMODATION_CATEGORIES.map((category) => {
                            const Icon = categoryIconMap[category.icon];

                            return (
                                <article
                                    key={category.id}
                                    className="group flex flex-col overflow-hidden rounded-[24px] border border-tijum-surface bg-white shadow-tijum-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-tijum-peach hover:shadow-tijum-soft"
                                >
                                    <picture className="block aspect-[16/10] w-full overflow-hidden bg-tijum-surface">
                                        <source
                                            srcSet={category.image.webpSrcSet}
                                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                            type="image/webp"
                                        />
                                        <source
                                            srcSet={category.image.jpgSrcSet}
                                            sizes={category.image.sizes}
                                            type="image/jpeg"
                                        />
                                        <img
                                            src={category.image.fallbackSrc}
                                            alt={category.image.alt}
                                            width={category.image.width}
                                            height={category.image.height}
                                            loading="lazy"
                                            className="tijum-image-zoom h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                                        />
                                    </picture>

                                    <div className="flex flex-1 flex-col justify-between gap-5 p-6 sm:p-7">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-9 items-center justify-center rounded-xl bg-tijum-plum text-tijum-cream transition-all duration-300 group-hover:scale-105 group-hover:bg-tijum-coral">
                                                    <Icon
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <span className="font-heading text-xs font-semibold text-tijum-lavender">
                                                    {category.subtitle}
                                                </span>
                                            </div>
                                            <h3 className="font-heading text-xl font-bold text-tijum-plum transition-colors duration-300 group-hover:text-tijum-coral">
                                                {category.title}
                                            </h3>
                                            <p className="text-sm leading-relaxed text-tijum-lavender">
                                                {category.description}
                                            </p>
                                        </div>

                                        <Link
                                            href={search.url({
                                                query: {
                                                    category: category.slug,
                                                },
                                            })}
                                            className="group/link inline-flex min-h-11 items-center gap-2 self-start rounded-lg font-heading text-sm font-semibold text-tijum-plum hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                        >
                                            Explore {category.title}
                                            <ArrowUpRight
                                                className="transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
