import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    DoorClosed,
    Edit3,
    Layers,
    PlusCircle,
    Search,
    Wrench,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { roomOperationalStatusMap } from '@/components/owner/properties/property-status-helpers';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes/owner';
import {
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import { index as roomTypesIndexRoute } from '@/routes/owner/properties/room-types';
import {
    create as createRoomRoute,
    edit as editRoomRoute,
    index as roomsIndexRoute,
} from '@/routes/owner/properties/rooms';
import { update as roomStatusRoute } from '@/routes/owner/properties/rooms/status';
import type {
    PropertyRoomData,
    PropertyRoomStatus,
    PropertyRoomTypeData,
    PropertySummaryData,
} from '@/types';

type RoomsIndexProps = {
    property: PropertySummaryData;
    canManageInventory: boolean;
    canManageOperations: boolean;
    rooms: PropertyRoomData[];
    roomTypes: PropertyRoomTypeData[];
    roomSummary: {
        total_rooms: number;
        active_rooms: number;
        maintenance_rooms: number;
        blocked_rooms: number;
        inactive_rooms: number;
        nominal_active_capacity: number;
    };
    operationalStatuses: {
        value: PropertyRoomStatus;
        label: string;
        description: string;
    }[];
    filters: {
        search: string;
        room_type: string;
        operational_status: string;
    };
};

export default function RoomsIndex({
    property,
    canManageInventory,
    canManageOperations,
    rooms,
    roomTypes,
    roomSummary,
    operationalStatuses,
    filters,
}: RoomsIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [roomTypeFilter, setRoomTypeFilter] = useState(filters.room_type);
    const [statusFilter, setStatusFilter] = useState(
        filters.operational_status,
    );

    const handleFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get(
            roomsIndexRoute.url(property.id),
            {
                search: search || undefined,
                room_type: roomTypeFilter || undefined,
                operational_status: statusFilter || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleClear = () => {
        setSearch('');
        setRoomTypeFilter('');
        setStatusFilter('');
        router.get(roomsIndexRoute.url(property.id));
    };

    const handleQuickStatus = (
        roomId: number,
        nextStatus: PropertyRoomStatus,
    ) => {
        router.patch(
            roomStatusRoute.url([property.id, roomId]),
            { operational_status: nextStatus },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title={`Physical Rooms · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 4 · ${property.property_reference}`}
                    title={`Physical Rooms — ${property.name}`}
                    description="Maintain physical room numbers mapped to configured room types. Capacity derives dynamically from active room records without individual sleeping position entries."
                    actions={
                        canManageInventory && roomTypes.length > 0 ? (
                            <Button asChild data-test="add-room-button">
                                <Link href={createRoomRoute(property.id)}>
                                    <PlusCircle aria-hidden="true" />
                                    <span>Add Physical Room</span>
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="rooms"
                    roomTypesCount={roomTypes.length}
                    roomsCount={roomSummary.total_rooms}
                />

                {roomTypes.length === 0 && (
                    <Alert variant="warning">
                        <AlertTitle>Configure Room Types First</AlertTitle>
                        <AlertDescription>
                            Add at least one Room Type (e.g. 4 Sharing AC or
                            Single Room AC) before creating physical rooms.{' '}
                            <Link
                                href={roomTypesIndexRoute(property.id)}
                                className="font-semibold underline underline-offset-4"
                            >
                                Go to Room Types
                            </Link>
                            .
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Physical Rooms"
                        value={String(roomSummary.total_rooms)}
                        helperText="Registered physical rooms"
                        icon={DoorClosed}
                    />
                    <StatCard
                        label="Active Operational Rooms"
                        value={String(roomSummary.active_rooms)}
                        helperText="Contributing to nominal capacity"
                        icon={Building2}
                    />
                    <StatCard
                        label="Maintenance / Blocked"
                        value={String(
                            roomSummary.maintenance_rooms +
                                roomSummary.blocked_rooms,
                        )}
                        helperText={`${roomSummary.maintenance_rooms} maintenance · ${roomSummary.blocked_rooms} blocked · ${roomSummary.inactive_rooms} inactive`}
                        icon={Wrench}
                    />
                    <StatCard
                        label="Nominal Occupancy Capacity"
                        value={`${roomSummary.nominal_active_capacity} places`}
                        helperText="Calculated from active rooms & types"
                        icon={Layers}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter Physical Rooms</CardTitle>
                        <CardDescription>
                            Search by room number, wing, or building, and toggle
                            operational states cleanly without triggering
                            property re-verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <search>
                            <form
                                onSubmit={handleFilter}
                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                            >
                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="room-filter-search">
                                        Room / Wing / Building
                                    </Label>
                                    <div className="relative">
                                        <Search
                                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="room-filter-search"
                                            type="search"
                                            value={search}
                                            className="w-full min-w-0 pl-9"
                                            placeholder="101, A-201, East Wing..."
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="room-filter-type">
                                        Room Type
                                    </Label>
                                    <Select
                                        value={roomTypeFilter || 'all'}
                                        onValueChange={(v) =>
                                            setRoomTypeFilter(
                                                v === 'all' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="room-filter-type"
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue placeholder="All room types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All room types
                                            </SelectItem>
                                            {roomTypes.map((rt) => (
                                                <SelectItem
                                                    key={rt.id}
                                                    value={String(rt.id)}
                                                >
                                                    {rt.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="room-filter-status">
                                        Operational Status
                                    </Label>
                                    <Select
                                        value={statusFilter || 'all'}
                                        onValueChange={(v) =>
                                            setStatusFilter(
                                                v === 'all' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="room-filter-status"
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue placeholder="All statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All statuses
                                            </SelectItem>
                                            {operationalStatuses.map((s) => (
                                                <SelectItem
                                                    key={s.value}
                                                    value={s.value}
                                                >
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-wrap items-end gap-2">
                                    <Button type="submit">Apply</Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClear}
                                    >
                                        <X aria-hidden="true" />
                                        <span>Clear</span>
                                    </Button>
                                </div>
                            </form>
                        </search>
                    </CardContent>
                </Card>

                {rooms.length === 0 ? (
                    <EmptyState
                        icon={DoorClosed}
                        title="No physical rooms recorded"
                        description="Record actual physical room numbers such as 101, 102, or A-201 linked to your room types."
                        action={
                            canManageInventory && roomTypes.length > 0 ? (
                                <Button asChild>
                                    <Link href={createRoomRoute(property.id)}>
                                        Add First Physical Room
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <DataTable<PropertyRoomData>
                        caption="Property physical rooms inventory"
                        columns={[
                            {
                                key: 'room',
                                header: 'Room Number',
                                isRowHeader: true,
                                render: (row) => (
                                    <span className="font-heading font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                        {row.room_number}
                                    </span>
                                ),
                            },
                            {
                                key: 'type',
                                header: 'Room Type / Config',
                                render: (row) => (
                                    <div>
                                        <p className="font-medium text-tijum-plum dark:text-foreground">
                                            {row.room_type_name}
                                        </p>
                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {row.is_air_conditioned
                                                ? 'AC'
                                                : 'Non-AC'}{' '}
                                            · {row.max_guests_per_room} guest
                                            max
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: 'location',
                                header: 'Floor / Wing',
                                render: (row) => (
                                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        {[
                                            row.floor_number
                                                ? `Floor ${row.floor_number}`
                                                : null,
                                            row.wing_name,
                                            row.building_name,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ') || '—'}
                                    </span>
                                ),
                            },
                            {
                                key: 'status',
                                header: 'Status',
                                render: (row) => (
                                    <StatusBadge
                                        status={
                                            roomOperationalStatusMap[
                                                row.operational_status
                                            ]
                                        }
                                        label={row.operational_status_label}
                                    />
                                ),
                            },
                            {
                                key: 'actions',
                                header: 'Quick Status & Actions',
                                render: (row) => (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {canManageOperations && (
                                            <Select
                                                value={row.operational_status}
                                                onValueChange={(v) =>
                                                    handleQuickStatus(
                                                        row.id,
                                                        v as PropertyRoomStatus,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    aria-label={`Change status for room ${row.room_number}`}
                                                    size="sm"
                                                    className="w-36 text-xs"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {operationalStatuses.map(
                                                        (s) => (
                                                            <SelectItem
                                                                key={s.value}
                                                                value={s.value}
                                                            >
                                                                {s.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={editRoomRoute([
                                                    property.id,
                                                    row.id,
                                                ])}
                                            >
                                                <Edit3 aria-hidden="true" />
                                                <span>Edit</span>
                                            </Link>
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        rows={rooms}
                        getRowKey={(row) => row.id}
                    />
                )}
            </div>
        </>
    );
}

RoomsIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Physical Rooms', href: roomsIndexRoute(1) },
    ],
};
