import { createInertiaApp, router } from '@inertiajs/react';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { PWAOfflineBanner } from '@/components/pwa/PWAOfflineBanner';
import { PWAUpdateBanner } from '@/components/pwa/PWAUpdateBanner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { clearPwaUserCaches, initPwaClient } from '@/lib/pwa';
import { clearWishlistLocal, syncWishlistIds } from '@/lib/wishlist';
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
                <PWAOfflineBanner />
                {app}
                <PWAUpdateBanner />
                <PWAInstallPrompt />
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#FF7A67',
    },
});

// Initialize TIJUM light-first theme and PWA runtime on client boot
initializeTheme();
initPwaClient();

let hadAuthenticatedActor = false;
router.on('success', (event) => {
    const auth = event.detail.page.props.auth as
        | { user?: unknown; owner?: unknown; admin?: unknown }
        | undefined;
    const hasActor = Boolean(auth?.user || auth?.owner || auth?.admin);

    if (hadAuthenticatedActor && !hasActor) {
        clearPwaUserCaches();
    }

    const wishlistIds = event.detail.page.props.wishlistIds as
        | number[]
        | undefined;
    if (!auth?.user) {
        clearWishlistLocal();
    } else if (Array.isArray(wishlistIds)) {
        syncWishlistIds(wishlistIds);
    }

    hadAuthenticatedActor = hasActor;
});
