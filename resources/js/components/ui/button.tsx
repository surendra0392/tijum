import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "font-heading inline-flex touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-tijum-plum focus-visible:ring-tijum-coral/35 focus-visible:ring-[3px] aria-invalid:ring-tijum-coral/35 aria-invalid:border-tijum-coral",
    {
        variants: {
            variant: {
                default:
                    'bg-tijum-coral text-white shadow-tijum-card hover:bg-tijum-coral/90 hover:-translate-y-0.5 active:translate-y-0',
                plum: 'bg-tijum-plum text-tijum-cream shadow-tijum-card hover:bg-tijum-plum/92 hover:-translate-y-0.5 dark:bg-card dark:text-foreground dark:border dark:border-border dark:hover:bg-muted',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90 focus-visible:ring-destructive/30',
                success:
                    'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700 focus-visible:ring-emerald-500/30 dark:bg-emerald-600 dark:hover:bg-emerald-500',
                outline:
                    'border border-tijum-surface/80 dark:border-border bg-white dark:bg-card text-tijum-plum dark:text-foreground hover:border-tijum-coral/50 hover:bg-tijum-cream/60 dark:hover:bg-accent',
                secondary:
                    'bg-tijum-surface/75 dark:bg-secondary text-tijum-plum dark:text-foreground shadow-2xs hover:bg-tijum-surface dark:hover:bg-secondary/80',
                ghost: 'text-tijum-plum dark:text-foreground hover:bg-tijum-cream/60 dark:hover:bg-accent hover:text-tijum-plum dark:hover:text-foreground',
                link: 'text-tijum-plum dark:text-foreground underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2 has-[>svg]:px-3.5',
                sm: "h-8 gap-1.5 rounded-lg px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
                lg: 'h-12 rounded-xl px-6 text-base has-[>svg]:px-5',
                icon: 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    disabled,
    children,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
        loading?: boolean;
    }) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        >
            {asChild ? (
                children
            ) : (
                <>
                    {loading && <Spinner />}
                    {children}
                </>
            )}
        </Comp>
    );
}

export { Button, buttonVariants };
