import { Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FormFieldProps = {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    labelAction?: ReactNode;
    children: (a11yProps: {
        id: string;
        'aria-invalid': boolean | undefined;
        'aria-describedby': string | undefined;
    }) => ReactNode;
    className?: string;
};

export function FormField({
    id,
    label,
    required = false,
    hint,
    error,
    labelAction,
    children,
    className,
}: FormFieldProps) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy =
        [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('grid gap-2', className)}>
            <div className="flex items-center justify-between gap-2">
                <Label
                    htmlFor={id}
                    className="font-heading text-sm font-medium text-tijum-plum dark:text-foreground"
                >
                    <span>{label}</span>
                    {required && (
                        <span
                            className="ml-1 text-status-error-fg"
                            aria-hidden="true"
                        >
                            *
                        </span>
                    )}
                </Label>
                {labelAction}
            </div>

            {children({
                id,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': describedBy,
            })}

            {hint && (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            )}

            <InputError id={errorId} message={error} />
        </div>
    );
}

type FileUploadFieldProps = {
    id?: string;
    name: string;
    label: string;
    accept?: string;
    required?: boolean;
    disabled?: boolean;
    hint?: string;
    error?: string;
    onFileChange?: (file: File | null) => void;
    className?: string;
};

export function FileUploadField({
    id,
    name,
    label,
    accept,
    required = false,
    disabled = false,
    hint,
    error,
    onFileChange,
    className,
}: FileUploadFieldProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [fileName, setFileName] = useState<string | null>(null);
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy =
        [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('grid min-w-0 gap-2', className)}>
            <Label
                htmlFor={inputId}
                className="font-heading text-sm font-medium text-tijum-plum"
            >
                <span>{label}</span>
                {required && (
                    <span
                        className="ml-1 text-status-error-fg"
                        aria-hidden="true"
                    >
                        *
                    </span>
                )}
            </Label>

            <label
                htmlFor={inputId}
                className={cn(
                    'flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-tijum-border-control bg-tijum-cream/55 px-4 py-5 text-center transition-colors hover:bg-tijum-peach/15 dark:border-border dark:bg-muted/45 dark:hover:bg-muted/70',
                    'has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/35',
                    error && 'border-destructive',
                    disabled && 'cursor-not-allowed opacity-60',
                )}
            >
                <Upload
                    className="size-5 text-tijum-coral"
                    aria-hidden="true"
                />
                <span className="max-w-full font-heading text-sm font-semibold wrap-anywhere text-tijum-plum dark:text-foreground">
                    {fileName ?? 'Choose a file to upload'}
                </span>
                {accept && (
                    <span className="max-w-full text-xs wrap-anywhere text-muted-foreground">
                        Accepted formats: {accept.split(',').join(', ')}
                    </span>
                )}
                <input
                    id={inputId}
                    name={name}
                    type="file"
                    accept={accept}
                    required={required}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setFileName(file ? file.name : null);
                        onFileChange?.(file);
                    }}
                    className="sr-only"
                />
            </label>

            {hint && (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            )}
            <InputError id={errorId} message={error} />
        </div>
    );
}

type MultiSelectOption = {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
};

type MultiSelectCheckboxGroupProps = {
    legend: string;
    options: MultiSelectOption[];
    value: string[];
    onChange: (nextValues: string[]) => void;
    hint?: string;
    error?: string;
    className?: string;
};

export function MultiSelectCheckboxGroup({
    legend,
    options,
    value,
    onChange,
    hint,
    error,
    className,
}: MultiSelectCheckboxGroupProps) {
    const groupId = useId();
    const errorId = error ? `${groupId}-error` : undefined;

    const toggleValue = (itemValue: string, checked: boolean) => {
        if (checked) {
            onChange(Array.from(new Set([...value, itemValue])));
            return;
        }
        onChange(value.filter((entry) => entry !== itemValue));
    };

    return (
        <fieldset className={cn('grid gap-2.5', className)}>
            <legend className="mb-1 font-heading text-sm font-medium text-tijum-plum dark:text-foreground">
                {legend}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
                {options.map((option) => {
                    const optionId = `${groupId}-${option.value}`;
                    const isChecked = value.includes(option.value);

                    return (
                        <label
                            key={option.value}
                            htmlFor={optionId}
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-xl border border-tijum-surface/80 bg-card p-3 transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/40 dark:border-border dark:bg-card dark:hover:bg-accent/60',
                                isChecked &&
                                    'border-tijum-coral bg-tijum-cream/70 dark:border-tijum-coral dark:bg-tijum-coral/12',
                                option.disabled &&
                                    'cursor-not-allowed opacity-60',
                            )}
                        >
                            <Checkbox
                                id={optionId}
                                checked={isChecked}
                                disabled={option.disabled}
                                onCheckedChange={(checked) =>
                                    toggleValue(option.value, checked === true)
                                }
                                className="mt-0.5"
                            />
                            <span className="grid gap-0.5">
                                <span className="font-heading text-sm font-medium text-tijum-plum dark:text-foreground">
                                    {option.label}
                                </span>
                                {option.description && (
                                    <span className="text-xs text-muted-foreground">
                                        {option.description}
                                    </span>
                                )}
                            </span>
                        </label>
                    );
                })}
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <InputError id={errorId} message={error} />
        </fieldset>
    );
}
