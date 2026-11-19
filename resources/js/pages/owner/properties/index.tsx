import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Camera,
    DoorClosed,
    FileCheck2,
    Layers,
    MapPin,
    PauseCircle,
    PlayCircle,
    PlusCircle,
    PowerOff,
    RotateCcw,
    Search,
    ShieldCheck,
    Utensils,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
} from '@/components/owner/properties/property-status-helpers';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
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
import { update as operationalStatusRoute } from '@/routes/owner/properties/operational-status';
import { index as roomTypesIndexRoute } from '@/routes/owner/properties/room-types';
import { index as roomsIndexRoute } from '@/routes/owner/properties/rooms';
import { show as verificationShowRoute } from '@/routes/owner/properties/verification';
import type {
    CityOption,
    PropertyCategoryOption,
    PropertyOperationalStatus,
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
        closed?: number;
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
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const statusError = errors?.status;

    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [verificationStatus, setVerificationStatus] = useState(
        filters.verification_status,
    );
    const [city, setCity] = useState(filters.city);
    const [category, setCategory] = useState(filters.category);
    const [pendingStatusChange, setPendingStatusChange] = useState<{
        property: PropertySummaryData;
        target: PropertyOperationalStatus;
    } | null>(null);
    const [statusBusy, setStatusBusy] = useState(false);

    useEffect(() => {
        setSearch(filters.search);
        setStatus(filters.status);
        setVerificationStatus(filters.verification_status);
        setCity(filters.city);
        setCategory(filters.category);
    }, [
        filters.search,
        filters.status,
        filters.verification_status,
        filters.city,
        filters.category,
    ]);

    const handleOperationalStatusConfirm = () => {
        if (!pendingStatusChange) {
            return;
        }

        setStatusBusy(true);
        router.patch(
            operationalStatusRoute.url(pendingStatusChange.property.id),
            {
                status: pendingStatusChange.target,
                redirect_to_index: true,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setStatusBusy(false);
                    setPendingStatusChange(null);
                },
            },
        );
    };

    const applyFilters = (
        overrides: {
            search?: string;
            status?: string;
            verificationStatus?: string;
            city?: string;
            category?: string;
        } = {},
        page = 1,
    ) => {
        const nextSearch = (overrides.search ?? search).trim();
        const nextStatus = overrides.status ?? status;
        const nextVerif = overrides.verificationStatus ?? verificationStatus;
        const nextCity = overrides.city ?? city;
        const nextCategory = overrides.category ?? category;

        router.get(
            propertiesIndexRoute.url(),
            {
                search: nextSearch || undefined,
                status: nextStatus || undefined,
                verification_status: nextVerif || undefined,
                city: nextCity || undefined,
                category: nextCategory || undefined,
                page: page > 1 ? page : undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleFilter = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        applyFilters();
    };

    const clearSearch = () => {
        setSearch('');
        applyFilters({ search: '' });
    };

    const hasActiveFilters = Boolean(
        search.trim() || status || verificationStatus || city || category,
    );

    const clearFilters = () => {
        setSearch('');
        setStatus('');
        setVerificationStatus('');
        setCity('');
        setCategory('');
        router.get(
            propertiesIndexRoute.url(),
            {},
            { preserveState: true, preserveScroll: true },
        );
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

                {statusError && (
                    <Alert variant="destructive">
                        <AlertTriangle aria-hidden="true" />
                        <AlertTitle>Unable to Update Property Status</AlertTitle>
                        <AlertDescription>{statusError}</AlertDescription>
                    </Alert>
                )}

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
                        helperText={
                            stats.closed
                                ? `Live for bookings · ${stats.closed} closed`
                                : 'Live for customer bookings & stays'
                        }
                        icon={Layers}
                    />
                    <StatCard
                        label="Draft Setup"
                        value={String(stats.drafts)}
                        helperText="Awaiting configuration & submit"
                        icon={FileCheck2}
                    />
                </div>

                <section
                    aria-label="Search and filter properties"
                    className="rounded-2xl border border-tijum-surface/85 bg-card p-3 shadow-tijum-card dark:border-border"
                >
                    <search>
                        <form
                            onSubmit={handleFilter}
                            className="flex flex-col gap-2.5 lg:flex-row lg:items-center"
                        >
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="owner-prop-search"
                                    type="text"
                                    value={search}
                                    aria-label="Search properties by name, reference, or locality"
                                    className="h-9 pr-16 pl-9 text-xs"
                                    placeholder="Search name, ref (TJP-...), or locality..."
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        aria-label="Clear search"
                                        className="absolute top-1/2 right-12 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-md bg-tijum-cream px-2 py-1 text-[11px] font-semibold text-tijum-plum transition-colors hover:bg-tijum-coral hover:text-white dark:bg-muted dark:text-foreground dark:hover:bg-tijum-coral"
                                >
                                    Find
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                                <Select
                                    value={city || 'all'}
                                    onValueChange={(v) => {
                                        const nextCity = v === 'all' ? '' : v;
                                        setCity(nextCity);
                                        applyFilters({ city: nextCity });
                                    }}
                                >
                                    <SelectTrigger
                                        id="owner-prop-city"
                                        aria-label="Filter by city"
                                        className="h-9 w-full text-xs sm:w-[140px]"
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

                                <Select
                                    value={category || 'all'}
                                    onValueChange={(v) => {
                                        const nextCategory =
                                            v === 'all' ? '' : v;
                                        setCategory(nextCategory);
                                        applyFilters({
                                            category: nextCategory,
                                        });
                                    }}
                                >
                                    <SelectTrigger
                                        id="owner-prop-category"
                                        aria-label="Filter by category"
                                        className="h-9 w-full text-xs sm:w-[145px]"
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

                                <Select
                                    value={verificationStatus || 'all'}
                                    onValueChange={(v) => {
                                        const nextVerif = v === 'all' ? '' : v;
                                        setVerificationStatus(nextVerif);
                                        applyFilters({
                                            verificationStatus: nextVerif,
                                        });
                                    }}
                                >
                                    <SelectTrigger
                                        id="owner-prop-verif"
                                        aria-label="Filter by verification status"
                                        className="h-9 w-full text-xs sm:w-[165px]"
                                    >
                                        <SelectValue placeholder="All verification" />
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

                                <Select
                                    value={status || 'all'}
                                    onValueChange={(v) => {
                                        const nextStatus = v === 'all' ? '' : v;
                                        setStatus(nextStatus);
                                        applyFilters({ status: nextStatus });
                                    }}
                                >
                                    <SelectTrigger
                                        id="owner-prop-status"
                                        aria-label="Filter by operational status"
                                        className="h-9 w-full text-xs sm:w-[165px]"
                                    >
                                        <SelectValue placeholder="All operational" />
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

                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-9 shrink-0 px-2.5 text-xs text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                    >
                                        <RotateCcw
                                            className="mr-1 size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Reset</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </search>
                </section>

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
                                                {property.can_toggle_operational_status &&
                                                    property.status ===
                                                        'active' && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setPendingStatusChange(
                                                                    {
                                                                        property,
                                                                        target: 'temporarily_closed',
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <PauseCircle
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                            <span>Pause</span>
                                                        </Button>
                                                    )}
                                                {property.can_toggle_operational_status &&
                                                    (property.status ===
                                                        'temporarily_closed' ||
                                                        property.status ===
                                                            'archived') && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="plum"
                                                            onClick={() =>
                                                                setPendingStatusChange(
                                                                    {
                                                                        property,
                                                                        target: 'active',
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <PlayCircle
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Reopen Active
                                                            </span>
                                                        </Button>
                                                    )}
                                                {property.can_close_completely && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setPendingStatusChange(
                                                                {
                                                                    property,
                                                                    target: 'archived',
                                                                },
                                                            )
                                                        }
                                                        className="border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white"
                                                        data-test={`close-property-${property.id}`}
                                                    >
                                                        <PowerOff
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Close Property
                                                        </span>
                                                    </Button>
                                                )}
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

                <ConfirmationDialog
                    open={pendingStatusChange !== null}
                    onOpenChange={(open) =>
                        !open && setPendingStatusChange(null)
                    }
                    tone={
                        pendingStatusChange?.target === 'archived'
                            ? 'destructive'
                            : 'default'
                    }
                    title={
                        pendingStatusChange?.target === 'archived'
                            ? `Close "${pendingStatusChange.property.name}" Completely?`
                            : pendingStatusChange?.target ===
                                'temporarily_closed'
                              ? `Temporarily Pause "${pendingStatusChange.property.name}"?`
                              : `Reopen "${pendingStatusChange?.property.name ?? ''}" as Active?`
                    }
                    description={
                        pendingStatusChange?.target === 'archived'
                            ? 'Closing this property completely removes it from public listings, unpublishes public photos, and blocks new reservations. Historical bookings and payouts remain intact. Blocked automatically if current or upcoming reservations exist.'
                            : pendingStatusChange?.target ===
                                'temporarily_closed'
                              ? 'Pausing operational availability preserves your verification approval and can be reopened anytime.'
                              : 'Restoring Active status re-enables public visibility and booking readiness for this verified property.'
                    }
                    confirmLabel={
                        pendingStatusChange?.target === 'archived'
                            ? 'Close Property Completely'
                            : pendingStatusChange?.target ===
                                'temporarily_closed'
                              ? 'Temporarily Close'
                              : 'Mark Active'
                    }
                    loading={statusBusy}
                    onConfirm={handleOperationalStatusConfirm}
                />
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
