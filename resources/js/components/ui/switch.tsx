import * as React from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = Omit<React.ComponentProps<'input'>, 'type'> & {
    onCheckedChange?: (checked: boolean) => void;
};

function Switch({
    className,
    onCheckedChange,
    onChange,
    disabled,
    ...props
}: SwitchProps) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
        onCheckedChange?.(event.target.checked);
    };

    return (
        <span className="relative inline-flex shrink-0 items-center">
            <input
                type="checkbox"
                role="switch"
                data-slot="switch"
                disabled={disabled}
                onChange={handleChange}
                className="peer sr-only"
                {...props}
            />
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none inline-flex h-6 w-11 items-center rounded-full border border-tijum-border-control bg-tijum-surface p-0.5 transition-colors',
                    'peer-checked:border-tijum-plum peer-checked:bg-tijum-plum',
                    'peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/45 peer-focus-visible:outline-none',
                    'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                    '[&>span]:translate-x-0 peer-checked:[&>span]:translate-x-5 peer-checked:[&>span]:bg-tijum-cream',
                    className,
                )}
            >
                <span className="size-4.5 rounded-full bg-tijum-cream shadow-xs transition-transform" />
            </span>
        </span>
    );
}

export { Switch };
