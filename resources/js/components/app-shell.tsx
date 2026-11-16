import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
    className?: string;
};

export function AppShell({ children, variant = 'sidebar', className }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div
                className={
                    className
                        ? `flex min-h-dvh w-full flex-col ${className}`
                        : 'flex min-h-dvh w-full flex-col'
                }
            >
                {children}
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={isOpen} className={className}>
            {children}
        </SidebarProvider>
    );
}
