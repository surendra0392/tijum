import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'font-heading inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'border-tijum-peach/60 dark:border-border bg-tijum-cream dark:bg-card text-tijum-plum dark:text-foreground [a&]:hover:bg-tijum-peach/40',
                plum: 'border-transparent bg-tijum-plum text-tijum-cream dark:bg-card dark:text-foreground dark:border dark:border-border [a&]:hover:bg-tijum-plum/90',
                peach: 'border-transparent bg-tijum-peach/65 text-tijum-plum dark:bg-tijum-peach/30 dark:text-tijum-peach',
                food: 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
                secondary:
                    'border-tijum-surface/80 dark:border-border bg-tijum-surface/75 dark:bg-muted text-tijum-plum dark:text-foreground [a&]:hover:bg-tijum-surface',
                destructive:
                    'border-status-error-border bg-status-error-bg text-status-error-fg',
                outline:
                    'border-tijum-surface/80 dark:border-border bg-white dark:bg-card text-tijum-plum dark:text-foreground [a&]:hover:bg-tijum-peach/15',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

function Badge({
    className,
    variant,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span';

    return (
        <Comp
            data-slot="badge"
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
