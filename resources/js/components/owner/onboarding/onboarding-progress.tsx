import { Link } from '@inertiajs/react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    businessProfile,
    cities,
    documents,
    index as onboardingIndex,
    review,
} from '@/routes/owner/onboarding';
import type { OnboardingWorkflowStep } from '@/types';

type OnboardingProgressProps = {
    steps: OnboardingWorkflowStep[];
    currentStepKey: string;
    isEditable?: boolean;
};

const stepRouteMap: Record<string, string> = {
    account_verification: onboardingIndex.url(),
    business_profile: businessProfile.url(),
    operating_cities: cities.url(),
    documents: documents.url(),
    review: review.url(),
};

export function OnboardingProgress({
    steps,
    currentStepKey,
    isEditable = true,
}: OnboardingProgressProps) {
    return (
        <nav
            aria-label="Partner onboarding steps"
            className="rounded-2xl border border-tijum-surface/80 bg-white p-3 shadow-tijum-card sm:p-4 dark:border-border dark:bg-card"
        >
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {steps.map((step) => {
                    const isCurrent = step.key === currentStepKey;
                    const href =
                        stepRouteMap[step.key] ?? onboardingIndex.url();
                    const canNavigate =
                        isEditable ||
                        step.key === 'account_verification' ||
                        step.key === 'review';

                    const content = (
                        <div className="flex min-w-0 items-start gap-2.5">
                            <span
                                className={cn(
                                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold',
                                    step.completed
                                        ? 'bg-status-success-bg text-status-success-fg'
                                        : isCurrent
                                          ? 'bg-tijum-coral text-white'
                                          : 'border border-tijum-surface bg-tijum-cream text-tijum-plum-muted dark:border-border dark:bg-muted dark:text-muted-foreground',
                                )}
                            >
                                {step.completed ? (
                                    <CheckCircle2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                ) : isCurrent ? (
                                    step.number
                                ) : (
                                    <Circle
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                    Step {step.number} · {step.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-tijum-plum-muted dark:text-muted-foreground">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );

                    return (
                        <li key={step.key} className="min-w-0">
                            {canNavigate ? (
                                <Link
                                    href={href}
                                    aria-current={
                                        isCurrent ? 'step' : undefined
                                    }
                                    className={cn(
                                        'block h-full rounded-xl border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                        isCurrent
                                            ? 'border-tijum-coral bg-tijum-cream/85 shadow-2xs dark:border-tijum-coral dark:bg-tijum-coral/15'
                                            : 'border-tijum-surface/70 bg-white hover:border-tijum-peach hover:bg-tijum-cream/40 dark:border-border dark:bg-card dark:hover:border-tijum-coral/40 dark:hover:bg-accent/70',
                                    )}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <div
                                    aria-current={
                                        isCurrent ? 'step' : undefined
                                    }
                                    className={cn(
                                        'h-full rounded-xl border px-3 py-2.5',
                                        isCurrent
                                            ? 'border-tijum-peach bg-tijum-cream/60 dark:border-tijum-coral/50 dark:bg-tijum-coral/12'
                                            : 'border-tijum-surface/70 bg-tijum-surface/20 opacity-85 dark:border-border dark:bg-muted/40',
                                    )}
                                >
                                    {content}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
