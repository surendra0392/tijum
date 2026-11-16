import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type LoadingStateProps = {
    variant?: 'cards' | 'table' | 'profile';
    rows?: number;
    label?: string;
    className?: string;
};

export function LoadingState({
    variant = 'cards',
    rows = 3,
    label = 'Loading content...',
    className,
}: LoadingStateProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className={cn('space-y-4', className)}
        >
            <span className="sr-only">{label}</span>

            {variant === 'cards' && (
                <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: rows }).map((_, index) => (
                        <div
                            key={index}
                            className="space-y-3 rounded-[20px] border border-tijum-surface/80 bg-card p-6 shadow-tijum-card dark:border-border"
                        >
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-7 w-36" />
                            <Skeleton className="h-3.5 w-full" />
                        </div>
                    ))}
                </div>
            )}

            {variant === 'table' && (
                <div className="space-y-2 rounded-[20px] border border-tijum-surface/80 bg-card p-4 shadow-tijum-card dark:border-border">
                    <Skeleton className="h-9 w-full" />
                    {Array.from({ length: rows }).map((_, index) => (
                        <Skeleton key={index} className="h-11 w-full" />
                    ))}
                </div>
            )}

            {variant === 'profile' && (
                <div className="space-y-4 rounded-[20px] border border-tijum-surface/80 bg-card p-6 shadow-tijum-card dark:border-border">
                    <div className="flex items-center gap-3">
                        <Skeleton className="size-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3.5 w-28" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            )}
        </div>
    );
}
