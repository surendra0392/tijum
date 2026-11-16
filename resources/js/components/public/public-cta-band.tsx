import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CtaAction = {
    label: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

type PublicCtaBandProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    primaryAction: CtaAction;
    secondaryAction?: CtaAction;
    className?: string;
};

export function PublicCtaBand({
    eyebrow,
    title,
    description,
    primaryAction,
    secondaryAction,
    className,
}: PublicCtaBandProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-start justify-between gap-6 rounded-[28px] bg-tijum-plum p-7 text-tijum-cream shadow-tijum-soft sm:p-10 lg:flex-row lg:items-center lg:p-12',
                className,
            )}
        >
            <div className="max-w-2xl space-y-2">
                {eyebrow && (
                    <p className="font-heading text-xs font-semibold tracking-wider text-tijum-peach uppercase">
                        {eyebrow}
                    </p>
                )}
                <h2 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[28px] leading-tight text-balance">
                    {title}
                </h2>
                {description && (
                    <p className="max-w-[60ch] text-sm leading-relaxed text-tijum-cream/80 sm:text-base text-pretty">
                        {description}
                    </p>
                )}
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap lg:shrink-0">
                <Button size="lg" asChild>
                    <Link href={primaryAction.href}>
                        <span>{primaryAction.label}</span>
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </Button>

                {secondaryAction && (
                    <Button
                        variant="outline"
                        size="lg"
                        className="border-tijum-cream/35 bg-transparent text-tijum-cream hover:bg-tijum-cream/10 hover:text-tijum-cream"
                        asChild
                    >
                        <Link href={secondaryAction.href}>
                            <span>{secondaryAction.label}</span>
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
