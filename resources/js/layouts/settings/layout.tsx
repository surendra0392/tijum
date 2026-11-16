import { Link } from '@inertiajs/react';
import {
    Bell,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    UserRound,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: editProfile(),
        icon: UserRound,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: SlidersHorizontal,
    },
    {
        title: 'Notifications',
        href: '/settings/notifications',
        icon: Bell,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mb-6 space-y-2 border-b border-tijum-surface/80 pb-5 sm:mb-8 dark:border-border">
                <p className="font-heading text-xs font-semibold tracking-[0.16em] text-tijum-coral uppercase">
                    Customer Account
                </p>
                <p className="max-w-2xl text-sm leading-relaxed text-pretty text-tijum-plum-muted dark:text-muted-foreground">
                    Manage your TIJUM profile, security protections, visual
                    preferences, and communication consent from one place.
                </p>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <aside className="w-full lg:w-64 lg:shrink-0">
                    <nav
                        className="flex flex-col gap-1 lg:sticky lg:top-24"
                        aria-label="Customer settings navigation"
                    >
                        <p className="mb-1 hidden px-3 font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase lg:block dark:text-muted-foreground">
                            Manage
                        </p>

                        {sidebarNavItems.map((item, index) => {
                            const active = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={`${toUrl(item.href)}-${index}`}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'group relative inline-flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-heading text-sm transition-colors focus-visible:ring-2 focus-visible:ring-tijum-coral/40 focus-visible:outline-none',
                                        active
                                            ? 'bg-white font-semibold text-tijum-plum shadow-tijum-card ring-1 ring-tijum-peach/80 dark:bg-card dark:text-foreground dark:ring-tijum-coral/40'
                                            : 'font-medium text-tijum-plum-muted hover:bg-white/75 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-accent/70 dark:hover:text-foreground',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-full bg-tijum-coral transition-opacity',
                                            active
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.icon && (
                                        <item.icon
                                            className={cn(
                                                'size-4 shrink-0',
                                                active
                                                    ? 'text-tijum-coral'
                                                    : 'text-tijum-plum-muted dark:text-muted-foreground',
                                            )}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{item.title}</span>
                                </Link>
                            );
                        })}

                        <Separator className="my-2 lg:hidden" />

                        <Link
                            href={`${editProfile.url()}#account-management`}
                            className="inline-flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-heading text-sm font-medium text-status-error-fg transition-colors hover:bg-status-error-bg/70 focus-visible:ring-2 focus-visible:ring-status-error-fg/40 focus-visible:outline-none"
                        >
                            <Trash2
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Account Management</span>
                        </Link>
                    </nav>
                </aside>

                <div className="min-w-0 flex-1 space-y-6">{children}</div>
            </div>
        </div>
    );
}
