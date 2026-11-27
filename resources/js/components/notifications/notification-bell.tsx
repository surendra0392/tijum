import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    CheckCheck,
    ExternalLink,
    Inbox,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationBellProps {
    role?: 'customer' | 'owner' | 'admin';
    initialUnreadCount?: number;
}

export function NotificationBell({
    role = 'customer',
    initialUnreadCount = 0,
}: NotificationBellProps) {
    const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
    const [isOpen, setIsOpen] = useState(false);

    const basePath =
        role === 'owner'
            ? '/owner/notifications'
            : role === 'admin'
              ? '/admin/notifications'
              : '/notifications';
    const countEndpoint =
        role === 'owner'
            ? '/owner/notifications/unread-count'
            : '/notifications/unread-count';
    const markAllReadEndpoint =
        role === 'owner'
            ? '/owner/notifications/mark-all-read'
            : '/notifications/mark-all-read';

    const fetchUnreadCount = useCallback(async () => {
        if (role === 'admin') return;

        try {
            const res = await fetch(countEndpoint, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                if (typeof data.unread_count === 'number') {
                    setUnreadCount(data.unread_count);
                }
            }
        } catch {
            // Ignore transient network glitches
        }
    }, [countEndpoint, role]);

    // Fetch unread count immediately on mount and periodically if not admin
    useEffect(() => {
        if (role === 'admin') return;

        void fetchUnreadCount();
        const interval = setInterval(() => {
            void fetchUnreadCount();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount, role]);

    const handleOpen = (open: boolean) => {
        setIsOpen(open);
        if (open && role !== 'admin') {
            void fetchUnreadCount();
        }
    };

    const markAllAsRead = () => {
        if (role === 'admin') return;
        router.post(
            markAllReadEndpoint,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUnreadCount(0);
                },
            },
        );
    };

    return (
        <DropdownMenu modal={false} open={isOpen} onOpenChange={handleOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9 shrink-0 cursor-pointer rounded-full border border-tijum-surface/80 bg-white/90 text-tijum-plum shadow-xs hover:border-tijum-coral/50 hover:bg-white hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral dark:border-border dark:bg-card/90 dark:text-foreground dark:hover:border-tijum-coral/60 dark:hover:bg-accent dark:hover:text-foreground"
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                >
                    <Bell className="size-4" aria-hidden="true" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tijum-coral px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-card">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-80 overflow-hidden rounded-2xl border border-tijum-surface/80 bg-white p-0 text-tijum-plum shadow-tijum-soft sm:w-96 dark:border-border dark:bg-card dark:text-foreground"
            >
                <div className="flex items-center justify-between border-b border-tijum-surface/70 px-4 py-3.5 dark:border-border">
                    <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <span className="rounded-full border border-tijum-peach/80 bg-tijum-cream px-2 py-0.5 text-[11px] font-semibold text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && role !== 'admin' && (
                        <button
                            type="button"
                            onClick={markAllAsRead}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-tijum-surface/80 bg-white px-2.5 py-1 font-heading text-xs font-medium text-tijum-plum transition-colors hover:border-tijum-coral/50 hover:text-tijum-coral dark:border-border dark:bg-muted/60 dark:text-foreground dark:hover:border-tijum-coral/50 dark:hover:text-tijum-peach"
                        >
                            <CheckCheck className="size-3.5" aria-hidden="true" />
                            <span>Mark all read</span>
                        </button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {unreadCount === 0 && (
                        <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                            <span className="mb-3 flex size-11 items-center justify-center rounded-full border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                <Inbox className="size-5" aria-hidden="true" />
                            </span>
                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                You&apos;re all caught up
                            </p>
                            <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                No unread notifications right now.
                            </p>
                        </div>
                    )}

                    {unreadCount > 0 && (
                        <div className="p-4 text-center">
                            <p className="mb-3 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                You have{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {unreadCount}
                                </span>{' '}
                                unread notification
                                {unreadCount === 1 ? '' : 's'}.
                            </p>
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                            >
                                <Link href={basePath}>
                                    Open Notification Inbox
                                    <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                <DropdownMenuSeparator className="m-0 bg-tijum-surface/70 dark:bg-border" />
                <div className="bg-tijum-cream/55 p-2 dark:bg-muted/50">
                    <Link
                        href={basePath}
                        className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-heading text-xs font-semibold text-tijum-plum transition-colors hover:bg-white hover:text-tijum-coral dark:text-foreground dark:hover:bg-accent dark:hover:text-tijum-peach"
                    >
                        <span>View all notification history</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
