import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
    'relative w-full rounded-xl border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
    {
        variants: {
            variant: {
                default:
                    'border-tijum-surface/80 dark:border-border bg-white dark:bg-card text-tijum-plum dark:text-foreground *:data-[slot=alert-description]:text-tijum-plum-muted dark:*:data-[slot=alert-description]:text-muted-foreground',
                info: 'border-status-info-border bg-status-info-bg text-status-info-fg *:data-[slot=alert-description]:text-status-info-fg/90',
                success:
                    'border-status-success-border bg-status-success-bg text-status-success-fg *:data-[slot=alert-description]:text-status-success-fg/90',
                warning:
                    'border-status-warning-border bg-status-warning-bg text-status-warning-fg *:data-[slot=alert-description]:text-status-warning-fg/90',
                destructive:
                    'border-status-error-border bg-status-error-bg text-status-error-fg *:data-[slot=alert-description]:text-status-error-fg/90',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

function Alert({
    className,
    variant,
    ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
    return (
        <div
            data-slot="alert"
            role="alert"
            className={cn(alertVariants({ variant }), className)}
            {...props}
        />
    );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="alert-title"
            className={cn(
                'font-heading col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight',
                className,
            )}
            {...props}
        />
    );
}

function AlertDescription({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="alert-description"
            className={cn(
                'col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
                className,
            )}
            {...props}
        />
    );
}

export { Alert, AlertTitle, AlertDescription };
