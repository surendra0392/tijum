import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import BrandLogo from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { faqs, privacy, terms } from '@/routes/public';

type FormWidth = 'default' | 'comfortable' | 'wide';

type AuthCardLayoutProps = PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
    maxWidth?: FormWidth;
    portalLabel?: string;
    switchPrompt?: string;
    switchLabel?: string;
    switchHref?: string;
}>;

export default function AuthCardLayout({
    children,
    title = '',
    description = '',
    maxWidth = 'default',
    portalLabel = 'Partner Portal',
    switchPrompt,
    switchLabel,
    switchHref,
}: AuthCardLayoutProps) {
    const formWidthClass =
        maxWidth === 'wide'
            ? 'max-w-[44rem]'
            : maxWidth === 'comfortable'
              ? 'max-w-[35rem]'
              : 'max-w-[30rem]';

    return (
        <div className="tijum-auth flex min-h-dvh flex-col bg-tijum-cream text-tijum-plum">
            <header className="border-b border-tijum-surface/75 bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-10">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <Link
                        href={home()}
                        aria-label="TIJUM home"
                        className="rounded-lg focus-visible:outline-tijum-coral"
                    >
                        <BrandLogo variant="horizontal" tone="light" size="sm" />
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href={home()}
                            className="group hidden items-center gap-1.5 font-heading text-xs font-semibold text-tijum-plum-muted transition-colors hover:text-tijum-plum sm:inline-flex"
                        >
                            <ArrowLeft
                                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                                aria-hidden="true"
                            />
                            <span>Back to TIJUM</span>
                        </Link>

                        {switchHref && switchLabel && (
                            <Link
                                href={switchHref}
                                className="group inline-flex items-center gap-1.5 rounded-full border border-tijum-surface bg-white px-3.5 py-1.5 font-heading text-xs font-semibold text-tijum-plum shadow-2xs transition-colors hover:border-tijum-coral/60 hover:bg-tijum-cream/80"
                            >
                                {switchPrompt && (
                                    <span className="hidden font-normal text-tijum-plum-muted sm:inline">
                                        {switchPrompt}
                                    </span>
                                )}
                                <span>{switchLabel}</span>
                                <ArrowRight
                                    className="size-3 text-tijum-coral transition-transform group-hover:translate-x-0.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
                <section
                    className={cn(
                        'mx-auto w-full rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-9',
                        formWidthClass,
                    )}
                >
                    <div className="mb-6 space-y-2.5 border-b border-tijum-surface/80 pb-5">
                        {portalLabel && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-tijum-surface bg-tijum-cream px-3 py-1 font-heading text-[11px] font-semibold tracking-[0.12em] text-tijum-plum uppercase">
                                <span
                                    className="size-1.5 rounded-full bg-tijum-coral"
                                    aria-hidden="true"
                                />
                                {portalLabel}
                            </span>
                        )}
                        {title && (
                            <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance text-tijum-plum sm:text-[28px]">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="max-w-2xl text-sm leading-relaxed text-pretty text-tijum-plum-muted">
                                {description}
                            </p>
                        )}
                    </div>

                    {children}
                </section>
            </main>

            <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-6 text-center text-xs text-tijum-plum-muted sm:px-6">
                <span>TIJUM · Stay easy. Eat well. Spend less.</span>
                <span aria-hidden="true">·</span>
                <div className="inline-flex items-center gap-3">
                    <Link
                        href={faqs()}
                        className="font-medium transition-colors hover:text-tijum-plum"
                    >
                        FAQs
                    </Link>
                    <Link
                        href={terms()}
                        className="font-medium transition-colors hover:text-tijum-plum"
                    >
                        Terms
                    </Link>
                    <Link
                        href={privacy()}
                        className="font-medium transition-colors hover:text-tijum-plum"
                    >
                        Privacy
                    </Link>
                </div>
            </footer>
        </div>
    );
}
