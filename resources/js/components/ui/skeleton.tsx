import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            className={cn(
                'animate-pulse rounded-lg bg-tijum-surface/75',
                className,
            )}
            {...props}
        />
    );
}

export { Skeleton };
