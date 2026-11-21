import { sanitizeDeepLink } from './deepLinkSanitizer.ts';

function toAppPath(path: string): string {
    const trimmedPath = path.trim();

    if (trimmedPath.startsWith('/')) {
        const decodedPath = decodeURIComponent(trimmedPath.split('?', 1)[0]);
        let hasControlCharacter = false;
        for (let index = 0; index < decodedPath.length; index += 1) {
            if (decodedPath.charCodeAt(index) < 32) {
                hasControlCharacter = true;
                break;
            }
        }
        if (
            decodedPath.includes('..') ||
            decodedPath.includes('\\') ||
            hasControlCharacter
        ) {
            return '/';
        }

        return trimmedPath;
    }

    const sanitized = sanitizeDeepLink(trimmedPath);
    if (!sanitized.isValid || !sanitized.sanitizedUrl) {
        return '/';
    }

    const url = new URL(sanitized.sanitizedUrl);
    const pathname =
        url.protocol === 'tijum:'
            ? `/${url.hostname}${url.pathname}`
            : url.pathname;

    return `${pathname}${url.search}`;
}

export function resolveDeepLinkPath(path: string): string {
    try {
        const appPath = toAppPath(path);
        const [pathname, query = ''] = appPath.split('?', 2);
        const suffix = query ? `?${query}` : '';

        const propertyMatch = pathname.match(/^\/properties\/([^/]+)\/?$/);
        if (propertyMatch) {
            return `/(customer)/explore/property/${propertyMatch[1]}${suffix}`;
        }

        const reservationMatch = pathname.match(/^\/reservations\/([^/]+)\/?$/);
        if (reservationMatch) {
            return `/(customer)/bookings/${reservationMatch[1]}${suffix}`;
        }

        const ownerReservationMatch = pathname.match(
            /^\/owner\/reservations\/([^/]+)\/?$/,
        );
        if (ownerReservationMatch) {
            return `/(partner)/reservations/${ownerReservationMatch[1]}${suffix}`;
        }

        const ownerSettlementMatch = pathname.match(
            /^\/owner\/settlements\/([^/]+)\/?$/,
        );
        if (ownerSettlementMatch) {
            return `/(partner)/settlements/${ownerSettlementMatch[1]}${suffix}`;
        }

        const supportMatch = pathname.match(/^\/my-support\/([^/]+)\/?$/);
        if (supportMatch) {
            return `/(customer)/support/${supportMatch[1]}${suffix}`;
        }

        if (pathname === '/rewards') {
            return `/(customer)/rewards${suffix}`;
        }

        if (pathname === '/customer' || pathname.startsWith('/customer/')) {
            return `${pathname.replace('/customer', '/(customer)')}${suffix}`;
        }

        if (pathname === '/partner' || pathname.startsWith('/partner/')) {
            return `${pathname.replace('/partner', '/(partner)')}${suffix}`;
        }

        if (
            pathname === '/' ||
            pathname === '/help' ||
            pathname.startsWith('/legal/') ||
            pathname.startsWith('/(auth)/') ||
            pathname.startsWith('/(customer)/') ||
            pathname.startsWith('/(partner)/')
        ) {
            return `${pathname}${suffix}`;
        }

        return '/';
    } catch {
        return '/';
    }
}
