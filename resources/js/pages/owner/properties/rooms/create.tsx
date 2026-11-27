import { Head } from '@inertiajs/react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { RoomForm } from '@/components/owner/properties/room-form';
import { PageHeader } from '@/components/shared/page-header';
import { dashboard } from '@/routes/owner';
import { index as propertiesIndexRoute } from '@/routes/owner/properties';
import { store as storeRoomRoute } from '@/routes/owner/properties/rooms';
import type {
    PropertyRoomStatus,
    PropertyRoomTypeData,
    PropertySummaryData,
} from '@/types';

type CreateRoomPageProps = {
    property: PropertySummaryData;
    roomTypes: PropertyRoomTypeData[];
    operationalStatuses: {
        value: PropertyRoomStatus;
        label: string;
        description: string;
    }[];
};

export default function CreateRoomPage({
    property,
    roomTypes,
    operationalStatuses,
}: CreateRoomPageProps) {
    return (
        <>
            <Head title={`Add Physical Room · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 4 · ${property.property_reference}`}
                    title="Add Physical Room"
                    description={`Assign an actual physical room number to an active room type inside ${property.name}.`}
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="rooms"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                <RoomForm
                    actionUrl={storeRoomRoute.url(property.id)}
                    method="post"
                    roomTypes={roomTypes}
                    operationalStatuses={operationalStatuses}
                    submitLabel="Save Physical Room"
                />
            </div>
        </>
    );
}

CreateRoomPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Add Room', href: '#' },
    ],
};
