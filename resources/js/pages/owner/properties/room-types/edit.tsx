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
    edit as editRoomTypeRoute,
    index as roomTypesIndexRoute,
    update as updateRoomTypeRoute,
} from '@/routes/owner/properties/room-types';
import type {
    PropertyGenderPolicy,
    PropertyGuestComposition,
    PropertyRoomTypeData,
    PropertyRoomTypeMode,
    PropertySummaryData,
    TimingRules,
} from '@/types';

type EditRoomTypePageProps = {
    property: PropertySummaryData;
    canManageInventory: boolean;
    roomType: PropertyRoomTypeData;
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

export default function EditRoomTypePage({
    property,
    canManageInventory,
    roomType,
    options,
    timingRules,
}: EditRoomTypePageProps) {
    return (
        <>
            <Head title={`Edit ${roomType.name} · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 3 · ${property.property_reference}`}
                    title={`Edit Room Type — ${roomType.name}`}
                    description={`Update eligibility policies, early check-in availability, and presentation metadata for ${property.name}.`}
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="room_types"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                <RoomTypeForm
                    actionUrl={updateRoomTypeRoute.url([
                        property.id,
                        roomType.id,
                    ])}
                    method="put"
                    options={options}
                    timingRules={timingRules}
                    existingRoomType={roomType}
                    readOnly={!canManageInventory}
                    submitLabel="Save Room Type Changes"
                />
            </div>
        </>
    );
}

EditRoomTypePage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Room Types', href: roomTypesIndexRoute(1) },
        { title: 'Edit Room Type', href: editRoomTypeRoute([1, 1]) },
    ],
};
