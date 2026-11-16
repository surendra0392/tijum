import type { PropertyDetailPayload, PropertyDetailRoomType } from '@/types/public-search';

export function formatMoney(minor: number | null | undefined): string {
    if (minor == null) {
        return 'Not configured';
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
}

export function rateFor(
    roomType: PropertyDetailRoomType,
    durationType: string,
): number | null {
    if (durationType === 'weekly') {
        return roomType.weekly_rate_minor;
    }
    if (durationType === 'monthly') {
        return roomType.monthly_rate_minor;
    }

    return roomType.daily_rate_minor;
}

export function durationUnitLabel(durationType: string): string {
    if (durationType === 'weekly') {
        return 'week';
    }
    if (durationType === 'monthly') {
        return 'month';
    }

    return 'day';
}

export function durationPluralLabel(durationType: string, count: number): string {
    const unit = durationUnitLabel(durationType);
    return `${count} ${count === 1 ? unit : `${unit}s`}`;
}

export function formatDisplayDate(isoDate: string): string {
    if (!isoDate) {
        return 'Select date';
    }

    const parsed = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
        return isoDate;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(parsed);
}

export function galleryPhotoLabel(
    photo?: PropertyDetailPayload['gallery'][number],
): string {
    if (!photo) {
        return 'Stay photo';
    }

    if (photo.room_type_name) {
        return photo.room_type_name;
    }

    if (photo.is_cover) {
        return 'Cover photo';
    }

    return photo.scope === 'property' ? 'Property space' : 'Room interior';
}

export function startingRateForProperty(
    roomTypes: PropertyDetailRoomType[],
    durationType: string,
): number | null {
    const candidateRates = roomTypes
        .filter((room) => room.matches_search && room.available_quantity > 0)
        .map((room) => rateFor(room, durationType))
        .filter((rate): rate is number => rate != null);

    if (candidateRates.length > 0) {
        return Math.min(...candidateRates);
    }

    const fallbackRates = roomTypes
        .map((room) => rateFor(room, durationType))
        .filter((rate): rate is number => rate != null);

    return fallbackRates.length > 0 ? Math.min(...fallbackRates) : null;
}
