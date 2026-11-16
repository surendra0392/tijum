import { Link } from '@inertiajs/react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title = '',
    description = '',
}: AuthLayoutProps) {
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <div className="tijum-admin relative min-h-dvh overflow-x-clip bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
            <div
                className="pointer-events-none fixed inset-0 overflow-hidden"
                aria-hidden="true"
            >
                <div className="absolute -top-32 -right-24 size-96 rounded-full bg-tijum-coral/8 blur-3xl dark:bg-tijum-coral/10" />
                <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-tijum-plum/6 blur-3xl dark:bg-tijum-peach/6" />
            </div>

            <div className="relative mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl flex-col sm:min-h-[calc(100dvh-4rem)]">
                <header className="flex items-center justify-between gap-4">
                    <Link
                        href={home()}
                        aria-label="TIJUM home"
                        className="rounded-xl focus-visible:outline-tijum-coral"
                    >
                        <BrandLogo
                            variant="horizontal"
                            tone={isDark ? 'dark' : 'light'}
                            size="md"
                        />
                    </Link>

                    <div className="flex items-center gap-2.5">
                        <ThemeToggle />
                        <Link
                            href={home()}
                            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-tijum-surface/80 bg-white/90 px-3.5 font-heading text-xs font-semibold text-tijum-plum shadow-xs transition-colors hover:border-tijum-coral/50 hover:text-tijum-coral dark:border-border dark:bg-card/90 dark:text-foreground dark:hover:border-tijum-coral/60 dark:hover:text-tijum-peach"
                        >
                            <ArrowLeft
                                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                                aria-hidden="true"
                            />
                            <span>Public website</span>
                        </Link>
                    </div>
                </header>

                <main className="flex flex-1 items-center justify-center py-8 sm:py-12">
                    <section className="relative w-full max-w-[30rem] overflow-hidden rounded-[24px] border border-tijum-surface/80 bg-card text-card-foreground shadow-tijum-soft dark:border-border">
                        <div
                            className="flex h-1.5 w-full"
                            aria-hidden="true"
                        >
                            <div className="flex-1 bg-tijum-plum dark:bg-tijum-peach/45" />
                            <div className="w-24 bg-tijum-coral" />
                        </div>

                        <div className="p-6 sm:p-8">
                            <div className="mb-6 space-y-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-peach/80 bg-tijum-cream px-3 py-1 font-heading text-[11px] font-semibold tracking-[0.12em] text-tijum-plum uppercase dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                        <ShieldCheck
                                            className="size-3.5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <span>Admin Console</span>
                                    </span>

                                    <span className="inline-flex items-center gap-1 font-heading text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                        <Lock
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                        <span>TOTP Protected</span>
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    {title && (
                                        <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance text-tijum-plum sm:text-[1.75rem] dark:text-foreground">
                                            {title}
                                        </h1>
                                    )}
                                    {description && (
                                        <p className="text-sm leading-relaxed text-pretty text-tijum-plum-muted dark:text-muted-foreground">
                                            {description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {children}
                        </div>
                    </section>
                </main>

                <footer className="text-center text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                    TIJUM Administration Console · Isolated admin guard ·
                    Authorised administrators only
                </footer>
            </div>
        </div>
    );
}
