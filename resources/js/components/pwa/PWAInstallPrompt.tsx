import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
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
                    <DialogTitle className="flex items-center gap-2.5 font-heading text-xl text-tijum-plum dark:text-foreground">
                        <img
                            src="/pwa/icon-192x192.png"
                            alt="TIJUM app icon"
                            width={34}
                            height={34}
                            className="size-8.5 rounded-lg shadow-xs"
                        />
                        <span>Install TIJUM on iPhone &amp; iPad</span>
                    </DialogTitle>
                    <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                        Add TIJUM to your Home Screen in Safari for a full-screen app experience with fast 1-tap booking and instant alerts.
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
                                Launch TIJUM directly from your Home Screen anytime.
                            </p>
                        </div>
                    </li>
                </ol>
            </DialogContent>
        </Dialog>
    );
}

function BrowserInstallDialog({
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
                    <DialogTitle className="flex items-center gap-2.5 font-heading text-xl text-tijum-plum dark:text-foreground">
                        <img
                            src="/pwa/icon-192x192.png"
                            alt="TIJUM app icon"
                            width={34}
                            height={34}
                            className="size-8.5 rounded-lg shadow-xs"
                        />
                        <span>Install TIJUM Web App</span>
                    </DialogTitle>
                    <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                        Install TIJUM from your browser for faster 1-tap booking, app-style launch, and offline browsing.
                    </DialogDescription>
                </DialogHeader>

                <ol className="space-y-3 text-sm text-tijum-plum dark:text-foreground">
                    <li className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-white/80 p-3 dark:border-border dark:bg-background/60">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tijum-plum text-xs font-bold text-tijum-cream">
                            1
                        </span>
                        <div className="space-y-0.5">
                            <p className="font-semibold">Open your browser menu or address bar</p>
                            <p className="flex items-center gap-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Tap the install icon in the address bar or <MoreVertical className="inline size-3.5 text-tijum-coral" aria-hidden="true" /> menu.
                            </p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 rounded-xl border border-tijum-surface bg-white/80 p-3 dark:border-border dark:bg-background/60">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tijum-plum text-xs font-bold text-tijum-cream">
                            2
                        </span>
                        <div className="space-y-0.5">
                            <p className="font-semibold">Choose &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;</p>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Confirm the prompt to add TIJUM to your home screen or desktop apps.
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
        isInstalled,
        triggerNativeInstall,
    } = usePwaInstallState();
    const [iosDialogOpen, setIosDialogOpen] = useState(false);
    const [browserDialogOpen, setBrowserDialogOpen] = useState(false);

    if (isStandalone || isInstalled) {
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
            return;
        }

        setBrowserDialogOpen(true);
        onActionComplete?.();
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
            <BrowserInstallDialog open={browserDialogOpen} onOpenChange={setBrowserDialogOpen} />
        </>
    );
}

export function PWAInstallPrompt() {
    const currentPath = useCurrentRoutePath();
    const {
        canInstallNative,
        canShowIosInstall,
        isStandalone,
        isInstalled,
        isDismissed,
        triggerNativeInstall,
        dismissInstallPrompt,
    } = usePwaInstallState();
    const [iosDialogOpen, setIosDialogOpen] = useState(false);
    const [browserDialogOpen, setBrowserDialogOpen] = useState(false);
    const [readyToShow, setReadyToShow] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setReadyToShow(true);
        }, 1500);

        return () => window.clearTimeout(timer);
    }, []);

    const isSensitive = isSensitiveTransactionRoute(currentPath);
    const isAdminRoute = currentPath.startsWith('/admin');

    if (
        !readyToShow ||
        isStandalone ||
        isInstalled ||
        isDismissed ||
        isSensitive ||
        isAdminRoute
    ) {
        return (
            <>
                <IosInstallDialog
                    open={iosDialogOpen}
                    onOpenChange={setIosDialogOpen}
                />
                <BrowserInstallDialog
                    open={browserDialogOpen}
                    onOpenChange={setBrowserDialogOpen}
                />
            </>
        );
    }

    const handleInstall = async () => {
        if (canInstallNative) {
            await triggerNativeInstall();
            return;
        }

        if (canShowIosInstall) {
            setIosDialogOpen(true);
            return;
        }

        setBrowserDialogOpen(true);
    };

    return (
        <>
            <aside
                aria-label="Install TIJUM application"
                data-pwa-install-prompt="left"
                className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-50 w-[min(calc(100vw-1.5rem),356px)] animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-[22px] border border-tijum-surface/90 bg-white p-4 shadow-[0_22px_54px_-16px_rgba(68,47,65,0.28)] sm:bottom-6 sm:left-6 sm:w-[390px] sm:p-5 dark:border-border dark:bg-card"
            >
                <div className="flex items-start gap-3 sm:gap-3.5">
                    <div className="size-13 shrink-0 overflow-hidden rounded-2xl bg-tijum-plum shadow-sm ring-1 ring-tijum-surface/70 sm:size-14">
                        <img
                            src="/pwa/icon-192x192.png"
                            alt="TIJUM app icon"
                            width={56}
                            height={56}
                            className="size-full object-cover"
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-heading text-base leading-snug font-extrabold tracking-tight text-tijum-plum sm:text-[17px] dark:text-foreground">
                                Install TIJUM
                            </p>
                            <button
                                type="button"
                                onClick={dismissInstallPrompt}
                                aria-label="Dismiss install prompt"
                                className="-mt-1 -mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-tijum-plum-muted/80 transition-colors hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none dark:text-muted-foreground dark:hover:bg-accent"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <p className="mt-1 text-[13px] leading-snug text-tijum-lavender dark:text-muted-foreground">
                            Add our lightweight app for fast 1-tap booking &amp; offline browsing!
                        </p>

                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInstall}
                                className="h-10 cursor-pointer rounded-full bg-tijum-plum px-5 font-heading text-xs font-extrabold tracking-wider text-tijum-cream uppercase shadow-xs transition-all hover:bg-tijum-plum/92 hover:shadow-sm active:scale-[0.98] dark:bg-tijum-coral dark:text-tijum-plum"
                            >
                                INSTALL APP
                            </Button>
                            <button
                                type="button"
                                onClick={dismissInstallPrompt}
                                className="h-10 cursor-pointer rounded-full px-3.5 font-heading text-sm font-semibold text-tijum-plum-muted transition-colors hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none dark:text-muted-foreground dark:hover:bg-accent"
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <IosInstallDialog
                open={iosDialogOpen}
                onOpenChange={setIosDialogOpen}
            />
            <BrowserInstallDialog
                open={browserDialogOpen}
                onOpenChange={setBrowserDialogOpen}
            />
        </>
    );
}
