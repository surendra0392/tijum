import { Link } from '@inertiajs/react';
import {
    BadgeIndianRupee,
    Building2,
    Camera,
    ClipboardCheck,
    DoorClosed,
    Layers,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { index as amenitiesIndexRoute } from '@/routes/owner/properties/amenities';
import { index as mediaIndexRoute } from '@/routes/owner/properties/media';
import { index as pricingIndexRoute } from '@/routes/owner/properties/pricing';
import { index as roomTypesIndexRoute } from '@/routes/owner/properties/room-types';
import { index as roomsIndexRoute } from '@/routes/owner/properties/rooms';
import { show as propertyShowRoute } from '@/routes/owner/properties';
import { show as verificationShowRoute } from '@/routes/owner/properties/verification';

type PropertyPortalStep =
    | 'overview'
    | 'room_types'
    | 'rooms'
    | 'amenities'
    | 'pricing'
    | 'media'
    | 'verification';

type PropertyStepNavigationProps = {
    propertyId: number | null;
    activeStep: PropertyPortalStep;
    roomTypesCount?: number;
    roomsCount?: number;
};

type StepDef = {
    key: PropertyPortalStep;
    label: string;
    href: string | null;
    icon: LucideIcon;
    count?: number;
};

export function PropertyStepNavigation({
    propertyId,
    activeStep,
    roomTypesCount,
    roomsCount,
}: PropertyStepNavigationProps) {
    const steps: StepDef[] = [
        {
            key: 'overview',
            label: '1. Overview',
            href: propertyId ? propertyShowRoute.url(propertyId) : null,
            icon: Building2,
        },
        {
            key: 'room_types',
            label: '2. Room Types',
            href: propertyId ? roomTypesIndexRoute.url(propertyId) : null,
            icon: Layers,
            count: roomTypesCount,
        },
        {
            key: 'rooms',
            label: '3. Physical Rooms',
            href: propertyId ? roomsIndexRoute.url(propertyId) : null,
            icon: DoorClosed,
            count: roomsCount,
        },
        {
            key: 'amenities',
            label: '4. Amenities',
            href: propertyId ? amenitiesIndexRoute.url(propertyId) : null,
            icon: Sparkles,
        },
        {
            key: 'pricing',
            label: '5. Rates & Meals',
            href: propertyId ? pricingIndexRoute.url(propertyId) : null,
            icon: BadgeIndianRupee,
        },
        {
            key: 'media',
            label: '6. Photos',
            href: propertyId ? mediaIndexRoute.url(propertyId) : null,
            icon: Camera,
        },
        {
            key: 'verification',
            label: '7. Verify & Publish',
            href: propertyId ? verificationShowRoute.url(propertyId) : null,
            icon: ClipboardCheck,
        },
    ];

    return (
        <nav
            aria-label="Property setup steps"
            className="w-full overflow-x-auto rounded-2xl border border-tijum-surface/80 bg-white p-2 shadow-tijum-card dark:border-border dark:bg-card"
        >
            <ol className="flex min-w-max flex-wrap items-stretch gap-1 sm:min-w-0 sm:flex-wrap">
                {steps.map((step) => {
                    const Icon = step.icon;
                    const isActive = step.key === activeStep;
                    const isDisabled = step.href === null;
                    const label = step.label;

                    const content = (
                        <>
                            <Icon
                                className={cn(
                                    'size-4 shrink-0',
                                    isActive
                                        ? 'text-tijum-peach dark:text-white'
                                        : 'text-tijum-plum-muted dark:text-muted-foreground',
                                )}
                                aria-hidden="true"
                            />
                            <span className="text-xs font-semibold whitespace-nowrap">
                                {label}
                            </span>
                            {typeof step.count === 'number' && (
                                <span
                                    className={cn(
                                        'ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-tijum-surface text-tijum-plum-muted dark:bg-muted dark:text-muted-foreground',
                                    )}
                                >
                                    {step.count}
                                </span>
                            )}
                        </>
                    );

                    const className = cn(
                        'flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-colors',
                        isActive &&
                            'bg-tijum-plum text-tijum-cream shadow-2xs dark:bg-tijum-coral dark:text-white',
                        !isActive &&
                            !isDisabled &&
                            'text-tijum-plum-muted hover:bg-tijum-cream/60 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground',
                        isDisabled && 'cursor-not-allowed opacity-45',
                    );

                    return (
                        <li key={step.key}>
                            {step.href && !isDisabled ? (
                                <Link
                                    href={step.href}
                                    aria-current={isActive ? 'step' : undefined}
                                    className={className}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <span
                                    aria-disabled="true"
                                    className={className}
                                >
                                    {content}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
