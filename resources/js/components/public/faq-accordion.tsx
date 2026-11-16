import { ChevronDown } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FaqEntry } from '@/data/public-content';
import { cn } from '@/lib/utils';

type FaqAccordionProps = {
    items: FaqEntry[];
    labelledBy?: string;
    ariaLabel?: string;
    openFirst?: boolean;
    allowToggleAll?: boolean;
    className?: string;
};

/**
 * Accessible FAQ accordion built on native HTML `<details>`/`<summary>` elements
 * so hidden answers remain findable via browser Find-in-page and screen readers.
 */
export function FaqAccordion({
    items,
    labelledBy,
    ariaLabel,
    openFirst = false,
    allowToggleAll = false,
    className,
}: FaqAccordionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [allExpanded, setAllExpanded] = useState(
        openFirst && items.length === 1,
    );

    const syncExpandedState = useCallback(() => {
        const details = containerRef.current?.querySelectorAll('details');
        if (!details || details.length === 0) {
            return;
        }

        setAllExpanded(Array.from(details).every((node) => node.open));
    }, []);

    const handleToggleAll = () => {
        const details = containerRef.current?.querySelectorAll('details');
        if (!details || details.length === 0) {
            return;
        }

        const nextState = !allExpanded;
        details.forEach((node) => {
            node.open = nextState;
        });
        setAllExpanded(nextState);
    };

    return (
        <div
            ref={containerRef}
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : ariaLabel}
            className={cn('space-y-3', className)}
        >
            {allowToggleAll && items.length > 1 && (
                <div className="flex justify-end pb-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-expanded={allExpanded}
                        onClick={handleToggleAll}
                    >
                        {allExpanded ? 'Collapse all' : 'Expand all'}
                    </Button>
                </div>
            )}

            {items.map((item, index) => (
                <details
                    key={item.id}
                    id={item.id}
                    open={openFirst && index === 0 ? true : undefined}
                    onToggle={allowToggleAll ? syncExpandedState : undefined}
                    className="tijum-faq-item group rounded-[20px] border border-tijum-surface bg-white shadow-tijum-card transition-colors open:border-tijum-peach"
                >
                    <summary className="tijum-faq-summary flex min-h-14 cursor-pointer items-start gap-3 rounded-[20px] px-5 py-4 text-left font-heading text-sm font-semibold text-tijum-plum outline-none hover:bg-tijum-peach/12 focus-visible:ring-3 focus-visible:ring-tijum-coral/35 sm:px-6 sm:py-4.5 sm:text-base">
                        <ChevronDown
                            aria-hidden="true"
                            className="tijum-faq-chevron mt-0.5 size-4.5 shrink-0 text-tijum-plum-muted"
                        />
                        <span className="leading-snug">{item.question}</span>
                    </summary>
                    <div className="px-5 pb-5 pl-12.5 text-sm leading-relaxed text-tijum-plum-muted sm:px-6 sm:pb-5 sm:pl-13.5 sm:text-[15px]">
                        <p>{item.answer}</p>
                    </div>
                </details>
            ))}
        </div>
    );
}
