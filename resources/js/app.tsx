import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AdminLayout from '@/layouts/admin-layout';
import AdminAuthLayout from '@/layouts/admin/admin-auth-layout';
import CustomerLayout from '@/layouts/customer-layout';
import CustomerAuthLayout from '@/layouts/customer/customer-auth-layout';
import OwnerLayout from '@/layouts/owner-layout';
import OwnerAuthLayout from '@/layouts/owner/owner-auth-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'TIJUM';

void createInertiaApp({
    title: (title) => {
        if (!title) {
            return appName;
        }

        return title.toLowerCase().includes('tijum')
            ? title
            : `${title} · ${appName}`;
    },
    layout: (name) => {
        switch (true) {
            case name === 'welcome' ||
                name.startsWith('public/') ||
                name === 'reservations/create' ||
                name === 'reservations/show':
                return PublicLayout;
            case name.startsWith('dev/'):
                return PublicLayout;
            case name.startsWith('owner/auth/'):
                return OwnerAuthLayout;
            case name.startsWith('owner/'):
                return OwnerLayout;
            case name.startsWith('admin/auth/'):
                return AdminAuthLayout;
            case name.startsWith('admin/'):
                return AdminLayout;
            case name.startsWith('auth/'):
                return CustomerAuthLayout;
            case name.startsWith('settings/'):
                return [CustomerLayout, SettingsLayout];
            default:
                return CustomerLayout;
        }
    },
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#FF7A67',
    },
});

// Initialize TIJUM light-first theme on client boot
initializeTheme();
