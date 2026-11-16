import { Head, Link, router } from '@inertiajs/react';
import { CheckCheck, ExternalLink, Inbox, Settings } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
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

export default function CustomerNotificationsIndex({
    notifications,
    unreadCount,
    filter,
}: Props) {
    const markAsRead = (id: string, actionUrl?: string | null) => {
        router.post(
            `/notifications/${id}/read`,
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
            '/notifications/mark-all-read',
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <>
            <Head title="Notifications" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="mx-auto w-full max-w-4xl space-y-6 pb-12">
                    <PageHeader
                        eyebrow="Stay Alerts & Updates"
                        title="Notifications"
                        description="View important updates, reservation confirmations, payment reminders, and stay alerts."
                        actions={
                            <div className="flex flex-wrap items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={markAllAsRead}
                                        className="gap-1.5 text-xs"
                                    >
                                        <CheckCheck className="size-4" />
                                        <span>Mark all as read</span>
                                    </Button>
                                )}
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs"
                                >
                                    <Link href="/settings/notifications">
                                        <Settings className="size-4 text-tijum-coral" />
                                        <span>Preferences</span>
                                    </Link>
                                </Button>
                            </div>
                        }
                    />

                    {/* Filter Pills */}
                    <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-tijum-surface/80 bg-white p-1.5 shadow-2xs dark:border-border dark:bg-card">
                        <Link
                            href="/notifications?filter=all"
                            className={`rounded-lg px-3.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                filter === 'all'
                                    ? 'bg-tijum-plum text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                    : 'text-muted-foreground hover:bg-tijum-cream hover:text-foreground dark:hover:bg-accent'
                            }`}
                        >
                            All Notifications ({notifications.total})
                        </Link>
                        <Link
                            href="/notifications?filter=unread"
                            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                filter === 'unread'
                                    ? 'bg-tijum-plum text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                    : 'text-muted-foreground hover:bg-tijum-cream hover:text-foreground dark:hover:bg-accent'
                            }`}
                        >
                            <span>Unread</span>
                            {unreadCount > 0 && (
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                        filter === 'unread'
                                            ? 'bg-white text-tijum-plum dark:text-tijum-coral'
                                            : 'bg-tijum-coral text-white'
                                    }`}
                                >
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/notifications?filter=read"
                            className={`rounded-lg px-3.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                filter === 'read'
                                    ? 'bg-tijum-plum text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                    : 'text-muted-foreground hover:bg-tijum-cream hover:text-foreground dark:hover:bg-accent'
                            }`}
                        >
                            Read
                        </Link>
                    </div>

                    {/* Notification List */}
                    {notifications.data.length === 0 ? (
                        <Card className="border-dashed py-12">
                            <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                <div className="mb-3 rounded-2xl bg-tijum-peach/25 p-4 text-tijum-plum dark:bg-muted dark:text-tijum-peach">
                                    <Inbox className="size-7" />
                                </div>
                                <h3 className="font-heading text-base font-semibold text-foreground">
                                    No notifications found
                                </h3>
                                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                                    {filter === 'unread'
                                        ? "You have read all of your notifications. You're all caught up!"
                                        : 'When your reservations, payments, or stay updates are processed, notifications will appear here.'}
                                </p>
                                {filter !== 'all' && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="mt-4 text-xs"
                                    >
                                        <Link href="/notifications?filter=all">
                                            View all notifications
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {notifications.data.map((notification) => {
                                const isUnread = notification.read_at === null;
                                const title =
                                    notification.data.title || 'Notification';
                                const body = notification.data.body || '';
                                const actionUrl = notification.data.action_url;
                                const relatedRef =
                                    notification.data.related_reference;

                                return (
                                    <Card
                                        key={notification.id}
                                        className={`py-0 transition-[border-color,box-shadow,background-color] hover:border-tijum-coral/40 hover:shadow-md ${
                                            isUnread
                                                ? 'border-tijum-coral/35 border-l-4 border-l-tijum-coral bg-card dark:border-tijum-coral/45'
                                                : 'border-tijum-surface/80 bg-card dark:border-border'
                                        }`}
                                    >
                                        <CardContent className="p-4 sm:p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1.5 shrink-0">
                                                        {isUnread ? (
                                                            <span className="flex size-2.5 rounded-full bg-tijum-coral ring-4 ring-tijum-coral/20" />
                                                        ) : (
                                                            <span className="flex size-2 rounded-full bg-muted-foreground/35" />
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="font-heading text-sm font-semibold text-foreground">
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
                                                                    <span>
                                                                        ·
                                                                    </span>
                                                                    <Link
                                                                        href={
                                                                            actionUrl
                                                                        }
                                                                        onClick={() => {
                                                                            if (
                                                                                isUnread
                                                                            )
                                                                                markAsRead(
                                                                                    notification.id,
                                                                                );
                                                                        }}
                                                                        className="inline-flex items-center gap-1 font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                                                                    >
                                                                        <span>
                                                                            View
                                                                            details
                                                                        </span>
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
                                                        onClick={() =>
                                                            markAsRead(
                                                                notification.id,
                                                            )
                                                        }
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
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-4 dark:border-border">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {notifications.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {notifications.total}
                                </span>{' '}
                                notification
                                {notifications.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={notifications.current_page}
                                totalPages={notifications.last_page}
                                getPageHref={(page) =>
                                    `/notifications?filter=${filter}&page=${page}`
                                }
                            />
                        </div>
                    )}
                </div>
            </ResponsiveContainer>
        </>
    );
}

CustomerNotificationsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Notifications', href: '/notifications' },
    ],
};
