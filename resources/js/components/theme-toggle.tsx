import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const toggleTheme = () => {
        updateAppearance(isDark ? 'light' : 'dark');
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={cn(
                'relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-tijum-surface/80 bg-white/90 p-0 shadow-xs hover:border-tijum-coral/50 hover:bg-white focus-visible:ring-2 focus-visible:ring-tijum-coral dark:border-border dark:bg-card/90 dark:hover:border-tijum-coral/60 dark:hover:bg-accent',
                className,
            )}
        >
            <Sun
                className={cn(
                    'size-4 text-amber-400 transition-transform transition-opacity duration-200 ease-out',
                    isDark
                        ? 'scale-100 rotate-0 opacity-100'
                        : 'scale-0 rotate-90 opacity-0 pointer-events-none',
                )}
                aria-hidden="true"
            />
            <Moon
                className={cn(
                    'absolute size-4 text-tijum-plum transition-transform transition-opacity duration-200 ease-out dark:text-tijum-peach',
                    isDark
                        ? 'scale-0 -rotate-90 opacity-0 pointer-events-none'
                        : 'scale-100 rotate-0 opacity-100',
                )}
                aria-hidden="true"
            />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

export default ThemeToggle;
