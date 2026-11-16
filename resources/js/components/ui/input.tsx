import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    const isTemporalInput =
        type === 'date' ||
        type === 'time' ||
        type === 'datetime-local' ||
        type === 'month' ||
        type === 'week';

    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                isTemporalInput
                    ? 'block cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer'
                    : 'flex',
                'h-12 w-full min-w-0 rounded-xl border border-tijum-surface/80 dark:border-border bg-white dark:bg-card px-4 py-2 text-base text-tijum-plum dark:text-foreground transition-[color,border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none selection:bg-tijum-peach selection:text-tijum-plum file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-tijum-plum dark:file:text-foreground placeholder:text-tijum-lavender/75 dark:placeholder:text-muted-foreground hover:border-tijum-plum/55 dark:hover:border-tijum-coral/50 read-only:bg-tijum-surface/35 dark:read-only:bg-muted/30 read-only:text-tijum-plum/75 dark:read-only:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-tijum-surface/40 dark:disabled:bg-muted/40 disabled:opacity-60 md:text-sm',
                'focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25',
                'aria-invalid:border-tijum-coral aria-invalid:ring-tijum-coral/25',
                className,
            )}
            {...props}
        />
    );
}

export { Input };
