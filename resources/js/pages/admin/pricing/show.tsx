import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Ban,
    BedDouble,
    CheckCircle2,
    ShieldAlert,
    Wallet,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatReservationMoney } from '@/lib/reservation-format';
import pricingRoutes from '@/routes/admin/pricing';
import type {
    AvailabilityBlockPortal,
    PropertyPricingOptions,
    RoomTypePricingRow,
} from '@/types';

type Props = {
    property: {
        id: number;
        name: string;
        property_reference: string;
        owner_name?: string;
        city_name?: string;
        food: { label: string; food_provided: boolean };
    };
    roomTypes: RoomTypePricingRow[];
    rooms: {
        id: number;
        room_number: string;
        property_room_type_id: number;
        room_type_name?: string | null;
    }[];
    availabilityBlocks: AvailabilityBlockPortal[];
    evaluation: {
        active_room_types_count: number;
        configured_room_types_count: number;
        missing_pricing_count: number;
    };
    options: PropertyPricingOptions;
    canManageRestrictions: boolean;
};

export default function AdminPricingShow({
    property,
    roomTypes,
    rooms,
    availabilityBlocks,
    evaluation,
    options,
    canManageRestrictions,
}: Props) {
    const [cancellingBlockId, setCancellingBlockId] = useState<number | null>(
        null,
    );

    const blockForm = useForm({
        scope: 'property',
        block_type: 'stop_sell',
        property_room_type_id: '',
        property_room_id: '',
        start_date: '',
        end_date: '',
        reason: '',
    });

    const submitBlock = (e: FormEvent) => {
        e.preventDefault();
        blockForm.post(pricingRoutes.restrictions.store.url(property.id), {
            preserveScroll: true,
            onSuccess: () =>
                blockForm.reset('start_date', 'end_date', 'reason'),
        });
    };

    const cancelBlock = (id: number) => {
        setCancellingBlockId(id);
        router.post(
            pricingRoutes.restrictions.cancel.url({
                property: property.id,
                block: id,
            }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setCancellingBlockId(null),
            },
        );
    };

    const formatMinorRate = (minor: number | null) => {
        if (minor === null || minor === undefined) {
            return '—';
        }
        return formatReservationMoney(minor, options.currencyCode);
    };

    const activeBlocksCount = availabilityBlocks.filter(
        (b) => b.status === 'active',
    ).length;

    const roomTypeColumns: DataTableColumn<RoomTypePricingRow>[] = [
        {
            key: 'name',
            header: 'Room Type',
            isRowHeader: true,
            render: (rt) => (
                <div className="space-y-0.5">
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {rt.name}
                    </p>
                    <p className="text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                        {rt.accommodation_mode_label ?? 'Room type'} ·{' '}
                        {rt.is_air_conditioned ? 'AC' : 'Non-AC'}
                        {rt.pricing_basis
                            ? ` · ${rt.pricing_basis === 'per_guest' ? 'Per guest' : 'Per room'}`
                            : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'daily',
            header: 'Daily Rate',
            render: (rt) => (
                <span className="font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                    {formatMinorRate(rt.daily_rate_minor)}
                </span>
            ),
        },
        {
            key: 'weekly',
            header: 'Weekly Rate',
            render: (rt) => (
                <span className="font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                    {formatMinorRate(rt.weekly_rate_minor)}
                </span>
            ),
        },
        {
            key: 'monthly',
            header: 'Monthly Rate',
            render: (rt) => (
                <span className="font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                    {formatMinorRate(rt.monthly_rate_minor)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Configuration',
            render: (rt) => {
                const configured =
                    rt.has_any_direct_rate ??
                    (rt.daily_rate_minor !== null ||
                        rt.weekly_rate_minor !== null ||
                        rt.monthly_rate_minor !== null);
                return (
                    <StatusBadge
                        status={configured ? 'verified' : 'warning'}
                        label={configured ? 'Configured' : 'Missing'}
                    />
                );
            },
        },
    ];

    const blockColumns: DataTableColumn<AvailabilityBlockPortal>[] = [
        {
            key: 'restriction',
            header: 'Restriction',
            isRowHeader: true,
            render: (b) => (
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                            {b.block_type_label}
                        </span>
                        {b.is_admin_restriction && (
                            <Badge variant="plum">Admin restriction</Badge>
                        )}
                    </div>
                    <p className="text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                        {b.scope_label}
                    </p>
                </div>
            ),
        },
        {
            key: 'target',
            header: 'Target',
            render: (b) => (
                <span className="text-xs text-tijum-plum dark:text-foreground">
                    {b.room_type_name || b.room_number
                        ? [
                              b.room_type_name,
                              b.room_number ? `Room ${b.room_number}` : null,
                          ]
                              .filter(Boolean)
                              .join(' · ')
                        : 'Entire property'}
                </span>
            ),
        },
        {
            key: 'dates',
            header: 'Date Range',
            render: (b) => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tijum-plum tabular-nums dark:text-foreground">
                    <span>{b.start_date ?? '—'}</span>
                    <ArrowRight
                        className="size-3 text-tijum-plum-muted dark:text-muted-foreground"
                        aria-hidden="true"
                    />
                    <span>{b.end_date ?? '—'}</span>
                </span>
            ),
        },
        {
            key: 'reason',
            header: 'Reason',
            render: (b) => (
                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    {b.reason || b.cancellation_reason || '—'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (b) => (
                <StatusBadge
                    status={
                        b.status === 'active'
                            ? 'active'
                            : b.status === 'cancelled'
                              ? 'cancelled'
                              : 'neutral'
                    }
                    label={b.status_label}
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (b) =>
                b.status === 'active' && canManageRestrictions ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cancellingBlockId === b.id}
                        loading={cancellingBlockId === b.id}
                        onClick={() => cancelBlock(b.id)}
                    >
                        Cancel
                    </Button>
                ) : (
                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        —
                    </span>
                ),
        },
    ];

    return (
        <>
            <Head title={`${property.name} · Pricing`} />
            <div className="space-y-6">
                <PageHeader
                    eyebrow={`${property.property_reference} · Pricing Oversight`}
                    title={property.name}
                    description={`${property.owner_name ?? ''} · ${property.city_name ?? ''} · Food: ${property.food.label}`}
                    badges={
                        <>
                            <Badge variant="outline" className="tabular-nums">
                                {options.currencyCode}
                            </Badge>
                            <Badge
                                variant={
                                    property.food.food_provided
                                        ? 'food'
                                        : 'outline'
                                }
                            >
                                {property.food.label}
                            </Badge>
                        </>
                    }
                    actions={
                        <Button variant="outline" asChild>
                            <Link href={pricingRoutes.index.url()}>
                                <ArrowLeft aria-hidden="true" />
                                <span>Back to Pricing</span>
                            </Link>
                        </Button>
                    }
                />

                {evaluation.missing_pricing_count > 0 && (
                    <Card
                        role="status"
                        className="border-l-4 border-l-amber-500 py-4 dark:border-l-amber-400"
                    >
                        <CardContent className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
                                <AlertTriangle
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-0.5">
                                <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    Incomplete Room-Type Pricing
                                </p>
                                <p className="text-sm text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    {evaluation.missing_pricing_count} active
                                    room{' '}
                                    {evaluation.missing_pricing_count === 1
                                        ? 'type is'
                                        : 'types are'}{' '}
                                    missing direct daily, weekly, or monthly
                                    rates.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <section
                    aria-label="Property pricing and availability summary"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Active Room Types"
                        value={evaluation.active_room_types_count}
                        icon={BedDouble}
                    />
                    <StatCard
                        label="Configured Rates"
                        value={`${evaluation.configured_room_types_count}/${evaluation.active_room_types_count}`}
                        icon={Wallet}
                    />
                    <StatCard
                        label="Missing Pricing"
                        value={evaluation.missing_pricing_count}
                        icon={AlertTriangle}
                    />
                    <StatCard
                        label="Active Blocks"
                        value={activeBlocksCount}
                        icon={Ban}
                    />
                </section>

                <DataTable
                    caption="Direct pricing configured per active room type"
                    title="Direct room-type pricing"
                    description={`${evaluation.configured_room_types_count}/${evaluation.active_room_types_count} configured · ${evaluation.missing_pricing_count} missing.`}
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {roomTypes.length} room types
                        </Badge>
                    }
                    columns={roomTypeColumns}
                    rows={roomTypes}
                    getRowKey={(rt) => rt.id}
                    pageSize={15}
                    emptyTitle="No active room types"
                    emptyDescription="Active room types and their configured daily, weekly, and monthly rates will appear here."
                />

                {canManageRestrictions && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <ShieldAlert
                                        className="size-4.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">
                                        Create admin restriction or availability
                                        block
                                    </CardTitle>
                                    <CardDescription>
                                        Apply stop-sell, maintenance, or closure
                                        windows across the property, room types,
                                        or specific physical rooms.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={submitBlock}
                                className="grid gap-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-border dark:bg-muted/45"
                            >
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="block-scope"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Scope
                                    </Label>
                                    <Select
                                        value={blockForm.data.scope}
                                        onValueChange={(v) =>
                                            blockForm.setData('scope', v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="block-scope"
                                            className="w-full"
                                        >
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
                                    {blockForm.errors.scope && (
                                        <p className="text-xs text-status-error-fg">
                                            {blockForm.errors.scope}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="block-type"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Type
                                    </Label>
                                    <Select
                                        value={blockForm.data.block_type}
                                        onValueChange={(v) =>
                                            blockForm.setData('block_type', v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="block-type"
                                            className="w-full"
                                        >
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
                                    {blockForm.errors.block_type && (
                                        <p className="text-xs text-status-error-fg">
                                            {blockForm.errors.block_type}
                                        </p>
                                    )}
                                </div>

                                {blockForm.data.scope === 'room_type' && (
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="block-room-type"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Room type
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
                                            <SelectTrigger
                                                id="block-room-type"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select" />
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
                                        {blockForm.errors
                                            .property_room_type_id && (
                                            <p className="text-xs text-status-error-fg">
                                                {
                                                    blockForm.errors
                                                        .property_room_type_id
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}

                                {blockForm.data.scope === 'room' && (
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="block-room"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Room
                                        </Label>
                                        <Select
                                            value={
                                                blockForm.data.property_room_id
                                            }
                                            onValueChange={(v) =>
                                                blockForm.setData(
                                                    'property_room_id',
                                                    v,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="block-room"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {rooms.map((r) => (
                                                    <SelectItem
                                                        key={r.id}
                                                        value={String(r.id)}
                                                    >
                                                        {r.room_number}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {blockForm.errors.property_room_id && (
                                            <p className="text-xs text-status-error-fg">
                                                {
                                                    blockForm.errors
                                                        .property_room_id
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="block-start"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Start
                                    </Label>
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
                                    {blockForm.errors.start_date && (
                                        <p className="text-xs text-status-error-fg">
                                            {blockForm.errors.start_date}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="block-end"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        End
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
                                    />
                                    {blockForm.errors.end_date && (
                                        <p className="text-xs text-status-error-fg">
                                            {blockForm.errors.end_date}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                                    <Label
                                        htmlFor="block-reason"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Reason
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
                                        placeholder="Optional operational or compliance note"
                                    />
                                    {blockForm.errors.reason && (
                                        <p className="text-xs text-status-error-fg">
                                            {blockForm.errors.reason}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        disabled={blockForm.processing}
                                        loading={blockForm.processing}
                                    >
                                        <CheckCircle2 aria-hidden="true" />
                                        <span>Create restriction</span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <DataTable
                    caption="Property availability blocks and admin restrictions"
                    title="Availability blocks & admin restrictions"
                    description="Active and historical stop-sell, maintenance, and closure windows across this property."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {availabilityBlocks.length} blocks
                        </Badge>
                    }
                    columns={blockColumns}
                    rows={availabilityBlocks}
                    getRowKey={(b) => b.id}
                    pageSize={15}
                    emptyTitle="No blocks"
                    emptyDescription="No active or historical availability blocks or admin restrictions exist for this property."
                />
            </div>
        </>
    );
}
