import { Head } from '@inertiajs/react';
import { Moon, Sun } from 'lucide-react';
import AppearanceTabs from '@/components/appearance-tabs';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <>
            <Head title="Appearance settings" />

            <div className="space-y-6">
                <PageHeader
                    title="Appearance Settings"
                    description="Switch effortlessly between TIJUM Warm Cream Light Mode and Deep Obsidian Plum Dark Mode."
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Theme preference</CardTitle>
                        <CardDescription>
                            Customize your customer portal view with TIJUM
                            Light, Deep Obsidian Dark, or System sync.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <AppearanceTabs />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => updateAppearance('light')}
                                className={cn(
                                    'flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-all',
                                    appearance === 'light'
                                        ? 'border-tijum-coral bg-tijum-cream/60 ring-2 ring-tijum-coral/30 dark:bg-accent/50'
                                        : 'border-tijum-surface/80 bg-tijum-cream/30 hover:border-tijum-coral/50 dark:border-border dark:bg-muted/30',
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        <Sun
                                            className="size-4 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Warm Cream Light
                                    </span>
                                    <span className="size-3 rounded-full border border-[#E6E0DB] bg-[#FFF4EE]" />
                                </div>
                                <div className="space-y-1.5 rounded-xl border border-[#E6E0DB] bg-[#FFF4EE] p-3">
                                    <div className="h-2 w-24 rounded-full bg-[#442F41]" />
                                    <div className="h-6 rounded-lg border border-[#E6E0DB] bg-white px-2 py-1.5">
                                        <div className="h-2 w-16 rounded-full bg-[#FF7A67]" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Daylight-first hospitality palette with
                                    crisp white cards over Warm Cream.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => updateAppearance('dark')}
                                className={cn(
                                    'flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-all',
                                    appearance === 'dark'
                                        ? 'border-tijum-coral bg-tijum-cream/60 ring-2 ring-tijum-coral/30 dark:bg-accent/50'
                                        : 'border-tijum-surface/80 bg-tijum-cream/30 hover:border-tijum-coral/50 dark:border-border dark:bg-muted/30',
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-2 font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        <Moon
                                            className="size-4 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Deep Obsidian Dark
                                    </span>
                                    <span className="size-3 rounded-full border border-[#422D40] bg-[#1E131D]" />
                                </div>
                                <div className="space-y-1.5 rounded-xl border border-[#422D40] bg-[#1E131D] p-3">
                                    <div className="h-2 w-24 rounded-full bg-[#FFF4EE]" />
                                    <div className="h-6 rounded-lg border border-[#422D40] bg-[#281A27] px-2 py-1.5">
                                        <div className="h-2 w-16 rounded-full bg-[#FF7A67]" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Deep Plum surfaces tuned for comfortable
                                    low-light contrast and reduced glare.
                                </p>
                            </button>
                        </div>

                        <Alert variant="info">
                            <AlertTitle>Adaptive Hospitality Theme</AlertTitle>
                            <AlertDescription>
                                Public discovery pages and authentication stay
                                crisp Warm Cream light, while your signed-in
                                Customer Portal remembers your Light, Dark, or
                                System choice across every view.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
