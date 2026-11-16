import { CircleCheck, CircleMinus, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FoodInclusion = {
    food_provided: boolean;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
};

type FoodInclusionStatusProps = {
    food: FoodInclusion;
    compact?: boolean;
    showLabel?: boolean;
    className?: string;
};

const mealItems: Array<{
    key: keyof FoodInclusion;
    label: string;
}> = [
    { key: 'food_provided', label: 'Food provided' },
    { key: 'breakfast_included', label: 'Breakfast' },
    { key: 'lunch_included', label: 'Lunch' },
    { key: 'dinner_included', label: 'Dinner' },
];

export function FoodInclusionStatus({
    food,
    compact = false,
    showLabel = true,
    className,
}: FoodInclusionStatusProps) {
    if (compact) {
        const includedMeals = mealItems
            .slice(1)
            .filter((item) => food[item.key])
            .map((item) => item.label);

        return (
            <div
                className={cn(
                    'flex items-center gap-2 text-tijum-plum',
                    className,
                )}
            >
                <span
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full',
                        food.food_provided
                            ? 'bg-tijum-emerald/14 text-tijum-emerald'
                            : 'bg-tijum-surface/70 text-tijum-lavender',
                    )}
                >
                    <Utensils className="size-3" aria-hidden="true" />
                </span>
                <span className="leading-snug">
                    {showLabel ? (
                        <span className="text-xs sm:text-sm">
                            <strong className="font-heading font-semibold">
                                {food.food_provided
                                    ? 'Food available'
                                    : 'Food not provided'}
                            </strong>
                            {food.food_provided && includedMeals.length > 0 ? (
                                <span className="text-tijum-lavender">
                                    {' '}
                                    · {includedMeals.join(', ')}
                                </span>
                            ) : food.food_provided ? (
                                <span className="text-tijum-lavender">
                                    {' '}
                                    · No meals included in base rate
                                </span>
                            ) : null}
                        </span>
                    ) : (
                        <span className="text-[11.5px] leading-tight font-medium text-tijum-plum/80">
                            {food.food_provided && includedMeals.length > 0 ? (
                                <span>{includedMeals.join(', ')}</span>
                            ) : food.food_provided ? (
                                <span className="text-tijum-lavender">
                                    Food available (on-demand)
                                </span>
                            ) : (
                                <span className="text-tijum-lavender">
                                    Food not provided
                                </span>
                            )}
                        </span>
                    )}
                </span>
            </div>
        );
    }

    return (
        <dl
            className={cn(
                'grid gap-2 sm:grid-cols-2 xl:grid-cols-4',
                className,
            )}
        >
            {mealItems.map((item) => {
                const included = food[item.key];
                const Icon = included ? CircleCheck : CircleMinus;

                return (
                    <div
                        key={item.key}
                        className={cn(
                            'grid min-h-11 grid-cols-[auto_1fr] items-center gap-x-2 rounded-xl border px-3 py-2.5',
                            included
                                ? 'border-tijum-emerald/35 bg-tijum-emerald/10'
                                : 'border-tijum-surface bg-tijum-surface/25',
                        )}
                    >
                        <Icon
                            className={cn(
                                'row-span-2 size-4 shrink-0',
                                included
                                    ? 'text-tijum-emerald'
                                    : 'text-tijum-lavender',
                            )}
                            aria-hidden="true"
                        />
                        <dt className="font-heading text-xs font-semibold text-tijum-plum">
                            {item.label}
                        </dt>
                        <dd className="text-xs text-tijum-lavender">
                            {included ? 'Included' : 'Not included'}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}
