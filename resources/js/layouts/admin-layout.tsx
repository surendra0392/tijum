import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRightLeft,
    Bell,
    BookOpen,
    Building2,
    CalendarCheck,
    ChevronRight,
    ChevronsUpDown,
    Coins,
    CreditCard,
    DoorClosed,
    DoorOpen,
    ExternalLink,
    FileText,
    Flag,
    FolderTree,
    Gift,
    Globe,
    Headphones,
    HelpCircle,
    Image as ImageIcon,
    LayoutDashboard,
    Layers,
    LifeBuoy,
    Lock,
    LogOut,
    MailCheck,
    MapPin,
    Megaphone,
    Percent,
    Receipt,
    RefreshCw,
    Send,
    Settings,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
    Target,
    TicketPercent,
    User,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { Breadcrumbs } from '@/components/breadcrumbs';
import BrandLogo from '@/components/brand/brand-logo';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { StatusBadge } from '@/components/shared/status-badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    useSidebar,
} from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { dashboard, logout } from '@/routes/admin';
import { index as amenitiesIndex } from '@/routes/admin/amenities';
import { index as partnersIndex } from '@/routes/admin/partners';
import { index as pricingIndex } from '@/routes/admin/pricing';
import { index as propertiesIndex } from '@/routes/admin/properties';
import { index as reservationsIndex } from '@/routes/admin/reservations';
import { setup as twoFactorSetup } from '@/routes/admin/two-factor';
import type { AdminRole, BreadcrumbItem } from '@/types';

type AdminLayoutProps = PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
}>;

type BreadcrumbContextValue = {
    setBreadcrumbs: (items: BreadcrumbItem[]) => void;
};

const AdminLayoutContext = createContext<boolean>(false);
const AdminBreadcrumbContext = createContext<BreadcrumbContextValue | null>(
    null,
);

type PlannedAdminSection = {
    label: string;
    roles: AdminRole[];
    items: { title: string; icon: LucideIcon }[];
};

type AdminNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    active: boolean;
};

type AdminNavSection = {
    key: string;
    label: string;
    icon: LucideIcon;
    visible: boolean;
    items: AdminNavItem[];
};

