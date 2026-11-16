import type { ReactNode } from 'react';
import { Breadcrumbs, type BreadcrumbEntry } from '@/components/breadcrumbs';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { cn } from '@/lib/utils';

type PublicPageHeroProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbEntry[];
    badges?: ReactNode;
    actions?: ReactNode;
    variant?: 'cream' | 'plum';
    width?: 'default' | 'wide' | 'narrow';
    children?: ReactNode;
    className?: string;
};

export function PublicPageHero({
    eyebrow,
    title,
    description,
    breadcrumbs = [],
    badges,
    actions,
    variant = 'cream',
    width = 'wide',
    children,
    className,
}: PublicPageHeroProps) {
    const isPlum = variant === 'plum';

    return (
        <section
            className={cn(
                isPlum
                    ? 'bg-tijum-plum py-10 text-tijum-cream sm:py-14 lg:py-16'
                    : 'border-b border-tijum-surface bg-tijum-cream py-10 sm:py-12 lg:py-16',
                className,
            )}
        >
            <ResponsiveContainer width={width} className="space-y-6">
                {breadcrumbs.length > 0 && (
                    <Breadcrumbs
                        items={breadcrumbs}
                        tone={isPlum ? 'light' : 'dark'}
                        showHome
                    />
                )}

                <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 max-w-3xl space-y-3.5">
                        {(eyebrow || badges) && (
                            <div className="flex flex-wrap items-center gap-2.5">
                                {eyebrow && (
                                    <p
                                        className={cn(
                                            'font-heading text-xs font-semibold tracking-wider uppercase',
                                            isPlum
                                                ? 'text-tijum-peach'
                                                : 'text-tijum-lavender',
                                        )}
                                    >
                                        {eyebrow}
                                    </p>
                                )}
                                {badges}
                            </div>
                        )}

                        <h1
                            className={cn(
                                'font-heading text-2xl font-bold tracking-[-0.025em] sm:text-3xl lg:text-[42px] lg:leading-[1.1] text-balance',
                                isPlum ? 'text-white' : 'text-tijum-plum',
                            )}
                        >
                            {title}
                        </h1>

                        {description && (
                            <p
                                className={cn(
                                    'max-w-[65ch] text-base leading-[1.68] sm:text-[17px] text-pretty',
                                    isPlum
                                        ? 'text-tijum-cream/85'
                                        : 'text-tijum-lavender',
                                )}
                            >
                                {description}
                            </p>
                        )}
                    </div>

                    {actions && (
                        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-3">
                            {actions}
                        </div>
                    )}
                </header>

                {children}
            </ResponsiveContainer>
        </section>
    );
}
