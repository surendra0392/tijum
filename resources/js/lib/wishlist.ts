const STORAGE_KEY = 'tijum_wishlist_ids';
const EVENT_NAME = 'tijum-wishlist-update';

function dispatchWishlistUpdate(
    propertyId: number,
    wishlisted: boolean,
): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: { propertyId, wishlisted },
        }),
    );
}

function readCsrfHeaders(): Record<string, string> {
    if (typeof document === 'undefined') return {};

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    const xsrfMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (xsrfMatch) {
        headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
    } else {
        const meta = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');
        if (meta) {
            headers['X-CSRF-TOKEN'] = meta;
        }
    }

    return headers;
}

export function getWishlistIds(): number[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((id): id is number => typeof id === 'number')
            : [];
    } catch {
        return [];
    }
}

export function isWishlisted(propertyId: number): boolean {
    return getWishlistIds().includes(propertyId);
}

export function removeWishlistLocal(propertyId: number): void {
    if (typeof window === 'undefined') return;
    const updated = getWishlistIds().filter((id) => id !== propertyId);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // LocalStorage fallback
    }
    dispatchWishlistUpdate(propertyId, false);
}

export function syncWishlistIds(ids: number[]): void {
    if (typeof window === 'undefined') return;
    const unique = Array.from(new Set(ids.filter((id) => typeof id === 'number')));
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    } catch {
        // LocalStorage fallback
    }
    dispatchWishlistUpdate(unique[0] ?? 0, true);
}

export function toggleWishlist(
    propertyId: number,
    _propertySlug?: string,
    options?: { syncServer?: boolean },
): boolean {
    if (typeof window === 'undefined') return false;

    const current = getWishlistIds();
    const exists = current.includes(propertyId);
    const updated = exists
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId];

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // LocalStorage fallback
    }

    dispatchWishlistUpdate(propertyId, !exists);

    // Sync to server in the background only for authenticated customers, using property ID
    if (options?.syncServer) {
        void fetch(`/wishlist/${propertyId}/toggle`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: readCsrfHeaders(),
        }).catch(() => {
            // Silent fallback when offline
        });
    }

    return !exists;
}

export function subscribeToWishlist(
    callback: (
        event: CustomEvent<{ propertyId: number; wishlisted: boolean }>,
    ) => void,
) {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => callback(e as CustomEvent);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}
