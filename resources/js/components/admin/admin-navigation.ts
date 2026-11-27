import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    ArrowRightLeft,
    Bell,
    BookOpen,
    Building2,
    CalendarCheck,
    Coins,
    CreditCard,
    DoorClosed,
    DoorOpen,
    FileText,
    Flag,
    FolderTree,
    Gift,
    Globe,
    Headphones,
    HelpCircle,
    Image as ImageIcon,
    Layers,
    LayoutDashboard,
    LifeBuoy,
    MailCheck,
    MapPin,
    Megaphone,
    Percent,
    Receipt,
    RefreshCw,
    Send,
    Settings,
    ShieldAlert,
    SlidersHorizontal,
    Sparkles,
    Star,
    Target,
    TicketPercent,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react';
import type { AdminRole, BreadcrumbItem } from '@/types';

export type AdminTabItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    roles: readonly AdminRole[];
    exact?: boolean;
    matchPrefix?: string;
    excludePrefixes?: readonly string[];
    dividerBefore?: boolean;
};

export type AdminWorkspaceGroup = 'operations' | 'platform';

export type AdminWorkspaceDefinition = {
    key: string;
    group: AdminWorkspaceGroup;
    label: string;
    fallbackLabelForRoles?: Partial<Record<AdminRole, string>>;
    icon: LucideIcon;
    sidebarRoles: readonly AdminRole[];
    defaultHref?: string;
    tabs: readonly AdminTabItem[];
};

const ALL_ROLES: readonly AdminRole[] = [
    'super_admin',
    'property_verification',
    'operations',
    'finance',
    'customer_support',
] as const;

const OPS_AND_SUPPORT: readonly AdminRole[] = [
    'super_admin',
    'operations',
    'customer_support',
] as const;

const PROPERTY_VERIFICATION_ROLES: readonly AdminRole[] = [
    'super_admin',
    'property_verification',
    'operations',
] as const;

const FINANCE_ROUTE_ROLES: readonly AdminRole[] = [
    'super_admin',
    'finance',
    'operations',
] as const;

const FINANCE_SIDEBAR_ROLES: readonly AdminRole[] = [
    'super_admin',
    'finance',
] as const;

const OPS_ONLY: readonly AdminRole[] = ['super_admin', 'operations'] as const;

const REWARDS_ROLES: readonly AdminRole[] = [
    'super_admin',
    'operations',
    'finance',
] as const;

const SUPER_ADMIN_ONLY: readonly AdminRole[] = ['super_admin'] as const;

