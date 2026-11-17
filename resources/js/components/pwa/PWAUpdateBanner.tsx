import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    applyPwaUpdate,
    isSensitiveTransactionRoute,
    useCurrentRoutePath,
    usePwaInstallState,
} from '@/lib/pwa';

export function PWAUpdateBanner() {
    const currentPath = useCurrentRoutePath();
    const { updateReady } = usePwaInstallState();
    const [dismissedForSession, setDismissedForSession] = useState(false);

    if (
        !updateReady ||
        dismissedForSession ||
        isSensitiveTransactionRoute(currentPath)
    ) {
        return null;
    }

    return (
        <aside
            role="status"
            aria-live="polite"
            className="tijum-safe-bottom fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-tijum-coral/40 bg-tijum-plum px-4 py-3 text-tijum-cream shadow-xl"
        >
            <RefreshCw className="size-4 shrink-0 text-tijum-coral" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold">A new version of TIJUM is ready</p>
                <p className="text-tijum-cream/80">
                    Refresh to load the latest fixes and features.
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Button
                    type="button"
                    size="sm"
                    onClick={applyPwaUpdate}
                    className="h-7 rounded-lg bg-tijum-coral px-2.5 text-xs font-semibold text-tijum-plum hover:bg-tijum-coral/90"
                >
                    Update
                </Button>
                <button
                    type="button"
                    onClick={() => setDismissedForSession(true)}
                    aria-label="Dismiss update notification"
                    className="rounded-md p-1 text-tijum-cream/75 transition-colors hover:bg-white/10 hover:text-tijum-cream"
                >
                    <X className="size-3.5" aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}
