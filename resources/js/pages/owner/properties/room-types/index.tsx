import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Edit3,
    Layers,
    Lock,
    PauseCircle,
    PlusCircle,
    Snowflake,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes/owner';
import { index as propertiesIndexRoute } from '@/routes/owner/properties';
import {
    create as createRoomTypeRoute,
    destroy as destroyRoomTypeRoute,
    edit as editRoomTypeRoute,
} from '@/routes/owner/properties/room-types';
import { formatStayTime } from '@/lib/stay-timing';
import type {
    PropertyRoomTypeData,
    PropertySummaryData,
    TimingRules,
} from '@/types';

type RoomTypesIndexProps = {
    property: PropertySummaryData;
    canManageInventory: boolean;
    roomTypes: PropertyRoomTypeData[];
    timingRules: TimingRules;
};

export default function RoomTypesIndex({
    property,
    canManageInventory,
    roomTypes,
    timingRules,
}: RoomTypesIndexProps) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const roomTypeError = errors?.room_type;

    const [pendingAction, setPendingAction] = useState<{
        roomType: PropertyRoomTypeData;
        mode: 'activate' | 'deactivate' | 'delete';
        deleteRooms?: boolean;
    } | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleConfirmAction = () => {
        if (!pendingAction) {
            return;
        }

        setProcessing(true);
        const query =
            pendingAction.mode === 'activate'
                ? { activate: 1 }
                : pendingAction.mode === 'deactivate'
                  ? { deactivate: 1 }
                  : pendingAction.deleteRooms
                    ? { delete_rooms: 1 }
                    : undefined;
        const url = destroyRoomTypeRoute.url(
            [property.id, pendingAction.roomType.id],
            query ? { query } : undefined,
        );

        router.delete(url, {
            onFinish: () => {
                setProcessing(false);
                setPendingAction(null);
            },
        });
    };

    return (
        <>
            <Head title={`Room Types · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 3 · ${property.property_reference}`}
                    title={`Room Types — ${property.name}`}
                    description="Define only the accommodation configurations genuinely offered at this property (2, 3, 4 Sharing or Private Single Room; AC or Non-AC). Direct pricing, early check-in eligibility, amenities, and physical rooms support live reservations."
                    actions={
                        canManageInventory ? (
                            <Button asChild data-test="add-room-type-button">
                                <Link href={createRoomTypeRoute(property.id)}>
                                    <PlusCircle aria-hidden="true" />
                                    <span>Add Room Type</span>
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="room_types"
                    roomTypesCount={roomTypes.length}
                    roomsCount={property.rooms_count}
                />

                {roomTypeError && (
                    <Alert variant="destructive">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Unable to Update Room Type</AlertTitle>
                        <AlertDescription>{roomTypeError}</AlertDescription>
                    </Alert>
                )}

                {!canManageInventory && (
                    <Alert variant="warning">
                        <Lock aria-hidden="true" />
                        <AlertTitle>Room Types Locked</AlertTitle>
                        <AlertDescription>
                            Room types cannot be modified while initial
                            verification is under review or if the property is
                            suspended.
                        </AlertDescription>
                    </Alert>
                )}

                {roomTypes.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No room types configured"
                        description="Create at least one room type (e.g. 4 Sharing AC or Single Room Non-AC) before adding physical room numbers."
                        action={
                            canManageInventory ? (
                                <Button asChild>
                                    <Link
                                        href={createRoomTypeRoute(property.id)}
                                    >
                                        Create First Room Type
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {roomTypes.map((rt) => (
                            <Card key={rt.id} className="transition-all hover:border-tijum-coral/40 hover:shadow-md">
                                <CardHeader>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-lg">
                                                {rt.name}
                                            </CardTitle>
                                            <CardDescription>
                                                {rt.accommodation_mode_label}
                                            </CardDescription>
                                        </div>
                                        <StatusBadge
                                            status={
                                                rt.is_active
                                                    ? 'active'
                                                    : 'neutral'
                                            }
                                            label={
                                                rt.is_active
                                                    ? 'Active'
                                                    : 'Inactive'
                                            }
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="plum">
                                            Occupancy: {rt.max_guests_per_room}{' '}
                                            {rt.max_guests_per_room === 1
                                                ? 'guest'
                                                : 'guests'}
                                        </Badge>
                                        <Badge variant="outline">
                                            <Snowflake
                                                className="mr-1 size-3 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            {rt.is_air_conditioned
                                                ? 'AC'
                                                : 'Non-AC'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {rt.gender_policy_label}
                                        </Badge>
                                        <Badge
                                            variant={
                                                rt.early_check_in_enabled
                                                    ? 'outline'
                                                    : 'secondary'
                                            }
                                        >
                                            Early Check-in:{' '}
                                            {rt.early_check_in_enabled
                                                ? `Allowed (from ${formatStayTime(timingRules.earliest_early_check_in_time)})`
                                                : 'Not Allowed'}
                                        </Badge>
                                        <Badge variant="outline">
                                            Check-in{' '}
                                            {formatStayTime(
                                                timingRules.standard_check_in_time,
                                            )}{' '}
                                            · Check-out{' '}
                                            {formatStayTime(
                                                timingRules.standard_check_out_time,
                                            )}
                                        </Badge>
                                    </div>

                                    <dl className="grid grid-cols-3 gap-2 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3 text-center text-xs tabular-nums dark:border-border dark:bg-muted/45">
                                        <div>
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Rooms
                                            </dt>
                                            <dd className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                                {rt.rooms_count}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Active Capacity
                                            </dt>
                                            <dd className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                                {rt.total_active_capacity}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Room Photos
                                            </dt>
                                            <dd className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                                {rt.room_photos_count}
                                            </dd>
                                        </div>
                                    </dl>

                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Permitted guests:{' '}
                                        <strong className="text-tijum-plum dark:text-foreground">
                                            {rt.guest_composition_labels.join(
                                                ', ',
                                            )}
                                        </strong>
                                    </p>

                                    {canManageInventory && (
                                        <div className="flex flex-wrap items-center gap-2 border-t border-tijum-surface pt-3 dark:border-border">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                                className="h-8 w-28 justify-center"
                                            >
                                                <Link
                                                    href={editRoomTypeRoute([
                                                        property.id,
                                                        rt.id,
                                                    ])}
                                                >
                                                    <Edit3
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Edit</span>
                                                </Link>
                                            </Button>

                                            {rt.is_active ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        setPendingAction({
                                                            roomType: rt,
                                                            mode: 'deactivate',
                                                        })
                                                    }
                                                    className="h-8 w-28 justify-center"
                                                >
                                                    <PauseCircle
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Deactivate</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="success"
                                                    onClick={() =>
                                                        setPendingAction({
                                                            roomType: rt,
                                                            mode: 'activate',
                                                        })
                                                    }
                                                    className="h-8 w-28 justify-center"
                                                >
                                                    <CheckCircle2
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Activate</span>
                                                </Button>
                                            )}

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    setPendingAction({
                                                        roomType: rt,
                                                        mode: 'delete',
                                                        deleteRooms:
                                                            rt.rooms_count > 0,
                                                    })
                                                }
                                                className="h-8 w-28 justify-center"
                                            >
                                                <Trash2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>Delete</span>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <ConfirmationDialog
                    open={pendingAction !== null}
                    onOpenChange={(open) => !open && setPendingAction(null)}
                    tone={
                        pendingAction?.mode === 'delete'
                            ? 'destructive'
                            : 'default'
                    }
                    title={
                        pendingAction?.mode === 'activate'
                            ? `Activate "${pendingAction?.roomType.name}"?`
                            : pendingAction?.mode === 'deactivate'
                              ? `Deactivate "${pendingAction?.roomType.name}"?`
                              : `Delete "${pendingAction?.roomType.name}"?`
                    }
                    description={
                        pendingAction?.mode === 'activate'
                            ? 'Activating restores this room type so you can assign physical rooms, configure pricing, and accept bookings.'
                            : pendingAction?.mode === 'deactivate'
                              ? 'Deactivating keeps existing historical physical rooms intact while blocking adding new physical rooms to this type.'
                              : pendingAction?.deleteRooms
                                ? `This will permanently delete "${pendingAction.roomType.name}" and its ${pendingAction.roomType.rooms_count} unbooked physical room(s). Blocked automatically if any booking history exists.`
                                : 'This room type configuration will be permanently removed.'
                    }
                    confirmLabel={
                        pendingAction?.mode === 'activate'
                            ? 'Activate Room Type'
                            : pendingAction?.mode === 'deactivate'
                              ? 'Deactivate Room Type'
                              : 'Delete Room Type'
                    }
                    loading={processing}
                    onConfirm={handleConfirmAction}
                />
            </div>
        </>
    );
}

RoomTypesIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Room Types', href: '#' },
    ],
};