export const ADMIN_WORKSPACES: readonly AdminWorkspaceDefinition[] = [
    {
        key: 'overview',
        group: 'operations',
        label: 'Overview',
        icon: LayoutDashboard,
        sidebarRoles: ALL_ROLES,
        defaultHref: '/admin/dashboard',
        tabs: [],
    },
    {
        key: 'bookings-ops',
        group: 'operations',
        label: 'Bookings & Ops',
        icon: CalendarCheck,
        sidebarRoles: OPS_AND_SUPPORT,
        tabs: [
            {
                label: 'Reservations',
                href: '/admin/reservations',
                icon: CalendarCheck,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/reservations',
            },
            {
                label: 'Check-ins',
                href: '/admin/operations/check-ins',
                icon: DoorOpen,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/operations/check-ins',
            },
            {
                label: 'Check-outs',
                href: '/admin/operations/check-outs',
                icon: DoorClosed,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/operations/check-outs',
            },
            {
                label: 'Payments',
                href: '/admin/payments',
                icon: CreditCard,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/payments',
            },
            {
                label: 'Stay Cases',
                href: '/admin/customer-cases',
                icon: ShieldAlert,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/customer-cases',
            },
            {
                label: 'Relocations',
                href: '/admin/relocations',
                icon: Layers,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/relocations',
            },
        ],
    },
    {
        key: 'properties-partners',
        group: 'operations',
        label: 'Properties & Partners',
        fallbackLabelForRoles: {
            finance: 'Pricing & Amenities',
            customer_support: 'Pricing & Amenities',
        },
        icon: Building2,
        sidebarRoles: ALL_ROLES,
        tabs: [
            {
                label: 'Properties',
                href: '/admin/properties',
                icon: Building2,
                roles: PROPERTY_VERIFICATION_ROLES,
                matchPrefix: '/admin/properties',
            },
            {
                label: 'Partner Verification',
                href: '/admin/partners',
                icon: UserCheck,
                roles: PROPERTY_VERIFICATION_ROLES,
                matchPrefix: '/admin/partners',
                excludePrefixes: ['/admin/partners/financial'],
            },
            {
                label: 'Pricing & Availability',
                href: '/admin/pricing',
                icon: Percent,
                roles: ALL_ROLES,
                matchPrefix: '/admin/pricing',
            },
            {
                label: 'Amenities',
                href: '/admin/amenities',
                icon: Sparkles,
                roles: ALL_ROLES,
                matchPrefix: '/admin/amenities',
            },
        ],
    },
    {
        key: 'finance',
        group: 'operations',
        label: 'Finance',
        icon: Wallet,
        sidebarRoles: FINANCE_SIDEBAR_ROLES,
        tabs: [
            {
                label: 'Settlements',
                href: '/admin/settlements',
                icon: Wallet,
                roles: FINANCE_ROUTE_ROLES,
                matchPrefix: '/admin/settlements',
            },
            {
                label: 'Partner Bank & KYC',
                href: '/admin/partners/financial',
                icon: Building2,
                roles: FINANCE_ROUTE_ROLES,
                matchPrefix: '/admin/partners/financial',
            },
            {
                label: 'Commissions',
                href: '/admin/partner-commissions',
                icon: Percent,
                roles: FINANCE_ROUTE_ROLES,
                matchPrefix: '/admin/partner-commissions',
            },
            {
                label: 'Subsidies',
                href: '/admin/relocation-subsidies',
                icon: Receipt,
                roles: FINANCE_ROUTE_ROLES,
                matchPrefix: '/admin/relocation-subsidies',
            },
            {
                label: 'Reconciliation',
                href: '/admin/financial-reconciliation',
                icon: RefreshCw,
                roles: FINANCE_ROUTE_ROLES,
                matchPrefix: '/admin/financial-reconciliation',
            },
        ],
    },
    {
        key: 'support-reviews',
        group: 'operations',
        label: 'Support & Reviews',
        icon: LifeBuoy,
        sidebarRoles: OPS_AND_SUPPORT,
        tabs: [
            {
                label: 'Customer Support',
                href: '/admin/support/customers',
                icon: Headphones,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/support/customers',
            },
            {
                label: 'Partner Support',
                href: '/admin/support/partners',
                icon: LifeBuoy,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/support/partners',
            },
            {
                label: 'Customer Reviews',
                href: '/admin/reviews',
                icon: Star,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/reviews',
            },
            {
                label: 'Review Reports',
                href: '/admin/review-reports',
                icon: Flag,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/review-reports',
            },
        ],
    },
    {
        key: 'marketing-rewards',
        group: 'platform',
        label: 'Marketing & Rewards',
        fallbackLabelForRoles: {
            finance: 'Rewards & Loyalty',
        },
        icon: Megaphone,
        sidebarRoles: REWARDS_ROLES,
        tabs: [
            {
                label: 'Marketing',
                href: '/admin/marketing',
                icon: Megaphone,
                roles: OPS_ONLY,
                exact: true,
            },
            {
                label: 'Campaigns',
                href: '/admin/marketing/campaigns',
                icon: Target,
                roles: OPS_ONLY,
                matchPrefix: '/admin/marketing/campaigns',
            },
            {
                label: 'Banners',
                href: '/admin/marketing/banners',
                icon: Sparkles,
                roles: OPS_ONLY,
                matchPrefix: '/admin/marketing/banners',
            },
            {
                label: 'Subscribers',
                href: '/admin/marketing/subscribers',
                icon: MailCheck,
                roles: OPS_ONLY,
                matchPrefix: '/admin/marketing/subscribers',
            },
            {
                label: 'Emails',
                href: '/admin/marketing/emails',
                icon: Send,
                roles: OPS_ONLY,
                matchPrefix: '/admin/marketing/emails',
            },
            {
                label: 'Rewards',
                href: '/admin/rewards',
                icon: Gift,
                roles: REWARDS_ROLES,
                exact: true,
                dividerBefore: true,
            },
            {
                label: 'Coupons',
                href: '/admin/rewards/campaigns',
                icon: TicketPercent,
                roles: REWARDS_ROLES,
                matchPrefix: '/admin/rewards/campaigns',
            },
            {
                label: 'Points',
                href: '/admin/rewards/points',
                icon: Coins,
                roles: REWARDS_ROLES,
                matchPrefix: '/admin/rewards/points',
            },
            {
                label: 'Referrals',
                href: '/admin/rewards/referrals',
                icon: Users,
                roles: REWARDS_ROLES,
                matchPrefix: '/admin/rewards/referrals',
            },
        ],
    },
    {
        key: 'content-seo',
        group: 'platform',
        label: 'Content & SEO',
        icon: BookOpen,
        sidebarRoles: OPS_ONLY,
        tabs: [
            {
                label: 'CMS Pages',
                href: '/admin/content/pages',
                icon: FileText,
                roles: OPS_ONLY,
                matchPrefix: '/admin/content/pages',
            },
            {
                label: 'Blog',
                href: '/admin/content/blog',
                icon: BookOpen,
                roles: OPS_ONLY,
                matchPrefix: '/admin/content/blog',
            },
            {
                label: 'Categories',
                href: '/admin/content/categories',
                icon: FolderTree,
                roles: OPS_ONLY,
                matchPrefix: '/admin/content/categories',
            },
            {
                label: 'Authors',
                href: '/admin/content/authors',
                icon: UserCheck,
                roles: OPS_ONLY,
                matchPrefix: '/admin/content/authors',
            },
            {
                label: 'FAQs',
                href: '/admin/content/faqs',
                icon: HelpCircle,
                roles: OPS_ONLY,
                matchPrefix: '/admin/content/faqs',
            },
            {
                label: 'Media',
                href: '/admin/content/media',
                icon: ImageIcon,
                roles: OPS_ONLY,
                matchPrefix: '/admin/content/media',
            },
            {
                label: 'SEO',
                href: '/admin/seo',
                icon: Globe,
                roles: OPS_ONLY,
                exact: true,
                dividerBefore: true,
            },
            {
                label: 'Redirects',
                href: '/admin/seo/redirects',
                icon: ArrowRightLeft,
                roles: OPS_ONLY,
                matchPrefix: '/admin/seo/redirects',
            },
            {
                label: 'Sitemap',
                href: '/admin/seo/sitemap',
                icon: Layers,
                roles: OPS_ONLY,
                matchPrefix: '/admin/seo/sitemap',
            },
        ],
    },
    {
        key: 'notifications',
        group: 'platform',
        label: 'Notifications',
        icon: Bell,
        sidebarRoles: OPS_AND_SUPPORT,
        tabs: [
            {
                label: 'Deliveries',
                href: '/admin/notifications',
                icon: Bell,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/notifications',
                excludePrefixes: [
                    '/admin/notifications/templates',
                    '/admin/notifications/providers',
                ],
            },
            {
                label: 'Templates',
                href: '/admin/notifications/templates',
                icon: Layers,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/notifications/templates',
            },
            {
                label: 'Providers',
                href: '/admin/notifications/providers',
                icon: Activity,
                roles: OPS_AND_SUPPORT,
                matchPrefix: '/admin/notifications/providers',
            },
        ],
    },
    {
        key: 'system',
        group: 'platform',
        label: 'System',
        icon: SlidersHorizontal,
        sidebarRoles: SUPER_ADMIN_ONLY,
        tabs: [
            {
                label: 'Admin Accounts',
                href: '/admin/system/admins',
                icon: Users,
                roles: SUPER_ADMIN_ONLY,
                matchPrefix: '/admin/system/admins',
            },
            {
                label: 'Roles & Permissions',
                href: '/admin/system/roles',
                icon: Settings,
                roles: SUPER_ADMIN_ONLY,
                matchPrefix: '/admin/system/roles',
            },
            {
                label: 'Cities',
                href: '/admin/system/cities',
                icon: MapPin,
                roles: SUPER_ADMIN_ONLY,
                matchPrefix: '/admin/system/cities',
            },
            {
                label: 'Categories',
                href: '/admin/system/categories',
                icon: Layers,
                roles: SUPER_ADMIN_ONLY,
                matchPrefix: '/admin/system/categories',
            },
            {
                label: 'Platform Settings',
                href: '/admin/system/settings',
                icon: SlidersHorizontal,
                roles: SUPER_ADMIN_ONLY,
                matchPrefix: '/admin/system/settings',
            },
        ],
    },
] as const;

