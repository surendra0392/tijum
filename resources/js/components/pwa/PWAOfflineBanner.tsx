import { router } from '@inertiajs/react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function PWAOfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const [reconnectedRecently, setReconnectedRecently] = useState(false);

    useEffect(() => {
        setIsOffline(!navigator.onLine);

        const handleOffline = () => {
            setIsOffline(true);
            setReconnectedRecently(false);
        };

        const handleOnline = () => {
            setIsOffline(false);
            setReconnectedRecently(true);
            router.reload();

            window.setTimeout(() => {
                setReconnectedRecently(false);
            }, 3500);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        const removeNetworkErrorListener = router.on('networkError', () => {
            if (!navigator.onLine) {
                setIsOffline(true);
            }
        });

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            removeNetworkErrorListener();
        };
    }, []);

    if (!isOffline && !reconnectedRecently) {
        return null;
    }

    if (reconnectedRecently && !isOffline) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/90 px-4 py-1.5 text-xs font-medium text-emerald-100 shadow-lg backdrop-blur-md"
            >
                <Wifi
                    className="size-3.5 text-emerald-400"
                    aria-hidden="true"
                />
                <span>Back online &mdash; synced with TIJUM</span>
            </div>
        );
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="fixed top-3 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-tijum-plum px-4 py-2.5 text-xs text-tijum-cream shadow-xl backdrop-blur-md"
        >
            <div className="flex items-center gap-2.5">
                <WifiOff
                    className="size-4 shrink-0 text-tijum-coral"
                    aria-hidden="true"
                />
                <div>
                    <p className="font-semibold">You are offline</p>
                    <p className="text-tijum-cream/80">
                        Bookings, payments, and account actions require an
                        active internet connection.
                    </p>
                </div>
            </div>
            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                    if (navigator.onLine) {
                        setIsOffline(false);
                        router.reload();
                    }
                }}
                className="h-7 shrink-0 rounded-lg border-tijum-cream/30 bg-transparent px-2.5 text-xs text-tijum-cream hover:bg-white/10"
            >
                <RefreshCw className="mr-1 size-3" aria-hidden="true" />
                Retry
            </Button>
        </div>
    );
}
