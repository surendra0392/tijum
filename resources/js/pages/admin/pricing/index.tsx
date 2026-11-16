import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    Building2,
    CheckCircle2,
    Search,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
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
import pricingRoutes from '@/routes/admin/pricing';

type Row = {
    id: number;
    property_reference: string;
    name: string;
    owner_name: string;
    city_name: string;
    active_room_types_count: number;
    configured_room_types_count: number;
    missing_pricing_count: number;
    active_availability_blocks_count: number;
    food_provided: boolean;
};

type Props = {
    properties: {
        data: Row[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { search: string };
};

export default function AdminPricingIndex({ properties, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            pricingRoutes.index.url({ query: search ? { search } : {} }),
            {},
            { preserveState: true },
        );
    };

    const clear = () => {
        setSearch('');
        router.get(pricingRoutes.index.url(), {}, { preserveState: true });
    };

    const configuredOnPage = properties.data.filter(
        (p) => p.missing_pricing_count === 0,
    ).length;
    const missingOnPage = properties.data.filter(
        (p) => p.missing_pricing_count > 0,
    ).length;
    const activeBlocksOnPage = properties.data.reduce(
        (sum, p) => sum + p.active_availability_blocks_count,
        0,
    );

    const columns: DataTableColumn<Row>[] = [
        {
            key: 'property',
            header: 'Property',
            isRowHeader: true,
            render: (p) => (
                <div className="space-y-0.5">
                    <Link
                        href={pricingRoutes.show.url(p.id)}
                        className="font-heading font-semibold text-tijum-plum underline-offset-4 transition-colors hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                    >
                        {p.name}
                    </Link>
                    <p className="text-xs font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {p.property_reference} · {p.city_name}
                    </p>
                </div>
            ),
        },
        {
            key: 'owner',
            header: 'Partner Owner',
            render: (p) => (
                <span className="font-medium text-tijum-plum dark:text-foreground">
                    {p.owner_name}
                </span>
            ),
        },
        {
            key: 'pricing',
            header: 'Room-Type Pricing',
            render: (p) => (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                        {p.configured_room_types_count}/
                        {p.active_room_types_count}
                    </span>
                    <StatusBadge
                        status={
                            p.missing_pricing_count === 0
                                ? 'verified'
                                : 'warning'
                        }
                        label={
                            p.missing_pricing_count === 0
                                ? 'Configured'
                                : `${p.missing_pricing_count} missing`
                        }
                    />
                </div>
            ),
        },
        {
            key: 'food',
            header: 'Food',
            render: (p) => (
                <Badge variant={p.food_provided ? 'food' : 'outline'}>
                    {p.food_provided ? 'Yes' : 'No'}
                </Badge>
            ),
        },
        {
            key: 'blocks',
            header: 'Active Blocks',
            render: (p) => (
                <StatusBadge
                    status={
                        p.active_availability_blocks_count > 0
                            ? 'info'
                            : 'neutral'
                    }
                    label={`${p.active_availability_blocks_count} active`}
                    className="tabular-nums"
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (p) => (
                <Button asChild size="sm" variant="outline">
                    <Link href={pricingRoutes.show.url(p.id)}>Review</Link>
                </Button>
            ),
        },
    ];

    return (
        <>
            <Head title="Pricing & Availability" />
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Pricing Oversight"
                    title="Pricing & Availability"
                    description="Direct room-type pricing, property food declarations, and availability blocks across properties."
                    badges={
                        <Badge variant="outline" className="tabular-nums">
                            {properties.total} properties
                        </Badge>
                    }
                />

                <section
                    aria-label="Pricing oversight metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Total Properties"
                        value={properties.total}
                        icon={Building2}
                    />
                    <StatCard
                        label="Configured (This Page)"
                        value={configuredOnPage}
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Missing Pricing (This Page)"
                        value={missingOnPage}
                        icon={AlertTriangle}
                    />
                    <StatCard
                        label="Active Blocks (This Page)"
                        value={activeBlocksOnPage}
                        icon={Ban}
                    />
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2.5 text-base">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <Search className="size-4" aria-hidden="true" />
                            </span>
                            <span>Search Properties</span>
                        </CardTitle>
                        <CardDescription>
                            Filter properties by property name or TIJUM
                            reference code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={apply}
                            className="flex flex-wrap items-end gap-3"
                        >
                            <div className="min-w-64 flex-1 space-y-1.5">
                                <Label
                                    htmlFor="search"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Search
                                </Label>
                                <div className="relative">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="search"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder="Property name or reference"
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button type="submit" variant="plum">
                                    <Search aria-hidden="true" />
                                    <span>Search</span>
                                </Button>
                                {(search || filters.search) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={clear}
                                    >
                                        <X aria-hidden="true" />
                                        <span>Clear</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <DataTable
                    caption="Properties pricing and availability overview"
                    title="Properties Pricing & Availability"
                    description="Direct room-type pricing configuration and active availability blocks per property."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {properties.total} properties
                        </Badge>
                    }
                    columns={columns}
                    rows={properties.data}
                    getRowKey={(p) => p.id}
                    emptyTitle="No properties found"
                    emptyDescription="Try clearing or adjusting your property name or reference search."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {properties.data.length} of{' '}
                                {properties.total} properties
                            </p>
                            <Pagination
                                currentPage={properties.current_page}
                                totalPages={properties.last_page}
                                getPageHref={(page) =>
                                    pricingRoutes.index.url({
                                        query: {
                                            ...(search ? { search } : {}),
                                            page,
                                        },
                                    })
                                }
                            />
                        </div>
                    }
                />
            </div>
        </>
    );
}