export function normalizeAdminPath(url: string): string {
    const pathOnly = url.split('?')[0].split('#')[0] || '/';
    if (pathOnly.length > 1 && pathOnly.endsWith('/')) {
        return pathOnly.slice(0, -1);
    }

    return pathOnly;
}

export function isAdminTabActive(tab: AdminTabItem, url: string): boolean {
    const currentPath = normalizeAdminPath(url);

    if (
        tab.excludePrefixes?.some(
            (excluded) =>
                currentPath === excluded ||
                currentPath.startsWith(`${excluded}/`),
        )
    ) {
        return false;
    }

    if (tab.exact) {
        return currentPath === tab.href;
    }

    const prefix = tab.matchPrefix ?? tab.href;

    return currentPath === prefix || currentPath.startsWith(`${prefix}/`);
}

export function getVisibleWorkspaceTabs(
    workspace: AdminWorkspaceDefinition,
    role: AdminRole | undefined,
): AdminTabItem[] {
    if (!role) {
        return [];
    }

    return workspace.tabs.filter((tab) => tab.roles.includes(role));
}

export function getWorkspaceLabel(
    workspace: AdminWorkspaceDefinition,
    role: AdminRole | undefined,
): string {
    if (role && workspace.fallbackLabelForRoles?.[role]) {
        return workspace.fallbackLabelForRoles[role]!;
    }

    return workspace.label;
}

