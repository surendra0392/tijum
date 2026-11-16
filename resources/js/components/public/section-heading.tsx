import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
    id?: string;
    title: string;
    description?: string;
    eyebrow?: string;
    badge?: boolean;
    action?: ReactNode;
    align?: 'left' | 'center';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
    titleClassName?: string;
    descriptionClassName?: string;
};

export function SectionHeading({
    id,
    title,
    description,
    eyebrow,
    badge = false,
    action,
    align = 'left',
    size = 'default',
    className,
    titleClassName,
    descriptionClassName,
}: SectionHeadingProps) {
    const isSm = size === 'sm';
    const isLg = size === 'lg';

    return (
        <div
            className={cn(
                'flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between',
                !isSm && 'gap-6',
                align === 'center' &&
                    'items-center text-center lg:flex-col lg:items-center',
                className,
            )}
        >
            <div
                className={cn(
                    'max-w-3xl',
                    isSm ? 'space-y-1.5' : 'space-y-3.5',
                    align === 'center' && 'mx-auto',
                )}
            >
                {eyebrow && (
                    <div>
                        {badge ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-peach bg-tijum-peach/25 px-3 py-1 font-heading text-xs font-semibold tracking-wider text-tijum-plum uppercase">
                                {eyebrow}
                            </span>
                        ) : (
                            <p
                                className={cn(
                                    'font-heading font-semibold tracking-wider text-tijum-lavender uppercase',
                                    isSm ? 'text-xs' : 'text-xs sm:text-sm',
                                )}
                            >
                                {eyebrow}
                            </p>
                        )}
                    </div>
                )}

                <h2
                    id={id}
                    className={cn(
                        'font-heading font-bold tracking-tight text-tijum-plum text-balance',
                        isSm &&
                            'text-xl leading-snug sm:text-2xl',
                        !isSm &&
                            !isLg &&
                            'text-2xl leading-tight sm:text-3xl lg:text-[34px]',
                        isLg &&
                            'text-2xl leading-tight sm:text-3xl lg:text-4xl',
                        titleClassName,
                    )}
                >
                    {title}
                </h2>

                {description && (
                    <p
                        className={cn(
                            'leading-relaxed text-tijum-lavender text-pretty',
                            isSm
                                ? 'max-w-2xl text-xs sm:text-sm'
                                : 'max-w-[65ch] text-base sm:text-lg',
                            descriptionClassName,
                        )}
                    >
                        {description}
                    </p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
