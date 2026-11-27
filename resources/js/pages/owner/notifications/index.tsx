import { Head, Link, router } from '@inertiajs/react';
import { CheckCheck, ExternalLink, Inbox, Settings } from 'lucide-react';
import { WebPushToggle } from '@/components/pwa/WebPushToggle';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { InAppNotification } from '@/types/notifications';

interface PaginatedNotifications {
    data: InAppNotification[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}

interface Props {
    notifications: PaginatedNotifications;
    unreadCount: number;
    filter: 'all' | 'unread' | 'read';
}

export default function OwnerNotificationsIndex({
    notifications,
    unreadCount,
    filter,
}: Props) {
    const markAsRead = (id: string, actionUrl?: string | null) => {
        router.post(
            `/owner/notifications/${id}/read`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (actionUrl) {
                        router.visit(actionUrl);
                    }
                },
            },
        );
    };

    const markAllAsRead = () => {
        router.post(
            '/owner/notifications/mark-all-read',
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Partner Notifications" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                    title="Partner Notifications"
                    description="Stay updated with new booking requests, confirmed reservations, settlement payouts, and guest reviews."
                />

                <div className="flex flex-wrap items-center gap-2">
                    <WebPushToggle compact />
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                            className="flex items-center gap-1.5 text-xs text-tijum-plum dark:text-foreground"
                        >
                            <CheckCheck className="size-4" />
                            Mark all as read
                        </Button>
                    )}
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 text-xs"
                    >
                        <Link href="/owner/settings/notifications">
                            <Settings className="size-4 text-tijum-coral" />
                            Preferences
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border">
                <Link
                    href="/owner/notifications?filter=all"
                    preserveState
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        filter === 'all'
                            ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                            : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                    }`}
                >
                    All Notifications ({notifications.total})
                </Link>
                <Link
                    href="/owner/notifications?filter=unread"
                    preserveState
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        filter === 'unread'
                            ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                            : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                    }`}
                >
                    <span>Unread</span>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-tijum-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </Link>
                <Link
                    href="/owner/notifications?filter=read"
                    preserveState
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        filter === 'read'
                            ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                            : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                    }`}
                >
                    Read
                </Link>
            </div>

            {/* Notification List */}
            {notifications.data.length === 0 ? (
                <EmptyState
                    icon={Inbox}
                    title="No notifications"
                    description={
                        filter === 'unread'
                            ? 'All caught up! You have no unread notifications.'
                            : 'When new bookings arrive or settlements are processed, notifications will appear here.'
                    }
                    action={
                        filter !== 'all' ? (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="text-xs"
                            >
                                <Link href="/owner/notifications?filter=all" preserveState>
                                    View all notifications
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-3">
                    {notifications.data.map((notification) => {
                        const isUnread = notification.read_at === null;
                        const title = notification.data.title || 'Notification';
                        const body = notification.data.body || '';
                        const actionUrl = notification.data.action_url;
                        const relatedRef = notification.data.related_reference;

                        return (
                            <Card
                                key={notification.id}
                                className={`transition-all hover:border-tijum-coral/40 hover:shadow-md ${
                                    isUnread
                                        ? 'border-tijum-coral/35 border-l-4 border-l-tijum-coral bg-card dark:border-tijum-coral/45'
                                        : 'border-tijum-surface/80 bg-card dark:border-border'
                                }`}
                            >
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0">
                                                {isUnread ? (
                                                    <span className="flex h-2.5 w-2.5 rounded-full bg-tijum-coral ring-4 ring-tijum-coral/20" />
                                                ) : (
                                                    <span className="flex h-2 w-2 rounded-full bg-muted-foreground/30" />
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-sm font-semibold text-foreground">
                                                        {title}
                                                    </h4>
                                                    {relatedRef && (
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-[10px] uppercase"
                                                        >
                                                            {relatedRef}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                                                    {body}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                                                    <span>
                                                        {notification.created_at_human ||
                                                            notification.created_at}
                                                    </span>
                                                    {actionUrl && (
                                                        <>
                                                            <span>•</span>
                                                            <Link
                                                                href={actionUrl}
                                                                onClick={(
                                                                    event,
                                                                ) => {
                                                                    if (
                                                                        isUnread
                                                                    ) {
                                                                        event.preventDefault();
                                                                        markAsRead(
                                                                            notification.id,
                                                                            actionUrl,
                                                                        );
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1 font-semibold text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach dark:hover:text-tijum-coral"
                                                            >
                                                                <span>Take action</span>
                                                                <ExternalLink className="size-3" />
                                                            </Link>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isUnread && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => markAsRead(notification.id)}
                                                className="shrink-0 text-xs"
                                            >
                                                Mark read
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {notifications.data.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        Showing{' '}
                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                            {notifications.data.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                            {notifications.total}
                        </span>{' '}
                        {notifications.total === 1
                            ? 'notification'
                            : 'notifications'}
                    </p>
                    <Pagination
                        currentPage={notifications.current_page}
                        totalPages={notifications.last_page}
                        total={notifications.total}
                        onPageChange={(page) => {
                            router.get(
                                '/owner/notifications',
                                { filter, page },
                                { preserveState: true, preserveScroll: true },
                            );
                        }}
                    />
                </div>
            )}
        </div>
    );
}
