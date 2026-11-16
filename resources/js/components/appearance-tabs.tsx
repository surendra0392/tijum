import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: {
        value: Appearance;
        icon: LucideIcon;
        label: string;
    }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div
            className={cn(
                'inline-flex flex-wrap gap-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/70 p-1.5 dark:border-border dark:bg-muted/40',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'flex cursor-pointer items-center rounded-lg px-4 py-2 font-heading text-sm font-medium transition-all',
                        appearance === value
                            ? 'border border-tijum-surface/80 bg-white font-semibold text-tijum-plum shadow-xs dark:border-border dark:bg-card dark:text-tijum-cream'
                            : 'text-tijum-plum-muted hover:bg-white/50 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted/60 dark:hover:text-tijum-cream',
                    )}
                >
                    <Icon className="mr-2 size-4" aria-hidden="true" />
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
}
