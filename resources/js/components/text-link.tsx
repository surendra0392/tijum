import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link
            className={cn(
                'font-medium text-tijum-plum underline decoration-tijum-border-control/75 underline-offset-4 transition-colors duration-200 hover:text-tijum-coral-hover hover:decoration-tijum-coral-hover focus-visible:rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tijum-plum',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
