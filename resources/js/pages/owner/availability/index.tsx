import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Ban,
    BedDouble,
    Building2,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    DollarSign,
    Plus,
    RefreshCw,
    Trash2,
    Utensils,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type {
    AvailabilityBlockPortal,
    PropertyPricingEvaluation,
    PropertyPricingOptions,
    RoomTypePricingRow,
} from '@/types';

type PropertySummary = {
    id: number;
    name: string;
    property_reference: string;
    city_name?: string | null;
    operational_status: string;
    rooms_count: number;
    room_types_count: number;
    active_blocks_count: number;
    food_provided: boolean;
};

type Props = {
    properties: PropertySummary[];
    selectedPropertyId: number | null;
    property: {
        id: number;
        name: string;
        property_reference: string;
        food: {
            food_provided: boolean;
            breakfast_included: boolean;
            lunch_included: boolean;
            dinner_included: boolean;
            label?: string;
        };
    } | null;
    roomTypes: RoomTypePricingRow[];
    availabilityBlocks: AvailabilityBlockPortal[];
    rooms: Array<{
        id: number;
        room_number: string;
        property_room_type_id: number;
        room_type_name?: string | null;
    }>;
    evaluation: PropertyPricingEvaluation;
    options: PropertyPricingOptions;
    canManage: boolean;
    status?: string;
};

