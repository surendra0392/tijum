import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell
            variant="sidebar"
            className="tijum-customer min-h-svh w-full overflow-x-clip print:block"
        >
            <div className="print:hidden">
                <AppSidebar />
            </div>
            <AppContent
                variant="sidebar"
                className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-clip bg-tijum-cream/40 dark:bg-background print:bg-white"
            >
                <div className="print:hidden">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                </div>
                <div className="flex flex-1 flex-col justify-between">
                    <div className="flex-1">{children}</div>
                    <footer className="border-t border-tijum-surface/80 bg-white/90 px-6 py-3 text-xs text-tijum-plum-muted dark:border-border dark:bg-card/90 dark:text-muted-foreground print:hidden">
                        TIJUM — Stay easy. Eat well. Spend less.
                    </footer>
                </div>
            </AppContent>
        </AppShell>
    );
}
