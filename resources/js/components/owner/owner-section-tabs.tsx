import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarCheck,
    DoorOpen,
    LifeBuoy,
    MessageSquareWarning,
    Percent,
    Star,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OwnerSectionTabItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    matchPrefix?: string;
};

export const OWNER_BOOKINGS_TABS: readonly OwnerSectionTabItem[] = [
    {
        label: 'Front Desk (Today)',
        href: '/owner/front-desk',
        icon: DoorOpen,
        matchPrefix: '/owner/front-desk',
    },
    {
        label: 'All Reservations',
        href: '/owner/reservations',
        icon: CalendarCheck,
        matchPrefix: '/owner/reservations',
    },
] as const;

export const OWNER_FINANCE_TABS: readonly OwnerSectionTabItem[] = [
    {
        label: 'Settlements & Payouts',
        href: '/owner/settlements',
        icon: Wallet,
        matchPrefix: '/owner/settlements',
    },
    {
        label: 'Bank & Tax Profile',
        href: '/owner/financial-profile',
        icon: Building2,
        matchPrefix: '/owner/financial-profile',
    },
    {
        label: 'Commission Terms',
        href: '/owner/commission-agreements',
        icon: Percent,
        matchPrefix: '/owner/commission-agreements',
    },
] as const;

export const OWNER_SUPPORT_TABS: readonly OwnerSectionTabItem[] = [
    {
        label: 'Guest Reviews',
        href: '/owner/reviews',
        icon: Star,
        matchPrefix: '/owner/reviews',
    },
    {
        label: 'Guest Issues & Complaints',
        href: '/owner/complaints',
        icon: MessageSquareWarning,
        matchPrefix: '/owner/complaints',
    },
    {
        label: 'Partner Help Desk',
        href: '/owner/support',
        icon: LifeBuoy,
        matchPrefix: '/owner/support',
    },
] as const;

type OwnerSectionTabsProps = {
    items: readonly OwnerSectionTabItem[];
    ariaLabel: string;
    className?: string;
};

export function OwnerSectionTabs({
    items,
    ariaLabel,
    className,
}: OwnerSectionTabsProps) {
    const { url } = usePage();
    const currentPath = url.split('?')[0];

    return (
        <nav
            aria-label={ariaLabel}
            className={cn(
                'flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-white p-1.5 shadow-2xs dark:border-border dark:bg-card',
                className,
            )}
        >
            {items.map((item) => {
                const Icon = item.icon;
                const prefix = item.matchPrefix ?? item.href;
                const isActive =
                    currentPath === item.href ||
                    currentPath.startsWith(`${prefix}/`);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-heading text-xs font-semibold transition-all',
                            isActive
                                ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                : 'text-tijum-plum-muted hover:bg-tijum-cream/65 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground',
                        )}
                    >
                        <Icon
                            className={cn(
                                'size-3.5 shrink-0',
                                isActive
                                    ? 'text-tijum-peach dark:text-white'
                                    : 'text-tijum-plum-muted dark:text-muted-foreground',
                            )}
                            aria-hidden="true"
                        />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