export default function OwnerAvailabilityIndex({
    properties,
    selectedPropertyId,
    property,
    roomTypes,
    availabilityBlocks,
    rooms,
    evaluation,
    options,
    canManage,
    status,
}: Props) {
    const [blockModalOpen, setBlockModalOpen] = useState(false);

    // Pricing form
    const pricingForm = useForm({
        food_provided: property?.food?.food_provided ?? false,
        breakfast_included: property?.food?.breakfast_included ?? false,
        lunch_included: property?.food?.lunch_included ?? false,
        dinner_included: property?.food?.dinner_included ?? false,
        room_types: roomTypes.map((rt) => ({
            id: rt.id,
            daily_rate_minor:
                rt.daily_rate_minor !== null ? String(rt.daily_rate_minor) : '',
            weekly_rate_minor:
                rt.weekly_rate_minor !== null
                    ? String(rt.weekly_rate_minor)
                    : '',
            monthly_rate_minor:
                rt.monthly_rate_minor !== null
                    ? String(rt.monthly_rate_minor)
                    : '',
        })),
    });

    // Block creation form
    const [blocksPage, setBlocksPage] = useState(1);
    const blocksPageSize = 10;
    const blocksTotalPages = Math.max(
        1,
        Math.ceil(availabilityBlocks.length / blocksPageSize),
    );
    const safeBlocksPage = Math.min(blocksPage, blocksTotalPages);
    const blocksStartIndex = (safeBlocksPage - 1) * blocksPageSize;
    const visibleBlocks = availabilityBlocks.slice(
        blocksStartIndex,
        blocksStartIndex + blocksPageSize,
    );

    const blockForm = useForm({
        scope: 'property',
        block_type: 'maintenance',
        property_room_type_id: '',
        property_room_id: '',
        start_date: '',
        end_date: '',
        reason: '',
    });

    const handlePropertyChange = (propertyIdStr: string) => {
        router.get(
            '/owner/availability',
            { property_id: propertyIdStr },
            { preserveState: false },
        );
    };

    const submitPricing = (e: FormEvent) => {
        e.preventDefault();
        if (!property) return;

        pricingForm.transform((data) => ({
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

        pricingForm.put(`/owner/availability/${property.id}/pricing`, {
            preserveScroll: true,
        });
    };

    const submitBlock = (e: FormEvent) => {
        e.preventDefault();
        if (!property) return;

        blockForm.transform((data) => ({
            ...data,
            property_room_type_id:
                data.scope === 'room_type' && data.property_room_type_id
                    ? Number(data.property_room_type_id)
                    : null,
            property_room_id:
                data.scope === 'room' && data.property_room_id
                    ? Number(data.property_room_id)
                    : null,
        }));

        blockForm.post(`/owner/availability/${property.id}/blocks`, {
            preserveScroll: true,
            onSuccess: () => {
                setBlockModalOpen(false);
                blockForm.reset(
                    'start_date',
                    'end_date',
                    'reason',
                    'property_room_id',
                    'property_room_type_id',
                );
            },
        });
    };

    const cancelBlock = (blockId: number) => {
        if (!property) return;
        if (
            !confirm(
                'Are you sure you want to release this block and restore booking availability?',
            )
        ) {
            return;
        }

        router.delete(`/owner/availability/${property.id}/blocks/${blockId}`, {
            preserveScroll: true,
        });
    };

    const setRoomRate = (
        id: number,
        field: 'daily_rate_minor' | 'weekly_rate_minor' | 'monthly_rate_minor',
        value: string,
    ) => {
        pricingForm.setData(
            'room_types',
            pricingForm.data.room_types.map((rt) =>
                rt.id === id ? { ...rt, [field]: value } : rt,
            ),
        );
    };

    if (properties.length === 0) {
        return (
            <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <Head title="Availability & Pricing · TIJUM Partner" />
                <PageHeader
                    eyebrow="Partner Operations"
                    title="Availability & Pricing"
                    description="Configure direct booking rates, meal inclusions, and temporary room blocks for your properties."
                />
                <Card className="border-dashed py-12 text-center">
                    <CardContent className="space-y-4">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-tijum-peach/40 text-tijum-coral dark:bg-tijum-coral/15">
                            <Building2 className="size-6" />
                        </div>
                        <h3 className="font-heading text-lg font-semibold text-tijum-plum dark:text-foreground">
                            No properties onboarded yet
                        </h3>
                        <p className="mx-auto max-w-md text-sm text-tijum-plum-muted dark:text-muted-foreground">
                            Complete your partner business onboarding and
                            property submission to unlock real-time availability
                            controls, calendar hold blocks, and tiered room
                            pricing.
                        </p>
                        <Button
                            onClick={() =>
                                router.visit('/owner/properties/create')
                            }
                        >
                            <Plus className="mr-2 size-4" /> Add Your First
                            Property
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Head title="Availability & Pricing · TIJUM Partner" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                    eyebrow="Partner Operations"
                    title="Availability & Pricing"
                    description="Manage live nightly, weekly, and monthly rates, meal plans, and room availability blocks."
                />

                {/* Property selector */}
                <div className="flex items-center gap-2">
                    <Label
                        htmlFor="property-select"
                        className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground"
                    >
                        Property:
                    </Label>
                    <Select
                        value={String(selectedPropertyId)}
                        onValueChange={handlePropertyChange}
                    >
                        <SelectTrigger
                            id="property-select"
                            className="w-[240px] text-sm font-medium"
                        >
                            <SelectValue placeholder="Select Property" />
                        </SelectTrigger>
                        <SelectContent>
                            {properties.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate">
                                            {p.name}
                                        </span>
                                        {p.city_name && (
                                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                ({p.city_name})
                                            </span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {status === 'pricing-saved' && (
                <Alert variant="success">
                    <CheckCircle2 className="size-4" />
                    <AlertTitle>Pricing updated</AlertTitle>
                    <AlertDescription>
                        Direct room rates and meal options have been saved and
                        applied to customer searches.
                    </AlertDescription>
                </Alert>
            )}

            {status === 'availability-block-created' && (
                <Alert variant="success">
                    <CheckCircle2 className="size-4" />
                    <AlertTitle>Availability block active</AlertTitle>
                    <AlertDescription>
                        Selected dates have been blocked from guest reservation.
                    </AlertDescription>
                </Alert>
            )}

            {status === 'availability-block-cancelled' && (
                <Alert variant="success">
                    <CheckCircle2 className="size-4" />
                    <AlertTitle>Block released</AlertTitle>
                    <AlertDescription>
                        The block was canceled and rooms are available for
                        bookings again.
                    </AlertDescription>
                </Alert>
            )}

            {/* Key KPI Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card className="border-tijum-surface/80 dark:border-border">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-xs font-medium">
                            Active Room Types
                        </CardDescription>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {evaluation.active_room_types_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            {rooms.length} physical room
                            {rooms.length === 1 ? '' : 's'}
                        </span>
                    </CardContent>
                </Card>

                <Card className="border-tijum-surface/80 dark:border-border">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-xs font-medium">
                            Configured Rates
                        </CardDescription>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {evaluation.configured_room_types_count} /{' '}
                            {evaluation.active_room_types_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        {evaluation.missing_pricing_count > 0 ? (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {evaluation.missing_pricing_count} need rates
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-tijum-coral dark:text-tijum-peach">
                                All rates live
                            </span>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-tijum-surface/80 dark:border-border">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-xs font-medium">
                            Active Blocks / Holds
                        </CardDescription>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-coral">
                            {availabilityBlocks.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Maintenance &amp; manual holds
                        </span>
                    </CardContent>
                </Card>

                <Card className="border-tijum-surface/80 dark:border-border">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-xs font-medium">
                            Food &amp; Meal Service
                        </CardDescription>
                        <CardTitle className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                            {pricingForm.data.food_provided
                                ? 'Included'
                                : 'Not Offered'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            {pricingForm.data.food_provided
                                ? [
                                      pricingForm.data.breakfast_included &&
                                          'Breakfast',
                                      pricingForm.data.lunch_included &&
                                          'Lunch',
                                      pricingForm.data.dinner_included &&
                                          'Dinner',
                                  ]
                                      .filter(Boolean)
                                      .join(', ') || 'Meals configured'
                                : 'Self-catering'}
                        </span>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="rates" className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList variant="pill">
                        <TabsTrigger value="rates" className="gap-2">
                            <DollarSign className="size-4" />
                            <span>Room Rates &amp; Meals</span>
                        </TabsTrigger>
                        <TabsTrigger value="blocks" className="gap-2">
                            <CalendarDays className="size-4" />
                            <span>
                                Availability Blocks ({availabilityBlocks.length}
                                )
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    <Dialog
                        open={blockModalOpen}
                        onOpenChange={setBlockModalOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="border-tijum-coral text-tijum-coral hover:bg-tijum-coral hover:text-white dark:border-tijum-coral/70 dark:text-tijum-peach dark:hover:bg-tijum-coral dark:hover:text-white"
                            >
                                <Plus className="mr-2 size-4" /> Block Dates /
                                Maintenance
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <form onSubmit={submitBlock}>
                                <DialogHeader>
                                    <DialogTitle>
                                        Add Availability Block
                                    </DialogTitle>
                                    <DialogDescription>
                                        Temporarily take rooms or entire
                                        property off the market for maintenance,
                                        deep cleaning, or private reservation.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="block-scope">
                                            Block Scope
                                        </Label>
                                        <Select
                                            value={blockForm.data.scope}
                                            onValueChange={(v) =>
                                                blockForm.setData('scope', v)
                                            }
                                        >
                                            <SelectTrigger id="block-scope">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.blockScopes.map(
                                                    (s) => (
                                                        <SelectItem
                                                            key={s.value}
                                                            value={s.value}
                                                        >
                                                            {s.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {blockForm.data.scope === 'room_type' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="block-room-type">
                                                Select Room Type
                                            </Label>
                                            <Select
                                                value={
                                                    blockForm.data
                                                        .property_room_type_id
                                                }
                                                onValueChange={(v) =>
                                                    blockForm.setData(
                                                        'property_room_type_id',
                                                        v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="block-room-type">
                                                    <SelectValue placeholder="Choose Room Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roomTypes.map((rt) => (
                                                        <SelectItem
                                                            key={rt.id}
                                                            value={String(
                                                                rt.id,
                                                            )}
                                                        >
                                                            {rt.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {blockForm.data.scope === 'room' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="block-room">
                                                Select Specific Room
                                            </Label>
                                            <Select
                                                value={
                                                    blockForm.data
                                                        .property_room_id
                                                }
                                                onValueChange={(v) =>
                                                    blockForm.setData(
                                                        'property_room_id',
                                                        v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="block-room">
                                                    <SelectValue placeholder="Choose Room" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {rooms.map((r) => (
                                                        <SelectItem
                                                            key={r.id}
                                                            value={String(r.id)}
                                                        >
                                                            Room {r.room_number}{' '}
                                                            {r.room_type_name
                                                                ? `(${r.room_type_name})`
                                                                : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="block-type">
                                            Block Reason Category
                                        </Label>
                                        <Select
                                            value={blockForm.data.block_type}
                                            onValueChange={(v) =>
                                                blockForm.setData(
                                                    'block_type',
                                                    v,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="block-type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.blockTypes.map((t) => (
                                                    <SelectItem
                                                        key={t.value}
                                                        value={t.value}
                                                    >
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="block-start">
                                                Start Date
                                            </Label>
                                            <Input
                                                id="block-start"
                                                type="date"
                                                value={
                                                    blockForm.data.start_date
                                                }
                                                onChange={(e) =>
                                                    blockForm.setData(
                                                        'start_date',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="block-end">
                                                End Date
                                            </Label>
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
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="block-notes">
                                            Internal Notes (Optional)
                                        </Label>
                                        <Textarea
                                            id="block-notes"
                                            rows={2}
                                            placeholder="e.g. AC unit repair, wall painting, host family visit"
                                            value={blockForm.data.reason}
                                            onChange={(e) =>
                                                blockForm.setData(
                                                    'reason',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setBlockModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={blockForm.processing}
                                        className="bg-tijum-coral hover:bg-tijum-coral/90"
                                    >
                                        {blockForm.processing
                                            ? 'Saving Block...'
                                            : 'Confirm Block'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Tab 1: Rates & Meals */}
                <TabsContent value="rates">
                    <form onSubmit={submitPricing} className="space-y-6">
                        {/* Food plan settings */}
                        <Card className="border-tijum-surface/80 bg-white dark:border-border dark:bg-card">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Utensils className="size-5 text-tijum-coral" />
                                    <CardTitle className="text-base font-semibold">
                                        Food &amp; Meal Services
                                    </CardTitle>
                                </div>
                                <CardDescription>
                                    Specify whether meals are included in room
                                    rates. TIJUM displays clear meal tags so
                                    guests know what to expect.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="food_provided"
                                        checked={pricingForm.data.food_provided}
                                        onCheckedChange={(c) =>
                                            pricingForm.setData(
                                                'food_provided',
                                                Boolean(c),
                                            )
                                        }
                                    />
                                    <Label
                                        htmlFor="food_provided"
                                        className="cursor-pointer font-medium"
                                    >
                                        Food / Meals provided at this property
                                    </Label>
                                </div>

                                {pricingForm.data.food_provided && (
                                    <div className="ml-6 grid grid-cols-1 gap-3 rounded-lg border border-tijum-surface/80 bg-tijum-cream/40 p-3 sm:grid-cols-3 dark:border-border dark:bg-muted/40">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="bf_inc"
                                                checked={
                                                    pricingForm.data
                                                        .breakfast_included
                                                }
                                                onCheckedChange={(c) =>
                                                    pricingForm.setData(
                                                        'breakfast_included',
                                                        Boolean(c),
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor="bf_inc"
                                                className="cursor-pointer text-sm"
                                            >
                                                Breakfast Included
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="ln_inc"
                                                checked={
                                                    pricingForm.data
                                                        .lunch_included
                                                }
                                                onCheckedChange={(c) =>
                                                    pricingForm.setData(
                                                        'lunch_included',
                                                        Boolean(c),
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor="ln_inc"
                                                className="cursor-pointer text-sm"
                                            >
                                                Lunch Included
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="dn_inc"
                                                checked={
                                                    pricingForm.data
                                                        .dinner_included
                                                }
                                                onCheckedChange={(c) =>
                                                    pricingForm.setData(
                                                        'dinner_included',
                                                        Boolean(c),
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor="dn_inc"
                                                className="cursor-pointer text-sm"
                                            >
                                                Dinner Included
                                            </Label>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Room type rates */}
                        <Card className="border-tijum-surface/80 bg-white dark:border-border dark:bg-card">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BedDouble className="size-5 text-tijum-coral" />
                                        <CardTitle className="text-base font-semibold">
                                            Room Type Pricing Matrix
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline">
                                        Amounts in INR Paise (100 = ₹1.00)
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Enter rates in minor units (e.g. 120000 =
                                    ₹1,200/day). Guests can book by Day, Week,
                                    or Month.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-tijum-surface/80 dark:divide-border">
                                    {roomTypes.map((rt) => {
                                        const formRow =
                                            pricingForm.data.room_types.find(
                                                (r) => r.id === rt.id,
                                            );

                                        return (
                                            <div
                                                key={rt.id}
                                                className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-12 lg:items-center"
                                            >
                                                <div className="lg:col-span-4">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                            {rt.name}
                                                        </h4>
                                                        {rt.is_air_conditioned ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-sky-300 bg-sky-50 text-[10px] text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-200"
                                                            >
                                                                AC
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px]"
                                                            >
                                                                Non-AC
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        {
                                                            rt.accommodation_mode_label
                                                        }{' '}
                                                        · Max{' '}
                                                        {rt.max_guests_per_room}{' '}
                                                        guests
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-8">
                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor={`daily_${rt.id}`}
                                                            className="text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                                        >
                                                            Daily Rate (Paise)
                                                        </Label>
                                                        <div className="relative">
                                                            <Input
                                                                id={`daily_${rt.id}`}
                                                                type="number"
                                                                placeholder="e.g. 100000"
                                                                value={
                                                                    formRow?.daily_rate_minor ??
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    setRoomRate(
                                                                        rt.id,
                                                                        'daily_rate_minor',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="font-mono text-sm tabular-nums"
                                                            />
                                                        </div>
                                                        {formRow?.daily_rate_minor && (
                                                            <span className="text-[11px] font-medium tabular-nums text-tijum-coral dark:text-tijum-peach">
                                                                ≈ ₹
                                                                {(
                                                                    Number(
                                                                        formRow.daily_rate_minor,
                                                                    ) / 100
                                                                ).toLocaleString()}
                                                                /day
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor={`weekly_${rt.id}`}
                                                            className="text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                                        >
                                                            Weekly Rate (Paise)
                                                        </Label>
                                                        <Input
                                                            id={`weekly_${rt.id}`}
                                                            type="number"
                                                            placeholder="e.g. 600000"
                                                            value={
                                                                formRow?.weekly_rate_minor ??
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                setRoomRate(
                                                                    rt.id,
                                                                    'weekly_rate_minor',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="font-mono text-sm"
                                                        />
                                                        {formRow?.weekly_rate_minor && (
                                                            <span className="text-[11px] font-medium text-tijum-coral">
                                                                ≈ ₹
                                                                {(
                                                                    Number(
                                                                        formRow.weekly_rate_minor,
                                                                    ) / 100
                                                                ).toLocaleString()}
                                                                /wk
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor={`monthly_${rt.id}`}
                                                            className="text-xs text-tijum-plum-muted"
                                                        >
                                                            Monthly Rate (Paise)
                                                        </Label>
                                                        <Input
                                                            id={`monthly_${rt.id}`}
                                                            type="number"
                                                            placeholder="e.g. 2400000"
                                                            value={
                                                                formRow?.monthly_rate_minor ??
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                setRoomRate(
                                                                    rt.id,
                                                                    'monthly_rate_minor',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="font-mono text-sm"
                                                        />
                                                        {formRow?.monthly_rate_minor && (
                                                            <span className="text-[11px] font-medium text-tijum-coral">
                                                                ≈ ₹
                                                                {(
                                                                    Number(
                                                                        formRow.monthly_rate_minor,
                                                                    ) / 100
                                                                ).toLocaleString()}
                                                                /mo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end border-t border-tijum-surface/80 bg-tijum-cream/20 py-3 dark:border-border dark:bg-muted/20">
                                <Button
                                    type="submit"
                                    disabled={
                                        pricingForm.processing || !canManage
                                    }
                                    className="bg-tijum-coral hover:bg-tijum-coral/90"
                                >
                                    {pricingForm.processing ? (
                                        <>
                                            <RefreshCw className="mr-2 size-4 animate-spin" />{' '}
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 size-4" />{' '}
                                            Save Rates &amp; Meal Plan
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </TabsContent>

                {/* Tab 2: Availability Blocks */}
                <TabsContent value="blocks" className="space-y-4">
                    {availabilityBlocks.length === 0 ? (
                        <Card className="border-dashed py-10 text-center">
                            <CardContent className="space-y-3">
                                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-tijum-peach/40 text-tijum-coral dark:bg-tijum-coral/15">
                                    <CheckCircle2 className="size-5" />
                                </div>
                                <h4 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                                    All Rooms 100% Available
                                </h4>
                                <p className="mx-auto max-w-sm text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                    There are currently no active blocks or
                                    holds on this property. All rooms are open
                                    for guest discovery and instant booking.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => setBlockModalOpen(true)}
                                    className="mt-2"
                                >
                                    <Plus className="mr-2 size-4" /> Add Date
                                    Block
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {visibleBlocks.map((block) => (
                                <Card
                                    key={block.id}
                                    className="border-tijum-surface/80 bg-white dark:border-border dark:bg-card"
                                >
                                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                                                >
                                                    {block.block_type_label}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Scope: {block.scope_label}
                                                </Badge>
                                                {block.room_number && (
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono"
                                                    >
                                                        Room {block.room_number}
                                                    </Badge>
                                                )}
                                                {block.room_type_name && (
                                                    <span className="text-xs font-medium text-tijum-plum dark:text-foreground">
                                                        {block.room_type_name}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                                <Calendar className="size-4 text-tijum-coral" />
                                                <span>
                                                    <strong className="text-tijum-plum dark:text-foreground">
                                                        {block.start_date}
                                                    </strong>{' '}
                                                    to{' '}
                                                    <strong className="text-tijum-plum dark:text-foreground">
                                                        {block.end_date}
                                                    </strong>
                                                </span>
                                                {block.reason && (
                                                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground italic">
                                                        — &quot;{block.reason}
                                                        &quot;
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {block.status === 'active' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        cancelBlock(block.id)
                                                    }
                                                    className="border-status-error-border text-status-error-fg hover:bg-status-error-bg/70 hover:text-status-error-fg"
                                                >
                                                    <Trash2 className="mr-1.5 size-4" />{' '}
                                                    Release Block
                                                </Button>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {block.status_label}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {blocksStartIndex + 1}–
                                        {blocksStartIndex +
                                            visibleBlocks.length}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {availabilityBlocks.length}
                                    </span>{' '}
                                    {availabilityBlocks.length === 1
                                        ? 'block'
                                        : 'blocks'}
                                </p>
                                <Pagination
                                    currentPage={safeBlocksPage}
                                    totalPages={blocksTotalPages}
                                    onPageChange={setBlocksPage}
                                />
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
