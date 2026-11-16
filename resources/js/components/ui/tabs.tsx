import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
    activeTab: string;
    setActiveTab: (value: string) => void;
    baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);
const TabsVariantContext = React.createContext<'underline' | 'pill'>('underline');

function useTabsContext(): TabsContextValue {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within <Tabs>.');
    }
    return context;
}

type TabsProps = React.ComponentProps<'div'> & {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
};

function Tabs({
    defaultValue,
    value,
    onValueChange,
    className,
    children,
    ...props
}: TabsProps) {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? value ?? '');
    const activeTab = value ?? internalValue;
    const baseId = React.useId();

    const setActiveTab = React.useCallback(
        (nextValue: string) => {
            if (value === undefined) {
                setInternalValue(nextValue);
            }
            onValueChange?.(nextValue);
        },
        [value, onValueChange],
    );

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
            <div data-slot="tabs" className={cn('space-y-4', className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

type TabsListProps = React.ComponentProps<'div'> & {
    label?: string;
    variant?: 'underline' | 'pill';
};

function TabsList({
    label = 'Navigation Tabs',
    variant = 'underline',
    className,
    children,
    ...props
}: TabsListProps) {
    const listRef = React.useRef<HTMLDivElement>(null);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const container = listRef.current;
        if (!container) {
            return;
        }

        const tabs = Array.from(
            container.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]:not(:disabled)',
            ),
        );
        const currentIndex = tabs.indexOf(
            document.activeElement as HTMLButtonElement,
        );
        if (currentIndex === -1 || tabs.length === 0) {
            return;
        }

        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = tabs.length - 1;
        } else {
            return;
        }

        event.preventDefault();
        tabs[nextIndex]?.focus();
        tabs[nextIndex]?.click();
        tabs[nextIndex]?.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
        });
    };

    return (
        <TabsVariantContext.Provider value={variant}>
            <div
                ref={listRef}
                role="tablist"
                aria-label={label}
                onKeyDown={handleKeyDown}
                data-slot="tabs-list"
                data-variant={variant}
                className={cn(
                    variant === 'pill'
                        ? 'inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border'
                        : 'flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-tijum-surface/80 dark:border-border',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </TabsVariantContext.Provider>
    );
}

type TabsTriggerProps = React.ComponentProps<'button'> & {
    value: string;
};

function TabsTrigger({
    value,
    className,
    children,
    ...props
}: TabsTriggerProps) {
    const { activeTab, setActiveTab, baseId } = useTabsContext();
    const variant = React.useContext(TabsVariantContext);
    const isSelected = activeTab === value;

    return (
        <button
            id={`${baseId}-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={(event) => {
                setActiveTab(value);
                event.currentTarget.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                });
            }}
            data-slot="tabs-trigger"
            className={cn(
                variant === 'pill'
                    ? cn(
                          'font-heading relative inline-flex flex-none cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                          isSelected
                              ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                              : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground',
                      )
                    : cn(
                          'font-heading relative flex-none cursor-pointer px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                          isSelected
                              ? 'text-tijum-plum dark:text-foreground after:absolute after:inset-x-0 after:bottom-0 after:border-b-[3px] after:border-tijum-coral'
                              : 'text-tijum-plum-muted dark:text-muted-foreground hover:text-tijum-plum dark:hover:text-foreground',
                      ),
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

type TabsContentProps = React.ComponentProps<'div'> & {
    value: string;
};

function TabsContent({
    value,
    className,
    children,
    ...props
}: TabsContentProps) {
    const { activeTab, baseId } = useTabsContext();
    const isSelected = activeTab === value;

    return (
        <div
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${value}`}
            hidden={!isSelected}
            tabIndex={isSelected ? 0 : undefined}
            data-slot="tabs-content"
            className={cn('focus-visible:outline-none', className)}
            {...props}
        >
            {isSelected && children}
        </div>
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