export function getWorkspaceHref(
    workspace: AdminWorkspaceDefinition,
    role: AdminRole | undefined,
): string {
    if (workspace.defaultHref) {
        return workspace.defaultHref;
    }

    const visibleTabs = getVisibleWorkspaceTabs(workspace, role);

    return visibleTabs[0]?.href ?? '/admin/dashboard';
}

export function isWorkspaceActive(
    workspace: AdminWorkspaceDefinition,
    url: string,
): boolean {
    const currentPath = normalizeAdminPath(url);

    if (workspace.defaultHref) {
        return (
            currentPath === workspace.defaultHref ||
            currentPath.startsWith(`${workspace.defaultHref}/`)
        );
    }

    return workspace.tabs.some((tab) => isAdminTabActive(tab, currentPath));
}

export function resolveActiveAdminWorkspace(
    url: string,
    role: AdminRole | undefined,
): {
    workspace: AdminWorkspaceDefinition;
    activeTab: AdminTabItem | null;
    visibleTabs: AdminTabItem[];
} | null {
    const currentPath = normalizeAdminPath(url);

    for (const workspace of ADMIN_WORKSPACES) {
        if (workspace.tabs.length === 0) {
            if (isWorkspaceActive(workspace, currentPath)) {
                return { workspace, activeTab: null, visibleTabs: [] };
            }
            continue;
        }

        const matchedTab = workspace.tabs.find((tab) =>
            isAdminTabActive(tab, currentPath),
        );

        if (matchedTab) {
            return {
                workspace,
                activeTab: matchedTab,
                visibleTabs: getVisibleWorkspaceTabs(workspace, role),
            };
        }
    }

    return null;
}

export function deriveFallbackAdminBreadcrumbs(
    url: string,
    role: AdminRole | undefined,
): BreadcrumbItem[] {
    const currentPath = normalizeAdminPath(url);

    if (currentPath === '/admin/dashboard') {
        return [{ title: 'Overview', href: '/admin/dashboard' }];
    }

    if (currentPath.startsWith('/admin/profile')) {
        return [
            { title: 'Admin Console', href: '/admin/dashboard' },
            { title: 'Profile', href: '/admin/profile' },
        ];
    }

    if (currentPath.startsWith('/admin/security/two-factor')) {
        return [
            { title: 'Admin Console', href: '/admin/dashboard' },
            { title: 'Two-Factor Security', href: '/admin/security/two-factor' },
        ];
    }

    const resolved = resolveActiveAdminWorkspace(currentPath, role);
    if (!resolved) {
        return [{ title: 'Admin Console', href: '/admin/dashboard' }];
    }

    const crumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        {
            title: getWorkspaceLabel(resolved.workspace, role),
            href: getWorkspaceHref(resolved.workspace, role),
        },
    ];

    if (
        resolved.activeTab &&
        resolved.activeTab.label !== getWorkspaceLabel(resolved.workspace, role)
    ) {
        crumbs.push({
            title: resolved.activeTab.label,
            href: resolved.activeTab.href,
        });
    }

    return crumbs;
}
