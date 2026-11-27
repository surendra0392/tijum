import { Link, usePage } from '@inertiajs/react';
import {
    ExternalLink,
    Lock,
    LogOut,
    ShieldCheck,
    User,
} from 'lucide-react';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';
import {
    ADMIN_WORKSPACES,
    deriveFallbackAdminBreadcrumbs,
    getWorkspaceHref,
    getWorkspaceLabel,
    isWorkspaceActive,
    resolveActiveAdminWorkspace,
    type AdminWorkspaceDefinition,
} from '@/components/admin/admin-navigation';
import { AdminSectionTabs } from '@/components/admin/admin-section-tabs';
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
import { clearPwaUserCaches } from '@/lib/pwa';
import { dashboard, logout } from '@/routes/admin';
import { setup as twoFactorSetup } from '@/routes/admin/two-factor';
import type { AdminRole, BreadcrumbItem } from '@/types';

type AdminLayoutProps = PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
}>;

type ScopedBreadcrumbs = {
    url: string;
    items: BreadcrumbItem[];
};

type BreadcrumbContextValue = {
    setNestedBreadcrumbs: (scoped: ScopedBreadcrumbs | null) => void;
};

const AdminLayoutContext = createContext<boolean>(false);
const AdminBreadcrumbContext = createContext<BreadcrumbContextValue | null>(
    null,
);

function NestedAdminBreadcrumbBridge({
    breadcrumbs,
    children,
}: AdminLayoutProps) {
    const parentBreadcrumbContext = useContext(AdminBreadcrumbContext);
    const { url } = usePage();

    useEffect(() => {
        if (!parentBreadcrumbContext) {
            return;
        }

        parentBreadcrumbContext.setNestedBreadcrumbs({
            url,
            items: breadcrumbs ?? [],
        });

        return () => {
            parentBreadcrumbContext.setNestedBreadcrumbs(null);
        };
    }, [parentBreadcrumbContext, breadcrumbs, url]);

    return <>{children}</>;
}

