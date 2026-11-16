export function formatStayTime(time?: string): string {
    if (!time) {
        return '';
    }

    const [hours, minutes] = time.split(':');
    const hour = Number(hours);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour}:${minutes} ${suffix}`;
}
