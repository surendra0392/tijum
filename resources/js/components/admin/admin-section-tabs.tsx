import { Link, usePage } from '@inertiajs/react';
import {
    isAdminTabActive,
    type AdminTabItem,
} from '@/components/admin/admin-navigation';
import { cn } from '@/lib/utils';

type AdminSectionTabsProps = {
    items: readonly AdminTabItem[];
    ariaLabel: string;
    className?: string;
};

export function AdminSectionTabs({
    items,
    ariaLabel,
    className,
}: AdminSectionTabsProps) {
    const { url } = usePage();

    if (items.length <= 1) {
        return null;
    }

    return (
        <nav
            aria-label={ariaLabel}
            data-admin-section-tabs
            className={cn(
                'flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-white p-1.5 shadow-2xs dark:border-border dark:bg-card',
                className,
            )}
        >
            {items.map((item, index) => {
                const Icon = item.icon;
                const isActive = isAdminTabActive(item, url);
                const showDivider = Boolean(item.dividerBefore && index > 0);

                return (
                    <div
                        key={item.href}
                        className="flex items-center gap-1.5"
                    >
                        {showDivider && (
                            <span
                                aria-hidden="true"
                                className="mx-0.5 hidden h-5 w-px bg-tijum-surface sm:inline-block dark:bg-border"
                            />
                        )}
                        <Link
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl px-3 py-2 font-heading text-xs font-semibold transition-all',
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
                    </div>
                );
            })}
        </nav>
    );
}
