import { Link } from '@inertiajs/react';
import {
    Bell,
    BookOpen,
    CalendarClock,
    Coins,
    Compass,
    Gift,
    Heart,
    HelpCircle,
    LayoutDashboard,
    LifeBuoy,
    Settings,
    ShieldCheck,
    TicketPercent,
    UserRound,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
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
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard, home } from '@/routes';
import { edit as appearanceEdit } from '@/routes/appearance';
import { edit as profileEdit } from '@/routes/profile';
import { faqs, howItWorks } from '@/routes/public';
import { index as reservationsIndex } from '@/routes/reservations';
import { edit as securityEdit } from '@/routes/security';
import type { NavItem } from '@/types';

const rewardsNavItems: NavItem[] = [
    {
        title: 'Rewards Hub',
        href: '/rewards',
        icon: Gift,
    },
    {
        title: 'Points Wallet',
        href: '/rewards/points',
        icon: Coins,
    },
    {
        title: 'Refer & Earn',
        href: '/rewards/referrals',
        icon: Users,
    },
    {
        title: 'My Coupons',
        href: '/rewards/coupons',
        icon: TicketPercent,
    },
];

const accountNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: profileEdit(),
        icon: UserRound,
    },
    {
        title: 'Saved Stays',
        href: '/wishlist',
        icon: Heart,
    },
    {
        title: 'Security',
        href: securityEdit(),
        icon: ShieldCheck,
    },
    {
        title: 'Notifications',
        href: '/notifications',
        icon: Bell,
    },
    {
        title: 'Settings',
        href: appearanceEdit(),
        icon: Settings,
    },
];

const supportNavItems: NavItem[] = [
    {
        title: 'Support Tickets',
        href: '/support/tickets',
        icon: LifeBuoy,
    },
    {
        title: 'Grievances & Relocation',
        href: '/my-support',
        icon: ShieldCheck,
    },
    {
        title: 'FAQs & Help',
        href: faqs(),
        icon: HelpCircle,
    },
];

export function AppSidebar() {
    const { isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="space-y-2">
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(dashboard())}
                                tooltip={{ children: 'Dashboard' }}
                            >
                                <Link href={dashboard()} prefetch>
                                    <LayoutDashboard aria-hidden="true" />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                tooltip={{ children: 'Explore TIJUM' }}
                            >
                                <Link href={`${home.url()}#launch-cities`}>
                                    <Compass aria-hidden="true" />
                                    <span>Explore TIJUM</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentOrParentUrl(
                                    reservationsIndex(),
                                )}
                                tooltip={{ children: 'My Reservations' }}
                            >
                                <Link href={reservationsIndex()}>
                                    <CalendarClock
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>My Reservations</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <NavMain label="Rewards & Loyalty" items={rewardsNavItems} />

                <NavMain label="My Account" items={accountNavItems} />

                <NavMain label="Support" items={supportNavItems} />
            </SidebarContent>

            <SidebarFooter className="gap-1.5 border-t border-sidebar-border/60 py-3">
                <p className="px-2 font-heading text-[10px] font-semibold tracking-[0.14em] text-tijum-plum-muted uppercase group-data-[collapsible=icon]:hidden dark:text-muted-foreground">
                    Stay easy · Eat well · Spend less
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
