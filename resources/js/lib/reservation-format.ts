import type { ReservationSummary } from '@/types';

export function formatReservationMoney(
    amountMinor: number,
    currencyCode = 'INR',
): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 2,
    }).format(amountMinor / 100);
}

export function formatReservationMoneyCompact(
    amountMinor: number,
    currencyCode = 'INR',
): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(amountMinor / 100);
}

export function formatReservationDate(value: string): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
    }).format(new Date(`${value}T00:00:00+05:30`));
}

export function formatReservationDateShort(value: string): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
    }).format(new Date(`${value}T00:00:00+05:30`));
}

export function formatReservationDateTimeShort(
    iso?: string | null,
): string | null {
    if (!iso) {
        return null;
    }

    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return null;
    }
}

export type UnifiedLifecycleKey =
    | 'checked_out'
    | 'in_house'
    | 'awaiting_check_in'
    | 'awaiting_payment'
    | 'cancelled'
    | 'expired';

export type UnifiedLifecycleMeta = {
    key: UnifiedLifecycleKey;
    label: string;
    shortLabel: string;
    badgeClass: string;
    dotClass: string;
};

export function getUnifiedStayLifecycle(
    reservation: Pick<
        ReservationSummary,
        'status' | 'is_checked_in' | 'is_checked_out'
    >,
): UnifiedLifecycleMeta {
    if (reservation.status === 'cancelled') {
        return {
            key: 'cancelled',
            label: 'Cancelled',
            shortLabel: 'Cancelled',
            badgeClass:
                'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-200',
            dotClass: 'bg-rose-500',
        };
    }

    if (reservation.status === 'expired') {
        return {
            key: 'expired',
            label: 'Expired',
            shortLabel: 'Expired',
            badgeClass:
                'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/35 dark:bg-rose-950/50 dark:text-rose-300',
            dotClass: 'bg-rose-400',
        };
    }

    if (reservation.status === 'awaiting_payment') {
        return {
            key: 'awaiting_payment',
            label: 'Awaiting Payment',
            shortLabel: 'Unpaid',
            badgeClass:
                'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200',
            dotClass: 'bg-amber-500',
        };
    }

    if (reservation.is_checked_out) {
        return {
            key: 'checked_out',
            label: 'Checked Out',
            shortLabel: 'Checked Out',
            badgeClass:
                'border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-200',
            dotClass: 'bg-indigo-600',
        };
    }

    if (reservation.is_checked_in) {
        return {
            key: 'in_house',
            label: 'In-House',
            shortLabel: 'In-House',
            badgeClass:
                'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200',
            dotClass: 'bg-emerald-600',
        };
    }

    return {
        key: 'awaiting_check_in',
        label: 'Awaiting Check-In',
        shortLabel: 'Awaiting Arrival',
        badgeClass:
            'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-200',
        dotClass: 'bg-sky-600',
    };
}

export function getRoomTrailSummary(
    reservation: Pick<
        ReservationSummary,
        | 'status'
        | 'quantity'
        | 'allocated_quantity'
        | 'allocated_rooms'
        | 'room_history'
        | 'is_checked_out'
    >,
) {
    const historyEntries = reservation.room_history ?? [];
    const currentRooms = reservation.allocated_rooms ?? [];
    const allocatedQuantity = reservation.allocated_quantity ?? 0;
    const isFullyAllocated =
        allocatedQuantity >= reservation.quantity && currentRooms.length > 0;
    const needsRoom =
        reservation.status === 'confirmed' &&
        !reservation.is_checked_out &&
        !isFullyAllocated;

    const historyTrail: string[] = [];
    for (const entry of historyEntries) {
        if (
            entry.room_number &&
            historyTrail[historyTrail.length - 1] !== entry.room_number
        ) {
            historyTrail.push(entry.room_number);
        }
    }

    const hadRoomChange = historyEntries.some(
        (entry) =>
            entry.status === 'changed' || entry.action === 'room_changed',
    );

    const primaryRoomLabel =
        currentRooms.length > 0
            ? `Room ${currentRooms.join(', ')}`
            : historyTrail.length > 0
              ? `Room ${historyTrail[historyTrail.length - 1]}`
              : null;

    const fullTrailLabel =
        hadRoomChange && historyTrail.length > 1
            ? `Room ${historyTrail.join(' → ')}`
            : primaryRoomLabel;

    return {
        allocatedQuantity,
        isFullyAllocated,
        needsRoom,
        hadRoomChange,
        currentRooms,
        historyTrail,
        primaryRoomLabel,
        fullTrailLabel,
    };
}