function AdminWorkspaceList({
    label,
    workspaces,
    role,
    currentUrl,
    dashboardAccessible,
}: {
    label: string;
    workspaces: AdminWorkspaceDefinition[];
    role: AdminRole | undefined;
    currentUrl: string;
    dashboardAccessible: boolean;
}) {
    if (workspaces.length === 0) {
        return null;
    }

    return (
        <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.14em] text-tijum-peach/80 uppercase">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
                {workspaces.map((workspace) => {
                    const Icon = workspace.icon;
                    const workspaceLabel = getWorkspaceLabel(workspace, role);
                    const isOverview = workspace.key === 'overview';

                    if (isOverview && !dashboardAccessible) {
                        return (
                            <SidebarMenuItem key={workspace.key}>
                                <SidebarMenuButton
                                    disabled
                                    aria-disabled="true"
                                    tooltip={{
                                        children:
                                            'Complete TOTP setup to unlock Admin Console',
                                    }}
                                    className="cursor-not-allowed opacity-60"
                                >
                                    <Lock aria-hidden="true" />
                                    <span>Overview (TOTP Locked)</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    const href = getWorkspaceHref(workspace, role);
                    const active = isWorkspaceActive(workspace, currentUrl);

                    return (
                        <SidebarMenuItem key={workspace.key}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={{ children: workspaceLabel }}
                            >
                                <Link href={href}>
                                    <Icon aria-hidden="true" />
                                    <span>{workspaceLabel}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function AdminLayoutShell({ children, breadcrumbs = [] }: AdminLayoutProps) {
    const page = usePage();
    const admin = page.props.auth?.admin;
    const getInitials = useInitials();

    const [nestedBreadcrumbs, setNestedBreadcrumbs] =
        useState<ScopedBreadcrumbs | null>(null);

    const dashboardAccessible = Boolean(admin?.two_factor_enabled);
    const adminRole: AdminRole | undefined = admin?.role;

    const visibleWorkspaces = useMemo(() => {
        if (!adminRole) {
            return [];
        }

        if (!dashboardAccessible) {
            return ADMIN_WORKSPACES.filter((w) => w.key === 'overview');
        }

        return ADMIN_WORKSPACES.filter((workspace) =>
            workspace.sidebarRoles.includes(adminRole),
        );
    }, [adminRole, dashboardAccessible]);

    const operationsWorkspaces = useMemo(
        () => visibleWorkspaces.filter((w) => w.group === 'operations'),
        [visibleWorkspaces],
    );

    const platformWorkspaces = useMemo(
        () => visibleWorkspaces.filter((w) => w.group === 'platform'),
        [visibleWorkspaces],
    );

    const activeWorkspace = useMemo(
        () =>
            dashboardAccessible
                ? resolveActiveAdminWorkspace(page.url, adminRole)
                : null,
        [dashboardAccessible, page.url, adminRole],
    );

    const resolvedBreadcrumbs = useMemo(() => {
        if (
            nestedBreadcrumbs &&
            nestedBreadcrumbs.url === page.url &&
            nestedBreadcrumbs.items.length > 0
        ) {
            return nestedBreadcrumbs.items;
        }

        if (breadcrumbs.length > 0) {
            return breadcrumbs;
        }

        return deriveFallbackAdminBreadcrumbs(page.url, adminRole);
    }, [nestedBreadcrumbs, breadcrumbs, page.url, adminRole]);

    const breadcrumbContextValue = useMemo<BreadcrumbContextValue>(
        () => ({ setNestedBreadcrumbs }),
        [],
    );

    return (
        <AdminLayoutContext.Provider value={true}>
            <AdminBreadcrumbContext.Provider value={breadcrumbContextValue}>
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

                        <SidebarContent className="gap-1 py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <AdminWorkspaceList
                                label="Operations"
                                workspaces={operationsWorkspaces}
                                role={adminRole}
                                currentUrl={page.url}
                                dashboardAccessible={dashboardAccessible}
                            />

                            {!dashboardAccessible && (
                                <SidebarGroup className="px-2 py-1">
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(
                                                    twoFactorSetup.url(),
                                                )}
                                                tooltip={{
                                                    children:
                                                        'Two-Factor Security Setup',
                                                }}
                                            >
                                                <Link
                                                    href={twoFactorSetup.url()}
                                                >
                                                    <ShieldCheck aria-hidden="true" />
                                                    <span>
                                                        Two-Factor Security
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroup>
                            )}

                            <AdminWorkspaceList
                                label="Growth & Platform"
                                workspaces={platformWorkspaces}
                                role={adminRole}
                                currentUrl={page.url}
                                dashboardAccessible={dashboardAccessible}
                            />
                        </SidebarContent>

                        <SidebarFooter className="gap-1 border-t border-white/10 py-3">
                            <p className="px-2 font-heading text-[10px] font-semibold tracking-[0.14em] text-tijum-peach/75 uppercase group-data-[collapsible=icon]:hidden">
                                Stay easy · Eat well · Spend less
                            </p>
                        </SidebarFooter>
                    </Sidebar>

                    <AppContent
                        variant="sidebar"
                        className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-clip bg-background"
                    >
                        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-tijum-surface/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-border dark:bg-card/95">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <SidebarTrigger className="-ml-1 text-tijum-plum dark:text-foreground" />
                                <Breadcrumbs
                                    breadcrumbs={resolvedBreadcrumbs}
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
                                    <ExternalLink
                                        className="size-4"
                                        aria-hidden="true"
                                    />
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
                                                    onClick={() =>
                                                        clearPwaUserCaches()
                                                    }
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
                                {activeWorkspace &&
                                    activeWorkspace.visibleTabs.length > 1 && (
                                        <AdminSectionTabs
                                            items={activeWorkspace.visibleTabs}
                                            ariaLabel={`${getWorkspaceLabel(activeWorkspace.workspace, adminRole)} navigation`}
                                            className="mb-6"
                                        />
                                    )}
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

export default function AdminLayout({
    children,
    breadcrumbs = [],
}: AdminLayoutProps) {
    const isNested = useContext(AdminLayoutContext);

    if (isNested) {
        return (
            <NestedAdminBreadcrumbBridge breadcrumbs={breadcrumbs}>
                {children}
            </NestedAdminBreadcrumbBridge>
        );
    }

    return (
        <AdminLayoutShell breadcrumbs={breadcrumbs}>
            {children}
        </AdminLayoutShell>
    );
}
