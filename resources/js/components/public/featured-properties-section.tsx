import { Link } from '@inertiajs/react';
import { ArrowRight, Sparkles } from 'lucide-react';
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

const FALLBACK_PROPERTIES: FeaturedPropertyData[] = [
    {
        id: 101,
        name: 'Madhapur Executive Co-Living',
        slug: 'madhapur-executive-co-living',
        locality: 'HITEC City',
        gender_eligibility: 'Both',
        city: { name: 'Hyderabad' },
        category: { name: 'Co-Living' },
        cover_image_url: '/images/public/hero-stay-600w.webp',
        food_provided: true,
        breakfast_included: true,
        lunch_included: false,
        dinner_included: true,
        starting_price: 65000,
        monthly_price: 1150000,
        rating: null,
        review_count: 0,
    },
    {
        id: 102,
        name: 'Brodipet Deluxe PG for Men',
        slug: 'brodipet-deluxe-pg-men',
        locality: 'Brodipet',
        gender_eligibility: 'Male Only',
        city: { name: 'Guntur' },
        category: { name: 'Hostels/PG' },
        cover_image_url: '/images/public/hero-stay-600w.webp',
        food_provided: true,
        breakfast_included: true,
        lunch_included: true,
        dinner_included: true,
        starting_price: 45000,
        monthly_price: 680000,
        rating: null,
        review_count: 0,
    },
    {
        id: 103,
        name: 'Benz Circle Heritage Homestay',
        slug: 'benz-circle-heritage-homestay',
        locality: 'Benz Circle',
        gender_eligibility: 'Both',
        city: { name: 'Vijayawada' },
        category: { name: 'Homestays' },
        cover_image_url: '/images/public/hero-stay-600w.webp',
        food_provided: true,
        breakfast_included: true,
        lunch_included: false,
        dinner_included: false,
        starting_price: 80000,
        monthly_price: 1400000,
        rating: null,
        review_count: 0,
    },
];

export function FeaturedPropertiesSection({
    properties,
}: FeaturedPropertiesSectionProps) {
    const list =
        properties && properties.length > 0 ? properties : FALLBACK_PROPERTIES;
    const displayItems = list.slice(0, 3);

    return (
        <section
            aria-labelledby="featured-stays-heading"
            className="tijum-section bg-tijum-surface/20"
        >
            <ResponsiveContainer width="wide" className="space-y-10">
                <ScrollReveal direction="up" distance={20} duration={0.6}>
                    <SectionHeading
                        id="featured-stays-heading"
                        eyebrow="Handpicked Stays"
                        title="Featured Verified Accommodations"
                        description="Explore handpicked verified Hostels/PG, Homestays, and Co-Living spaces across Hyderabad, Guntur, Vijayawada, and Visakhapatnam with upfront pricing and clear meal details."
                        action={
                            <Button
                                variant="outline"
                                className="transition-transform duration-200 active:scale-95"
                                asChild
                            >
                                <Link href={search()}>
                                    View all stays
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        }
                    />
                </ScrollReveal>

                <ScrollReveal direction="up" distance={24} stagger={0.14}>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                              amountMinor:
                                                  property.monthly_price,
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
                    </div>
                </ScrollReveal>
            </ResponsiveContainer>
        </section>
    );
}
