import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
    title: string;
    description: string;
    icon?: LucideIcon;
    action?: ReactNode;
    className?: string;
};

export function EmptyState({
    title,
    description,
    icon: Icon = Inbox,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            data-slot="empty-state"
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-tijum-surface/90 bg-card px-6 py-10 text-center shadow-tijum-card dark:border-border',
                className,
            )}
        >
            <span className="flex size-12 items-center justify-center rounded-full border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="max-w-md space-y-1">
                <h2 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                    {title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>
            {action && <div className="pt-1">{action}</div>}
        </div>
    );
}
