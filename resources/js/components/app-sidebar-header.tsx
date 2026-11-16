import { usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const user = usePage().props.auth?.user;
    const getInitials = useInitials();

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-tijum-surface/80 bg-white/95 px-4 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:px-6 dark:border-border dark:bg-card/95">
            <div className="flex min-w-0 items-center gap-2.5">
                <SidebarTrigger className="-ml-1 text-tijum-plum dark:text-foreground" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-3">
                <ThemeToggle />
                <NotificationBell role="customer" />
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Open customer account menu"
                                data-test="header-account-menu-trigger"
                                className="size-9 shrink-0 cursor-pointer rounded-full border border-tijum-surface/80 bg-white/80 p-0 shadow-xs hover:border-tijum-coral/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-tijum-coral dark:border-border dark:bg-card/80 dark:hover:bg-accent"
                            >
                                <Avatar className="size-8 border border-tijum-peach/80">
                                    {user.avatar && (
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                    )}
                                    <AvatarFallback className="bg-tijum-peach/65 font-heading text-xs font-bold text-tijum-plum">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-64 rounded-xl border-tijum-surface/80 bg-white shadow-tijum-card dark:border-border dark:bg-card"
                        >
                            <UserMenuContent user={user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
