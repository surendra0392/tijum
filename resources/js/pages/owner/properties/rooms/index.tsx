import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    DoorClosed,
    Edit3,
    Layers,
    PlusCircle,
    RotateCcw,
    Search,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { roomOperationalStatusMap } from '@/components/owner/properties/property-status-helpers';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes/owner';
import { index as propertiesIndexRoute } from '@/routes/owner/properties';
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
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const roomError = errors?.room;

    const [search, setSearch] = useState(filters.search);
    const [roomTypeFilter, setRoomTypeFilter] = useState(filters.room_type);
    const [statusFilter, setStatusFilter] = useState(
        filters.operational_status,
    );
    const [deletingRoom, setDeletingRoom] = useState<PropertyRoomData | null>(
        null,
    );
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => {
        setSearch(filters.search);
        setRoomTypeFilter(filters.room_type);
        setStatusFilter(filters.operational_status);
    }, [filters.search, filters.room_type, filters.operational_status]);

    const applyFilters = (
        overrides: {
            search?: string;
            roomType?: string;
            status?: string;
        } = {},
    ) => {
        const nextSearch = (overrides.search ?? search).trim();
        const nextType = overrides.roomType ?? roomTypeFilter;
        const nextStatus = overrides.status ?? statusFilter;

        router.get(
            roomsIndexRoute.url(property.id),
            {
                search: nextSearch || undefined,
                room_type: nextType || undefined,
                operational_status: nextStatus || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        applyFilters();
    };

    const handleClearSearch = () => {
        setSearch('');
        applyFilters({ search: '' });
    };

    const hasActiveFilters = Boolean(
        search.trim() || roomTypeFilter || statusFilter,
    );

    const handleClear = () => {
        setSearch('');
        setRoomTypeFilter('');
        setStatusFilter('');
        router.get(
            roomsIndexRoute.url(property.id),
            {},
            { preserveState: true, preserveScroll: true },
        );
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

    const handleConfirmDelete = () => {
        if (!deletingRoom) return;
        setDeleteBusy(true);
        router.delete(
            `/owner/properties/${property.id}/rooms/${deletingRoom.id}`,
            {
                preserveScroll: true,
                onFinish: () => {
                    setDeleteBusy(false);
                    setDeletingRoom(null);
                },
            },
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

                {roomError && (
                    <Alert variant="destructive">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Unable to Update Physical Room</AlertTitle>
                        <AlertDescription>{roomError}</AlertDescription>
                    </Alert>
                )}

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

                <section
                    aria-label="Filter physical rooms"
                    className="rounded-2xl border border-tijum-surface/85 bg-card p-3 shadow-tijum-card dark:border-border"
                >
                    <search>
                        <form
                            onSubmit={handleFilter}
                            className="flex flex-col gap-2.5 lg:flex-row lg:items-center"
                        >
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="room-filter-search"
                                    type="text"
                                    value={search}
                                    aria-label="Filter by room number, wing, or building"
                                    className="h-9 pr-16 pl-9 text-xs"
                                    placeholder="Search room #, wing, or building (e.g. 101, A-201)..."
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        aria-label="Clear room search"
                                        className="absolute top-1/2 right-12 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-md bg-tijum-cream px-2 py-1 text-[11px] font-semibold text-tijum-plum transition-colors hover:bg-tijum-coral hover:text-white dark:bg-muted dark:text-foreground dark:hover:bg-tijum-coral"
                                >
                                    Find
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                                <Select
                                    value={roomTypeFilter || 'all'}
                                    onValueChange={(v) => {
                                        const nextType = v === 'all' ? '' : v;
                                        setRoomTypeFilter(nextType);
                                        applyFilters({ roomType: nextType });
                                    }}
                                >
                                    <SelectTrigger
                                        id="room-filter-type"
                                        aria-label="Filter by room type"
                                        className="h-9 w-full text-xs sm:w-[190px]"
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

                                <Select
                                    value={statusFilter || 'all'}
                                    onValueChange={(v) => {
                                        const nextStatus = v === 'all' ? '' : v;
                                        setStatusFilter(nextStatus);
                                        applyFilters({ status: nextStatus });
                                    }}
                                >
                                    <SelectTrigger
                                        id="room-filter-status"
                                        aria-label="Filter by operational status"
                                        className="h-9 w-full text-xs sm:w-[175px]"
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

                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClear}
                                        className="h-9 shrink-0 px-2.5 text-xs text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                    >
                                        <RotateCcw
                                            className="mr-1 size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Reset</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </search>
                </section>

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
                                        {canManageOperations && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    setDeletingRoom(row)
                                                }
                                                aria-label={`Delete room ${row.room_number}`}
                                            >
                                                <Trash2 aria-hidden="true" />
                                                <span>Delete</span>
                                            </Button>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        rows={rooms}
                        getRowKey={(row) => row.id}
                    />
                )}

                <ConfirmationDialog
                    open={deletingRoom !== null}
                    onOpenChange={(open) => !open && setDeletingRoom(null)}
                    tone="destructive"
                    title={`Delete Room "${deletingRoom?.room_number ?? ''}"?`}
                    description="This will permanently remove this unbooked physical room from the property. Rooms with reservation history cannot be deleted (mark them Inactive instead)."
                    confirmLabel="Delete Room"
                    loading={deleteBusy}
                    onConfirm={handleConfirmDelete}
                />
            </div>
        </>
    );
}

RoomsIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Physical Rooms', href: '#' },
    ],
};
