import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OnboardingStepCardProps = {
    stepNumber: number;
    title: string;
    description: string;
    completed: boolean;
    activeNeeded?: boolean;
    icon: LucideIcon;
    href: string;
    actionLabel: string;
    summaryText?: string;
    disabled?: boolean;
};

export function OnboardingStepCard({
    stepNumber,
    title,
    description,
    completed,
    activeNeeded = false,
    icon: Icon,
    href,
    actionLabel,
    summaryText,
    disabled = false,
}: OnboardingStepCardProps) {
    return (
        <Card
            className={cn(
                'flex flex-col justify-between transition-shadow hover:shadow-md',
                activeNeeded && 'border-tijum-coral/80 dark:border-tijum-coral/70',
            )}
        >
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span
                            className={cn(
                                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border',
                                completed
                                    ? 'border-status-success-border bg-status-success-bg text-status-success-fg'
                                    : activeNeeded
                                      ? 'border-tijum-coral bg-tijum-peach/35 text-tijum-plum dark:border-tijum-coral/60 dark:bg-tijum-coral/20 dark:text-tijum-peach'
                                      : 'border-tijum-surface bg-tijum-cream text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground',
                            )}
                        >
                            <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 space-y-1">
                            <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Step {stepNumber}
                            </p>
                            <CardTitle className="text-base">{title}</CardTitle>
                        </div>
                    </div>

                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 font-heading text-[11px] font-semibold',
                            completed
                                ? 'border-status-success-border bg-status-success-bg text-status-success-fg'
                                : 'border-status-warning-border bg-status-warning-bg text-status-warning-fg',
                        )}
                    >
                        {completed ? (
                            <>
                                <CheckCircle2
                                    className="size-3"
                                    aria-hidden="true"
                                />
                                Done
                            </>
                        ) : (
                            <>
                                <Clock className="size-3" aria-hidden="true" />
                                Pending
                            </>
                        )}
                    </span>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>

            {summaryText && (
                <CardContent className="pt-0">
                    <p className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 px-3 py-2 text-xs leading-relaxed text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                        {summaryText}
                    </p>
                </CardContent>
            )}

            <CardFooter className="border-t border-tijum-surface/70 pt-4 dark:border-border">
                <Button
                    variant={activeNeeded ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={disabled}
                    asChild={!disabled}
                >
                    {disabled ? (
                        <span>{actionLabel}</span>
                    ) : (
                        <Link href={href}>
                            <span>{actionLabel}</span>
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
