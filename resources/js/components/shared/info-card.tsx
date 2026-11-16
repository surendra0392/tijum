import type { LucideIcon } from 'lucide-react';
import { MapPin, Utensils } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatCardProps = {
    label: string;
    value: string | number;
    helperText?: string;
    icon?: LucideIcon;
    badge?: ReactNode;
    className?: string;
};

export function StatCard({
    label,
    value,
    helperText,
    icon: Icon,
    badge,
    className,
}: StatCardProps) {
    return (
        <Card className={cn('min-w-0 gap-4 py-5', className)}>
            <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                    <CardDescription className="wrap-break-word">
                        {label}
                    </CardDescription>
                    <CardTitle className="text-lg wrap-break-word tabular-nums sm:text-xl">
                        {value}
                    </CardTitle>
                </div>
                {Icon && (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                )}
            </CardHeader>
            {(helperText || badge) && (
                <CardContent className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    {helperText && <span>{helperText}</span>}
                    {badge}
                </CardContent>
            )}
        </Card>
    );
}

type InfoPanelProps = {
    title: string;
    description?: string;
    icon?: LucideIcon;
    badge?: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
};

export function InfoPanel({
    title,
    description,
    icon: Icon,
    badge,
    action,
    children,
    className,
}: InfoPanelProps) {
    return (
        <Card className={cn('gap-4', className)}>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        {Icon && (
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-tijum-surface/80 bg-tijum-cream text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground">
                                <Icon className="size-4.5" aria-hidden="true" />
                            </span>
                        )}
                        <div className="space-y-1">
                            <CardTitle className="text-base sm:text-lg">
                                {title}
                            </CardTitle>
                            {description && (
                                <CardDescription>{description}</CardDescription>
                            )}
                        </div>
                    </div>
                    {badge}
                </div>
            </CardHeader>
            {(children || action) && (
                <CardContent className="space-y-4">
                    {children}
                    {action}
                </CardContent>
            )}
        </Card>
    );
}

type PropertySummaryCardProps = {
    title: string;
    categoryLabel: string;
    cityLabel: string;
    mealLabel: string;
    priceSummary: string;
    badge?: ReactNode;
    footerAction?: ReactNode;
    className?: string;
};

/**
 * Reusable presentation card template for Phase 03+ stay summaries.
 * Contains no booking, availability, or catalog logic in Phase 02.
 */
export function PropertySummaryCard({
    title,
    categoryLabel,
    cityLabel,
    mealLabel,
    priceSummary,
    badge,
    footerAction,
    className,
}: PropertySummaryCardProps) {
    return (
        <Card className={cn('overflow-hidden pt-0', className)}>
            <div className="flex aspect-16/9 items-center justify-between border-b border-tijum-surface/80 bg-tijum-cream px-5 py-4 dark:border-border dark:bg-muted">
                <span className="rounded-full border border-tijum-peach/80 bg-tijum-cream px-3 py-1 font-heading text-xs font-semibold text-tijum-plum dark:bg-card dark:text-foreground">
                    {categoryLabel}
                </span>
                {badge}
            </div>
            <CardHeader className="gap-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {cityLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Utensils className="size-3.5" aria-hidden="true" />
                        {mealLabel}
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/70 pt-4 dark:border-border">
                <span className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                    {priceSummary}
                </span>
                {footerAction}
            </CardContent>
        </Card>
    );
}
