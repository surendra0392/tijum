import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export type BeforeInstallPromptEvent = Event & {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
};

export type WebPushStatus =
    | 'unsupported'
    | 'unconfigured'
    | 'denied'
    | 'default'
    | 'subscribed'
    | 'unsubscribed';

const INSTALL_DISMISS_STORAGE_KEY = 'tijum_pwa_install_dismissed_until';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
let updateReady = false;
let initialized = false;

const listeners = new Set<() => void>();

function notifyListeners(): void {
    listeners.forEach((listener) => listener());
}

export function isStandalonePwa(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    return mediaStandalone || iosStandalone;
}

export function isIosSafariBrowser(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const ua = window.navigator.userAgent;
    const isIosDevice =
        /iPad|iPhone|iPod/.test(ua) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    if (!isIosDevice) {
        return false;
    }

    const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);
    const isSafari = /Safari/.test(ua);

    return isSafari && !isOtherBrowser;
}

export function useCurrentRoutePath(): string {
    const [path, setPath] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return '/';
        }

        return window.location.pathname;
    });

    useEffect(() => {
        return router.on('navigate', (event) => {
            setPath(event.detail.page.url.split('?')[0].split('#')[0] || '/');
        });
    }, []);

    return path;
}

export function isSensitiveTransactionRoute(pathname?: string): boolean {
    const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');

    return (
        path.startsWith('/checkout') ||
        path.startsWith('/payments') ||
        path.startsWith('/reservations/create') ||
        path.includes('/payment')
    );
}

export function isInstallPromptDismissed(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const raw = window.localStorage.getItem(INSTALL_DISMISS_STORAGE_KEY);
        if (!raw) {
            return false;
        }

        const until = Number.parseInt(raw, 10);
        if (Number.isNaN(until)) {
            return false;
        }

        return Date.now() < until;
    } catch {
        return false;
    }
}

export function dismissInstallPrompt(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            INSTALL_DISMISS_STORAGE_KEY,
            String(Date.now() + DISMISS_COOLDOWN_MS),
        );
    } catch {
        // Ignore storage restrictions in private browsing
    }

    notifyListeners();
}

export function clearPwaUserCaches(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_USER_CACHES' });
}

export function initPwaClient(): void {
    if (initialized || typeof window === 'undefined') {
        return;
    }

    initialized = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event as BeforeInstallPromptEvent;
        notifyListeners();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        notifyListeners();
    });

    if (!('serviceWorker' in navigator)) {
        return;
    }

    const shouldRegister = !import.meta.env.DEV || window.location.search.includes('pwa=1');
    if (!shouldRegister) {
        return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing || isSensitiveTransactionRoute()) {
            return;
        }

        refreshing = true;
        window.location.reload();
    });

    const registerWorker = () => {
        navigator.serviceWorker
            .register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            })
            .then((registration) => {
                swRegistration = registration;

                if (registration.waiting && navigator.serviceWorker.controller) {
                    waitingWorker = registration.waiting;
                    updateReady = true;
                    notifyListeners();
                }

                registration.addEventListener('updatefound', () => {
                    const installing = registration.installing;
                    if (!installing) {
                        return;
                    }

                    installing.addEventListener('statechange', () => {
                        if (
                            installing.state === 'installed' &&
                            navigator.serviceWorker.controller
                        ) {
                            waitingWorker = registration.waiting ?? installing;
                            updateReady = true;
                            notifyListeners();
                        }
                    });
                });
            })
            .catch(() => {
                // Keep web experience uninterrupted if SW registration fails
            });
    };

    if (document.readyState === 'complete') {
        registerWorker();
    } else {
        window.addEventListener('load', registerWorker, { once: true });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && swRegistration) {
            swRegistration.update().catch(() => {});
        }
    });
}

export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredInstallPrompt) {
        return 'unavailable';
    }

    try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        notifyListeners();

        return choice.outcome;
    } catch {
        deferredInstallPrompt = null;
        notifyListeners();

        return 'unavailable';
    }
}

export function applyPwaUpdate(): void {
    if (!waitingWorker) {
        return;
    }

    updateReady = false;
    notifyListeners();
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function usePwaInstallState() {
    const [, setTick] = useState(0);

    useEffect(() => {
        initPwaClient();
        const onChange = () => setTick((n) => n + 1);
        listeners.add(onChange);

        const media = window.matchMedia?.('(display-mode: standalone)');
        media?.addEventListener?.('change', onChange);

        return () => {
            listeners.delete(onChange);
            media?.removeEventListener?.('change', onChange);
        };
    }, []);

    const standalone = isStandalonePwa();
    const iosSafari = isIosSafariBrowser();

    return {
        canInstallNative: deferredInstallPrompt !== null && !standalone,
        canShowIosInstall: iosSafari && !standalone,
        isStandalone: standalone,
        isIosSafari: iosSafari,
        isDismissed: isInstallPromptDismissed(),
        updateReady,
        triggerNativeInstall,
        dismissInstallPrompt,
        applyPwaUpdate,
    };
}

function getPushSubscriptionEndpoint(pathname?: string): string {
    const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

    if (path.startsWith('/admin')) {
        return '/admin/notifications/push-subscriptions';
    }

    if (path.startsWith('/owner')) {
        return '/owner/notifications/push-subscriptions';
    }

    return '/notifications/push-subscriptions';
}

function getCsrfHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    if (typeof document === 'undefined') {
        return headers;
    }

    const xsrfCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

    if (xsrfCookie) {
        headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfCookie);
    }

    const metaToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

    if (metaToken) {
        headers['X-CSRF-TOKEN'] = metaToken;
    }

    return headers;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

export async function getWebPushStatus(
    webPushEnabled: boolean,
    publicKey: string,
): Promise<WebPushStatus> {
    if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
    ) {
        return 'unsupported';
    }

    if (!webPushEnabled || !publicKey) {
        return 'unconfigured';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    if (Notification.permission === 'default') {
        return 'default';
    }

    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
        return 'unsubscribed';
    }

    const existing = await registration.pushManager.getSubscription();

    return existing ? 'subscribed' : 'unsubscribed';
}

export async function subscribeToWebPush(publicKey: string): Promise<WebPushStatus> {
    if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
    ) {
        return 'unsupported';
    }

    if (!publicKey) {
        return 'unconfigured';
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return permission === 'denied' ? 'denied' : 'default';
    }

    const registration =
        (await navigator.serviceWorker.getRegistration('/')) ??
        (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));

    const readyRegistration = await navigator.serviceWorker.ready;
    const targetRegistration = readyRegistration || registration;

    let subscription = await targetRegistration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await targetRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Browser push subscription keys are incomplete.');
    }

    const response = await fetch(getPushSubscriptionEndpoint(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: getCsrfHeaders(),
        body: JSON.stringify({
            endpoint: json.endpoint,
            keys: {
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
            },
            content_encoding: 'aes128gcm',
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to save notification subscription on server.');
    }

    return 'subscribed';
}

export async function unsubscribeFromWebPush(): Promise<WebPushStatus> {
    if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
    ) {
        return 'unsupported';
    }

    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();

    if (subscription) {
        await fetch(getPushSubscriptionEndpoint(), {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: getCsrfHeaders(),
            body: JSON.stringify({
                endpoint: subscription.endpoint,
            }),
        }).catch(() => {});

        await subscription.unsubscribe().catch(() => {});
    }

    return 'unsubscribed';
}
