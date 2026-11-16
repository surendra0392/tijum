import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    DoorClosed,
    DoorOpen,
    Sparkles,
    XCircle,
} from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { ReservationDetailGrid } from '@/components/reservations/reservation-detail-grid';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    allocations as allocationsRoute,
    cancel,
    index,
} from '@/routes/owner/reservations';
import type { ReservationDetail } from '@/types';

type AllocationInput = {
    property_room_id: number;
    allocated_quantity: number;
};

export default function OwnerReservationShow({
    reservation,
    status,
}: {
    reservation: ReservationDetail;
    status?: string;
}) {
    const allocationForm = useForm<{ allocations: AllocationInput[] }>({
        allocations: (reservation.allocations ?? []).map((allocation) => ({
            property_room_id: allocation.property_room_id,
            allocated_quantity: allocation.allocated_quantity,
        })),
    });

    const allocationFor = (roomId: number) =>
        allocationForm.data.allocations.find(
            (allocation) => allocation.property_room_id === roomId,
        );

    const toggleRoom = (roomId: number, checked: boolean) => {
        if (checked) {
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
        allocationForm.setData(
            'allocations',
            allocationForm.data.allocations.map((allocation) =>
                allocation.property_room_id === roomId
                    ? { ...allocation, allocated_quantity: quantity }
                    : allocation,
            ),
        );
    };

    const saveAllocations = (event: FormEvent) => {
        event.preventDefault();
        allocationForm.put(
            allocationsRoute(reservation.booking_reference).url,
            { preserveScroll: true },
        );
    };

    return (
        <div className="space-y-6">
            <Head title={`${reservation.booking_reference} · Reservations`} />
            <PageHeader
                eyebrow="Reservation management"
                title={reservation.booking_reference}
                description="Review the guest request, respond to its status, and allocate confirmed quantity to physical rooms."
                actions={
                    <Button asChild variant="outline">
                        <Link href={index().url}>
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            Reservations
                        </Link>
                    </Button>
                }
            />

            {status && (
                <div
                    role="status"
                    className="rounded-xl border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-fg"
                >
                    {status}
                </div>
            )}

            <ReservationDetailGrid reservation={reservation} />

            {reservation.status === 'confirmed' && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                            <DoorOpen
                                className="size-4 text-tijum-coral"
                                aria-hidden="true"
                            />
                            Front Desk &amp; Guest Status
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Record physical guest arrival and departure at your
                            property reception.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/50 p-4 dark:border-border dark:bg-muted/45">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Current Guest Status
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {reservation.is_checked_out ? (
                                        <Badge className="gap-1.5 border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/60 dark:text-emerald-200">
                                            <CheckCircle2 className="size-3.5" />
                                            Checked Out (
                                            {reservation.checked_out_at
                                                ? new Date(
                                                      reservation.checked_out_at,
                                                  ).toLocaleDateString()
                                                : 'Completed'}
                                            )
                                        </Badge>
                                    ) : reservation.is_checked_in ? (
                                        <Badge className="gap-1.5 border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/60 dark:text-emerald-200">
                                            <CheckCircle2 className="size-3.5" />
                                            Checked In (
                                            {reservation.checked_in_at
                                                ? new Date(
                                                      reservation.checked_in_at,
                                                  ).toLocaleTimeString([], {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : 'Arrived'}
                                            )
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200"
                                        >
                                            <Clock className="size-3.5" />
                                            Awaiting Arrival (Scheduled:{' '}
                                            {reservation.check_in_date})
                                        </Badge>
                                    )}

                                    {reservation.early_check_in_requested && (
                                        <Badge className="gap-1 border-amber-200 bg-amber-100 text-[10px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
                                            <Sparkles className="size-3" />
                                            Early Arrival Requested{' '}
                                            {reservation.requested_arrival_time &&
                                                `(${reservation.requested_arrival_time})`}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {!reservation.is_checked_in && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            router.post(
                                                `/owner/reservations/${reservation.booking_reference}/check-in`,
                                                {},
                                                { preserveScroll: true },
                                            );
                                        }}
                                    >
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <DoorOpen className="mr-1.5 size-4" />
                                            Mark Guest Checked-In
                                        </Button>
                                    </form>
                                )}

                                {reservation.is_checked_in &&
                                    !reservation.is_checked_out && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                router.post(
                                                    `/owner/reservations/${reservation.booking_reference}/check-out`,
                                                    {},
                                                    { preserveScroll: true },
                                                );
                                            }}
                                        >
                                            <Button
                                                type="submit"
                                                size="sm"
                                                variant="plum"
                                            >
                                                <DoorClosed className="mr-1.5 size-4" />
                                                Mark Guest Checked-Out
                                            </Button>
                                        </form>
                                    )}
                            </div>
                        </div>

                        {(reservation.check_in_notes ||
                            reservation.checkout_notes) && (
                            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                {reservation.check_in_notes && (
                                    <div className="rounded-lg bg-muted/40 p-2.5 dark:border dark:border-border/60">
                                        <strong className="text-tijum-plum dark:text-foreground">
                                            Check-in Notes:
                                        </strong>{' '}
                                        {reservation.check_in_notes}
                                    </div>
                                )}
                                {reservation.checkout_notes && (
                                    <div className="rounded-lg bg-muted/40 p-2.5 dark:border dark:border-border/60">
                                        <strong className="text-tijum-plum dark:text-foreground">
                                            Check-out Notes:
                                        </strong>{' '}
                                        {reservation.checkout_notes}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {reservation.status === 'awaiting_payment' && (
                <Card className="border-amber-300 border-l-4 border-l-amber-500 dark:border-amber-500/40">
                    <CardHeader className="pb-3">
                        <CardTitle className="font-heading text-base font-semibold text-amber-900 dark:text-amber-200">
                            Awaiting Guest Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-amber-800 dark:text-amber-100/90">
                        Room inventory is held for this reservation. The guest
                        has 15 minutes to complete online payment. Physical room
                        allocation will unlock automatically once guest payment
                        is confirmed.
                    </CardContent>
                </Card>
            )}

            {reservation.status === 'confirmed' &&
                reservation.payment_summary && (
                    <Card className="border-emerald-300 border-l-4 border-l-emerald-500 dark:border-emerald-500/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="font-heading text-base font-semibold text-emerald-950 dark:text-emerald-200">
                                Payment Captured
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
                            reservation is fully confirmed.
                        </CardContent>
                    </Card>
                )}

            {reservation.can_cancel && (
                <DecisionForm
                    title="Cancel confirmed reservation"
                    action={cancel.form(reservation.booking_reference)}
                    field="cancellation_reason"
                    button="Cancel reservation"
                />
            )}

            {reservation.can_allocate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DoorOpen
                                className="size-4 text-tijum-coral"
                                aria-hidden="true"
                            />
                            Physical room allocation
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Assign confirmed quantity to active room numbers.
                            Customers never select or see this operational
                            detail.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={saveAllocations} className="grid gap-4">
                            <div className="flex flex-wrap gap-4 rounded-xl border border-tijum-surface bg-tijum-cream/60 p-4 text-sm tabular-nums dark:border-border dark:bg-muted/45">
                                <span>
                                    Allocated:{' '}
                                    <strong>
                                        {reservation.allocated_quantity ?? 0}
                                    </strong>
                                </span>
                                <span>
                                    Remaining:{' '}
                                    <strong>
                                        {reservation.remaining_quantity ??
                                            reservation.quantity}
                                    </strong>
                                </span>
                            </div>

                            {(reservation.available_rooms ?? []).map((room) => {
                                const allocation = allocationFor(room.id);
                                const selected = allocation !== undefined;

                                return (
                                    <div
                                        key={room.id}
                                        className="grid gap-3 rounded-xl border border-tijum-surface p-4 sm:grid-cols-[auto_1fr_10rem] sm:items-center dark:border-border dark:bg-muted/25"
                                    >
                                        <Checkbox
                                            checked={selected}
                                            onCheckedChange={(checked) =>
                                                toggleRoom(
                                                    room.id,
                                                    checked === true,
                                                )
                                            }
                                            aria-label={`Allocate room ${room.room_number}`}
                                        />
                                        <div>
                                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                Room {room.room_number}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {room.floor_number
                                                    ? `Floor ${room.floor_number} · `
                                                    : ''}
                                                Up to {room.available_quantity}{' '}
                                                unit
                                                {room.available_quantity === 1
                                                    ? ''
                                                    : 's'}{' '}
                                                available
                                            </p>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor={`room-${room.id}`}>
                                                Allocated quantity
                                            </Label>
                                            <Input
                                                id={`room-${room.id}`}
                                                type="number"
                                                min={1}
                                                max={room.available_quantity}
                                                disabled={!selected}
                                                value={
                                                    allocation?.allocated_quantity ??
                                                    1
                                                }
                                                onChange={(event) =>
                                                    updateQuantity(
                                                        room.id,
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {(reservation.available_rooms ?? []).length ===
                                0 && (
                                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                                    No active physical room can be allocated for
                                    this stay.
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
                            <Button
                                type="submit"
                                className="w-fit"
                                disabled={allocationForm.processing}
                            >
                                {allocationForm.processing
                                    ? 'Saving allocation…'
                                    : 'Save room allocation'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function DecisionForm({
    title,
    action,
    field,
    button,
}: {
    title: string;
    action: {
        action: string;
        method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    };
    field: 'cancellation_reason';
    button: string;
}) {
    return (
        <Card className="border-status-error-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <XCircle className="size-4" aria-hidden="true" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Form
                    action={action.action}
                    method={action.method}
                    disableWhileProcessing
                    className="grid gap-3 inert:pointer-events-none inert:opacity-60"
                >
                    {({ errors, processing }) => (
                        <>
                            <Label htmlFor={field}>Reason</Label>
                            <Textarea
                                id={field}
                                name={field}
                                rows={3}
                                required
                                aria-invalid={errors[field] ? true : undefined}
                            />
                            <InputError message={errors[field]} />
                            <Button
                                type="submit"
                                variant="destructive"
                                className="w-fit"
                                disabled={processing}
                            >
                                {processing ? 'Saving…' : button}
                            </Button>
                        </>
                    )}
                </Form>
            </CardContent>
        </Card>
    );
}
