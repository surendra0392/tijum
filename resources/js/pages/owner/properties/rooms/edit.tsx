import { Head } from '@inertiajs/react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { RoomForm } from '@/components/owner/properties/room-form';
import { PageHeader } from '@/components/shared/page-header';
import { dashboard } from '@/routes/owner';
import { index as propertiesIndexRoute } from '@/routes/owner/properties';
import { update as updateRoomRoute } from '@/routes/owner/properties/rooms';
import type {
    PropertyRoomData,
    PropertyRoomStatus,
    PropertyRoomTypeData,
    PropertySummaryData,
} from '@/types';

type EditRoomPageProps = {
    property: PropertySummaryData;
    canManageInventory: boolean;
    room: PropertyRoomData;
    roomTypes: PropertyRoomTypeData[];
    operationalStatuses: {
        value: PropertyRoomStatus;
        label: string;
        description: string;
    }[];
};

export default function EditRoomPage({
    property,
    canManageInventory,
    room,
    roomTypes,
    operationalStatuses,
}: EditRoomPageProps) {
    return (
        <>
            <Head title={`Edit Room ${room.room_number} · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 4 · ${property.property_reference}`}
                    title={`Edit Physical Room — ${room.room_number}`}
                    description={`Update optional floor/wing metadata, operational status, or internal notes for room ${room.room_number}.`}
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="rooms"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                <RoomForm
                    actionUrl={updateRoomRoute.url([property.id, room.id])}
                    method="put"
                    roomTypes={roomTypes}
                    operationalStatuses={operationalStatuses}
                    existingRoom={room}
                    structuralLocked={
                        room.is_approved_version && !canManageInventory
                    }
                    submitLabel="Save Room Changes"
                />
            </div>
        </>
    );
}

EditRoomPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Edit Room', href: '#' },
    ],
};
