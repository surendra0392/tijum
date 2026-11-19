import { Link } from '@inertiajs/react';
import { ArrowUpRight, BedDouble, Building2, Home, Users } from 'lucide-react';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import {
    ACCOMMODATION_CATEGORIES,
    type AccommodationCategoryItem,
} from '@/data/public-content';
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

const categorySummaries: Record<AccommodationCategoryItem['id'], string> = {
    'hostels-pg':
        'Shared and private rooms with clear meal schedules and monthly or daily rates.',
    homestays:
        'Comfortable rooms in residential homes with direct host guidelines.',
    'co-living':
        'Modern furnished spaces with workspaces, amenities, and flexible stays.',
};

export function AccommodationCategoriesSection() {
    return (
        <section
            aria-labelledby="categories-heading"
            className="border-y border-tijum-surface/80 bg-white py-16 sm:py-20"
        >
            <ResponsiveContainer
                width="wide"
                className="space-y-9 sm:space-y-10"
            >
                <ScrollReveal direction="up" distance={18} duration={0.6}>
                    <SectionHeading
                        id="categories-heading"
                        title="Choose the way you want to live"
                        description="Compare three distinct stay formats side by side with clear room options, meals, and pricing."
                    />
                </ScrollReveal>

                <ScrollReveal
                    direction="up"
                    distance={22}
                    stagger={0.1}
                    className="grid grid-cols-1 gap-6 md:grid-cols-3"
                >
                    {ACCOMMODATION_CATEGORIES.map((category) => {
                        const Icon = categoryIconMap[category.icon];

                        return (
                            <Link
                                key={category.id}
                                href={search.url({
                                    query: {
                                        category: category.slug,
                                    },
                                })}
                                className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[26px] bg-tijum-plum shadow-tijum-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-tijum-soft focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:min-h-[380px]"
                            >
                                <picture className="absolute inset-0 block h-full w-full">
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
                                        className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                                    />
                                </picture>

                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#241522]/94 via-[#241522]/42 to-[#241522]/10 transition-opacity duration-300 group-hover:from-[#241522]/96"
                                />

                                <div className="relative z-10 flex items-center justify-between p-5 sm:p-6">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 font-heading text-xs font-semibold text-white backdrop-blur-md">
                                        <Icon
                                            className="size-3.5 text-tijum-peach"
                                            aria-hidden="true"
                                        />
                                        <span>{category.subtitle}</span>
                                    </span>

                                    <span className="flex size-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-tijum-coral group-hover:bg-tijum-coral">
                                        <ArrowUpRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </div>

                                <div className="relative z-10 space-y-2 p-5 pt-0 sm:p-6 sm:pt-0">
                                    <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
                                        {category.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-tijum-cream/85">
                                        {categorySummaries[category.id] ??
                                            category.description}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
