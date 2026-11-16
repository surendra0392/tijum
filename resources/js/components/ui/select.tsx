import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const SELECT_SCROLL_ATTRIBUTE = 'data-tijum-select-open';

function armStandaloneSelectScroll(): void {
    if (
        typeof document === 'undefined' ||
        document.body.hasAttribute('data-scroll-locked')
    ) {
        return;
    }

    document.body.setAttribute(SELECT_SCROLL_ATTRIBUTE, '');

    window.setTimeout(() => {
        if (!document.body.hasAttribute('data-scroll-locked')) {
            document.body.removeAttribute(SELECT_SCROLL_ATTRIBUTE);
        }
    }, 500);
}

function releaseSelectScrollWhenUnlocked(): void {
    if (typeof document === 'undefined') {
        return;
    }

    const release = () => {
        if (document.body.hasAttribute('data-scroll-locked')) {
            return false;
        }

        document.body.removeAttribute(SELECT_SCROLL_ATTRIBUTE);
        return true;
    };

    if (release()) {
        return;
    }

    const observer = new MutationObserver(() => {
        if (release()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-scroll-locked'],
    });
}

function Select({
    onOpenChange,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
    const unlockStandaloneSelectRef = React.useRef(false);

    React.useEffect(
        () => () => {
            if (unlockStandaloneSelectRef.current) {
                releaseSelectScrollWhenUnlocked();
            }
        },
        [],
    );

    const handleOpenChange = (open: boolean) => {
        if (open) {
            unlockStandaloneSelectRef.current =
                document.body.hasAttribute(SELECT_SCROLL_ATTRIBUTE) ||
                !document.body.hasAttribute('data-scroll-locked');

            if (unlockStandaloneSelectRef.current) {
                document.body.setAttribute(SELECT_SCROLL_ATTRIBUTE, '');
            }
        } else if (unlockStandaloneSelectRef.current) {
            releaseSelectScrollWhenUnlocked();
            unlockStandaloneSelectRef.current = false;
        }

        onOpenChange?.(open);
    };

    return (
        <SelectPrimitive.Root
            data-slot="select"
            onOpenChange={handleOpenChange}
            {...props}
        />
    );
}

function SelectGroup({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
    return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
    return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
    className,
    size = 'default',
    children,
    disabled,
    onPointerDownCapture,
    onKeyDownCapture,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
    size?: 'sm' | 'default';
}) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            data-size={size}
            className={cn(
                "flex w-fit items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 dark:border-border bg-white dark:bg-card px-4 py-2 text-sm text-tijum-plum dark:text-foreground whitespace-nowrap transition-[color,border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none data-[placeholder]:text-tijum-lavender/75 dark:data-[placeholder]:text-muted-foreground hover:border-tijum-coral/50 focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25 aria-invalid:border-tijum-coral aria-invalid:ring-tijum-coral/25 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-12 data-[size=sm]:h-10 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-tijum-lavender",
                className,
            )}
            disabled={disabled}
            onPointerDownCapture={(event) => {
                onPointerDownCapture?.(event);

                if (
                    !event.defaultPrevented &&
                    event.button === 0 &&
                    !disabled
                ) {
                    armStandaloneSelectScroll();
                }
            }}
            onKeyDownCapture={(event) => {
                onKeyDownCapture?.(event);

                if (
                    !event.defaultPrevented &&
                    !disabled &&
                    ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)
                ) {
                    armStandaloneSelectScroll();
                }
            }}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDownIcon className="size-4 opacity-50" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
}

function SelectContent({
    className,
    children,
    position = 'popper',
    side = 'bottom',
    sideOffset = 4,
    align = 'center',
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                data-slot="select-content"
                className={cn(
                    'relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-tijum-surface/80 dark:border-border bg-white dark:bg-card text-tijum-plum dark:text-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                    position === 'popper' &&
                        'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
                    className,
                )}
                position={position}
                side={side}
                sideOffset={sideOffset}
                collisionPadding={8}
                align={align}
                {...props}
            >
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                    className={cn(
                        'p-1',
                        position === 'popper' &&
                            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
                    )}
                >
                    {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
}

function SelectLabel({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
    return (
        <SelectPrimitive.Label
            data-slot="select-label"
            className={cn(
                'text-muted-foreground px-2 py-1.5 text-xs',
                className,
            )}
            {...props}
        />
    );
}

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(
                "relative flex w-full cursor-default items-center gap-2 rounded-lg py-2.5 pr-8 pl-3 text-sm outline-hidden select-none focus:bg-tijum-peach/25 dark:focus:bg-tijum-coral/20 focus:text-tijum-plum dark:focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-tijum-lavender *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className,
            )}
            {...props}
        >
            <span
                data-slot="select-item-indicator"
                className="absolute right-2 flex size-3.5 items-center justify-center"
            >
                <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}

function SelectSeparator({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            data-slot="select-separator"
            className={cn(
                'bg-border pointer-events-none -mx-1 my-1 h-px',
                className,
            )}
            {...props}
        />
    );
}

function SelectScrollUpButton({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
    return (
        <SelectPrimitive.ScrollUpButton
            data-slot="select-scroll-up-button"
            className={cn(
                'flex cursor-default items-center justify-center py-1',
                className,
            )}
            {...props}
        >
            <ChevronUpIcon className="size-4" />
        </SelectPrimitive.ScrollUpButton>
    );
}

function SelectScrollDownButton({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
    return (
        <SelectPrimitive.ScrollDownButton
            data-slot="select-scroll-down-button"
            className={cn(
                'flex cursor-default items-center justify-center py-1',
                className,
            )}
            {...props}
        >
            <ChevronDownIcon className="size-4" />
        </SelectPrimitive.ScrollDownButton>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
