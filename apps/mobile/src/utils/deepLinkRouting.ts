import {
    hasTraversalOrControlChars,
    sanitizeDeepLink,
} from './deepLinkSanitizer.ts';

function toAppPath(path: string): string {
    const trimmedPath = path.trim();

    if (trimmedPath.startsWith('/')) {
        const pathOnly = trimmedPath.split('?', 1)[0];
        if (hasTraversalOrControlChars(pathOnly)) {
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

    if (hasTraversalOrControlChars(pathname)) {
        return '/';
    }

    return `${pathname}${url.search}`;
}

const ALLOWED_EXPLICIT_INTERNAL_ROUTES: RegExp[] = [
    /^\/$/,
    /^\/help$/,
    /^\/legal\/[a-z0-9-]+$/i,
    /^\/\(auth\)\/(customer-login|customer-register|owner-login|owner-register)$/,
    /^\/\(customer\)\/(explore|bookings|bookings\/create|wishlist|notifications|reviews|rewards|rewards\/points|rewards\/coupons|rewards\/referrals|support|support\/tickets|profile|profile\/edit|profile\/security)$/,
    /^\/\(customer\)\/explore\/property\/[^/]+$/,
    /^\/\(customer\)\/bookings\/[^/]+$/,
    /^\/\(customer\)\/support\/(ticket\/)?[^/]+$/,
    /^\/\(partner\)\/(dashboard|account|notifications|reviews|properties|properties\/create|reservations|settlements|financial-profile|financial-profile\/agreements|cases)$/,
    /^\/\(partner\)\/properties\/\d+\/(edit|room-types|rooms|pricing|availability|media|amenities)$/,
    /^\/\(partner\)\/reservations\/[^/]+$/,
    /^\/\(partner\)\/settlements\/[^/]+$/,
    /^\/\(partner\)\/cases\/[^/]+$/,
];

function isAllowedInternalRoute(pathname: string): boolean {
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    return ALLOWED_EXPLICIT_INTERNAL_ROUTES.some((pattern) =>
        pattern.test(normalized),
    );
}

export function resolveDeepLinkPath(path: string): string {
    try {
        const appPath = toAppPath(path);
        const [pathname, query = ''] = appPath.split('?', 2);
        const suffix = query ? `?${query}` : '';

        const referralMatch = pathname.match(/^\/r\/([^/]+)\/?$/);
        if (referralMatch) {
            const existing = new URLSearchParams(query);
            existing.set('referral_code', referralMatch[1]);
            return `/(auth)/customer-register?${existing.toString()}`;
        }

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

        const ownerCaseMatch = pathname.match(/^\/owner\/cases\/([^/]+)\/?$/);
        if (ownerCaseMatch) {
            return `/(partner)/cases/${ownerCaseMatch[1]}${suffix}`;
        }

        const ownerPropertyMatch = pathname.match(
            /^\/owner\/properties\/(\d+)(?:\/(edit|room-types|rooms|pricing|availability|media|amenities))?\/?$/,
        );
        if (ownerPropertyMatch) {
            const sub = ownerPropertyMatch[2] ?? 'edit';
            return `/(partner)/properties/${ownerPropertyMatch[1]}/${sub}${suffix}`;
        }

        if (pathname === '/owner/reviews' || pathname === '/owner/reviews/') {
            return `/(partner)/reviews${suffix}`;
        }

        if (
            pathname === '/owner/financial-profile' ||
            pathname === '/owner/financial-profile/'
        ) {
            return `/(partner)/financial-profile${suffix}`;
        }

        const supportTicketMatch = pathname.match(
            /^\/support-tickets\/([^/]+)\/?$/,
        );
        if (supportTicketMatch) {
            return `/(customer)/support/ticket/${supportTicketMatch[1]}${suffix}`;
        }

        const supportMatch = pathname.match(/^\/my-support\/([^/]+)\/?$/);
        if (supportMatch) {
            return `/(customer)/support/${supportMatch[1]}${suffix}`;
        }

        if (pathname === '/rewards') {
            return `/(customer)/rewards${suffix}`;
        }

        if (pathname === '/customer' || pathname.startsWith('/customer/')) {
            const mapped = pathname.replace('/customer', '/(customer)');
            return isAllowedInternalRoute(mapped) ? `${mapped}${suffix}` : '/';
        }

        if (pathname === '/partner' || pathname.startsWith('/partner/')) {
            const mapped = pathname.replace('/partner', '/(partner)');
            return isAllowedInternalRoute(mapped) ? `${mapped}${suffix}` : '/';
        }

        if (isAllowedInternalRoute(pathname)) {
            return `${pathname}${suffix}`;
        }

        return '/';
    } catch {
        return '/';
    }
}
