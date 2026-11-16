import { Head } from '@inertiajs/react';
import { PropertyForm } from '@/components/owner/properties/property-form';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { PageHeader } from '@/components/shared/page-header';
import { dashboard } from '@/routes/owner';
import {
    create as createPropertyRoute,
    index as propertiesIndexRoute,
    store as storePropertyRoute,
} from '@/routes/owner/properties';
import type {
    CityOption,
    PropertyCategoryOption,
    PropertyOwnershipArrangement,
    TimingRules,
} from '@/types';

type CreatePropertyPageProps = {
    categories: PropertyCategoryOption[];
    cities: CityOption[];
    ownershipArrangements: {
        value: PropertyOwnershipArrangement;
        label: string;
        guidance: string;
    }[];
    timingRules: TimingRules;
};

export default function CreatePropertyPage({
    categories,
    cities,
    ownershipArrangements,
    timingRules,
}: CreatePropertyPageProps) {
    return (
        <>
            <Head title="Add Property · Partner Portal" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Step 1 & 2 · Property Onboarding"
                    title="Register a New Property"
                    description="Create a property draft first, then define AC/Non-AC room types, physical room numbers, photographs, and property verification documents."
                />

                <PropertyStepNavigation
                    propertyId={null}
                    activeStep="overview"
                />

                <PropertyForm
                    actionUrl={storePropertyRoute.url()}
                    method="post"
                    categories={categories}
                    cities={cities}
                    ownershipArrangements={ownershipArrangements}
                    timingRules={timingRules}
                    submitLabel="Save Draft & Continue to Room Types"
                />
            </div>
        </>
    );
}

CreatePropertyPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Add Property', href: createPropertyRoute() },
    ],
};
