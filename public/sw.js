/* eslint-disable no-restricted-globals */
const CACHE_VERSION = '2026-11-27-v3';
const STATIC_CACHE = `tijum-static-${CACHE_VERSION}`;
const RUNTIME_STATIC_CACHE = `tijum-assets-${CACHE_VERSION}`;
const ACTIVE_CACHES = [STATIC_CACHE, RUNTIME_STATIC_CACHE];

const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
    OFFLINE_URL,
    '/manifest.webmanifest',
    '/pwa/icon-192x192.png',
    '/pwa/icon-512x512.png',
    '/pwa/icon-maskable-192x192.png',
    '/pwa/icon-maskable-512x512.png',
    '/apple-touch-icon.png',
    '/brand/icons/tijum-symbol.png',
];

const SENSITIVE_PATH_PREFIXES = [
    '/login',
    '/register',
    '/logout',
    '/forgot-password',
    '/reset-password',
    '/two-factor-challenge',
    '/email/verify',
    '/user/',
    '/dashboard',
    '/settings',
    '/account',
    '/notifications',
    '/support',
    '/my-support',
    '/rewards',
    '/wishlist',
    '/customer',
    '/reviews',
    '/relocations',
    '/reservations',
    '/payments',
    '/checkout',
    '/webhooks',
    '/razorpay',
    '/owner',
    '/admin',
    '/api',
    '/sanctum',
    '/up',
];

function isSensitivePath(pathname) {
    if (/^\/properties\/[^/]+\/reserve(?:\/|$)/.test(pathname)) {
        return true;
    }

    return SENSITIVE_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + '/') || (prefix.endsWith('/') && pathname.startsWith(prefix)),
    );
}

function isImmutableStaticAsset(pathname) {
    return (
        pathname.startsWith('/build/assets/') ||
        pathname.startsWith('/pwa/') ||
        pathname.startsWith('/brand/') ||
        pathname.startsWith('/images/public/') ||
        pathname === '/offline.html' ||
        pathname === '/apple-touch-icon.png' ||
        pathname === '/favicon.ico' ||
        pathname === '/favicon.png' ||
        pathname === '/favicon-dark.png' ||
        pathname === '/favicon-light.png' ||
        pathname === '/favicon-16x16.png' ||
        pathname === '/favicon-32x32.png' ||
        pathname === '/favicon-48x48.png'
    );
}

function isManifestRequest(pathname) {
    return pathname === '/manifest.webmanifest' || pathname === '/site.webmanifest';
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(async (cache) => {
            await Promise.allSettled(
                PRECACHE_URLS.map(async (url) => {
                    const response = await fetch(url, { cache: 'reload' });
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                }),
            );
        }),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith('tijum-') && !ACTIVE_CACHES.includes(key))
                        .map((staleKey) => caches.delete(staleKey)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') {
        return;
    }

    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (data.type === 'CLEAR_USER_CACHES') {
        event.waitUntil(
            caches.keys().then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith('tijum-') && key !== STATIC_CACHE)
                        .map((key) => caches.delete(key)),
                ),
            ),
        );
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Never intercept non-GET mutations (POST, PUT, PATCH, DELETE)
    if (request.method !== 'GET') {
        return;
    }

    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }

    // Never intercept cross-origin payment gateways, maps, or third-party scripts
    if (url.origin !== self.location.origin) {
        return;
    }

    // Never intercept Inertia XHR partial/SPA JSON visits: let Inertia handle network errors cleanly
    if (request.headers.has('X-Inertia')) {
        return;
    }

    // Never cache sensitive/authenticated/transactional paths
    if (isSensitivePath(url.pathname)) {
        if (request.mode === 'navigate') {
            event.respondWith(
                fetch(request).catch(async () => {
                    const cachedOffline = await caches.match(OFFLINE_URL);
                    return (
                        cachedOffline ||
                        new Response("You're currently offline.", {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                        })
                    );
                }),
            );
        }
        return;
    }

    // Web app manifests: Network-First with cache fallback so icon & splash metadata updates propagate promptly
    if (isManifestRequest(url.pathname)) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    return cached || Response.error();
                }),
        );
        return;
    }

    // Immutable static assets: Cache-First
    if (isImmutableStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) {
                    return cached;
                }
                return fetch(request).then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(RUNTIME_STATIC_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            }),
        );
        return;
    }

    // Document navigations: strictly Network-Only (never cache HTML with CSRF tokens or user state) + branded offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const cachedOffline = await caches.match(OFFLINE_URL);
                return (
                    cachedOffline ||
                    new Response("You're currently offline.", {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                    })
                );
            }),
        );
    }
});

self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    let payload = {};
    try {
        payload = event.data.json();
    } catch {
        payload = {
            title: 'TIJUM Notification',
            body: event.data.text(),
        };
    }

    const title = typeof payload.title === 'string' && payload.title.trim() !== '' ? payload.title : 'TIJUM';
    const body = typeof payload.body === 'string' ? payload.body : '';
    const rawData = payload.data && typeof payload.data === 'object' ? { ...payload.data } : {};

    // Defensive strip in browser worker as well
    delete rawData.otp_code;
    delete rawData.password;
    delete rawData.token;
    delete rawData.secret;

    const options = {
        body,
        icon: payload.icon || '/pwa/icon-192x192.png',
        badge: payload.badge || '/brand/app/notification-icon.png',
        tag: payload.tag || undefined,
        data: rawData,
        requireInteraction: Boolean(payload.requireInteraction),
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const rawUrl = event.notification.data && typeof event.notification.data.action_url === 'string'
        ? event.notification.data.action_url
        : '/';

    let targetUrl = '/';
    try {
        const parsed = new URL(rawUrl, self.location.origin);
        if (parsed.origin === self.location.origin) {
            targetUrl = parsed.href;
        }
    } catch {
        targetUrl = '/';
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                try {
                    const clientUrl = new URL(client.url);
                    if (clientUrl.origin === self.location.origin) {
                        if ('navigate' in client) {
                            return client.navigate(targetUrl).then((navigated) => (navigated ? navigated.focus() : client.focus()));
                        }
                        return client.focus();
                    }
                } catch {
                    // Continue scanning clients
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
            return undefined;
        }),
    );
});

self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            clients.forEach((client) => {
                client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
            });
        }),
    );
});
