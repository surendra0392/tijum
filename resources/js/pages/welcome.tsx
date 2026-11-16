import { AccommodationCategoriesSection } from '@/components/public/accommodation-categories';
import { CheckinFlexibilitySection } from '@/components/public/checkin-flexibility-section';
import { CompareDrawer } from '@/components/public/compare-drawer';
import { FaqPreviewSection } from '@/components/public/faq-preview';
import { FeaturedPropertiesSection } from '@/components/public/featured-properties-section';
import { FinalCtaSection } from '@/components/public/final-cta-section';
import { FoodStorySection } from '@/components/public/food-story-section';
import { HeroSection } from '@/components/public/hero-section';
import { HowItWorksSection } from '@/components/public/how-it-works-section';
import { LaunchCitiesSection } from '@/components/public/launch-cities-section';
import { NewsletterSection } from '@/components/public/newsletter-section';
import { PartnerCtaSection } from '@/components/public/partner-cta-section';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { ReferralSection } from '@/components/public/referral-section';
import { TrustSection } from '@/components/public/trust-section';
import { ValuePropositionSection } from '@/components/public/value-proposition';
import { WhyTijumSection } from '@/components/public/why-tijum-section';
import type { MarketingBanner } from '@/types/marketing';
import type {
    SearchLocationOption,
    StayTimingData,
} from '@/types/public-search';
import type { SeoMetadata } from '@/types/seo';

type SearchOption = {
    id: number;
    name: string;
    slug?: string;
    state?: string | null;
};

type SearchCategory = {
    id: number;
    name: string;
    slug?: string;
    code?: string;
};

type WelcomeProps = {
    seo?: SeoMetadata;
    search?: {
        cities: SearchOption[];
        locations: SearchLocationOption[];
        categories: SearchCategory[];
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
    heroBanners?: MarketingBanner[];
    stripBanners?: MarketingBanner[];
    featuredProperties?: any[];
    properties?: any[];
};

export default function Welcome({
    seo,
    search,
    heroBanners = [],
    featuredProperties,
    properties,
}: WelcomeProps) {
    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="TIJUM | Stay easy. Eat well. Spend less."
                fallbackDescription="Discover affordable Hostels/PG, Homestays, and Co-Living accommodations with property-specific food flags and transparent room pricing."
            />

            <HeroSection search={search} heroBanners={heroBanners} />
            <ValuePropositionSection />
            <AccommodationCategoriesSection />
            <FeaturedPropertiesSection
                properties={featuredProperties ?? properties ?? []}
            />
            <HowItWorksSection />
            <LaunchCitiesSection />
            <FoodStorySection />
            <WhyTijumSection />
            <ReferralSection />
            {search?.timing && (
                <CheckinFlexibilitySection timing={search.timing} />
            )}
            <PartnerCtaSection />
            <TrustSection />
            <NewsletterSection />
            {search?.timing && <FaqPreviewSection timing={search.timing} />}
            <FinalCtaSection />
            <CompareDrawer />
        </>
    );
}
