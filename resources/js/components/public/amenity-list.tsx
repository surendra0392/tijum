import {
    Accessibility,
    Archive,
    ArrowUpDown,
    Bath,
    Bike,
    BookOpen,
    Cctv,
    CircleCheck,
    CircleMinus,
    CircleParking,
    Droplets,
    Dumbbell,
    Fan,
    Flame,
    HeartPulse,
    Shield,
    Shirt,
    Sofa,
    Sparkles,
    Tv,
    WashingMachine,
    Wifi,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicAmenityItem } from '@/types/public-search';

type AmenityListProps = {
    amenities: PublicAmenityItem[];
    variant?: 'compact' | 'grid' | 'icons-only';
    limit?: number;
    moreCount?: number;
    emptyMessage?: string;
    className?: string;
};

const amenityIcons: Record<string, LucideIcon> = {
    accessibility: Accessibility,
    'arrow-up-down': ArrowUpDown,
    bath: Bath,
    bike: Bike,
    'book-open': BookOpen,
    cabinet: Archive,
    cctv: Cctv,
    droplets: Droplets,
    dumbbell: Dumbbell,
    fan: Fan,
    flame: Flame,
    'flame-kindling': Flame,
    'heart-pulse': HeartPulse,
    'parking-circle': CircleParking,
    shield: Shield,
    shirt: Shirt,
    sofa: Sofa,
    sparkles: Sparkles,
    table: BookOpen,
    toilet: Bath,
    tv: Tv,
    'washing-machine': WashingMachine,
    wifi: Wifi,
    zap: Zap,
};

export function AmenityList({
    amenities,
    variant = 'grid',
    limit,
    moreCount = 0,
    emptyMessage = 'Amenities have not been published yet.',
    className,
}: AmenityListProps) {
    if (amenities.length === 0) {
        return (
            <p
                className={cn(
                    'flex items-start gap-2 text-sm leading-relaxed text-tijum-lavender',
                    className,
                )}
            >
                <CircleMinus
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                />
                <span>{emptyMessage}</span>
            </p>
        );
    }

    const visibleAmenities =
        limit === undefined ? amenities : amenities.slice(0, limit);
    const hiddenCount =
        Math.max(0, amenities.length - visibleAmenities.length) + moreCount;

    if (variant === 'icons-only') {
        return (
            <ul
                className={cn('flex flex-wrap items-center gap-1.5', className)}
            >
                {visibleAmenities.map((amenity) => {
                    const Icon =
                        amenityIcons[amenity.icon_key ?? ''] ?? CircleCheck;

                    return (
                        <li
                            key={`${amenity.id}-${amenity.code}`}
                            title={amenity.name}
                            aria-label={amenity.name}
                            className="flex size-7 items-center justify-center rounded-lg border border-tijum-surface/80 bg-tijum-cream text-tijum-coral shadow-2xs transition-colors hover:border-tijum-peach"
                        >
                            <Icon
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                        </li>
                    );
                })}
                {hiddenCount > 0 && (
                    <li className="flex h-7 items-center rounded-lg border border-tijum-surface/80 bg-tijum-surface/30 px-2 font-heading text-[11px] font-semibold text-tijum-plum shadow-2xs">
                        +{hiddenCount}
                    </li>
                )}
            </ul>
        );
    }

    return (
        <ul
            className={cn(
                variant === 'compact'
                    ? 'flex flex-wrap gap-2'
                    : 'grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3',
                className,
            )}
        >
            {visibleAmenities.map((amenity) => {
                const Icon =
                    amenityIcons[amenity.icon_key ?? ''] ?? CircleCheck;

                return (
                    <li
                        key={`${amenity.id}-${amenity.code}`}
                        className={cn(
                            'flex items-center gap-2 text-tijum-plum',
                            variant === 'compact'
                                ? 'rounded-lg border border-tijum-surface bg-tijum-cream px-2.5 py-1.5 text-xs'
                                : 'border-b border-tijum-surface py-3 text-sm',
                        )}
                    >
                        <Icon
                            className="size-4 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>{amenity.name}</span>
                    </li>
                );
            })}
            {hiddenCount > 0 && (
                <li className="flex items-center rounded-lg border border-tijum-surface bg-tijum-surface/30 px-2.5 py-1.5 font-heading text-xs font-semibold text-tijum-plum">
                    +{hiddenCount} more
                </li>
            )}
        </ul>
    );
}
