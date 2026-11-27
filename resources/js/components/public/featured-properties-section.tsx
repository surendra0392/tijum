import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { PropertyCard } from '@/components/public/property-card';
import { SectionHeading } from '@/components/public/section-heading';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { search } from '@/routes/public';
import { show as propertyShow } from '@/routes/public/properties';
import type { PublicAmenityItem } from '@/types/public-search';

export type FeaturedPropertyData = {
    id: number;
    name: string;
    slug: string;
    locality?: string | null;
    gender_eligibility?: string | null;
    city?: { id?: number; name?: string | null; slug?: string | null } | null;
    category?: {
        id?: number;
        name?: string | null;
        slug?: string | null;
    } | null;
    cover_image_url?: string | null;
    property_amenities?: PublicAmenityItem[];
    property_amenities_more_count?: number;
    food_provided?: boolean;
    breakfast_included?: boolean;
    lunch_included?: boolean;
    dinner_included?: boolean;
    starting_price?: number | null;
    monthly_price?: number | null;
    rating?: number | null;
    review_count?: number;
};

type FeaturedPropertiesSectionProps = {
    properties?: FeaturedPropertyData[];
};

export function FeaturedPropertiesSection({
    properties,
}: FeaturedPropertiesSectionProps) {
    if (!properties || properties.length === 0) {
        return null;
    }

    const displayItems = properties.slice(0, 3);

    return (
        <section
            aria-labelledby="featured-stays-heading"
            className="bg-tijum-cream py-16 sm:py-20"
        >
            <ResponsiveContainer width="wide" className="space-y-9 sm:space-y-10">
                <ScrollReveal direction="up" distance={18} duration={0.6}>
                    <SectionHeading
                        id="featured-stays-heading"
                        title="Featured stays ready to book"
                        description="Handpicked Hostels/PG, Homestays, and Co-Living spaces with transparent pricing and meal inclusions."
                        action={
                            <Button variant="outline" asChild>
                                <Link href={search()}>
                                    View all stays
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        }
                    />
                </ScrollReveal>

                <ScrollReveal
                    direction="up"
                    distance={22}
                    stagger={0.1}
                    className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                    {displayItems.map((property) => (
                        <PropertyCard
                            key={property.id}
                            layout="vertical"
                            property={{
                                id: property.id,
                                name: property.name,
                                slug: property.slug,
                                category: property.category?.name ?? null,
                                city: property.city?.name ?? null,
                                locality: property.locality ?? null,
                                genderEligibility:
                                    property.gender_eligibility ?? null,
                                imageUrl: property.cover_image_url ?? null,
                                amenities: property.property_amenities ?? [],
                                amenityMoreCount:
                                    property.property_amenities_more_count,
                                food: {
                                    food_provided: Boolean(
                                        property.food_provided,
                                    ),
                                    breakfast_included: Boolean(
                                        property.breakfast_included,
                                    ),
                                    lunch_included: Boolean(
                                        property.lunch_included,
                                    ),
                                    dinner_included: Boolean(
                                        property.dinner_included,
                                    ),
                                },
                                price: property.monthly_price
                                    ? {
                                          amountMinor: property.monthly_price,
                                          currency: 'INR',
                                          rateLabel: 'Monthly Base Rate',
                                      }
                                    : property.starting_price
                                      ? {
                                            amountMinor:
                                                property.starting_price,
                                            currency: 'INR',
                                            rateLabel: 'Daily Rate',
                                        }
                                      : null,
                                rating: property.rating ?? null,
                                reviewCount: property.review_count ?? 0,
                            }}
                            href={propertyShow(property.slug)}
                        />
                    ))}
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
