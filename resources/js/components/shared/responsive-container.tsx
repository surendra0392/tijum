import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type ContainerWidth = 'narrow' | 'default' | 'wide' | 'full';

type ResponsiveContainerProps = PropsWithChildren<{
    width?: ContainerWidth;
    className?: string;
}>;

const widthClasses: Record<ContainerWidth, string> = {
    narrow: 'max-w-3xl',
    default: 'max-w-[75rem]',
    wide: 'max-w-[90rem]',
    full: 'max-w-none',
};

export function ResponsiveContainer({
    width = 'default',
    className,
    children,
}: ResponsiveContainerProps) {
    return (
        <div
            className={cn(
                'mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-10',
                widthClasses[width],
                className,
            )}
        >
            {children}
        </div>
    );
}
