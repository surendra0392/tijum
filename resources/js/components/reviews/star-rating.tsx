import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    value: number;
    onChange?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    className?: string;
    ariaLabel?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
};

export function StarRating({
    value,
    onChange,
    readonly = false,
    size = 'md',
    showValue = false,
    className = '',
    ariaLabel,
}: StarRatingProps) {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const activeRating = hoverValue !== null ? hoverValue : value;

    return (
        <div
            className={cn('inline-flex items-center gap-1.5', className)}
            role={readonly ? 'img' : 'radiogroup'}
            aria-label={ariaLabel ?? `${value} out of 5 stars`}
        >
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= Math.floor(activeRating);
                    const isHalf =
                        !isFilled &&
                        star === Math.ceil(activeRating) &&
                        activeRating % 1 >= 0.25;

                    return (
                        <button
                            key={star}
                            type="button"
                            disabled={readonly}
                            onClick={() => !readonly && onChange?.(star)}
                            onMouseEnter={() =>
                                !readonly && setHoverValue(star)
                            }
                            onMouseLeave={() =>
                                !readonly && setHoverValue(null)
                            }
                            onFocus={() => !readonly && setHoverValue(star)}
                            onBlur={() => !readonly && setHoverValue(null)}
                            className={cn(
                                'relative transition-transform duration-100',
                                readonly
                                    ? 'pointer-events-none cursor-default'
                                    : 'cursor-pointer rounded-sm hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            )}
                            role={readonly ? undefined : 'radio'}
                            aria-checked={readonly ? undefined : value === star}
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            tabIndex={readonly ? -1 : 0}
                        >
                            <Star
                                className={cn(
                                    sizeClasses[size],
                                    'transition-colors',
                                    isFilled
                                        ? 'fill-tijum-coral text-tijum-coral'
                                        : isHalf
                                          ? 'fill-tijum-peach text-tijum-coral'
                                          : 'fill-muted/20 text-muted-foreground/40',
                                )}
                            />
                        </button>
                    );
                })}
            </div>

            {showValue && (
                <span
                    className={cn(
                        'font-semibold tracking-tight text-foreground',
                        size === 'sm' && 'text-xs',
                        size === 'md' && 'text-sm',
                        size === 'lg' && 'text-base',
                    )}
                >
                    {value > 0 ? value.toFixed(1) : 'New'}
                </span>
            )}
        </div>
    );
}
