import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
    title?: string;
    description: string;
    onRetry?: () => void;
    retryLabel?: string;
    action?: ReactNode;
    className?: string;
};

export function ErrorState({
    title = 'Unable to complete request',
    description,
    onRetry,
    retryLabel = 'Try again',
    action,
    className,
}: ErrorStateProps) {
    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-start justify-between gap-4 rounded-2xl border border-status-error-border bg-status-error-bg p-5 text-status-error-fg sm:flex-row sm:items-center',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <AlertTriangle
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                />
                <div className="space-y-1">
                    <h2 className="font-heading text-sm font-semibold sm:text-base">
                        {title}
                    </h2>
                    <p className="text-sm text-status-error-fg/90">
                        {description}
                    </p>
                </div>
            </div>

            {(onRetry || action) && (
                <div className="flex shrink-0 items-center gap-2">
                    {onRetry && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            className="border-status-error-border bg-card text-status-error-fg hover:bg-tijum-peach/15 dark:bg-card"
                        >
                            <RefreshCw className="size-4" aria-hidden="true" />
                            <span>{retryLabel}</span>
                        </Button>
                    )}
                    {action}
                </div>
            )}
        </div>
    );
}
