import { Head } from '@inertiajs/react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { RoomTypeForm } from '@/components/owner/properties/room-type-form';
import { PageHeader } from '@/components/shared/page-header';
import { dashboard } from '@/routes/owner';
import {
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import {
    create as createRoomTypeRoute,
    index as roomTypesIndexRoute,
    store as storeRoomTypeRoute,
} from '@/routes/owner/properties/room-types';
import type {
    PropertyGenderPolicy,
    PropertyGuestComposition,
    PropertyRoomTypeMode,
    PropertySummaryData,
    TimingRules,
} from '@/types';

type CreateRoomTypePageProps = {
    property: PropertySummaryData;
    options: {
        modes: {
            value: PropertyRoomTypeMode;
            label: string;
            description: string;
        }[];
        sharingCapacities: number[];
        genderPolicies: { value: PropertyGenderPolicy; label: string }[];
        guestCompositions: { value: PropertyGuestComposition; label: string }[];
    };
    timingRules: TimingRules;
};

export default function CreateRoomTypePage({
    property,
    options,
    timingRules,
}: CreateRoomTypePageProps) {
    return (
        <>
            <Head title={`Add Room Type · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 3 · ${property.property_reference}`}
                    title="Add Room Type"
                    description={`Configure a customer-facing room category for ${property.name}.`}
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="room_types"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                <RoomTypeForm
                    actionUrl={storeRoomTypeRoute.url(property.id)}
                    method="post"
                    options={options}
                    timingRules={timingRules}
                    submitLabel="Create Room Type"
                />
            </div>
        </>
    );
}

CreateRoomTypePage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Room Types', href: roomTypesIndexRoute(1) },
        { title: 'Add Room Type', href: createRoomTypeRoute(1) },
    ],
};
