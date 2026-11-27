import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

type SharedFlash = {
    status?: string | null;
    success?: string | null;
    error?: string | null;
    warning?: string | null;
};

function emitSharedFlash(
    flash: SharedFlash | undefined,
    lastToastKeyRef: { current: string | null },
): void {
    if (!flash) {
        return;
    }

    const candidates: Array<{
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
    }> = [];

    if (flash.error) {
        candidates.push({ type: 'error', message: flash.error });
    }
    if (flash.warning) {
        candidates.push({ type: 'warning', message: flash.warning });
    }
    if (flash.success) {
        candidates.push({ type: 'success', message: flash.success });
    } else if (flash.status && flash.status !== 'message-sent') {
        candidates.push({ type: 'success', message: flash.status });
    }

    for (const item of candidates) {
        const key = `${item.type}:${item.message}`;
        if (lastToastKeyRef.current === key) {
            continue;
        }
        lastToastKeyRef.current = key;
        toast[item.type](item.message);
    }
}

export function useFlashToast(): void {
    const lastToastKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            const rawPage = document.getElementById('app')?.dataset.page;
            if (rawPage) {
                try {
                    const parsed = JSON.parse(rawPage) as {
                        props?: { flash?: SharedFlash };
                    };
                    emitSharedFlash(parsed.props?.flash, lastToastKeyRef);
                } catch {
                    // Ignore malformed initial payload
                }
            }
        }

        const offFlash = router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            lastToastKeyRef.current = `${data.type}:${data.message}`;
            toast[data.type](data.message);
        });

        const offSuccess = router.on('success', (event) => {
            const flash = event.detail.page.props.flash as
                | SharedFlash
                | undefined;
            emitSharedFlash(flash, lastToastKeyRef);
        });

        return () => {
            offFlash();
            offSuccess();
        };
    }, []);
}
