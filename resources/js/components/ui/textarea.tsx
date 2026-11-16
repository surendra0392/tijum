import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                'flex min-h-24 w-full rounded-xl border border-tijum-surface/80 dark:border-border bg-white dark:bg-card px-4 py-3 text-base text-tijum-plum dark:text-foreground transition-[color,border-color,box-shadow] duration-300 outline-none selection:bg-tijum-peach selection:text-tijum-plum placeholder:text-tijum-lavender/75 dark:placeholder:text-muted-foreground hover:border-tijum-coral/50 dark:hover:border-border disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 md:text-sm',
                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
                'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
