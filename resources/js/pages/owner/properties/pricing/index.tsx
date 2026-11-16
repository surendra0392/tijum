import { Head, useForm } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { FormEvent } from 'react';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes/owner';
import {
    index as propertiesIndexRoute,
    show as propertyShowRoute,
} from '@/routes/owner/properties';
import pricingRoutes from '@/routes/owner/properties/pricing';
import type {
    AvailabilityBlockPortal,
    PropertyPricingEvaluation,
    PropertyPricingOptions,
    RoomTypePricingRow,
} from '@/types';

type Food = {
    food_provided: boolean;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
    label?: string;
};

type Props = {
    property: {
        id: number;
        name: string;
        property_reference: string;
        food: Food;
    };
    roomTypes: RoomTypePricingRow[];
    availabilityBlocks: AvailabilityBlockPortal[];
    rooms: {
        id: number;
        room_number: string;
        property_room_type_id: number;
        room_type_name?: string | null;
    }[];
    evaluation: PropertyPricingEvaluation;
    options: PropertyPricingOptions;
    canManage: boolean;
    status?: string | null;
};

export default function OwnerPropertyPricing({
    property,
    roomTypes,
    availabilityBlocks,
    rooms,
    evaluation,
    options,
    canManage,
}: Props) {
    const form = useForm({
        food_provided: property.food.food_provided,
        breakfast_included: property.food.breakfast_included,
        lunch_included: property.food.lunch_included,
        dinner_included: property.food.dinner_included,
        room_types: roomTypes.map((rt) => ({
            id: rt.id,
            daily_rate_minor: rt.daily_rate_minor ?? '',
            weekly_rate_minor: rt.weekly_rate_minor ?? '',
            monthly_rate_minor: rt.monthly_rate_minor ?? '',
        })),
    });

    const blockForm = useForm({
        scope: 'property',
        block_type: 'maintenance',
        property_room_type_id: '',
        property_room_id: '',
        start_date: '',
        end_date: '',
        reason: '',
    });

    const submitPricing = (e: FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            room_types: data.room_types.map((rt) => ({
                id: rt.id,
                daily_rate_minor:
                    rt.daily_rate_minor === ''
                        ? null
                        : Number(rt.daily_rate_minor),
                weekly_rate_minor:
                    rt.weekly_rate_minor === ''
                        ? null
                        : Number(rt.weekly_rate_minor),
                monthly_rate_minor:
                    rt.monthly_rate_minor === ''
                        ? null
                        : Number(rt.monthly_rate_minor),
            })),
        }));
        form.put(pricingRoutes.update.url(property.id), {
            preserveScroll: true,
        });
    };

    const submitBlock = (e: FormEvent) => {
        e.preventDefault();
        blockForm.post(
            pricingRoutes.availabilityBlocks.store.url(property.id),
            {
                preserveScroll: true,
                onSuccess: () =>
                    blockForm.reset(
                        'start_date',
                        'end_date',
                        'reason',
                        'property_room_id',
                        'property_room_type_id',
                    ),
            },
        );
    };

    const setRoomRate = (
        id: number,
        field: 'daily_rate_minor' | 'weekly_rate_minor' | 'monthly_rate_minor',
        value: string,
    ) => {
        form.setData(
            'room_types',
            form.data.room_types.map((rt) =>
                rt.id === id ? { ...rt, [field]: value } : rt,
            ),
        );
    };

    const cancelBlock = (blockId: number) => {
        useForm({}).post(
            pricingRoutes.availabilityBlocks.cancel.url({
                property: property.id,
                block: blockId,
            }),
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title={`${property.name} · Pricing & Availability`} />
            <div className="min-w-0 space-y-6">
                <PageHeader
                    eyebrow={`${property.property_reference} · Pricing & Availability`}
                    title={property.name}
                    description="Set property-level food inclusion and direct room-type pricing in INR minor units. Availability blocks do not create reservations."
                    badges={
                        <Badge variant="outline">{options.currencyCode}</Badge>
                    }
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="pricing"
                />

                {!canManage && (
                    <Alert variant="warning">
                        <AlertTitle>Read-only</AlertTitle>
                        <AlertDescription>
                            Pricing can be managed only by an active, approved
                            partner account.
                        </AlertDescription>
                    </Alert>
                )}

                <Alert variant="info">
                    <AlertTitle>Phase 09A pricing model</AlertTitle>
                    <AlertDescription>
                        Food is declared at property level. Pricing is stored
                        directly on each room type (daily/weekly/monthly).
                        AC/Non-AC remains a room-type attribute. No rate plans,
                        seasonal pricing, or amenity additional charges.
                    </AlertDescription>
                </Alert>

                <form onSubmit={submitPricing} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Food & meal inclusion</CardTitle>
                            <CardDescription>
                                Property-level declaration only. Select included
                                meals when food is provided.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-tijum-plum dark:text-foreground">
                                <Checkbox
                                    checked={form.data.food_provided}
                                    onCheckedChange={(v) =>
                                        form.setData(
                                            'food_provided',
                                            v === true,
                                        )
                                    }
                                    disabled={!canManage}
                                />
                                Food provided at this property
                            </label>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {(
                                    [
                                        [
                                            'breakfast_included',
                                            'Breakfast included',
                                        ],
                                        ['lunch_included', 'Lunch included'],
                                        ['dinner_included', 'Dinner included'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className="flex items-center gap-2 rounded-xl border border-tijum-surface/70 bg-tijum-cream/25 px-3 py-2.5 text-sm text-tijum-plum dark:border-border dark:bg-muted/35 dark:text-foreground"
                                    >
                                        <Checkbox
                                            checked={form.data[key]}
                                            onCheckedChange={(v) =>
                                                form.setData(key, v === true)
                                            }
                                            disabled={
                                                !canManage ||
                                                !form.data.food_provided
                                            }
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                            {form.errors.food_provided && (
                                <p className="text-xs text-status-error-fg">
                                    {form.errors.food_provided}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Direct room-type pricing</CardTitle>
                            <CardDescription>
                                Enter amounts in minor units (paise). Leave
                                blank if a duration is not offered.{' '}
                                {evaluation.configured_room_types_count}/
                                {evaluation.active_room_types_count} room types
                                configured.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {roomTypes.length === 0 ? (
                                <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    Configure active room types before setting
                                    pricing.
                                </p>
                            ) : (
                                roomTypes.map((rt) => {
                                    const row = form.data.room_types.find(
                                        (r) => r.id === rt.id,
                                    );
                                    return (
                                        <div
                                            key={rt.id}
                                            className="space-y-3 rounded-xl border border-tijum-surface p-4 dark:border-border dark:bg-muted/25"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                        {rt.name}
                                                    </p>
                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        {rt.accommodation_mode_label ??
                                                            'Room type'}{' '}
                                                        ·{' '}
                                                        {rt.is_air_conditioned
                                                            ? 'AC'
                                                            : 'Non-AC'}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        rt.has_any_direct_rate
                                                            ? 'plum'
                                                            : 'outline'
                                                    }
                                                >
                                                    {rt.has_any_direct_rate
                                                        ? 'Configured'
                                                        : 'Missing rates'}
                                                </Badge>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`daily-${rt.id}`}
                                                    >
                                                        Daily (minor)
                                                    </Label>
                                                    <Input
                                                        id={`daily-${rt.id}`}
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            row?.daily_rate_minor ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setRoomRate(
                                                                rt.id,
                                                                'daily_rate_minor',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={!canManage}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`weekly-${rt.id}`}
                                                    >
                                                        Weekly (minor)
                                                    </Label>
                                                    <Input
                                                        id={`weekly-${rt.id}`}
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            row?.weekly_rate_minor ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setRoomRate(
                                                                rt.id,
                                                                'weekly_rate_minor',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={!canManage}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`monthly-${rt.id}`}
                                                    >
                                                        Monthly (minor)
                                                    </Label>
                                                    <Input
                                                        id={`monthly-${rt.id}`}
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            row?.monthly_rate_minor ??
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setRoomRate(
                                                                rt.id,
                                                                'monthly_rate_minor',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={!canManage}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    variant="plum"
                                    disabled={!canManage || form.processing}
                                >
                                    Save pricing & food
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>

                <Card>
                    <CardHeader>
                        <CardTitle>Availability blocks</CardTitle>
                        <CardDescription>
                            Property, room-type, or room-level blocks. These
                            prevent availability but are not bookings or
                            reservations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form
                            onSubmit={submitBlock}
                            className="grid gap-3 rounded-xl border border-tijum-surface p-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-border dark:bg-muted/25"
                        >
                            <div className="space-y-1">
                                <Label>Scope</Label>
                                <Select
                                    value={blockForm.data.scope}
                                    onValueChange={(v) =>
                                        blockForm.setData('scope', v)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.blockScopes.map((o) => (
                                            <SelectItem
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Type</Label>
                                <Select
                                    value={blockForm.data.block_type}
                                    onValueChange={(v) =>
                                        blockForm.setData('block_type', v)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.blockTypes.map((o) => (
                                            <SelectItem
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {blockForm.data.scope === 'room_type' && (
                                <div className="space-y-1">
                                    <Label>Room type</Label>
                                    <Select
                                        value={
                                            blockForm.data.property_room_type_id
                                        }
                                        onValueChange={(v) =>
                                            blockForm.setData(
                                                'property_room_type_id',
                                                v,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select room type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roomTypes.map((rt) => (
                                                <SelectItem
                                                    key={rt.id}
                                                    value={String(rt.id)}
                                                >
                                                    {rt.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {blockForm.data.scope === 'room' && (
                                <div className="space-y-1">
                                    <Label>Room</Label>
                                    <Select
                                        value={blockForm.data.property_room_id}
                                        onValueChange={(v) =>
                                            blockForm.setData(
                                                'property_room_id',
                                                v,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select room" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rooms.map((r) => (
                                                <SelectItem
                                                    key={r.id}
                                                    value={String(r.id)}
                                                >
                                                    {r.room_number}{' '}
                                                    {r.room_type_name
                                                        ? `· ${r.room_type_name}`
                                                        : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label htmlFor="block-start">Start date</Label>
                                <Input
                                    id="block-start"
                                    type="date"
                                    value={blockForm.data.start_date}
                                    onChange={(e) =>
                                        blockForm.setData(
                                            'start_date',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="block-end">End date</Label>
                                <Input
                                    id="block-end"
                                    type="date"
                                    value={blockForm.data.end_date}
                                    onChange={(e) =>
                                        blockForm.setData(
                                            'end_date',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                                <Label htmlFor="block-reason">
                                    Reason (optional)
                                </Label>
                                <Input
                                    id="block-reason"
                                    value={blockForm.data.reason}
                                    onChange={(e) =>
                                        blockForm.setData(
                                            'reason',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={
                                        !canManage || blockForm.processing
                                    }
                                >
                                    Create block
                                </Button>
                            </div>
                        </form>

                        {availabilityBlocks.length === 0 ? (
                            <p className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                No availability blocks.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {availabilityBlocks.map((b) => (
                                    <div
                                        key={b.id}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface px-3 py-2 text-sm dark:border-border dark:bg-muted/35"
                                    >
                                        <div>
                                            <p className="font-medium text-tijum-plum dark:text-foreground">
                                                {b.block_type_label} ·{' '}
                                                {b.scope_label}{' '}
                                                {b.room_type_name
                                                    ? `· ${b.room_type_name}`
                                                    : ''}
                                                {b.room_number
                                                    ? `· Room ${b.room_number}`
                                                    : ''}
                                            </p>
                                            <p className="inline-flex items-center gap-1 text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                                <span>{b.start_date}</span>
                                                <ArrowRight
                                                    className="size-3 text-tijum-coral"
                                                    aria-hidden="true"
                                                />
                                                <span>{b.end_date}</span>
                                                <span>
                                                    · {b.status_label}
                                                    {b.is_admin_restriction
                                                        ? ' · Admin restriction'
                                                        : ''}
                                                </span>
                                            </p>
                                            {b.reason && (
                                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    {b.reason}
                                                </p>
                                            )}
                                        </div>
                                        {b.status === 'active' &&
                                            !b.is_admin_restriction &&
                                            canManage && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        cancelBlock(b.id)
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

OwnerPropertyPricing.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Pricing & Availability', href: propertyShowRoute(1) },
    ],
};
