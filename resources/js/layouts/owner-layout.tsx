import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Building2,
    CalendarCheck,
    CalendarDays,
    ClipboardCheck,
    Coins,
    DoorOpen,
    FileCheck2,
    LayoutDashboard,
    LifeBuoy,
    LogOut,
    MessageSquareWarning,
    PlusCircle,
    Star,
    UserRound,
    Utensils,
    Wallet,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { clearPwaUserCaches } from '@/lib/pwa';
import { Breadcrumbs } from '@/components/breadcrumbs';
import BrandLogo from '@/components/brand/brand-logo';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { dashboard, logout } from '@/routes/owner';
import {
    index as onboardingIndex,
    status as onboardingStatus,
} from '@/routes/owner/onboarding';
import { edit as profileEdit } from '@/routes/owner/profile';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/owner/properties';
import { index as reservationsIndex } from '@/routes/owner/reservations';
import type { BreadcrumbItem, OwnerStatus } from '@/types';

type OwnerLayoutProps = PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
}>;

const ownerStatusMap: Record<OwnerStatus, SemanticStatus> = {
    active: 'active',
    pending_verification: 'pending',
    pending_review: 'processing',
    rejected: 'rejected',
    suspended: 'suspended',
};

export default function OwnerLayout({
    children,
    breadcrumbs = [],
}: OwnerLayoutProps) {
    const page = usePage();
    const owner = page.props.auth?.owner;
    const getInitials = useInitials();
    const canPublishProperties = Boolean(owner?.can_publish_properties);

    const operationsNavItems = [
        {
            label: 'Availability & Pricing',
            href: '/owner/availability',
            icon: CalendarDays,
            active:
                page.url.startsWith('/owner/availability') ||
                page.url.includes('/pricing'),
        },
        {
            label: 'Check-ins & Check-outs',
            href: '/owner/front-desk',
            icon: DoorOpen,
            active: page.url.startsWith('/owner/front-desk'),
        },
        {
            label: 'Reservations',
            href: reservationsIndex.url(),
            icon: CalendarCheck,
            active:
                page.url.startsWith(reservationsIndex.url()) &&
                !page.url.startsWith('/owner/front-desk'),
        },
        {
            label: 'Complaints',
            href: '/owner/complaints',
            icon: MessageSquareWarning,
            active:
                page.url.startsWith('/owner/complaints') ||
                page.url.startsWith('/owner/cases'),
        },
    ];

    const activeNavItems = [
        {
            label: 'Overview',
            href: dashboard.url(),
            icon: LayoutDashboard,
            active:
                page.url.startsWith(dashboard.url()) &&
                page.url === dashboard.url(),
        },
        {
            label: 'Partner Onboarding',
            href: onboardingIndex.url(),
            icon: ClipboardCheck,
            active:
                page.url.startsWith(onboardingIndex.url()) &&
                !page.url.startsWith(onboardingStatus.url()),
        },
        {
            label: 'Verification Status',
            href: onboardingStatus.url(),
            icon: FileCheck2,
            active: page.url.startsWith(onboardingStatus.url()),
        },
        {
            label: 'Guest Reviews',
            href: '/owner/reviews',
            icon: Star,
            active: page.url.startsWith('/owner/reviews'),
        },
        {
            label: 'Partner Support',
            href: '/owner/support',
            icon: LifeBuoy,
            active: page.url.startsWith('/owner/support'),
        },
        {
            label: 'Notifications',
            href: '/owner/notifications',
            icon: Bell,
            active: page.url.startsWith('/owner/notifications'),
        },
    ];

    const propertyNavItems = [
        {
            label: 'My Properties',
            href: propertiesIndex.url(),
            icon: Building2,
            active:
                page.url.startsWith(propertiesIndex.url()) &&
                !page.url.startsWith(propertyCreate.url()),
        },
        ...(canPublishProperties
            ? [
                  {
                      label: 'Add Property',
                      href: propertyCreate.url(),
                      icon: PlusCircle,
                      active: page.url.startsWith(propertyCreate.url()),
                  },
              ]
            : []),
        {
            label: 'Food & Meal Plans',
            href: propertiesIndex.url({ query: { module: 'food' } }),
            icon: Utensils,
            active: page.url.includes('module=food'),
        },
    ];

    const financialNavItems = [
        {
            label: 'Settlements',
            href: '/owner/settlements',
            icon: Wallet,
            active: page.url.startsWith('/owner/settlements'),
        },
        {
            label: 'Bank & Payouts',
            href: '/owner/financial-profile',
            icon: Building2,
            active: page.url.startsWith('/owner/financial-profile'),
        },
        {
            label: 'Commission Terms',
            href: '/owner/commission-agreements',
            icon: Coins,
            active: page.url.startsWith('/owner/commission-agreements'),
        },
    ];

    const ownerBadgeStatus: SemanticStatus = owner
        ? ownerStatusMap[owner.status]
        : 'neutral';

    return (
        <AppShell
            variant="sidebar"
            className="tijum-owner min-h-svh w-full overflow-x-clip"
        >
            <Sidebar collapsible="icon" variant="sidebar">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href={dashboard.url()}>
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        <BrandLogo
                                            variant="icon"
                                            size="sm"
                                        />
                                        <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                            <span className="truncate font-heading text-sm font-bold tracking-[0.2em] text-tijum-plum uppercase dark:text-foreground">
                                                TIJUM
                                            </span>
                                            <span className="truncate text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                                Partner Portal
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent className="space-y-1.5">
                    <SidebarGroup className="px-2 py-1">
                        <SidebarGroupLabel>
                            Operations &amp; Stays
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {operationsNavItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={item.active}
                                            tooltip={{ children: item.label }}
                                        >
                                            <Link href={item.href}>
                                                <Icon aria-hidden="true" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>

                    <SidebarGroup className="px-2 py-1">
                        <SidebarGroupLabel>
                            Property Management
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {propertyNavItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={item.active}
                                            tooltip={{ children: item.label }}
                                        >
                                            <Link href={item.href}>
                                                <Icon aria-hidden="true" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>

                    <SidebarGroup className="px-2 py-1">
                        <SidebarGroupLabel>Partner Workspace</SidebarGroupLabel>
                        <SidebarMenu>
                            {activeNavItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={item.active}
                                            tooltip={{ children: item.label }}
                                        >
                                            <Link href={item.href}>
                                                <Icon aria-hidden="true" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>

                    <SidebarGroup className="px-2 py-1">
                        <SidebarGroupLabel>
                            Earnings &amp; Settlements
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {financialNavItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={item.active}
                                            tooltip={{ children: item.label }}
                                        >
                                            <Link href={item.href}>
                                                <Icon aria-hidden="true" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="gap-1.5 border-t border-sidebar-border/60 py-3">
                    <p className="px-2 font-heading text-[10px] font-semibold tracking-[0.14em] text-tijum-plum-muted uppercase group-data-[collapsible=icon]:hidden dark:text-muted-foreground">
                        Stay easy · Eat well · Spend less
                    </p>
                </SidebarFooter>
            </Sidebar>

            <AppContent
                variant="sidebar"
                className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-clip bg-tijum-cream/40 dark:bg-background"
            >
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-tijum-surface/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-border dark:bg-card/95">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <SidebarTrigger className="-ml-1 text-tijum-plum dark:text-foreground" />
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <ThemeToggle />
                        <NotificationBell role="owner" />
                        {owner && (
                            <StatusBadge
                                status={ownerBadgeStatus}
                                label={owner.status_label}
                            />
                        )}
                        {owner && (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Open partner profile menu"
                                        data-test="header-owner-menu-trigger"
                                        className="size-9 shrink-0 cursor-pointer rounded-full border border-tijum-surface/80 bg-white/80 p-0 shadow-xs hover:border-tijum-coral/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-tijum-coral dark:border-border dark:bg-card/80 dark:hover:bg-accent"
                                    >
                                        <Avatar className="size-8 border border-tijum-peach/80">
                                            <AvatarFallback className="bg-tijum-peach/65 font-heading text-xs font-bold text-tijum-plum">
                                                {getInitials(owner.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-60 rounded-xl border border-tijum-surface/80 bg-white text-tijum-plum shadow-tijum-card dark:border-border dark:bg-card dark:text-foreground"
                                >
                                    <DropdownMenuLabel className="space-y-1">
                                        <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                            {owner.name}
                                        </p>
                                        <p className="text-xs font-normal text-muted-foreground">
                                            {owner.email}
                                        </p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href={profileEdit.url()}
                                            className="cursor-pointer text-tijum-plum dark:text-foreground"
                                        >
                                            <UserRound
                                                className="mr-2 size-4 text-tijum-plum-muted dark:text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            Profile &amp; Settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href="/owner/settings/notifications"
                                            className="cursor-pointer text-tijum-plum dark:text-foreground"
                                        >
                                            <Bell
                                                className="mr-2 size-4 text-tijum-plum-muted dark:text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            Notification Preferences
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href={logout.url()}
                                            method="post"
                                            as="button"
                                            onClick={() => clearPwaUserCaches()}
                                            className="w-full cursor-pointer text-status-error-fg"
                                            data-test="owner-logout-button"
                                        >
                                            <LogOut
                                                className="mr-2 size-4"
                                                aria-hidden="true"
                                            />
                                            Sign out
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </header>

                <div className="flex flex-1 flex-col justify-between">
                    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                        {children}
                    </main>

                    <footer className="border-t border-tijum-surface/80 bg-white/90 px-6 py-3 text-xs text-tijum-plum-muted dark:border-border dark:bg-card/90 dark:text-muted-foreground">
                        TIJUM Partner Portal — Stay easy. Eat well. Spend less.
                    </footer>
                </div>
            </AppContent>
        </AppShell>
    );
}
