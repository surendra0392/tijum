import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Check,
    CheckCircle2,
    Layers,
    Save,
    Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/owner';
import {
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import { index as amenitiesIndexRoute } from '@/routes/owner/properties/amenities';
import { index as roomTypesIndexRoute } from '@/routes/owner/properties/room-types';
import type {
    AmenityAssignmentSummary,
    AmenityCatalogueItem,
    AmenityCategoryOption,
    PropertySummaryData,
} from '@/types';

type Props = {
    property: PropertySummaryData;
    roomTypes: { id: number; name: string; is_active: boolean }[];
    catalogue: AmenityCategoryOption[];
    propertyAssignments: AmenityAssignmentSummary[];
    roomTypeAssignments: AmenityAssignmentSummary[];
    canManage: boolean;
    status?: string;
};

export default function OwnerPropertyAmenitiesIndex({
    property,
    roomTypes,
    catalogue,
    propertyAssignments,
    roomTypeAssignments,
    canManage,
    status,
}: Props) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const errorMessage =
        errors?.amenity ??
        errors?.amenity_ids ??
        errors?.property_room_type_id ??
        null;

    const [scope, setScope] = useState<'property' | 'room_type'>('property');
    const [activeRoomTypeId, setActiveRoomTypeId] = useState<number | null>(
        roomTypes[0]?.id ?? null,
    );
    const [applyToAllRoomTypes, setApplyToAllRoomTypes] = useState(false);
    const [saving, setSaving] = useState(false);

    const initialPropertyIds = useMemo(
        () =>
            propertyAssignments
                .filter((a) => a.is_current && a.status !== 'inactive')
                .map((a) => a.amenity_id),
        [propertyAssignments],
    );

    const initialRoomTypeMap = useMemo(() => {
        const next: Record<number, number[]> = {};
        for (const rt of roomTypes) {
            next[rt.id] = [];
        }
        for (const assignment of roomTypeAssignments) {
            if (!assignment.is_current || assignment.status === 'inactive') {
                continue;
            }
            const rtId = assignment.property_room_type_id;
            if (typeof rtId === 'number') {
                next[rtId] ??= [];
                if (!next[rtId].includes(assignment.amenity_id)) {
                    next[rtId].push(assignment.amenity_id);
                }
            }
        }
        return next;
    }, [roomTypes, roomTypeAssignments]);

    const [selectedPropertyIds, setSelectedPropertyIds] =
        useState<number[]>(initialPropertyIds);
    const [selectedByRoomType, setSelectedByRoomType] =
        useState<Record<number, number[]>>(initialRoomTypeMap);

    useEffect(() => {
        setSelectedPropertyIds(initialPropertyIds);
    }, [initialPropertyIds]);

    useEffect(() => {
        setSelectedByRoomType(initialRoomTypeMap);
        if (
            activeRoomTypeId === null ||
            !roomTypes.some((rt) => rt.id === activeRoomTypeId)
        ) {
            setActiveRoomTypeId(roomTypes[0]?.id ?? null);
        }
    }, [initialRoomTypeMap, roomTypes, activeRoomTypeId]);

    const groupedPropertyCategories = useMemo(
        () =>
            catalogue
                .map((category) => ({
                    ...category,
                    amenities: (category.amenities ?? []).filter(
                        (a) => a.applies_to_property,
                    ),
                }))
                .filter((category) => category.amenities.length > 0),
        [catalogue],
    );

    const groupedRoomTypeCategories = useMemo(
        () =>
            catalogue
                .map((category) => ({
                    ...category,
                    amenities: (category.amenities ?? []).filter(
                        (a) => a.applies_to_room_type,
                    ),
                }))
                .filter((category) => category.amenities.length > 0),
        [catalogue],
    );

    const activeRoomSelectedIds = useMemo(
        () =>
            activeRoomTypeId !== null
                ? (selectedByRoomType[activeRoomTypeId] ?? [])
                : [],
        [activeRoomTypeId, selectedByRoomType],
    );

    const togglePropertyAmenity = (amenityId: number) => {
        if (!canManage) return;
        setSelectedPropertyIds((prev) =>
            prev.includes(amenityId)
                ? prev.filter((id) => id !== amenityId)
                : [...prev, amenityId],
        );
    };

    const togglePropertyCategory = (items: AmenityCatalogueItem[]) => {
        if (!canManage) return;
        const itemIds = items.map((a) => a.id);
        const allSelected = itemIds.every((id) =>
            selectedPropertyIds.includes(id),
        );

        setSelectedPropertyIds((prev) => {
            if (allSelected) {
                return prev.filter((id) => !itemIds.includes(id));
            }
            const next = new Set(prev);
            for (const id of itemIds) {
                next.add(id);
            }
            return Array.from(next);
        });
    };

    const toggleRoomTypeAmenity = (amenityId: number) => {
        if (!canManage || activeRoomTypeId === null) return;
        setSelectedByRoomType((prev) => {
            const current = prev[activeRoomTypeId] ?? [];
            const next = current.includes(amenityId)
                ? current.filter((id) => id !== amenityId)
                : [...current, amenityId];
            return { ...prev, [activeRoomTypeId]: next };
        });
    };

    const toggleRoomTypeCategory = (items: AmenityCatalogueItem[]) => {
        if (!canManage || activeRoomTypeId === null) return;
        const itemIds = items.map((a) => a.id);
        const current = selectedByRoomType[activeRoomTypeId] ?? [];
        const allSelected = itemIds.every((id) => current.includes(id));

        setSelectedByRoomType((prev) => {
            const existing = prev[activeRoomTypeId] ?? [];
            if (allSelected) {
                return {
                    ...prev,
                    [activeRoomTypeId]: existing.filter(
                        (id) => !itemIds.includes(id),
                    ),
                };
            }
            const next = new Set(existing);
            for (const id of itemIds) {
                next.add(id);
            }
            return { ...prev, [activeRoomTypeId]: Array.from(next) };
        });
    };

    const savePropertyAmenities = () => {
        setSaving(true);
        router.put(
            `/owner/properties/${property.id}/amenities/sync`,
            {
                scope: 'property',
                amenity_ids: selectedPropertyIds,
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    const saveRoomTypeAmenities = () => {
        if (activeRoomTypeId === null && !applyToAllRoomTypes) return;
        setSaving(true);
        router.put(
            `/owner/properties/${property.id}/amenities/sync`,
            {
                scope: 'room_type',
                property_room_type_id: activeRoomTypeId,
                apply_to_all_room_types: applyToAllRoomTypes,
                amenity_ids: activeRoomSelectedIds,
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <>
            <Head title={`Amenities · ${property.name}`} />
            <div className="space-y-6">
                <PageHeader
                    eyebrow={`${property.property_reference} · Amenities`}
                    title="Amenities & Facilities"
                    description="Simply check the amenities available at this property and inside each room type, then click save."
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="amenities"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                {(status === 'property-amenities-synced' ||
                    status === 'room-type-amenities-synced') && (
                    <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertTitle>Amenities saved</AlertTitle>
                        <AlertDescription>
                            {status === 'property-amenities-synced'
                                ? 'Property-level amenities have been updated and published.'
                                : 'Room-type amenities have been updated and published.'}
                        </AlertDescription>
                    </Alert>
                )}

                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Unable to Save Amenities</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {/* Scope Switcher Tabs */}
                <div
                    role="tablist"
                    aria-label="Amenity scope"
                    className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/85 bg-card p-1.5 shadow-2xs dark:border-border"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={scope === 'property'}
                        onClick={() => setScope('property')}
                        className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-heading text-xs font-semibold transition-all',
                            scope === 'property'
                                ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                : 'text-tijum-plum-muted hover:bg-tijum-cream/65 hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                        )}
                    >
                        <Building2 className="size-4" aria-hidden="true" />
                        <span>Property Amenities</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                'px-1.5 py-0 text-[10px] font-bold tabular-nums',
                                scope === 'property'
                                    ? 'border-white/30 bg-white/15 text-white'
                                    : '',
                            )}
                        >
                            {selectedPropertyIds.length}
                        </Badge>
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={scope === 'room_type'}
                        onClick={() => setScope('room_type')}
                        className={cn(
                            'inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-heading text-xs font-semibold transition-all',
                            scope === 'room_type'
                                ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                : 'text-tijum-plum-muted hover:bg-tijum-cream/65 hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                        )}
                    >
                        <Layers className="size-4" aria-hidden="true" />
                        <span>Room-Type Amenities</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                'px-1.5 py-0 text-[10px] font-bold tabular-nums',
                                scope === 'room_type'
                                    ? 'border-white/30 bg-white/15 text-white'
                                    : '',
                            )}
                        >
                            {roomTypes.length} types
                        </Badge>
                    </button>
                </div>

                {scope === 'property' ? (
                    <Card>
                        <CardHeader className="flex flex-col gap-3 border-b border-tijum-surface/75 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-border">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Sparkles
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Select Amenities Available at{' '}
                                        {property.name}
                                    </span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Checked items appear directly under shared
                                    property facilities on TIJUM.
                                </CardDescription>
                            </div>
                            {canManage && (
                                <Button
                                    type="button"
                                    onClick={savePropertyAmenities}
                                    disabled={saving}
                                    className="shrink-0"
                                >
                                    <Save
                                        className="mr-1.5 size-4"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {saving
                                            ? 'Saving…'
                                            : `Save Property Amenities (${selectedPropertyIds.length})`}
                                    </span>
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-6 pt-5">
                            {groupedPropertyCategories.length === 0 ? (
                                <EmptyState
                                    icon={Sparkles}
                                    title="No property amenities in catalogue"
                                    description="TIJUM administrators configure the master amenity catalogue."
                                />
                            ) : (
                                groupedPropertyCategories.map((category) => {
                                    const allSelected = category.amenities.every(
                                        (a) =>
                                            selectedPropertyIds.includes(a.id),
                                    );
                                    return (
                                        <div
                                            key={category.id}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                                <h3 className="font-heading text-xs font-bold tracking-wider text-tijum-plum uppercase dark:text-foreground">
                                                    {category.name}
                                                </h3>
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            togglePropertyCategory(
                                                                category.amenities,
                                                            )
                                                        }
                                                        className="cursor-pointer text-xs font-semibold text-tijum-coral hover:underline"
                                                    >
                                                        {allSelected
                                                            ? 'Deselect all'
                                                            : 'Select all'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                                {category.amenities.map(
                                                    (amenity) => {
                                                        const checked =
                                                            selectedPropertyIds.includes(
                                                                amenity.id,
                                                            );
                                                        return (
                                                            <AmenityToggleTile
                                                                key={amenity.id}
                                                                amenity={amenity}
                                                                checked={checked}
                                                                disabled={
                                                                    !canManage
                                                                }
                                                                onToggle={() =>
                                                                    togglePropertyAmenity(
                                                                        amenity.id,
                                                                    )
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {canManage &&
                                groupedPropertyCategories.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface pt-4 dark:border-border">
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            <strong>
                                                {selectedPropertyIds.length}
                                            </strong>{' '}
                                            property amenities selected
                                        </p>
                                        <Button
                                            type="button"
                                            onClick={savePropertyAmenities}
                                            disabled={saving}
                                        >
                                            <Save
                                                className="mr-1.5 size-4"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {saving
                                                    ? 'Saving…'
                                                    : 'Save Property Amenities'}
                                            </span>
                                        </Button>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="flex flex-col gap-3 border-b border-tijum-surface/75 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-border">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Layers
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Select Amenities Per Room Type
                                    </span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Pick a room type below and check its room
                                    features (AC/Non-AC &amp; meals are set on
                                    Room Types / Pricing).
                                </CardDescription>
                            </div>
                            {canManage && roomTypes.length > 0 && (
                                <Button
                                    type="button"
                                    onClick={saveRoomTypeAmenities}
                                    disabled={saving}
                                    className="shrink-0"
                                >
                                    <Save
                                        className="mr-1.5 size-4"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {saving
                                            ? 'Saving…'
                                            : applyToAllRoomTypes
                                              ? 'Save to All Room Types'
                                              : `Save Room-Type Amenities (${activeRoomSelectedIds.length})`}
                                    </span>
                                </Button>
                            )}
                        </CardHeader>

                        <CardContent className="space-y-5 pt-5">
                            {roomTypes.length === 0 ? (
                                <EmptyState
                                    icon={Layers}
                                    title="No room types yet"
                                    description="Create at least one Room Type first before assigning room-type amenities."
                                    action={
                                        <Button asChild size="sm">
                                            <Link
                                                href={roomTypesIndexRoute(
                                                    property.id,
                                                )}
                                            >
                                                Manage Room Types
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <>
                                    {/* Room Type Pills + Apply To All Toggle */}
                                    <div className="flex flex-col gap-3 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/30">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {roomTypes.map((rt) => {
                                                const isActive =
                                                    rt.id === activeRoomTypeId;
                                                const count = (
                                                    selectedByRoomType[rt.id] ??
                                                    []
                                                ).length;

                                                return (
                                                    <button
                                                        key={rt.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setActiveRoomTypeId(
                                                                rt.id,
                                                            )
                                                        }
                                                        className={cn(
                                                            'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 font-heading text-xs font-semibold transition-all',
                                                            isActive
                                                                ? 'border-tijum-coral bg-tijum-coral text-white shadow-2xs'
                                                                : 'border-tijum-surface bg-background text-tijum-plum hover:border-tijum-coral/45 dark:border-border dark:text-foreground',
                                                        )}
                                                    >
                                                        <span>{rt.name}</span>
                                                        <span
                                                            className={cn(
                                                                'rounded-full px-1.5 py-0 text-[10px] font-bold tabular-nums',
                                                                isActive
                                                                    ? 'bg-white/25 text-white'
                                                                    : 'bg-tijum-cream text-tijum-plum-muted dark:bg-muted dark:text-muted-foreground',
                                                            )}
                                                        >
                                                            {count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {roomTypes.length > 1 && canManage && (
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="apply-all-room-types"
                                                    checked={
                                                        applyToAllRoomTypes
                                                    }
                                                    onCheckedChange={(v) =>
                                                        setApplyToAllRoomTypes(
                                                            v === true,
                                                        )
                                                    }
                                                />
                                                <Label
                                                    htmlFor="apply-all-room-types"
                                                    className="cursor-pointer text-xs font-medium"
                                                >
                                                    Apply to all {roomTypes.length}{' '}
                                                    room types
                                                </Label>
                                            </div>
                                        )}
                                    </div>

                                    {groupedRoomTypeCategories.map(
                                        (category) => {
                                            const allSelected =
                                                category.amenities.every((a) =>
                                                    activeRoomSelectedIds.includes(
                                                        a.id,
                                                    ),
                                                );
                                            return (
                                                <div
                                                    key={category.id}
                                                    className="space-y-3"
                                                >
                                                    <div className="flex items-center justify-between border-b border-tijum-surface/70 pb-2 dark:border-border">
                                                        <h3 className="font-heading text-xs font-bold tracking-wider text-tijum-plum uppercase dark:text-foreground">
                                                            {category.name}
                                                        </h3>
                                                        {canManage && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleRoomTypeCategory(
                                                                        category.amenities,
                                                                    )
                                                                }
                                                                className="cursor-pointer text-xs font-semibold text-tijum-coral hover:underline"
                                                            >
                                                                {allSelected
                                                                    ? 'Deselect all'
                                                                    : 'Select all'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                                        {category.amenities.map(
                                                            (amenity) => {
                                                                const checked =
                                                                    activeRoomSelectedIds.includes(
                                                                        amenity.id,
                                                                    );
                                                                return (
                                                                    <AmenityToggleTile
                                                                        key={
                                                                            amenity.id
                                                                        }
                                                                        amenity={
                                                                            amenity
                                                                        }
                                                                        checked={
                                                                            checked
                                                                        }
                                                                        disabled={
                                                                            !canManage
                                                                        }
                                                                        onToggle={() =>
                                                                            toggleRoomTypeAmenity(
                                                                                amenity.id,
                                                                            )
                                                                        }
                                                                    />
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )}

                                    {canManage && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface pt-4 dark:border-border">
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                <strong>
                                                    {
                                                        activeRoomSelectedIds.length
                                                    }
                                                </strong>{' '}
                                                amenities selected
                                                {applyToAllRoomTypes
                                                    ? ` (will apply to all ${roomTypes.length} room types)`
                                                    : ''}
                                            </p>
                                            <Button
                                                type="button"
                                                onClick={saveRoomTypeAmenities}
                                                disabled={saving}
                                            >
                                                <Save
                                                    className="mr-1.5 size-4"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {saving
                                                        ? 'Saving…'
                                                        : applyToAllRoomTypes
                                                          ? 'Save to All Room Types'
                                                          : 'Save Room-Type Amenities'}
                                                </span>
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

function AmenityToggleTile({
    amenity,
    checked,
    disabled,
    onToggle,
}: {
    amenity: AmenityCatalogueItem;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onToggle}
            aria-pressed={checked}
            className={cn(
                'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all',
                !disabled && 'cursor-pointer',
                checked
                    ? 'border-tijum-coral bg-tijum-coral/10 ring-1 ring-tijum-coral/35 dark:border-tijum-coral dark:bg-tijum-coral/15'
                    : 'border-tijum-surface bg-card hover:border-tijum-coral/40 hover:bg-tijum-cream/35 dark:border-border dark:hover:bg-muted/40',
            )}
        >
            <span
                className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    checked
                        ? 'border-tijum-coral bg-tijum-coral text-white'
                        : 'border-tijum-plum-muted/40 bg-background',
                )}
            >
                {checked && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                    {amenity.name}
                </span>
                {amenity.description && (
                    <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted-foreground">
                        {amenity.description}
                    </span>
                )}
            </span>
        </button>
    );
}

OwnerPropertyAmenitiesIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Amenities', href: amenitiesIndexRoute(1) },
    ],
};
