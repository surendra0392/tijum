import * as React from 'react';
import { cn } from '@/lib/utils';

type RadioGroupProps = React.ComponentProps<'fieldset'> & {
    legend?: string;
};

function RadioGroup({
    className,
    legend,
    children,
    ...props
}: RadioGroupProps) {
    return (
        <fieldset
            data-slot="radio-group"
            className={cn('grid gap-2.5', className)}
            {...props}
        >
            {legend && (
                <legend className="font-heading mb-1 text-sm font-medium text-tijum-plum">
                    {legend}
                </legend>
            )}
            {children}
        </fieldset>
    );
}

type RadioOptionProps = Omit<React.ComponentProps<'input'>, 'type'> & {
    label: string;
    description?: string;
};

function RadioOption({
    id,
    label,
    description,
    className,
    disabled,
    ...props
}: RadioOptionProps) {
    const generatedId = React.useId();
    const controlId = id ?? generatedId;

    return (
        <label
            htmlFor={controlId}
            className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border border-tijum-surface bg-tijum-cream p-3.5 transition-colors hover:bg-tijum-peach/15',
                'has-checked:border-tijum-plum has-checked:bg-tijum-cream/85',
                'has-focus-visible:ring-[3px] has-focus-visible:ring-ring/35',
                disabled &&
                    'cursor-not-allowed bg-tijum-surface/35 opacity-60 hover:bg-tijum-surface/35',
                className,
            )}
        >
            <input
                id={controlId}
                type="radio"
                disabled={disabled}
                className="mt-0.5 size-4 shrink-0 accent-tijum-plum focus-visible:outline-none"
                {...props}
            />
            <span className="grid gap-0.5">
                <span className="font-heading text-sm font-semibold text-tijum-plum">
                    {label}
                </span>
                {description && (
                    <span className="font-body text-xs text-muted-foreground">
                        {description}
                    </span>
                )}
            </span>
        </label>
    );
}

export { RadioGroup, RadioOption };
