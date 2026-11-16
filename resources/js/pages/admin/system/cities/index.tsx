import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Eye,
    MapPin,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Switch } from '@/components/ui/switch';
import { dashboard } from '@/routes/admin';
import { index as adminsIndex } from '@/routes/admin/system/admins';
import {
    destroy as citiesDestroy,
    index as citiesIndex,
    store as citiesStore,
    toggleStatus,
    update as citiesUpdate,
} from '@/routes/admin/system/cities';

interface CityItem {
    id: number;
    name: string;
    slug: string;
    state: string;
    state_code: string | null;
    country_code: string;
    is_active: boolean;
    sort_order: number;
    properties_count: number;
    created_at: string;
}

interface PaginatedCities {
    data: CityItem[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface Props {
    cities: PaginatedCities;
    filters: {
        search: string;
        status: string;
    };
}

export default function AdminCitiesIndex({ cities, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const createForm = useForm({
        name: '',
        slug: '',
        state: '',
        state_code: '',
        country_code: 'IN',
        sort_order: 0,
        is_active: true,
    });

    // Edit Modal
    const [editingCity, setEditingCity] = useState<CityItem | null>(null);
    const editForm = useForm({
        name: '',
        slug: '',
        state: '',
        state_code: '',
        country_code: 'IN',
        sort_order: 0,
        is_active: true,
    });

    // Delete Confirmation
    const [deletingCity, setDeletingCity] = useState<CityItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const publishedOnPage = cities.data.filter((c) => c.is_active).length;
    const hiddenOnPage = cities.data.length - publishedOnPage;
    const propertiesOnPage = cities.data.reduce(
        (sum, c) => sum + c.properties_count,
        0,
    );

    const handleFilter = (e?: FormEvent) => {
        e?.preventDefault();
        router.get(
            citiesIndex.url(),
            {
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        router.get(
            citiesIndex.url(),
            {},
            { preserveState: true, replace: true },
        );
    };

    const openCreateDialog = () => {
        createForm.reset();
        createForm.clearErrors();
        setIsCreateOpen(true);
    };

    const handleCreateNameChange = (val: string) => {
        createForm.setData((data) => ({
            ...data,
            name: val,
            slug:
                data.slug === '' ||
                data.slug ===
                    data.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '')
                    ? val
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '')
                    : data.slug,
        }));
    };

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(citiesStore.url(), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEditDialog = (city: CityItem) => {
        setEditingCity(city);
        editForm.setData({
            name: city.name,
            slug: city.slug,
            state: city.state,
            state_code: city.state_code || '',
            country_code: city.country_code,
            sort_order: city.sort_order,
            is_active: city.is_active,
        });
        editForm.clearErrors();
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingCity) return;

        editForm.put(citiesUpdate.url(editingCity.id), {
            onSuccess: () => {
                setEditingCity(null);
                editForm.reset();
            },
        });
    };

    const handleToggleStatus = (city: CityItem) => {
        router.post(toggleStatus.url(city.id), {}, { preserveScroll: true });
    };

    const handleConfirmDelete = () => {
        if (!deletingCity) return;
        setIsDeleting(true);
        router.delete(citiesDestroy.url(deletingCity.id), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeletingCity(null);
            },
        });
    };

    const columns: DataTableColumn<CityItem>[] = [
        {
            key: 'name',
            header: 'City Name',
            isRowHeader: true,
            render: (city) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {city.name}
                    </span>
                    <span className="font-mono text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                        /{city.slug}
                    </span>
                </div>
            ),
        },
        {
            key: 'state',
            header: 'State / Region',
            render: (city) => (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-tijum-plum dark:text-foreground">
                    <span>{city.state}</span>
                    {city.state_code && (
                        <Badge
                            variant="secondary"
                            className="px-1.5 py-0 font-mono text-[10px] uppercase"
                        >
                            {city.state_code}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'properties',
            header: 'Properties',
            render: (city) => (
                <div className="flex items-center gap-1.5">
                    <Building2
                        className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                        aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                        {city.properties_count}
                    </span>
                    <span className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                        listed
                    </span>
                </div>
            ),
        },
        {
            key: 'sort_order',
            header: 'Display Order',
            render: (city) => (
                <span className="font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                    {city.sort_order}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Active',
            render: (city) => (
                <div className="flex items-center gap-2.5">
                    <Switch
                        checked={city.is_active}
                        onCheckedChange={() => handleToggleStatus(city)}
                        aria-label={`Toggle active status for ${city.name}`}
                    />
                    <span
                        className={`text-xs font-semibold ${
                            city.is_active
                                ? 'text-status-success-fg'
                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                        }`}
                    >
                        {city.is_active ? 'Published' : 'Hidden'}
                    </span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (city) => (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openEditDialog(city)}
                    >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        <span>Edit</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={city.properties_count > 0}
                        title={
                            city.properties_count > 0
                                ? 'Cannot delete city with existing properties'
                                : 'Delete city'
                        }
                        aria-label={`Delete ${city.name}`}
                        className="h-8 gap-1.5 border-status-error-border text-xs text-status-error-fg hover:bg-status-error-bg/70 disabled:opacity-40"
                        onClick={() => setDeletingCity(city)}
                    >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                </div>
            ),
        },
    ];

    const hasActiveFilters = Boolean(search) || statusFilter !== 'all';

    return (
        <>
            <Head title="Cities — System Management — TIJUM" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="System Management"
                    title="Cities & Locations"
                    description="Configure supported operating regions, manage regional visibility, and monitor inventory density."
                    actions={
                        <Button
                            type="button"
                            variant="plum"
                            size="sm"
                            onClick={openCreateDialog}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Add City</span>
                        </Button>
                    }
                />

                {/* Summary KPIs */}
                <section
                    aria-label="Cities overview metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Total Cities"
                        value={cities.total}
                        helperText="Configured operating regions"
                        icon={MapPin}
                    />
                    <StatCard
                        label="Published (This Page)"
                        value={`${publishedOnPage} / ${cities.data.length}`}
                        helperText="Visible in customer search"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Hidden (This Page)"
                        value={`${hiddenOnPage} / ${cities.data.length}`}
                        helperText="Paused or draft locations"
                        icon={Eye}
                    />
                    <StatCard
                        label="Properties (This Page)"
                        value={propertiesOnPage}
                        helperText="Active listings in view"
                        icon={Building2}
                    />
                </section>

                {/* Filters */}
                <Card className="py-4">
                    <CardContent className="px-5">
                        <form
                            onSubmit={handleFilter}
                            className="flex flex-wrap items-center gap-3"
                        >
                            <div className="relative min-w-[220px] flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by city name, state, or slug..."
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[160px]">
                                <Select
                                    value={statusFilter}
                                    onValueChange={setStatusFilter}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Status
                                        </SelectItem>
                                        <SelectItem value="active">
                                            Published
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Hidden
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="submit" variant="plum" size="sm">
                                    Filter
                                </Button>
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearFilters}
                                    >
                                        <X
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Clear</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <DataTable
                    caption="Operating Cities"
                    title="Operating Cities & Regions"
                    description="Supported marketplace cities, regional state codes, and listing counts."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {cities.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={cities.data}
                    getRowKey={(city) => city.id}
                    emptyTitle="No cities found"
                    emptyDescription="Create your first city or adjust your search filters."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {cities.data.length} of {cities.total}{' '}
                                cit(y/ies)
                            </p>

                            <Pagination
                                currentPage={cities.current_page}
                                totalPages={cities.last_page}
                                getPageHref={(p) =>
                                    citiesIndex.url({
                                        query: {
                                            page: p,
                                            search: search || undefined,
                                            status:
                                                statusFilter !== 'all'
                                                    ? statusFilter
                                                    : undefined,
                                        },
                                    })
                                }
                            />
                        </div>
                    }
                />
            </div>

            {/* Create City Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New City</DialogTitle>
                        <DialogDescription>
                            Define a new operating location for TIJUM property
                            listings.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateSubmit}
                        className="space-y-4 py-1"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="city-name"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                City Name
                            </Label>
                            <Input
                                id="city-name"
                                required
                                value={createForm.data.name}
                                onChange={(e) =>
                                    handleCreateNameChange(e.target.value)
                                }
                                placeholder="e.g. Hyderabad"
                                className="h-10.5"
                            />
                            <InputError
                                message={createForm.errors.name}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="city-slug"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                URL Slug
                            </Label>
                            <Input
                                id="city-slug"
                                required
                                value={createForm.data.slug}
                                onChange={(e) =>
                                    createForm.setData('slug', e.target.value)
                                }
                                placeholder="e.g. hyderabad"
                                className="h-10.5 font-mono text-sm"
                            />
                            <InputError
                                message={createForm.errors.slug}
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="city-state"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    State
                                </Label>
                                <Input
                                    id="city-state"
                                    required
                                    value={createForm.data.state}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'state',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. Telangana"
                                    className="h-10.5"
                                />
                                <InputError
                                    message={createForm.errors.state}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="city-state-code"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    State Code
                                </Label>
                                <Input
                                    id="city-state-code"
                                    value={createForm.data.state_code}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'state_code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    placeholder="e.g. TS"
                                    maxLength={5}
                                    className="h-10.5 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="city-sort"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Sort Order
                                </Label>
                                <Input
                                    id="city-sort"
                                    type="number"
                                    value={createForm.data.sort_order}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'sort_order',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    className="h-10.5 tabular-nums"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="city-country"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Country Code
                                </Label>
                                <Input
                                    id="city-country"
                                    value={createForm.data.country_code}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'country_code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    maxLength={2}
                                    className="h-10.5 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                            <div className="space-y-0.5">
                                <Label
                                    htmlFor="city-active"
                                    className="text-sm font-medium text-tijum-plum dark:text-foreground"
                                >
                                    Published
                                </Label>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Visible in customer search and filters
                                </p>
                            </div>
                            <Switch
                                id="city-active"
                                checked={createForm.data.is_active}
                                onCheckedChange={(val) =>
                                    createForm.setData('is_active', val)
                                }
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                loading={createForm.processing}
                            >
                                {createForm.processing
                                    ? 'Creating...'
                                    : 'Create City'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit City Dialog */}
            <Dialog
                open={Boolean(editingCity)}
                onOpenChange={(open) => !open && setEditingCity(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit City</DialogTitle>
                        <DialogDescription>
                            Update location details and search presentation.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleEditSubmit}
                        className="space-y-4 py-1"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-city-name"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                City Name
                            </Label>
                            <Input
                                id="edit-city-name"
                                required
                                value={editForm.data.name}
                                onChange={(e) =>
                                    editForm.setData('name', e.target.value)
                                }
                                className="h-10.5"
                            />
                            <InputError
                                message={editForm.errors.name}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-city-slug"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                URL Slug
                            </Label>
                            <Input
                                id="edit-city-slug"
                                required
                                value={editForm.data.slug}
                                onChange={(e) =>
                                    editForm.setData('slug', e.target.value)
                                }
                                className="h-10.5 font-mono text-sm"
                            />
                            <InputError
                                message={editForm.errors.slug}
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-city-state"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    State
                                </Label>
                                <Input
                                    id="edit-city-state"
                                    required
                                    value={editForm.data.state}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'state',
                                            e.target.value,
                                        )
                                    }
                                    className="h-10.5"
                                />
                                <InputError
                                    message={editForm.errors.state}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-city-state-code"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    State Code
                                </Label>
                                <Input
                                    id="edit-city-state-code"
                                    value={editForm.data.state_code}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'state_code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    maxLength={5}
                                    className="h-10.5 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-city-sort"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Sort Order
                                </Label>
                                <Input
                                    id="edit-city-sort"
                                    type="number"
                                    value={editForm.data.sort_order}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'sort_order',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    className="h-10.5 tabular-nums"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-city-country"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Country Code
                                </Label>
                                <Input
                                    id="edit-city-country"
                                    value={editForm.data.country_code}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'country_code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    maxLength={2}
                                    className="h-10.5 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                            <div className="space-y-0.5">
                                <Label
                                    htmlFor="edit-city-active"
                                    className="text-sm font-medium text-tijum-plum dark:text-foreground"
                                >
                                    Published
                                </Label>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Visible in customer search and filters
                                </p>
                            </div>
                            <Switch
                                id="edit-city-active"
                                checked={editForm.data.is_active}
                                onCheckedChange={(val) =>
                                    editForm.setData('is_active', val)
                                }
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingCity(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="plum"
                                loading={editForm.processing}
                            >
                                {editForm.processing
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete City Confirmation */}
            <ConfirmationDialog
                isOpen={Boolean(deletingCity)}
                onOpenChange={(open) => !open && setDeletingCity(null)}
                title="Delete City?"
                description={`Are you sure you want to delete ${deletingCity?.name}? This action cannot be undone.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete City'}
                cancelLabel="Cancel"
                variant="destructive"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingCity(null)}
            />
        </>
    );
}

AdminCitiesIndex.layout = {
    breadcrumbs: [
        { title: 'Admin Console', href: dashboard() },
        { title: 'System Management', href: adminsIndex() },
        { title: 'Cities', href: citiesIndex() },
    ],
};
