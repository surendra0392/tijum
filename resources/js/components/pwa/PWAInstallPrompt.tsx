import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    isSensitiveTransactionRoute,
    useCurrentRoutePath,
    usePwaInstallState,
} from '@/lib/pwa';
import { cn } from '@/lib/utils';

function IosInstallDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-tijum-surface bg-tijum-cream text-tijum-plum sm:max-w-md dark:border-border dark:bg-card dark:text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-heading text-xl text-tijum-plum dark:text-foreground">
                        <img
                            src="/pwa/icon-192x192.png"
                            alt="TIJUM app icon"
                            width={32}
                            height={32}
                            className="size-8 rounded-lg shadow-xs"
                        />
                        <span>Install TIJUM on iPhone &amp; iPad</span>
                    </DialogTitle>
                    <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                        Add TIJUM to your Home Screen in Safari for a full-screen app experience with quick access and push alerts.
                    </DialogDescription>
                </DialogHeader>

                <ol className="space-y-3 text-sm text-tijum-plum dark:text-foreground">
                    <li className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-white/80 p-3 dark:border-border dark:bg-background/60">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tijum-plum text-xs font-bold text-tijum-cream">
                            1
                        </span>
                        <div className="space-y-0.5">
                            <p className="font-semibold">Tap the Share button in Safari</p>
                            <p className="flex items-center gap-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Look for <Share className="inline size-3.5 text-tijum-coral" aria-hidden="true" /> at the bottom or top toolbar.
                            </p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-white/80 p-3 dark:border-border dark:bg-background/60">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tijum-plum text-xs font-bold text-tijum-cream">
                            2
                        </span>
                        <div className="space-y-0.5">
                            <p className="font-semibold">Select &ldquo;Add to Home Screen&rdquo;</p>
                            <p className="flex items-center gap-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Scroll down and tap <PlusSquare className="inline size-3.5 text-tijum-coral" aria-hidden="true" /> Add to Home Screen.
                            </p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-white/80 p-3 dark:border-border dark:bg-background/60">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tijum-plum text-xs font-bold text-tijum-cream">
                            3
                        </span>
                        <div className="space-y-0.5">
                            <p className="font-semibold">Tap &ldquo;Add&rdquo; to finish</p>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Open TIJUM directly from your Home Screen anytime.
                            </p>
                        </div>
                    </li>
                </ol>
            </DialogContent>
        </Dialog>
    );
}

export function PWAInstallButton({
    className,
    variant = 'button',
    label = 'Install TIJUM App',
    onActionComplete,
}: {
    className?: string;
    variant?: 'button' | 'menu' | 'compact';
    label?: string;
    onActionComplete?: () => void;
}) {
    const {
        canInstallNative,
        canShowIosInstall,
        isStandalone,
        triggerNativeInstall,
    } = usePwaInstallState();
    const [iosDialogOpen, setIosDialogOpen] = useState(false);

    if (isStandalone || (!canInstallNative && !canShowIosInstall)) {
        return null;
    }

    const handleClick = async () => {
        if (canInstallNative) {
            await triggerNativeInstall();
            onActionComplete?.();
            return;
        }

        if (canShowIosInstall) {
            setIosDialogOpen(true);
            onActionComplete?.();
        }
    };

    return (
        <>
            {variant === 'menu' ? (
                <button
                    type="button"
                    onClick={handleClick}
                    className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-tijum-plum transition-colors hover:bg-tijum-cream/80 dark:text-foreground dark:hover:bg-accent',
                        className,
                    )}
                >
                    <Download className="size-4 text-tijum-coral" aria-hidden="true" />
                    <span>{label}</span>
                </button>
            ) : variant === 'compact' ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClick}
                    className={cn(
                        'gap-1.5 rounded-full border-tijum-surface bg-white/85 text-tijum-plum hover:border-tijum-coral hover:bg-tijum-cream dark:border-border dark:bg-card dark:text-foreground',
                        className,
                    )}
                >
                    <Download className="size-3.5 text-tijum-coral" aria-hidden="true" />
                    <span>Install</span>
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleClick}
                    className={cn(
                        'gap-2 rounded-xl border-tijum-surface bg-white text-tijum-plum hover:border-tijum-coral hover:bg-tijum-cream dark:border-border dark:bg-card dark:text-foreground',
                        className,
                    )}
                >
                    <Smartphone className="size-4 text-tijum-coral" aria-hidden="true" />
                    <span>{label}</span>
                </Button>
            )}

            <IosInstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
        </>
    );
}

export function PWAInstallPrompt() {
    const currentPath = useCurrentRoutePath();
    const {
        canInstallNative,
        canShowIosInstall,
        isStandalone,
        isDismissed,
        triggerNativeInstall,
        dismissInstallPrompt,
    } = usePwaInstallState();
    const [iosDialogOpen, setIosDialogOpen] = useState(false);
    const [readyToShow, setReadyToShow] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setReadyToShow(true);
        }, 4000);

        return () => window.clearTimeout(timer);
    }, []);

    const isSensitive = isSensitiveTransactionRoute(currentPath);
    const canOfferInstall = canInstallNative || canShowIosInstall;

    if (
        !readyToShow ||
        isStandalone ||
        isDismissed ||
        isSensitive ||
        !canOfferInstall
    ) {
        return (
            <IosInstallDialog
                open={iosDialogOpen}
                onOpenChange={setIosDialogOpen}
            />
        );
    }

    const handleInstall = async () => {
        if (canInstallNative) {
            await triggerNativeInstall();
            return;
        }

        if (canShowIosInstall) {
            setIosDialogOpen(true);
        }
    };

    return (
        <>
            <aside
                aria-label="Install TIJUM application"
                className="tijum-safe-bottom fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-md rounded-2xl border border-tijum-surface bg-white/95 p-3.5 shadow-xl backdrop-blur-md sm:left-auto sm:w-96 dark:border-border dark:bg-card/95"
            >
                <div className="flex items-start gap-3">
                    <img
                        src="/pwa/icon-192x192.png"
                        alt="TIJUM app icon"
                        width={44}
                        height={44}
                        className="size-11 shrink-0 rounded-xl shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                Install TIJUM App
                            </p>
                            <button
                                type="button"
                                onClick={dismissInstallPrompt}
                                aria-label="Dismiss install prompt"
                                className="rounded-md p-1 text-tijum-plum-muted transition-colors hover:bg-tijum-cream hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-accent"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            {canInstallNative
                                ? 'Quick access to bookings, stays, and instant alerts right from your device.'
                                : 'Add TIJUM to your Home Screen from Safari for quick app-style access.'}
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInstall}
                                className="h-8 rounded-lg bg-tijum-plum px-3 text-xs font-semibold text-tijum-cream hover:bg-tijum-plum/90 dark:bg-tijum-coral dark:text-tijum-plum"
                            >
                                <Download className="mr-1.5 size-3.5" aria-hidden="true" />
                                {canInstallNative ? 'Install' : 'How to install'}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={dismissInstallPrompt}
                                className="h-8 rounded-lg px-2.5 text-xs text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground"
                            >
                                Not now
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            <IosInstallDialog
                open={iosDialogOpen}
                onOpenChange={setIosDialogOpen}
            />
        </>
    );
}
