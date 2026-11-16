import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type PageHeaderProps = {
    title: string;
    description?: string;
    eyebrow?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
    badges?: ReactNode;
    className?: string;
};

export function PageHeader({
    title,
    description,
    eyebrow,
    breadcrumbs = [],
    actions,
    badges,
    className,
}: PageHeaderProps) {
    return (
        <header className={cn('space-y-3', className)}>
            {breadcrumbs.length > 0 && (
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            )}

            <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div className="min-w-0 space-y-1.5">
                    {eyebrow && (
                        <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            {eyebrow}
                        </p>
                    )}
                    {badges && (
                        <div className="flex flex-wrap items-center gap-2">
                            {badges}
                        </div>
                    )}
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl dark:text-foreground">
                        {title}
                    </h1>
                    {description && (
                        <p className="max-w-2xl text-sm leading-relaxed text-tijum-plum/75 sm:text-base dark:text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>

                {actions && (
                    <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}
