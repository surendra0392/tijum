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

export function formatReservationDate(value: string): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
    }).format(new Date(`${value}T00:00:00+05:30`));
}
