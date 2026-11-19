import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Camera,
    DoorClosed,
    FileCheck2,
    Layers,
    MapPin,
    PlusCircle,
    Search,
    ShieldCheck,
    Utensils,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
} from '@/components/owner/properties/property-status-helpers';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatusBadge } from '@/components/shared/status-badge';
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
    create as createPropertyRoute,
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import { index as mediaIndexRoute } from '@/routes/owner/properties/media';
import { index as roomTypesIndexRoute } from '@/routes/owner/properties/room-types';
import { index as roomsIndexRoute } from '@/routes/owner/properties/rooms';
import { show as verificationShowRoute } from '@/routes/owner/properties/verification';
import type {
    CityOption,
    PropertyCategoryOption,
    PropertySummaryData,
} from '@/types';

type OwnerPropertiesIndexProps = {
    properties: {
        data: PropertySummaryData[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: {
        total: number;
        verified: number;
        active: number;
        drafts: number;
    };
    filters: {
        search: string;
        status: string;
        verification_status: string;
        city: string;
        category: string;
        module?: string;
    };
    cities: CityOption[];
    categories: PropertyCategoryOption[];
    operationalStatuses: { value: string; label: string }[];
    verificationStatuses: { value: string; label: string }[];
    canCreateProperty: boolean;
};

export default function OwnerPropertiesIndex({
    properties,
    stats,
    filters,
    cities,
    categories,
    operationalStatuses,
    verificationStatuses,
    canCreateProperty,
}: OwnerPropertiesIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [verificationStatus, setVerificationStatus] = useState(
        filters.verification_status,
    );
    const [city, setCity] = useState(filters.city);
    const [category, setCategory] = useState(filters.category);

    const handleFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.get(
            propertiesIndexRoute.url(),
            {
                search: search || undefined,
                status: status || undefined,
                verification_status: verificationStatus || undefined,
                city: city || undefined,
                category: category || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setVerificationStatus('');
        setCity('');
        setCategory('');
        router.get(propertiesIndexRoute.url());
    };

    return (
        <>
            <Head title="My Properties · Partner Portal" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="TIJUM Property & Room Inventory"
                    title="My Properties"
                    description="Register your independent Hostels/PG, Homestays, or Co-Living properties, configure AC/Non-AC room types, list physical rooms, upload photographs, and submit each property for independent verification."
                    actions={
                        canCreateProperty ? (
                            <Button asChild data-test="add-property-button">
                                <Link href={createPropertyRoute()}>
                                    <PlusCircle aria-hidden="true" />
                                    <span>Add Property</span>
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                {!canCreateProperty && (
                    <Alert variant="warning">
                        <AlertTitle>Partner Approval Required</AlertTitle>
                        <AlertDescription>
                            Complete your Partner Verification before
                            registering and submitting properties on TIJUM.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total Properties"
                        value={String(stats.total)}
                        helperText="No artificial property cap"
                        icon={Building2}
                    />
                    <StatCard
                        label="Independently Verified"
                        value={String(stats.verified)}
                        helperText="Property verification approved"
                        icon={ShieldCheck}
                    />
                    <StatCard
                        label="Operationally Active"
                        value={String(stats.active)}
                        helperText="Live for customer bookings & stays"
                        icon={Layers}
                    />
                    <StatCard
                        label="Draft Setup"
                        value={String(stats.drafts)}
                        helperText="Awaiting configuration & submit"
                        icon={FileCheck2}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Search &amp; Filter Properties</CardTitle>
                        <CardDescription>
                            Filter across launch cities, accommodation
                            categories, operational states, and verification
                            statuses.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <search>
                            <form
                                onSubmit={handleFilter}
                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                            >
                                <div className="min-w-0 space-y-1 sm:col-span-2">
                                    <Label htmlFor="owner-prop-search">
                                        Search name, ref, or locality
                                    </Label>
                                    <div className="relative">
                                        <Search
                                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="owner-prop-search"
                                            type="search"
                                            value={search}
                                            className="w-full min-w-0 pl-9"
                                            placeholder="TJP-2026-000001, hostel..."
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="owner-prop-city">
                                        City
                                    </Label>
                                    <Select
                                        value={city || 'all'}
                                        onValueChange={(v) =>
                                            setCity(v === 'all' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="owner-prop-city"
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue placeholder="All cities" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All launch cities
                                            </SelectItem>
                                            {cities.map((c) => (
                                                <SelectItem
                                                    key={c.slug}
                                                    value={c.slug}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="owner-prop-category">
                                        Category
                                    </Label>
                                    <Select
                                        value={category || 'all'}
                                        onValueChange={(v) =>
                                            setCategory(v === 'all' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="owner-prop-category"
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All categories
                                            </SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem
                                                    key={cat.slug}
                                                    value={cat.slug}
                                                >
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="owner-prop-verif">
                                        Verification
                                    </Label>
                                    <Select
                                        value={verificationStatus || 'all'}
                                        onValueChange={(v) =>
                                            setVerificationStatus(
                                                v === 'all' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="owner-prop-verif"
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue placeholder="All statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All verification states
                                            </SelectItem>
                                            {verificationStatuses.map((s) => (
                                                <SelectItem
                                                    key={s.value}
                                                    value={s.value}
                                                >
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <Label htmlFor="owner-prop-status">
                                        Operational Status
                                    </Label>
                                    <Select
                                        value={status || 'all'}
                                        onValueChange={(v) =>
                                            setStatus(v === 'all' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="owner-prop-status"
                                            className="w-full min-w-0"
                                        >
                                            <SelectValue placeholder="All states" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All operational states
                                            </SelectItem>
                                            {operationalStatuses.map((s) => (
                                                <SelectItem
                                                    key={s.value}
                                                    value={s.value}
                                                >
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
                                    <Button type="submit">Apply Filters</Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={clearFilters}
                                    >
                                        <X aria-hidden="true" />
                                        <span>Clear</span>
                                    </Button>
                                </div>
                            </form>
                        </search>
                    </CardContent>
                </Card>

                {properties.data.length === 0 ? (
                    <EmptyState
                        icon={Building2}
                        title="No properties found"
                        description="Create your first Hostel/PG, Homestay, or Co-Living listing draft to configure room types, physical rooms, photographs, and verification."
                        action={
                            canCreateProperty ? (
                                <Button asChild>
                                    <Link href={createPropertyRoute()}>
                                        Add Property
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {properties.data.map((property) => {
                                const thumbSrc =
                                    property.cover_media
                                        ?.public_thumbnail_url ??
                                    property.cover_media?.thumbnail_preview_url;

                                return (
                                    <Card
                                        key={property.id}
                                        className="flex min-w-0 flex-col overflow-hidden py-0 transition-all hover:border-tijum-coral/40 hover:shadow-md"
                                    >
                                        <div className="relative aspect-[16/9] w-full bg-tijum-cream dark:bg-muted">
                                            {thumbSrc ? (
                                                <img
                                                    src={thumbSrc}
                                                    alt={
                                                        property.cover_media
                                                            ?.alt_text ??
                                                        property.name
                                                    }
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex size-full flex-col items-center justify-center gap-1 text-tijum-plum-muted dark:text-muted-foreground">
                                                    <Camera
                                                        className="size-6"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="text-xs">
                                                        No cover photo yet
                                                    </span>
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                                <Badge variant="plum">
                                                    {
                                                        property.property_reference
                                                    }
                                                </Badge>
                                                {property.is_amendment_active && (
                                                    <Badge variant="default">
                                                        Amendment Active
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <CardHeader className="pt-4 pb-2">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <CardTitle className="min-w-0 text-lg wrap-break-word">
                                                    {property.name}
                                                </CardTitle>
                                            </div>
                                            <CardDescription className="flex flex-wrap items-center gap-1.5 text-xs">
                                                <span>
                                                    {property.category?.name ??
                                                        'Category'}
                                                </span>
                                                <span aria-hidden="true">
                                                    ·
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin
                                                        className="size-3"
                                                        aria-hidden="true"
                                                    />
                                                    {property.locality},{' '}
                                                    {property.city?.name ?? ''}
                                                </span>
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="flex flex-1 flex-col justify-between gap-4 pb-5">
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <StatusBadge
                                                        status={
                                                            propertyVerificationStatusMap[
                                                                property
                                                                    .verification_status
                                                            ]
                                                        }
                                                        label={
                                                            property.verification_status_label
                                                        }
                                                    />
                                                    <StatusBadge
                                                        status={
                                                            propertyOperationalStatusMap[
                                                                property.status
                                                            ]
                                                        }
                                                        label={
                                                            property.status_label
                                                        }
                                                    />
                                                </div>

                                                <dl className="grid grid-cols-3 gap-2 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-2.5 text-center text-xs tabular-nums dark:border-border dark:bg-muted/45">
                                                    <div>
                                                        <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                            Room Types
                                                        </dt>
                                                        <dd className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                            {
                                                                property.room_types_count
                                                            }
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                            Rooms
                                                        </dt>
                                                        <dd className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                            {
                                                                property.rooms_count
                                                            }
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                            Active Cap.
                                                        </dt>
                                                        <dd className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                            {
                                                                property.nominal_active_capacity
                                                            }
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <div className="flex flex-wrap gap-2 border-t border-tijum-surface pt-3 dark:border-border">
                                                <Button size="sm" asChild>
                                                    <Link
                                                        href={showPropertyRoute(
                                                            property.id,
                                                        )}
                                                    >
                                                        Manage Property
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        href={roomTypesIndexRoute(
                                                            property.id,
                                                        )}
                                                    >
                                                        Room Types
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/owner/properties/${property.id}/pricing`}
                                                    >
                                                        <Utensils
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Food &amp; Pricing</span>
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        href={roomsIndexRoute(
                                                            property.id,
                                                        )}
                                                    >
                                                        <DoorClosed
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Rooms</span>
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        href={mediaIndexRoute(
                                                            property.id,
                                                        )}
                                                    >
                                                        Photos
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="plum"
                                                    asChild
                                                >
                                                    <Link
                                                        href={verificationShowRoute(
                                                            property.id,
                                                        )}
                                                    >
                                                        Verification
                                                    </Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {properties.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {properties.total}
                                </span>{' '}
                                {properties.total === 1
                                    ? 'property'
                                    : 'properties'}
                            </p>
                            <Pagination
                                currentPage={properties.current_page}
                                totalPages={properties.last_page}
                                onPageChange={(page) =>
                                    router.get(
                                        propertiesIndexRoute.url(),
                                        {
                                            search: search || undefined,
                                            status: status || undefined,
                                            verification_status:
                                                verificationStatus || undefined,
                                            city: city || undefined,
                                            category: category || undefined,
                                            page,
                                        },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                            />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

OwnerPropertiesIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
    ],
};