function AdminSidebarBody({
    dashboardAccessible,
    dashboardActive,
    sections,
    plannedSections,
}: {
    dashboardAccessible: boolean;
    dashboardActive: boolean;
    sections: AdminNavSection[];
    plannedSections: PlannedAdminSection[];
}) {
    const { state, setOpen } = useSidebar();
    const isCollapsed = state === 'collapsed';

    const activeSectionKey = useMemo(
        () =>
            sections.find(
                (section) =>
                    section.visible && section.items.some((i) => i.active),
            )?.key ?? null,
        [sections],
    );

    const [openSection, setOpenSection] = useState<string | null>(
        activeSectionKey,
    );

    useEffect(() => {
        if (activeSectionKey) {
            setOpenSection(activeSectionKey);
        }
    }, [activeSectionKey]);

    const visibleSections = sections.filter(
        (section) => section.visible && section.items.length > 0,
    );

    return (
        <SidebarContent className="gap-1.5 px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Pinned Command Dashboard */}
            <SidebarGroup className="p-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        {dashboardAccessible ? (
                            <SidebarMenuButton
                                asChild
                                isActive={dashboardActive}
                                tooltip={{ children: 'Dashboard' }}
                            >
                                <Link href={dashboard.url()}>
                                    <LayoutDashboard aria-hidden="true" />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        ) : (
                            <SidebarMenuButton
                                disabled
                                aria-disabled="true"
                                tooltip={{
                                    children:
                                        'Complete TOTP setup to unlock Dashboard',
                                }}
                                className="cursor-not-allowed opacity-60"
                            >
                                <Lock aria-hidden="true" />
                                <span>Dashboard (TOTP Locked)</span>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            {/* Accordion Domain Sections (Single-open keeps height compact without scrollbar) */}
            <div className="space-y-1">
                {visibleSections.map((section) => {
                    const SectionIcon = section.icon;
                    const hasActiveChild = section.items.some((i) => i.active);
                    const isOpen = openSection === section.key;

                    return (
                        <Collapsible
                            key={section.key}
                            open={isOpen}
                            onOpenChange={(nextOpen) => {
                                if (isCollapsed) {
                                    setOpen(true);
                                    setOpenSection(section.key);
                                    return;
                                }
                                setOpenSection(nextOpen ? section.key : null);
                            }}
                        >
                            <SidebarGroup className="p-0">
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                type="button"
                                                tooltip={{
                                                    children: section.label,
                                                }}
                                                className={cn(
                                                    'h-8.5 w-full justify-between rounded-lg px-2.5 text-xs font-semibold tracking-wide transition-colors',
                                                    isOpen || hasActiveChild
                                                        ? 'bg-white/10 text-white'
                                                        : 'text-tijum-cream/80 hover:bg-white/8 hover:text-white',
                                                )}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <SectionIcon
                                                        className={cn(
                                                            'size-4 shrink-0',
                                                            hasActiveChild
                                                                ? 'text-tijum-coral'
                                                                : 'text-tijum-peach/90',
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="truncate font-heading group-data-[collapsible=icon]:hidden">
                                                        {section.label}
                                                    </span>
                                                </span>
                                                <span className="flex shrink-0 items-center gap-1.5 group-data-[collapsible=icon]:hidden">
                                                    {hasActiveChild &&
                                                        !isOpen && (
                                                            <span
                                                                className="size-1.5 rounded-full bg-tijum-coral"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    <ChevronRight
                                                        className={cn(
                                                            'size-3.5 text-tijum-peach/80 transition-transform duration-200',
                                                            isOpen &&
                                                                'rotate-90 text-white',
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                    </SidebarMenuItem>
                                </SidebarMenu>

                                <CollapsibleContent>
                                    <SidebarMenu className="mt-1 ml-2.5 space-y-0.5 border-l border-white/12 pl-2 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:pl-0">
                                        {section.items.map((item) => {
                                            const ItemIcon = item.icon;
                                            return (
                                                <SidebarMenuItem
                                                    key={item.label}
                                                >
                                                    <SidebarMenuButton
                                                        asChild
                                                        size="sm"
                                                        isActive={item.active}
                                                        tooltip={{
                                                            children:
                                                                item.label,
                                                        }}
                                                    >
                                                        <Link href={item.href}>
                                                            <ItemIcon aria-hidden="true" />
                                                            <span>
                                                                {item.label}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    );
                })}
            </div>

            {plannedSections.length > 0 && (
                <div className="space-y-2 pt-1 group-data-[collapsible=icon]:hidden">
                    {plannedSections.map((section) => (
                        <SidebarGroup key={section.label} className="p-0">
                            <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-tijum-peach/85 uppercase">
                                {section.label}
                            </div>
                            <SidebarMenu>
                                {section.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            disabled
                                            aria-disabled="true"
                                            tooltip={{ children: item.title }}
                                            className="cursor-default justify-between gap-2 text-tijum-cream/70 opacity-75"
                                        >
                                            <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                                                <item.icon
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span
                                                    className="truncate"
                                                    title={item.title}
                                                >
                                                    {item.title}
                                                </span>
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="ml-auto shrink-0 border-white/25 bg-transparent px-1.5 py-0 text-[10px] text-tijum-peach"
                                            >
                                                Planned
                                            </Badge>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))}
                </div>
            )}
        </SidebarContent>
    );
}

const plannedAdminSections: PlannedAdminSection[] = [];

export default function AdminLayout({
    children,
    breadcrumbs = [],
}: AdminLayoutProps) {
    const isNested = useContext(AdminLayoutContext);
    const parentBreadcrumbContext = useContext(AdminBreadcrumbContext);

    useEffect(() => {
        if (
            isNested &&
            parentBreadcrumbContext &&
            breadcrumbs &&
            breadcrumbs.length > 0
        ) {
            parentBreadcrumbContext.setBreadcrumbs(breadcrumbs);
        }
    }, [isNested, parentBreadcrumbContext, breadcrumbs]);

    if (isNested) {
        return <>{children}</>;
    }

    const [customBreadcrumbs, setCustomBreadcrumbs] =
        useState<BreadcrumbItem[]>(breadcrumbs);

    useEffect(() => {
        if (breadcrumbs && breadcrumbs.length > 0) {
            setCustomBreadcrumbs(breadcrumbs);
        }
    }, [breadcrumbs]);

    const page = usePage();
    const admin = page.props.auth?.admin;
    const getInitials = useInitials();

    const dashboardAccessible = Boolean(admin?.two_factor_enabled);
    const adminRole: AdminRole | undefined = admin?.role;
    const canViewPartners = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('partners.view')),
    );
    const canViewProperties = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('properties.view')),
    );
    const canViewAmenities = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('amenities.view')),
    );
    const canViewPricing = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('pricing.view')),
    );
    const canViewReservations = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('bookings.view') ||
            admin.permissions.includes('bookings.manage')),
    );
    const canViewFinance = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('settlements.view') ||
            admin.permissions.includes('partners.financial.view')),
    );
    const canViewReviews = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('reviews.view')),
    );
    const canViewReviewReports = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('review_reports.view')),
    );
    const canViewContent = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('content.view')),
    );
    const canViewSeo = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('seo.view')),
    );
    const canViewMarketing = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('marketing.view')),
    );
    const canViewRewards = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('rewards.view') ||
            admin.permissions.includes('marketing.view') ||
            admin.permissions.includes('operations.view')),
    );
    const canViewOperations = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('operations.manage') ||
            admin.permissions.includes('bookings.manage') ||
            admin.permissions.includes('bookings.view') ||
            adminRole === 'super_admin' ||
            adminRole === 'operations' ||
            adminRole === 'customer_support'),
    );
    const canViewSupport = Boolean(
        dashboardAccessible &&
        admin &&
        (admin.permissions.includes('*') ||
            admin.permissions.includes('support.manage') ||
            adminRole === 'super_admin' ||
            adminRole === 'customer_support' ||
            adminRole === 'operations'),
    );
    const canManageSystem = Boolean(
        dashboardAccessible && admin && adminRole === 'super_admin',
    );

    const systemNavItems = [
        {
            label: 'Admin Accounts',
            href: '/admin/system/admins',
            icon: Users,
            active: page.url.startsWith('/admin/system/admins'),
        },
        {
            label: 'Roles & Permissions',
            href: '/admin/system/roles',
            icon: Settings,
            active: page.url.startsWith('/admin/system/roles'),
        },
        {
            label: 'Cities',
            href: '/admin/system/cities',
            icon: MapPin,
            active: page.url.startsWith('/admin/system/cities'),
        },
        {
            label: 'Categories',
            href: '/admin/system/categories',
            icon: Layers,
            active: page.url.startsWith('/admin/system/categories'),
        },
        {
            label: 'Platform Settings',
            href: '/admin/system/settings',
            icon: SlidersHorizontal,
            active: page.url.startsWith('/admin/system/settings'),
        },
    ];

    const rewardsNavItems = [
        {
            label: 'Rewards Overview',
            href: '/admin/rewards',
            icon: Sparkles,
            active: page.url === '/admin/rewards',
        },
        {
            label: 'Campaigns & Coupons',
            href: '/admin/rewards/campaigns',
            icon: TicketPercent,
            active: page.url.startsWith('/admin/rewards/campaigns'),
        },
        {
            label: 'Loyalty Points',
            href: '/admin/rewards/points',
            icon: Coins,
            active: page.url.startsWith('/admin/rewards/points'),
        },
        {
            label: 'Referrals & Fraud',
            href: '/admin/rewards/referrals',
            icon: Users,
            active: page.url.startsWith('/admin/rewards/referrals'),
        },
    ];

    const contentNavItems = [
        {
            label: 'CMS Pages',
            href: '/admin/content/pages',
            icon: FileText,
            active: page.url.startsWith('/admin/content/pages'),
        },
        {
            label: 'Blog Articles',
            href: '/admin/content/blog',
            icon: BookOpen,
            active: page.url.startsWith('/admin/content/blog'),
        },
        {
            label: 'Categories',
            href: '/admin/content/categories',
            icon: FolderTree,
            active: page.url.startsWith('/admin/content/categories'),
        },
        {
            label: 'Authors',
            href: '/admin/content/authors',
            icon: UserCheck,
            active: page.url.startsWith('/admin/content/authors'),
        },
        {
            label: 'FAQs',
            href: '/admin/content/faqs',
            icon: HelpCircle,
            active: page.url.startsWith('/admin/content/faqs'),
        },
        {
            label: 'Media Library',
            href: '/admin/content/media',
            icon: ImageIcon,
            active: page.url.startsWith('/admin/content/media'),
        },
    ];

    const seoNavItems = [
        {
            label: 'SEO Overview',
            href: '/admin/seo',
            icon: Globe,
            active: page.url === '/admin/seo',
        },
        {
            label: 'Redirect Manager',
            href: '/admin/seo/redirects',
            icon: ArrowRightLeft,
            active: page.url.startsWith('/admin/seo/redirects'),
        },
        {
            label: 'Sitemap Status',
            href: '/admin/seo/sitemap',
            icon: Layers,
            active: page.url.startsWith('/admin/seo/sitemap'),
        },
    ];

    const marketingNavItems = [
        {
            label: 'Marketing Overview',
            href: '/admin/marketing',
            icon: Megaphone,
            active: page.url === '/admin/marketing',
        },
        {
            label: 'Campaigns',
            href: '/admin/marketing/campaigns',
            icon: Target,
            active: page.url.startsWith('/admin/marketing/campaigns'),
        },
        {
            label: 'Banners',
            href: '/admin/marketing/banners',
            icon: Sparkles,
            active: page.url.startsWith('/admin/marketing/banners'),
        },
        {
            label: 'Subscribers',
            href: '/admin/marketing/subscribers',
            icon: MailCheck,
            active: page.url.startsWith('/admin/marketing/subscribers'),
        },
        {
            label: 'Email Campaigns',
            href: '/admin/marketing/emails',
            icon: Send,
            active: page.url.startsWith('/admin/marketing/emails'),
        },
    ];

    const financeNavItems = [
        {
            label: 'Partner Settlements',
            href: '/admin/settlements',
            icon: Wallet,
            active: page.url.startsWith('/admin/settlements'),
        },
        {
            label: 'Commission Agreements',
            href: '/admin/partner-commissions',
            icon: Percent,
            active: page.url.startsWith('/admin/partner-commissions'),
        },
        {
            label: 'Partner Bank & KYC',
            href: '/admin/partners/financial',
            icon: Building2,
            active: page.url.startsWith('/admin/partners/financial'),
        },
        {
            label: 'Relocation Subsidies',
            href: '/admin/relocation-subsidies',
            icon: Receipt,
            active: page.url.startsWith('/admin/relocation-subsidies'),
        },
        {
            label: 'Reconciliation',
            href: '/admin/financial-reconciliation',
            icon: RefreshCw,
            active: page.url.startsWith('/admin/financial-reconciliation'),
        },
    ];
    const adminSections: AdminNavSection[] = [
        {
            key: 'overview',
            label: 'Overview & Oversight',
            icon: ShieldCheck,
            visible: true,
            items: [
                {
                    label: 'Two-Factor Security',
                    href: twoFactorSetup.url(),
                    icon: ShieldCheck,
                    active: page.url.startsWith(twoFactorSetup.url()),
                },
                ...(canViewAmenities
                    ? [
                          {
                              label: 'Amenities',
                              href: amenitiesIndex.url(),
                              icon: Sparkles,
                              active: page.url.startsWith(
                                  amenitiesIndex.url(),
                              ),
                          },
                      ]
                    : []),
                ...(canViewPricing
                    ? [
                          {
                              label: 'Pricing & Availability',
                              href: pricingIndex.url(),
                              icon: Percent,
                              active: page.url.startsWith(pricingIndex.url()),
                          },
                      ]
                    : []),
                ...(canViewReservations
                    ? [
                          {
                              label: 'Reservations',
                              href: reservationsIndex.url(),
                              icon: CalendarCheck,
                              active: page.url.startsWith(
                                  reservationsIndex.url(),
                              ),
                          },
                          {
                              label: 'Payments',
                              href: '/admin/payments',
                              icon: CreditCard,
                              active: page.url.startsWith('/admin/payments'),
                          },
                      ]
                    : []),
                ...(canViewReviews
                    ? [
                          {
                              label: 'Customer Reviews',
                              href: '/admin/reviews',
                              icon: Star,
                              active: page.url.startsWith('/admin/reviews'),
                          },
                      ]
                    : []),
                ...(canViewReviewReports
                    ? [
                          {
                              label: 'Review Reports',
                              href: '/admin/review-reports',
                              icon: Flag,
                              active: page.url.startsWith(
                                  '/admin/review-reports',
                              ),
                          },
                      ]
                    : []),
                ...(canViewReservations
                    ? [
                          {
                              label: 'Notifications',
                              href: '/admin/notifications',
                              icon: Bell,
                              active: page.url.startsWith(
                                  '/admin/notifications',
                              ),
                          },
                      ]
                    : []),
            ],
        },
        {
            key: 'operations',
            label: 'Marketplace Operations',
            icon: DoorOpen,
            visible: canViewOperations,
            items: [
                {
                    label: 'Check-ins',
                    href: '/admin/operations/check-ins',
                    icon: DoorOpen,
                    active: page.url.startsWith('/admin/operations/check-ins'),
                },
                {
                    label: 'Check-outs',
                    href: '/admin/operations/check-outs',
                    icon: DoorClosed,
                    active: page.url.startsWith('/admin/operations/check-outs'),
                },
                {
                    label: 'Stay Grievances & Claims',
                    href: '/admin/customer-cases',
                    icon: ShieldAlert,
                    active: page.url.startsWith('/admin/customer-cases'),
                },
                {
                    label: 'Alternative Accommodation',
                    href: '/admin/relocations',
                    icon: Layers,
                    active: page.url.startsWith('/admin/relocations'),
                },
            ],
        },
        {
            key: 'partners',
            label: 'Partner Verification',
            icon: UserCheck,
            visible: canViewPartners,
            items: [
                {
                    label: 'Partner Verification',
                    href: partnersIndex.url(),
                    icon: UserCheck,
                    active:
                        page.url.startsWith(partnersIndex.url()) &&
                        !page.url.includes('status=approved') &&
                        !page.url.includes('status=rejected') &&
                        !page.url.startsWith('/admin/partners/financial'),
                },
                {
                    label: 'Verified Partners',
                    href: partnersIndex.url({
                        query: { status: 'approved' },
                    }),
                    icon: ShieldCheck,
                    active: page.url.includes('status=approved'),
                },
                {
                    label: 'Rejected Applications',
                    href: partnersIndex.url({
                        query: { status: 'rejected' },
                    }),
                    icon: ShieldAlert,
                    active: page.url.includes('status=rejected'),
                },
            ],
        },
        {
            key: 'properties',
            label: 'Property Management',
            icon: Building2,
            visible: canViewProperties,
            items: [
                {
                    label: 'All Properties',
                    href: propertiesIndex.url(),
                    icon: Building2,
                    active:
                        page.url.startsWith(propertiesIndex.url()) &&
                        !page.url.includes('verification_status=') &&
                        !page.url.includes('operational_status='),
                },
                {
                    label: 'Property Verification',
                    href: propertiesIndex.url({
                        query: { verification_status: 'submitted' },
                    }),
                    icon: ShieldCheck,
                    active: page.url.includes('verification_status=submitted'),
                },
                {
                    label: 'Approved Properties',
                    href: propertiesIndex.url({
                        query: { verification_status: 'approved' },
                    }),
                    icon: Building2,
                    active: page.url.includes('verification_status=approved'),
                },
                {
                    label: 'Rejected Properties',
                    href: propertiesIndex.url({
                        query: { verification_status: 'rejected' },
                    }),
                    icon: ShieldAlert,
                    active: page.url.includes('verification_status=rejected'),
                },
                {
                    label: 'Suspended Properties',
                    href: propertiesIndex.url({
                        query: { operational_status: 'suspended' },
                    }),
                    icon: Lock,
                    active: page.url.includes('operational_status=suspended'),
                },
            ],
        },
        {
            key: 'finance',
            label: 'Finance & Settlements',
            icon: Wallet,
            visible: canViewFinance,
            items: financeNavItems,
        },
        {
            key: 'content',
            label: 'Content Management',
            icon: BookOpen,
            visible: canViewContent,
            items: contentNavItems,
        },
        {
            key: 'seo',
            label: 'SEO Management',
            icon: Globe,
            visible: canViewSeo,
            items: seoNavItems,
        },
        {
            key: 'marketing',
            label: 'Marketing',
            icon: Megaphone,
            visible: canViewMarketing,
            items: marketingNavItems,
        },
        {
            key: 'rewards',
            label: 'Rewards & Loyalty',
            icon: Gift,
            visible: canViewRewards,
            items: rewardsNavItems,
        },
        {
            key: 'system',
            label: 'System Management',
            icon: SlidersHorizontal,
            visible: canManageSystem,
            items: systemNavItems,
        },
        {
            key: 'support',
            label: 'Support Desk',
            icon: LifeBuoy,
            visible: canViewSupport,
            items: [
                {
                    label: 'Customer Support',
                    href: '/admin/support/customers',
                    icon: Headphones,
                    active: page.url.startsWith('/admin/support/customers'),
                },
                {
                    label: 'Partner Support',
                    href: '/admin/support/partners',
                    icon: LifeBuoy,
                    active: page.url.startsWith('/admin/support/partners'),
                },
            ],
        },
    ];

    const visiblePlannedSections = plannedAdminSections.filter((section) =>
        adminRole ? section.roles.includes(adminRole) : false,
    );

    return (
        <AdminLayoutContext.Provider value={true}>
            <AdminBreadcrumbContext.Provider
                value={{ setBreadcrumbs: setCustomBreadcrumbs }}
            >
                <AppShell
                    variant="sidebar"
                    className="tijum-admin tijum-admin-theme min-h-svh w-full overflow-x-clip"
                >
                    <Sidebar collapsible="icon" variant="sidebar">
                        <SidebarHeader>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton size="lg" asChild>
                                        <Link
                                            href={
                                                dashboardAccessible
                                                    ? dashboard.url()
                                                    : twoFactorSetup.url()
                                            }
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <BrandLogo
                                                    variant="icon"
                                                    tone="dark"
                                                    size="sm"
                                                />
                                                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                                    <span className="truncate font-heading text-sm font-bold tracking-[0.2em] text-tijum-cream uppercase">
                                                        TIJUM
                                                    </span>
                                                    <span className="truncate text-[11px] font-medium text-tijum-peach">
                                                        Admin Console
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarHeader>

                        <AdminSidebarBody
                            dashboardAccessible={dashboardAccessible}
                            dashboardActive={page.url.startsWith(
                                dashboard.url(),
                            )}
                            sections={adminSections}
                            plannedSections={visiblePlannedSections}
                        />
                    </Sidebar>

                    <AppContent
                        variant="sidebar"
                        className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-clip bg-background"
                    >
                        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-tijum-surface/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-border dark:bg-card/95">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <SidebarTrigger className="-ml-1 text-tijum-plum dark:text-foreground" />
                                <Breadcrumbs
                                    breadcrumbs={
                                        customBreadcrumbs.length > 0
                                            ? customBreadcrumbs
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <a
                                    href="/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex size-9 items-center justify-center rounded-full border border-tijum-surface/80 bg-white/90 text-tijum-plum-muted shadow-xs transition-all hover:border-tijum-coral/50 hover:bg-white hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none dark:border-border dark:bg-card/90 dark:text-muted-foreground dark:hover:border-tijum-coral/60 dark:hover:bg-accent dark:hover:text-foreground"
                                    title="Explore Live Marketplace"
                                    aria-label="Explore Live Marketplace"
                                >
                                    <ExternalLink className="size-4" aria-hidden="true" />
                                </a>
                                <ThemeToggle />
                                <NotificationBell role="admin" />
                                {admin && (
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-tijum-surface/80 bg-white/90 shadow-xs transition-all hover:border-tijum-coral/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none dark:border-border dark:bg-card/90 dark:hover:border-tijum-coral/60 dark:hover:bg-accent"
                                                title={`${admin.name} · ${admin.role_label}`}
                                                aria-label="Admin Profile & Menu"
                                            >
                                                <Avatar className="size-7.5 rounded-full">
                                                    <AvatarFallback className="rounded-full bg-tijum-peach/65 font-heading text-xs font-bold text-tijum-plum">
                                                        {getInitials(
                                                            admin.name,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span
                                                    className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white dark:border-card ${
                                                        admin.two_factor_enabled
                                                            ? 'bg-emerald-500'
                                                            : 'bg-amber-500'
                                                    }`}
                                                    title={
                                                        admin.two_factor_enabled
                                                            ? 'TOTP Active'
                                                            : 'TOTP Setup Pending'
                                                    }
                                                />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            side="bottom"
                                            sideOffset={8}
                                            className="w-72 rounded-2xl border border-tijum-surface/80 bg-white p-2 text-tijum-plum shadow-xl dark:border-border dark:bg-card dark:text-foreground"
                                        >
                                            <DropdownMenuLabel className="p-2.5 font-normal">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="size-10 shrink-0 rounded-xl">
                                                        <AvatarFallback className="rounded-xl bg-tijum-plum font-heading text-sm font-bold text-tijum-cream">
                                                            {getInitials(
                                                                admin.name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1 space-y-0.5">
                                                        <p className="truncate font-heading text-xs font-bold text-tijum-plum dark:text-foreground">
                                                            {admin.name}
                                                        </p>
                                                        <p className="truncate text-[11px] font-normal text-muted-foreground">
                                                            {admin.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-tijum-surface/60 pt-2.5 dark:border-border">
                                                    <Badge
                                                        variant="plum"
                                                        className="px-2 py-0.5 text-[10px] font-semibold"
                                                    >
                                                        {admin.role_label}
                                                    </Badge>
                                                    <StatusBadge
                                                        status={
                                                            admin.two_factor_enabled
                                                                ? 'verified'
                                                                : 'pending'
                                                        }
                                                        label={
                                                            admin.two_factor_enabled
                                                                ? 'TOTP Active'
                                                                : 'TOTP Setup'
                                                        }
                                                        className="text-[10px]"
                                                    />
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator className="my-1" />
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href="/admin/profile"
                                                    className="flex cursor-pointer items-center gap-2.5 rounded-xl p-2 text-xs font-medium text-tijum-plum transition-colors hover:bg-tijum-cream/60 dark:text-foreground dark:hover:bg-accent"
                                                >
                                                    <User
                                                        className="size-4 text-tijum-plum-muted dark:text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Admin Profile</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={twoFactorSetup.url()}
                                                    className="flex cursor-pointer items-center gap-2.5 rounded-xl p-2 text-xs font-medium text-tijum-plum transition-colors hover:bg-tijum-cream/60 dark:text-foreground dark:hover:bg-accent"
                                                >
                                                    <ShieldCheck
                                                        className="size-4 text-emerald-600 dark:text-emerald-400"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Two-Factor Security
                                                    </span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-1" />
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={logout.url()}
                                                    method="post"
                                                    as="button"
                                                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl p-2 text-xs font-medium text-status-error-fg transition-colors hover:bg-status-error-bg/70"
                                                    data-test="admin-logout-button"
                                                >
                                                    <LogOut
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Sign out</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </header>

                        <div className="flex flex-1 flex-col justify-between">
                            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                                {children}
                            </main>

                            <footer className="border-t border-tijum-surface/80 bg-white/90 px-6 py-3 text-xs text-tijum-plum-muted dark:border-border dark:bg-card/90 dark:text-muted-foreground">
                                TIJUM Administration Console — Protected by
                                dedicated admin guard &amp; TOTP verification.
                            </footer>
                        </div>
                    </AppContent>
                </AppShell>
            </AdminBreadcrumbContext.Provider>
        </AdminLayoutContext.Provider>
    );
}
