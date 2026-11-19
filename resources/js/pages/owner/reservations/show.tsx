import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRightLeft,
    CalendarCheck,
    CheckCircle2,
    Clock,
    DoorClosed,
    DoorOpen,
    History,
    KeyRound,
    ShieldCheck,
    Sparkles,
    X,
    XCircle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { ReservationDetailGrid } from '@/components/reservations/reservation-detail-grid';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/owner';
import {
    allocations as allocationsRoute,
    cancel,
    index,
} from '@/routes/owner/reservations';
import type {
    ReservationDetail,
    ReservationRoomHistoryEntry,
} from '@/types';

type AllocationInput = {
    property_room_id: number;
    allocated_quantity: number;
};

function formatDateTime(iso?: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

export default function OwnerReservationShow({
    reservation,
    status,
}: {
    reservation: ReservationDetail;
    status?: string;
}) {
    const initialAllocations: AllocationInput[] = (
        reservation.allocations ?? []
    ).map((allocation) => ({
        property_room_id: allocation.property_room_id,
        allocated_quantity: allocation.allocated_quantity,
    }));

    const isFullyAllocated =
        (reservation.allocated_quantity ?? 0) >= reservation.quantity &&
        (reservation.allocations?.length ?? 0) > 0;

    const [isEditingAllocation, setIsEditingAllocation] = useState(
        !isFullyAllocated,
    );
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [frontDeskNotes, setFrontDeskNotes] = useState('');
    const [frontDeskSubmitting, setFrontDeskSubmitting] = useState(false);

    const allocationForm = useForm<{ allocations: AllocationInput[] }>({
        allocations: initialAllocations,
    });

    const allocationFor = (roomId: number) =>
        allocationForm.data.allocations.find(
            (allocation) => allocation.property_room_id === roomId,
        );

    const selectedTotalQuantity = allocationForm.data.allocations.reduce(
        (sum, item) => sum + (Number(item.allocated_quantity) || 0),
        0,
    );

    const toggleRoom = (roomId: number, checked: boolean) => {
        if (checked) {
            if (allocationFor(roomId)) {
                return;
            }
            allocationForm.setData('allocations', [
                ...allocationForm.data.allocations,
                { property_room_id: roomId, allocated_quantity: 1 },
            ]);
            return;
        }

        allocationForm.setData(
            'allocations',
            allocationForm.data.allocations.filter(
                (allocation) => allocation.property_room_id !== roomId,
            ),
        );
    };

    const updateQuantity = (roomId: number, quantity: number) => {
        const clamped = Math.max(1, quantity);
        allocationForm.setData(
            'allocations',
            allocationForm.data.allocations.map((allocation) =>
                allocation.property_room_id === roomId
                    ? { ...allocation, allocated_quantity: clamped }
                    : allocation,
            ),
        );
    };

    const cancelEditingAllocation = () => {
        allocationForm.setData('allocations', initialAllocations);
        allocationForm.clearErrors();
        setIsEditingAllocation(false);
    };

    const saveAllocations = (event: FormEvent) => {
        event.preventDefault();
        allocationForm.put(
            allocationsRoute(reservation.booking_reference).url,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingAllocation(false);
                },
            },
        );
    };

    const handleCheckIn = (event: FormEvent) => {
        event.preventDefault();
        setFrontDeskSubmitting(true);
        router.post(
            `/owner/reservations/${reservation.booking_reference}/check-in`,
            { notes: frontDeskNotes.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setFrontDeskSubmitting(false);
                    setFrontDeskNotes('');
                },
            },
        );
    };

    const handleCheckOut = (event: FormEvent) => {
        event.preventDefault();
        setFrontDeskSubmitting(true);
        router.post(
            `/owner/reservations/${reservation.booking_reference}/check-out`,
            { notes: frontDeskNotes.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setFrontDeskSubmitting(false);
                    setFrontDeskNotes('');
                },
            },
        );
    };

    const roomHistory: ReservationRoomHistoryEntry[] =
        reservation.room_history ?? [];
    const hasRoomChanges = roomHistory.some(
        (entry) =>
            entry.status === 'changed' || entry.action === 'room_changed',
    );

    return (
        <div className="space-y-6">
            <Head title={`${reservation.booking_reference} · Reservations`} />
            <PageHeader
                eyebrow="Reservation & Stay Management"
                title={reservation.booking_reference}
                description="Review guest contact details, manage physical room allocation, and track check-in through check-out."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline">
                            <Link href="/owner/front-desk">
                                <DoorOpen
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Front Desk
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={index().url}>
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                All Bookings
                            </Link>
                        </Button>
                    </div>
                }
            />

            {status && (
                <div
                    role="status"
                    className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200"
                >
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{status}</span>
                </div>
            )}

            {/* 4-Stage Visual Booking & Guest Stay Lifecycle Bar (Distinct Semantic Colors) */}
            <BookingLifecycleBar
                reservation={reservation}
                isFullyAllocated={isFullyAllocated}
            />

            <ReservationDetailGrid reservation={reservation} />

            {/* Payment Status Callout for Awaiting Payment */}
            {reservation.status === 'awaiting_payment' && (
                <Card className="border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-amber-900 dark:text-amber-200">
                            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                            Awaiting Guest Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-amber-800 dark:text-amber-100/90">
                        Room inventory is temporarily held for this booking. The
                        customer has 15 minutes to complete online payment.
                        Physical room allocation and check-in controls unlock
                        automatically once payment is confirmed.
                    </CardContent>
                </Card>
            )}

            {/* Physical Room Allocation & Room Stay History Section */}
            {reservation.status === 'confirmed' && (
                <Card
                    id="room-allocation-card"
                    className={cn(
                        'overflow-hidden',
                        reservation.is_checked_out
                            ? 'border-indigo-200 dark:border-indigo-500/30'
                            : !isFullyAllocated
                              ? 'border-orange-300 ring-1 ring-orange-200 dark:border-orange-500/40 dark:ring-orange-500/20'
                              : 'border-tijum-surface dark:border-border',
                    )}
                >
                    <CardHeader className="flex flex-col gap-3 border-b border-tijum-surface/70 bg-tijum-cream/35 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/30">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                                    <KeyRound
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {reservation.is_checked_out
                                            ? 'Rooms Stayed & Allocation History'
                                            : 'Physical Room Allocation'}
                                    </span>
                                </CardTitle>

                                {reservation.is_checked_out ? (
                                    <Badge className="border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-200">
                                        <DoorClosed className="mr-1 size-3" />
                                        Stay Completed · Locked
                                    </Badge>
                                ) : isFullyAllocated ? (
                                    <Badge className="border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-200">
                                        <CheckCircle2 className="mr-1 size-3" />
                                        Room Allotted (
                                        {reservation.allocated_quantity ?? 0}/
                                        {reservation.quantity})
                                    </Badge>
                                ) : (
                                    <Badge className="border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-400/40 dark:bg-orange-950/70 dark:text-orange-200">
                                        <AlertTriangle className="mr-1 size-3" />
                                        Allocation Pending (
                                        {reservation.allocated_quantity ?? 0}/
                                        {reservation.quantity})
                                    </Badge>
                                )}

                                {hasRoomChanges && (
                                    <Badge
                                        variant="outline"
                                        className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200"
                                    >
                                        <ArrowRightLeft className="mr-1 size-3" />
                                        Room Changed During Stay
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs">
                                {reservation.is_checked_out
                                    ? 'Complete record of physical room(s) allotted to and occupied by the customer until check-out.'
                                    : isFullyAllocated && !isEditingAllocation
                                      ? 'Physical room is assigned for this reservation. Click "Change Room" only if you need to move the customer to a different room.'
                                      : 'Select physical room number(s) from the 4-column grid below to assign this booking.'}
                            </CardDescription>
                        </div>

                        {/* Change Room button ONLY shown when booking is confirmed, NOT checked out, already allocated, and not currently editing */}
                        {!reservation.is_checked_out &&
                            reservation.can_allocate &&
                            isFullyAllocated &&
                            !isEditingAllocation && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditingAllocation(true)}
                                    className="shrink-0 border-tijum-coral/50 text-tijum-plum hover:bg-tijum-coral hover:text-white dark:text-foreground"
                                >
                                    <ArrowRightLeft className="mr-1.5 size-3.5" />
                                    Change Room
                                </Button>
                            )}
                    </CardHeader>

                    <CardContent className="space-y-5 pt-5">
                        {/* VIEW MODE: Shown when customer is Checked Out OR when Room is Already Allocated and partner hasn't clicked "Change Room" */}
                        {(reservation.is_checked_out ||
                            (isFullyAllocated && !isEditingAllocation)) && (
                            <div className="space-y-5">
                                {/* Current / Final Allotted Rooms in 4-Column Grid */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            {reservation.is_checked_out
                                                ? 'Final Room(s) Occupied Until Check-Out'
                                                : reservation.is_checked_in
                                                  ? 'Currently Occupied Room(s) (In-House)'
                                                  : 'Assigned Room(s) for Arrival'}
                                        </h4>
                                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                            Allocated:{' '}
                                            <strong className="text-tijum-plum dark:text-foreground">
                                                {reservation.allocated_quantity ??
                                                    0}
                                            </strong>{' '}
                                            of{' '}
                                            <strong className="text-tijum-plum dark:text-foreground">
                                                {reservation.quantity}
                                            </strong>{' '}
                                            {reservation.quantity_basis_label}
                                        </span>
                                    </div>

                                    {(reservation.allocations ?? []).length >
                                    0 ? (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {(
                                                reservation.allocations ?? []
                                            ).map((allocation) => (
                                                <div
                                                    key={
                                                        allocation.property_room_id
                                                    }
                                                    className={cn(
                                                        'flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 shadow-2xs',
                                                        reservation.is_checked_out
                                                            ? 'border-indigo-200 bg-indigo-50/45 dark:border-indigo-500/30 dark:bg-indigo-950/25'
                                                            : reservation.is_checked_in
                                                              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/35 dark:bg-emerald-950/25'
                                                              : 'border-sky-300 bg-sky-50/50 dark:border-sky-500/35 dark:bg-sky-950/25',
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'flex size-8 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold',
                                                                    reservation.is_checked_out
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : reservation.is_checked_in
                                                                          ? 'bg-emerald-600 text-white'
                                                                          : 'bg-sky-600 text-white',
                                                                )}
                                                            >
                                                                <KeyRound className="size-4" />
                                                            </span>
                                                            <div>
                                                                <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                                    Room{' '}
                                                                    {
                                                                        allocation.room_number
                                                                    }
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    {allocation.floor_number
                                                                        ? `Floor ${allocation.floor_number}`
                                                                        : reservation.room_type_name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-background/80 text-[10px] font-semibold tabular-nums"
                                                        >
                                                            {
                                                                allocation.allocated_quantity
                                                            }{' '}
                                                            {allocation.allocated_quantity ===
                                                            1
                                                                ? 'unit'
                                                                : 'units'}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-black/5 pt-2 text-[11px] dark:border-white/10">
                                                        <span
                                                            className={cn(
                                                                'font-semibold',
                                                                reservation.is_checked_out
                                                                    ? 'text-indigo-800 dark:text-indigo-300'
                                                                    : reservation.is_checked_in
                                                                      ? 'text-emerald-800 dark:text-emerald-300'
                                                                      : 'text-sky-800 dark:text-sky-300',
                                                            )}
                                                        >
                                                            {reservation.is_checked_out
                                                                ? 'Stayed until Check-Out'
                                                                : reservation.is_checked_in
                                                                  ? 'Occupied (In-House)'
                                                                  : 'Allotted for Stay'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                                            No physical room allocation was
                                            recorded for this stay.
                                        </p>
                                    )}
                                </div>

                                {/* Complete Chronological Room Stay & Change History */}
                                {roomHistory.length > 0 && (
                                    <RoomStayHistoryPanel
                                        history={roomHistory}
                                        isCheckedOut={Boolean(
                                            reservation.is_checked_out,
                                        )}
                                    />
                                )}
                            </div>
                        )}

                        {/* EDIT / ALLOCATE MODE: Only shown when can_allocate is true AND (!isFullyAllocated || isEditingAllocation) */}
                        {!reservation.is_checked_out &&
                            reservation.can_allocate &&
                            (!isFullyAllocated || isEditingAllocation) && (
                                <form
                                    onSubmit={saveAllocations}
                                    className="space-y-4"
                                >
                                    {/* Allocation Counter Banner */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/60 px-4 py-3 text-xs tabular-nums dark:border-border dark:bg-muted/45">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <span>
                                                Required:{' '}
                                                <strong className="text-tijum-plum dark:text-foreground">
                                                    {reservation.quantity}{' '}
                                                    {
                                                        reservation.quantity_basis_label
                                                    }
                                                </strong>
                                            </span>
                                            <span>
                                                Selected:{' '}
                                                <strong
                                                    className={cn(
                                                        selectedTotalQuantity ===
                                                            reservation.quantity
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : selectedTotalQuantity >
                                                                reservation.quantity
                                                              ? 'text-rose-600 dark:text-rose-400'
                                                              : 'text-amber-700 dark:text-amber-400',
                                                    )}
                                                >
                                                    {selectedTotalQuantity}
                                                </strong>
                                            </span>
                                            <span>
                                                Remaining:{' '}
                                                <strong className="text-tijum-plum dark:text-foreground">
                                                    {Math.max(
                                                        0,
                                                        reservation.quantity -
                                                            selectedTotalQuantity,
                                                    )}
                                                </strong>
                                            </span>
                                        </div>
                                        {isFullyAllocated &&
                                            isEditingAllocation && (
                                                <span className="text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                                    Currently assigned:{' '}
                                                    <strong>
                                                        Room{' '}
                                                        {(
                                                            reservation.allocations ??
                                                            []
                                                        )
                                                            .map(
                                                                (a) =>
                                                                    a.room_number,
                                                            )
                                                            .join(', ')}
                                                    </strong>{' '}
                                                    (changing rooms is recorded
                                                    in stay history)
                                                </span>
                                            )}
                                    </div>

                                    {/* 4-Column Physical Room Grid */}
                                    {(reservation.available_rooms ?? [])
                                        .length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {(
                                                reservation.available_rooms ??
                                                []
                                            ).map((room) => {
                                                const allocation =
                                                    allocationFor(room.id);
                                                const selected =
                                                    allocation !== undefined;
                                                const wasPreviouslyAssigned = (
                                                    reservation.allocations ??
                                                    []
                                                ).some(
                                                    (a) =>
                                                        a.property_room_id ===
                                                        room.id,
                                                );

                                                return (
                                                    <div
                                                        key={room.id}
                                                        onClick={() =>
                                                            toggleRoom(
                                                                room.id,
                                                                !selected,
                                                            )
                                                        }
                                                        className={cn(
                                                            'group relative flex cursor-pointer flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all select-none',
                                                            selected
                                                                ? 'border-tijum-coral bg-tijum-coral/8 ring-2 ring-tijum-coral/25 dark:border-tijum-coral dark:bg-tijum-coral/15'
                                                                : 'border-tijum-surface bg-card hover:border-tijum-coral/45 hover:bg-tijum-cream/35 dark:border-border dark:hover:bg-muted/40',
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <span
                                                                    className={cn(
                                                                        'flex size-8 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold transition-colors',
                                                                        selected
                                                                            ? 'bg-tijum-coral text-white'
                                                                            : 'bg-tijum-cream text-tijum-plum dark:bg-muted dark:text-foreground',
                                                                    )}
                                                                >
                                                                    <DoorClosed className="size-4" />
                                                                </span>
                                                                <div>
                                                                    <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                                        Room{' '}
                                                                        {
                                                                            room.room_number
                                                                        }
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {room.floor_number
                                                                            ? `Floor ${room.floor_number}`
                                                                            : 'Standard Floor'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <Checkbox
                                                                    checked={
                                                                        selected
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        toggleRoom(
                                                                            room.id,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                    aria-label={`Allocate room ${room.room_number}`}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-tijum-surface/70 pt-2 text-[11px] dark:border-border">
                                                            <span className="text-muted-foreground tabular-nums">
                                                                Up to{' '}
                                                                <strong className="text-tijum-plum dark:text-foreground">
                                                                    {
                                                                        room.available_quantity
                                                                    }
                                                                </strong>{' '}
                                                                unit
                                                                {room.available_quantity ===
                                                                1
                                                                    ? ''
                                                                    : 's'}{' '}
                                                                free
                                                            </span>
                                                            {wasPreviouslyAssigned && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-sky-300 bg-sky-50 px-1.5 py-0 text-[10px] text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/60 dark:text-sky-200"
                                                                >
                                                                    Current
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {selected && (
                                                            <div
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                                className="flex items-center justify-between gap-2 rounded-lg border border-tijum-coral/30 bg-background/90 px-2.5 py-1.5"
                                                            >
                                                                <Label
                                                                    htmlFor={`room-${room.id}`}
                                                                    className="text-[11px] font-medium text-tijum-plum dark:text-foreground"
                                                                >
                                                                    Units
                                                                </Label>
                                                                <Input
                                                                    id={`room-${room.id}`}
                                                                    type="number"
                                                                    min={1}
                                                                    max={
                                                                        room.available_quantity
                                                                    }
                                                                    value={
                                                                        allocation?.allocated_quantity ??
                                                                        1
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateQuantity(
                                                                            room.id,
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                    className="h-7 w-16 px-2 text-center text-xs font-semibold tabular-nums"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                                            No active physical room is currently
                                            available for this room type and
                                            stay window.
                                        </p>
                                    )}

                                    <InputError
                                        message={
                                            allocationForm.errors.allocations ??
                                            allocationForm.errors[
                                                'allocations.0.allocated_quantity'
                                            ]
                                        }
                                    />

                                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                        <Button
                                            type="submit"
                                            disabled={allocationForm.processing}
                                        >
                                            {allocationForm.processing
                                                ? 'Saving allocation…'
                                                : isFullyAllocated
                                                  ? 'Save room change'
                                                  : 'Save room allocation'}
                                        </Button>

                                        {isFullyAllocated && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={
                                                    cancelEditingAllocation
                                                }
                                                disabled={
                                                    allocationForm.processing
                                                }
                                            >
                                                <X className="mr-1 size-4" />
                                                Cancel
                                            </Button>
                                        )}
                                    </div>

                                    {roomHistory.length > 0 && (
                                        <div className="pt-2">
                                            <RoomStayHistoryPanel
                                                history={roomHistory}
                                                isCheckedOut={false}
                                            />
                                        </div>
                                    )}
                                </form>
                            )}
                    </CardContent>
                </Card>
            )}

            {/* Front Desk Check-In / Check-Out Execution & Status Card */}
            {reservation.status === 'confirmed' && (
                <Card
                    className={cn(
                        reservation.is_checked_out
                            ? 'border-indigo-200 dark:border-indigo-500/30'
                            : reservation.is_checked_in
                              ? 'border-emerald-300 dark:border-emerald-500/40'
                              : 'border-sky-200 dark:border-sky-500/30',
                    )}
                >
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                            <DoorOpen
                                className="size-4 text-tijum-coral"
                                aria-hidden="true"
                            />
                            Front Desk Check-In &amp; Check-Out
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {reservation.is_checked_out
                                ? 'This guest has completed their stay and checked out. All timestamps and notes are archived below.'
                                : 'Record physical guest arrival and departure at your property reception.'}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            className={cn(
                                'flex flex-col justify-between gap-4 rounded-xl border p-4 lg:flex-row lg:items-center',
                                reservation.is_checked_out
                                    ? 'border-indigo-200 bg-indigo-50/45 dark:border-indigo-500/30 dark:bg-indigo-950/25'
                                    : reservation.is_checked_in
                                      ? 'border-emerald-200 bg-emerald-50/45 dark:border-emerald-500/30 dark:bg-emerald-950/25'
                                      : 'border-sky-200 bg-sky-50/45 dark:border-sky-500/30 dark:bg-sky-950/25',
                            )}
                        >
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Guest Stay Lifecycle Status
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {reservation.is_checked_out ? (
                                        <Badge className="gap-1.5 border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-200">
                                            <DoorClosed className="size-3.5" />
                                            Checked Out · Completed (
                                            {formatDateTime(
                                                reservation.checked_out_at,
                                            )}
                                            )
                                        </Badge>
                                    ) : reservation.is_checked_in ? (
                                        <Badge className="gap-1.5 border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200">
                                            <DoorOpen className="size-3.5" />
                                            Checked In · In-House (
                                            {formatDateTime(
                                                reservation.checked_in_at,
                                            )}
                                            )
                                        </Badge>
                                    ) : (
                                        <Badge className="gap-1.5 border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-200">
                                            <CalendarCheck className="size-3.5" />
                                            Confirmed · Awaiting Check-In
                                            (Scheduled:{' '}
                                            {reservation.check_in_date})
                                        </Badge>
                                    )}

                                    {reservation.early_check_in_requested && (
                                        <Badge className="gap-1 border-amber-300 bg-amber-100 text-[11px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
                                            <Sparkles className="size-3" />
                                            Early Arrival Requested{' '}
                                            {reservation.requested_arrival_time &&
                                                `(${reservation.requested_arrival_time})`}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {!reservation.is_checked_out && (
                                <form
                                    onSubmit={
                                        reservation.is_checked_in
                                            ? handleCheckOut
                                            : handleCheckIn
                                    }
                                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                                >
                                    <Input
                                        type="text"
                                        value={frontDeskNotes}
                                        onChange={(e) =>
                                            setFrontDeskNotes(e.target.value)
                                        }
                                        placeholder={
                                            reservation.is_checked_in
                                                ? 'Optional check-out note (key returned, etc.)'
                                                : 'Optional check-in note (ID verified, etc.)'
                                        }
                                        className="h-9 min-w-[240px] bg-background text-xs"
                                    />

                                    {!reservation.is_checked_in ? (
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={
                                                frontDeskSubmitting ||
                                                !isFullyAllocated
                                            }
                                            title={
                                                !isFullyAllocated
                                                    ? 'Allocate a physical room above before checking in the guest'
                                                    : undefined
                                            }
                                            className="shrink-0 bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <DoorOpen className="mr-1.5 size-4" />
                                            {frontDeskSubmitting
                                                ? 'Checking In…'
                                                : 'Mark Guest Checked-In'}
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={frontDeskSubmitting}
                                            className="shrink-0 bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
                                        >
                                            <DoorClosed className="mr-1.5 size-4" />
                                            {frontDeskSubmitting
                                                ? 'Checking Out…'
                                                : 'Mark Guest Checked-Out'}
                                        </Button>
                                    )}
                                </form>
                            )}
                        </div>

                        {!reservation.is_checked_in &&
                            !reservation.is_checked_out &&
                            !isFullyAllocated && (
                                <p className="flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                                    <AlertTriangle className="size-3.5 shrink-0" />
                                    <span>
                                        Assign physical room number(s) in the{' '}
                                        <strong>
                                            Physical Room Allocation
                                        </strong>{' '}
                                        section above to unlock guest check-in.
                                    </span>
                                </p>
                            )}

                        {(reservation.checked_in_at ||
                            reservation.checked_out_at ||
                            reservation.check_in_notes ||
                            reservation.checkout_notes) && (
                            <div className="grid gap-3 text-xs sm:grid-cols-2">
                                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 dark:border-emerald-500/25 dark:bg-emerald-950/20">
                                    <div className="flex items-center justify-between font-semibold text-emerald-950 dark:text-emerald-200">
                                        <span className="flex items-center gap-1.5">
                                            <DoorOpen className="size-3.5 text-emerald-600" />
                                            Check-In Record
                                        </span>
                                        <span className="tabular-nums">
                                            {formatDateTime(
                                                reservation.checked_in_at,
                                            )}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-muted-foreground">
                                        {reservation.check_in_notes
                                            ? `Note: "${reservation.check_in_notes}"`
                                            : reservation.checked_in_at
                                              ? 'Guest checked in at reception.'
                                              : 'Not checked in yet.'}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3 dark:border-indigo-500/25 dark:bg-indigo-950/20">
                                    <div className="flex items-center justify-between font-semibold text-indigo-950 dark:text-indigo-200">
                                        <span className="flex items-center gap-1.5">
                                            <DoorClosed className="size-3.5 text-indigo-600" />
                                            Check-Out Record
                                        </span>
                                        <span className="tabular-nums">
                                            {formatDateTime(
                                                reservation.checked_out_at,
                                            )}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-muted-foreground">
                                        {reservation.checkout_notes
                                            ? `Note: "${reservation.checkout_notes}"`
                                            : reservation.checked_out_at
                                              ? 'Guest completed stay and checked out.'
                                              : 'Guest has not checked out yet.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Payment Captured Summary Card */}
            {reservation.status === 'confirmed' &&
                reservation.payment_summary && (
                    <Card className="border-emerald-300 border-l-4 border-l-emerald-500 dark:border-emerald-500/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-emerald-950 dark:text-emerald-200">
                                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                                Payment Captured Online
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-emerald-800 dark:text-emerald-100/90">
                            Guest payment of{' '}
                            <strong className="tabular-nums">
                                ₹
                                {(
                                    reservation.payment_summary.amount_minor /
                                    100
                                ).toLocaleString('en-IN')}
                            </strong>{' '}
                            was captured online via{' '}
                            {reservation.payment_summary.gateway}. This
                            reservation is confirmed.
                        </CardContent>
                    </Card>
                )}

            {/* Cancellation Section — Only available BEFORE check-in/check-out (can_cancel is false after check-in/check-out) */}
            {reservation.can_cancel && (
                <Card className="border-rose-200 bg-rose-50/25 dark:border-rose-500/30 dark:bg-rose-950/15">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 font-heading text-sm font-semibold text-rose-900 dark:text-rose-200">
                                <XCircle
                                    className="size-4 text-rose-600 dark:text-rose-400"
                                    aria-hidden="true"
                                />
                                Cancel Reservation (Before Arrival Only)
                            </CardTitle>
                            <CardDescription className="text-xs text-rose-800/80 dark:text-rose-200/75">
                                Cancelling a confirmed reservation releases held
                                room inventory and initiates customer protection
                                refund review.
                            </CardDescription>
                        </div>
                        {!showCancelForm && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCancelForm(true)}
                                className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-500/50 dark:text-rose-300"
                            >
                                <XCircle className="mr-1.5 size-3.5" />
                                Cancel Reservation
                            </Button>
                        )}
                    </CardHeader>

                    {showCancelForm && (
                        <CardContent className="pt-0">
                            <Form
                                action={
                                    cancel.form(reservation.booking_reference)
                                        .action
                                }
                                method={
                                    cancel.form(reservation.booking_reference)
                                        .method
                                }
                                disableWhileProcessing
                                className="grid gap-3 border-t border-rose-200/70 pt-4 inert:pointer-events-none inert:opacity-60 dark:border-rose-500/25"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <Label htmlFor="cancellation_reason">
                                            Reason for cancellation
                                        </Label>
                                        <Textarea
                                            id="cancellation_reason"
                                            name="cancellation_reason"
                                            rows={3}
                                            required
                                            placeholder="Provide the operational reason for cancelling this reservation..."
                                            aria-invalid={
                                                errors.cancellation_reason
                                                    ? true
                                                    : undefined
                                            }
                                            className="bg-background"
                                        />
                                        <InputError
                                            message={errors.cancellation_reason}
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                size="sm"
                                                disabled={processing}
                                            >
                                                {processing
                                                    ? 'Cancelling…'
                                                    : 'Confirm Cancellation'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setShowCancelForm(false)
                                                }
                                                disabled={processing}
                                            >
                                                Keep Reservation
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
}

function BookingLifecycleBar({
    reservation,
    isFullyAllocated,
}: {
    reservation: ReservationDetail;
    isFullyAllocated: boolean;
}) {
    const isCancelledOrExpired =
        reservation.status === 'cancelled' || reservation.status === 'expired';
    const isConfirmed = reservation.status === 'confirmed';
    const isCheckedIn = Boolean(reservation.is_checked_in);
    const isCheckedOut = Boolean(reservation.is_checked_out);

    const assignedRoomsText =
        (reservation.allocations ?? []).length > 0
            ? `Room ${(reservation.allocations ?? []).map((a) => a.room_number).join(', ')}`
            : 'No room assigned yet';

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1: Booking & Payment Status */}
            <div
                className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3.5',
                    isCancelledOrExpired
                        ? 'border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/35 dark:text-rose-200'
                        : isConfirmed
                          ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/35 dark:text-emerald-200'
                          : 'border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-200',
                )}
            >
                <span
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-xl text-white',
                        isCancelledOrExpired
                            ? 'bg-rose-600'
                            : isConfirmed
                              ? 'bg-emerald-600'
                              : 'bg-amber-500',
                    )}
                >
                    {isCancelledOrExpired ? (
                        <XCircle className="size-4" />
                    ) : isConfirmed ? (
                        <ShieldCheck className="size-4" />
                    ) : (
                        <Clock className="size-4" />
                    )}
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
                        1. Booking Status
                    </p>
                    <p className="font-heading text-sm font-bold">
                        {reservation.status_label}
                    </p>
                    <p className="truncate text-[11px] opacity-80">
                        {isCancelledOrExpired
                            ? reservation.cancellation_reason ||
                              'Booking terminated'
                            : isConfirmed
                              ? 'Payment verified online'
                              : 'Awaiting customer payment'}
                    </p>
                </div>
            </div>

            {/* Step 2: Physical Room Allocation */}
            <div
                className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3.5',
                    isFullyAllocated
                        ? 'border-sky-300 bg-sky-50/70 text-sky-900 dark:border-sky-500/40 dark:bg-sky-950/35 dark:text-sky-200'
                        : isConfirmed && !isCheckedOut
                          ? 'border-orange-300 bg-orange-50/70 text-orange-900 dark:border-orange-500/40 dark:bg-orange-950/35 dark:text-orange-200'
                          : 'border-tijum-surface bg-card text-muted-foreground dark:border-border',
                )}
            >
                <span
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-xl',
                        isFullyAllocated
                            ? 'bg-sky-600 text-white'
                            : isConfirmed && !isCheckedOut
                              ? 'bg-orange-500 text-white'
                              : 'bg-muted text-muted-foreground',
                    )}
                >
                    <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
                        2. Room Allocation
                    </p>
                    <p className="font-heading text-sm font-bold">
                        {isFullyAllocated
                            ? assignedRoomsText
                            : isConfirmed && !isCheckedOut
                              ? 'Needs Room Assignment'
                              : 'Not Allocated'}
                    </p>
                    <p className="truncate text-[11px] opacity-80">
                        {reservation.allocated_quantity ?? 0} of{' '}
                        {reservation.quantity}{' '}
                        {reservation.quantity_basis_label} allotted
                    </p>
                </div>
            </div>

            {/* Step 3: Check-In Status */}
            <div
                className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3.5',
                    isCheckedIn
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/35 dark:text-emerald-200'
                        : isConfirmed && !isCancelledOrExpired
                          ? 'border-sky-200 bg-sky-50/40 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/20 dark:text-sky-200'
                          : 'border-tijum-surface bg-card text-muted-foreground dark:border-border',
                )}
            >
                <span
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-xl',
                        isCheckedIn
                            ? 'bg-emerald-600 text-white'
                            : isConfirmed && !isCancelledOrExpired
                              ? 'bg-sky-500 text-white'
                              : 'bg-muted text-muted-foreground',
                    )}
                >
                    <DoorOpen className="size-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
                        3. Guest Check-In
                    </p>
                    <p className="font-heading text-sm font-bold">
                        {isCheckedIn
                            ? 'Checked In'
                            : isConfirmed
                              ? 'Awaiting Check-In'
                              : 'Not Checked In'}
                    </p>
                    <p className="truncate text-[11px] opacity-80">
                        {isCheckedIn
                            ? formatDateTime(reservation.checked_in_at)
                            : `Scheduled: ${reservation.check_in_date}`}
                    </p>
                </div>
            </div>

            {/* Step 4: Check-Out Status */}
            <div
                className={cn(
                    'flex items-start gap-3 rounded-2xl border p-3.5',
                    isCheckedOut
                        ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/35 dark:text-indigo-200'
                        : isCheckedIn
                          ? 'border-amber-200 bg-amber-50/40 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200'
                          : 'border-tijum-surface bg-card text-muted-foreground dark:border-border',
                )}
            >
                <span
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-xl',
                        isCheckedOut
                            ? 'bg-indigo-600 text-white'
                            : isCheckedIn
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground',
                    )}
                >
                    <DoorClosed className="size-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wider uppercase opacity-75">
                        4. Guest Check-Out
                    </p>
                    <p className="font-heading text-sm font-bold">
                        {isCheckedOut
                            ? 'Checked Out'
                            : isCheckedIn
                              ? 'Currently In-House'
                              : 'Pending Stay'}
                    </p>
                    <p className="truncate text-[11px] opacity-80">
                        {isCheckedOut
                            ? formatDateTime(reservation.checked_out_at)
                            : `Scheduled: ${reservation.checkout_date}`}
                    </p>
                </div>
            </div>
        </div>
    );
}

function RoomStayHistoryPanel({
    history,
    isCheckedOut,
}: {
    history: ReservationRoomHistoryEntry[];
    isCheckedOut: boolean;
}) {
    return (
        <div className="rounded-xl border border-tijum-surface/85 bg-tijum-cream/30 p-4 dark:border-border dark:bg-muted/25">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <History className="size-4 text-tijum-coral" />
                    <h4 className="font-heading text-xs font-bold tracking-wider text-tijum-plum uppercase dark:text-foreground">
                        Complete Room List &amp; Stay History (
                        {isCheckedOut ? 'Until Check-Out' : 'Allotted & Changes'}
                        )
                    </h4>
                </div>
                <span className="text-[11px] text-muted-foreground">
                    {history.length}{' '}
                    {history.length === 1
                        ? 'room allocation record'
                        : 'room allocation records'}
                </span>
            </div>

            <ol className="space-y-2">
                {history.map((entry, idx) => {
                    const isChanged =
                        entry.status === 'changed' ||
                        entry.status === 'released';
                    const isFinalCheckout = entry.status === 'checked_out';

                    return (
                        <li
                            key={`${entry.property_room_id}-${idx}`}
                            className={cn(
                                'flex flex-col justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-xs sm:flex-row sm:items-center',
                                isFinalCheckout
                                    ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-950/30'
                                    : isChanged
                                      ? 'border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20'
                                      : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20',
                            )}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex size-5 items-center justify-center rounded-full bg-tijum-plum text-[10px] font-bold text-tijum-cream dark:bg-foreground dark:text-background">
                                    {idx + 1}
                                </span>
                                <span className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                    Room {entry.room_number}
                                </span>
                                {entry.floor_number && (
                                    <span className="text-muted-foreground">
                                        · Floor {entry.floor_number}
                                    </span>
                                )}
                                <span className="text-muted-foreground tabular-nums">
                                    · {entry.allocated_quantity}{' '}
                                    {entry.allocated_quantity === 1
                                        ? 'unit'
                                        : 'units'}
                                </span>

                                {entry.previous_rooms.length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                                        <ArrowRightLeft className="size-2.5" />
                                        Moved from Room{' '}
                                        {entry.previous_rooms.join(', ')}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                    {entry.allocated_at
                                        ? `Allotted: ${formatDateTime(entry.allocated_at)}`
                                        : ''}
                                    {entry.released_at
                                        ? ` → ${isFinalCheckout ? 'Checked out' : 'Changed'}: ${formatDateTime(entry.released_at)}`
                                        : ''}
                                </span>

                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-[10px] font-semibold',
                                        isFinalCheckout
                                            ? 'border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-200'
                                            : isChanged
                                              ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/70 dark:text-amber-200'
                                              : 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950/70 dark:text-emerald-200',
                                    )}
                                >
                                    {entry.status_label}
                                </Badge>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

OwnerReservationShow.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Reservations & Customer Records', href: index() },
        { title: 'Booking Details', href: '#' },
    ],
};
