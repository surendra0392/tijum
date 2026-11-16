import * as React from 'react';
import { cn } from '@/lib/utils';

type NativeSelectProps = React.ComponentProps<'select'> & {
    uiSize?: 'default' | 'sm';
};

/**
 * TIJUM-styled native select aligned with `<Input />` surface, height, focus ring, and dark mode scheme.
 */
function NativeSelect({
    className,
    uiSize = 'default',
    ...props
}: NativeSelectProps) {
    return (
        <select
            data-slot="native-select"
            className={cn(
                'w-full min-w-0 cursor-pointer rounded-xl border border-tijum-surface/80 bg-white px-4 text-sm text-tijum-plum transition-[color,border-color,box-shadow,background-color] duration-200 outline-none hover:border-tijum-plum/55 focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-tijum-surface/40 disabled:opacity-60 dark:border-border dark:bg-card dark:text-foreground dark:[color-scheme:dark] dark:hover:border-tijum-coral/50 dark:disabled:bg-muted/40',
                uiSize === 'sm' ? 'h-10' : 'h-12',
                className,
            )}
            {...props}
        />
    );
}

export { NativeSelect };
