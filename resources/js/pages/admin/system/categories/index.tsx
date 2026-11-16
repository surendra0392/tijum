import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Layers,
    Lock,
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
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes/admin';
import { index as adminsIndex } from '@/routes/admin/system/admins';
import {
    destroy as categoriesDestroy,
    index as categoriesIndex,
    store as categoriesStore,
    toggleStatus,
    update as categoriesUpdate,
} from '@/routes/admin/system/categories';

interface CategoryItem {
    id: number;
    name: string;
    slug: string;
    code: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    properties_count: number;
    is_canonical: boolean;
    created_at: string;
}

interface PaginatedCategories {
    data: CategoryItem[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

interface Props {
    categories: PaginatedCategories;
    filters: {
        search: string;
        status: string;
    };
}

export default function AdminCategoriesIndex({ categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

    // Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const createForm = useForm({
        name: '',
        slug: '',
        code: '',
        description: '',
        sort_order: 0,
        is_active: true,
    });

    // Edit Modal
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(
        null,
    );
    const editForm = useForm({
        name: '',
        slug: '',
        code: '',
        description: '',
        sort_order: 0,
        is_active: true,
    });

    // Delete Confirmation
    const [deletingCategory, setDeletingCategory] =
        useState<CategoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const activeOnPage = categories.data.filter((c) => c.is_active).length;
    const canonicalOnPage = categories.data.filter(
        (c) => c.is_canonical,
    ).length;
    const propertiesOnPage = categories.data.reduce(
        (sum, c) => sum + c.properties_count,
        0,
    );

    const handleFilter = (e?: FormEvent) => {
        e?.preventDefault();
        router.get(
            categoriesIndex.url(),
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
            categoriesIndex.url(),
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
        const slugified = val
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const coded = val
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/(^_|_$)/g, '');

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
                    ? slugified
                    : data.slug,
            code:
                data.code === '' ||
                data.code ===
                    data.name
                        .toUpperCase()
                        .replace(/[^A-Z0-9]+/g, '_')
                        .replace(/(^_|_$)/g, '')
                    ? coded
                    : data.code,
        }));
    };

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post(categoriesStore.url(), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const openEditDialog = (category: CategoryItem) => {
        setEditingCategory(category);
        editForm.setData({
            name: category.name,
            slug: category.slug,
            code: category.code,
            description: category.description || '',
            sort_order: category.sort_order,
            is_active: category.is_active,
        });
        editForm.clearErrors();
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;

        editForm.put(categoriesUpdate.url(editingCategory.id), {
            onSuccess: () => {
                setEditingCategory(null);
                editForm.reset();
            },
        });
    };

    const handleToggleStatus = (category: CategoryItem) => {
        router.post(
            toggleStatus.url(category.id),
            {},
            { preserveScroll: true },
        );
    };

    const handleConfirmDelete = () => {
        if (!deletingCategory) return;
        setIsDeleting(true);
        router.delete(categoriesDestroy.url(deletingCategory.id), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeletingCategory(null);
            },
        });
    };

    const columns: DataTableColumn<CategoryItem>[] = [
        {
            key: 'name',
            header: 'Category',
            isRowHeader: true,
            render: (category) => (
                <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                            {category.name}
                        </span>
                        {category.is_canonical && (
                            <Badge variant="default" className="text-[10px]">
                                Core Category
                            </Badge>
                        )}
                    </div>
                    {category.description && (
                        <span className="line-clamp-1 text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                            {category.description}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'identifiers',
            header: 'Code / Slug',
            render: (category) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs font-medium text-tijum-plum dark:text-foreground">
                        {category.code}
                    </span>
                    <span className="font-mono text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                        /{category.slug}
                    </span>
                </div>
            ),
        },
        {
            key: 'properties',
            header: 'Properties',
            render: (category) => (
                <div className="flex items-center gap-1.5">
                    <Building2
                        className="size-3.5 text-tijum-plum-muted dark:text-muted-foreground"
                        aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                        {category.properties_count}
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
            render: (category) => (
                <span className="font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                    {category.sort_order}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Active',
            render: (category) => (
                <div className="flex items-center gap-2.5">
                    <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleStatus(category)}
                        aria-label={`Toggle active status for ${category.name}`}
                    />
                    <span
                        className={`text-xs font-semibold ${
                            category.is_active
                                ? 'text-status-success-fg'
                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                        }`}
                    >
                        {category.is_active ? 'Active' : 'Disabled'}
                    </span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (category) => {
                const cannotDelete =
                    category.is_canonical || category.properties_count > 0;
                const deleteTitle = category.is_canonical
                    ? 'Canonical platform category cannot be deleted'
                    : category.properties_count > 0
                      ? 'Cannot delete category with associated properties'
                      : 'Delete category';

                return (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => openEditDialog(category)}
                        >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            <span>Edit</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={cannotDelete}
                            title={deleteTitle}
                            aria-label={`Delete ${category.name}`}
                            className="h-8 gap-1.5 border-status-error-border text-xs text-status-error-fg hover:bg-status-error-bg/70 disabled:opacity-40"
                            onClick={() => setDeletingCategory(category)}
                        >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const hasActiveFilters = Boolean(search) || statusFilter !== 'all';

    return (
        <>
            <Head title="Categories — System Management — TIJUM" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="System Management"
                    title="Stay Categories"
                    description="Manage accommodation verticals (Hostels/PG, Homestays, Co-Living) and custom stay types."
                    actions={
                        <Button
                            type="button"
                            variant="plum"
                            size="sm"
                            onClick={openCreateDialog}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Add Category</span>
                        </Button>
                    }
                />

                {/* Summary KPIs */}
                <section
                    aria-label="Stay categories overview metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Total Categories"
                        value={categories.total}
                        helperText="Configured stay verticals"
                        icon={Layers}
                    />
                    <StatCard
                        label="Active (This Page)"
                        value={`${activeOnPage} / ${categories.data.length}`}
                        helperText="Available for onboarding"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Core Categories (Page)"
                        value={canonicalOnPage}
                        helperText="Protected canonical tiers"
                        icon={Lock}
                    />
                    <StatCard
                        label="Properties (This Page)"
                        value={propertiesOnPage}
                        helperText="Listings in current view"
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
                                    placeholder="Search by category name, code, or slug..."
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
                                            Active
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Disabled
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
                    caption="Property Categories"
                    title="Stay Categories Directory"
                    description="Core accommodation verticals and custom stay classifications."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {categories.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={categories.data}
                    getRowKey={(cat) => cat.id}
                    emptyTitle="No categories found"
                    emptyDescription="Create your first property category or adjust your search filters."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {categories.data.length} of{' '}
                                {categories.total} categor(y/ies)
                            </p>

                            <Pagination
                                currentPage={categories.current_page}
                                totalPages={categories.last_page}
                                getPageHref={(p) =>
                                    categoriesIndex.url({
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

            {/* Create Category Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                            Configure a new category for classification, search
                            filtering, and partner onboarding.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleCreateSubmit}
                        className="space-y-4 py-1"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="cat-name"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Category Name
                            </Label>
                            <Input
                                id="cat-name"
                                required
                                value={createForm.data.name}
                                onChange={(e) =>
                                    handleCreateNameChange(e.target.value)
                                }
                                placeholder="e.g. Service Apartments"
                                className="h-10.5"
                            />
                            <InputError
                                message={createForm.errors.name}
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="cat-slug"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    URL Slug
                                </Label>
                                <Input
                                    id="cat-slug"
                                    required
                                    value={createForm.data.slug}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'slug',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. service-apartments"
                                    className="h-10.5 font-mono text-sm"
                                />
                                <InputError
                                    message={createForm.errors.slug}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="cat-code"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    System Code
                                </Label>
                                <Input
                                    id="cat-code"
                                    required
                                    value={createForm.data.code}
                                    onChange={(e) =>
                                        createForm.setData(
                                            'code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    placeholder="e.g. SERVICE_APTS"
                                    className="h-10.5 font-mono text-sm uppercase"
                                />
                                <InputError
                                    message={createForm.errors.code}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="cat-description"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Description
                            </Label>
                            <Textarea
                                id="cat-description"
                                value={createForm.data.description}
                                onChange={(e) =>
                                    createForm.setData(
                                        'description',
                                        e.target.value,
                                    )
                                }
                                placeholder="Brief summary of what this category offers..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="cat-sort"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Sort Order
                                </Label>
                                <Input
                                    id="cat-sort"
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

                            <div className="flex h-10.5 items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 dark:border-border dark:bg-muted/45">
                                <Label
                                    htmlFor="cat-active"
                                    className="text-xs font-medium text-tijum-plum dark:text-foreground"
                                >
                                    Active
                                </Label>
                                <Switch
                                    id="cat-active"
                                    checked={createForm.data.is_active}
                                    onCheckedChange={(val) =>
                                        createForm.setData('is_active', val)
                                    }
                                />
                            </div>
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
                                    : 'Create Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog
                open={Boolean(editingCategory)}
                onOpenChange={(open) => !open && setEditingCategory(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>
                            Update category details, description, and status.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleEditSubmit}
                        className="space-y-4 py-1"
                    >
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-cat-name"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Category Name
                            </Label>
                            <Input
                                id="edit-cat-name"
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

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-cat-slug"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    URL Slug
                                </Label>
                                <Input
                                    id="edit-cat-slug"
                                    required
                                    disabled={editingCategory?.is_canonical}
                                    value={editForm.data.slug}
                                    onChange={(e) =>
                                        editForm.setData('slug', e.target.value)
                                    }
                                    className="h-10.5 font-mono text-sm"
                                />
                                {editingCategory?.is_canonical && (
                                    <p className="flex items-center gap-1 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        <Lock
                                            className="size-3 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Slug is locked for canonical
                                            category
                                        </span>
                                    </p>
                                )}
                                <InputError
                                    message={editForm.errors.slug}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-cat-code"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    System Code
                                </Label>
                                <Input
                                    id="edit-cat-code"
                                    required
                                    disabled={editingCategory?.is_canonical}
                                    value={editForm.data.code}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="h-10.5 font-mono text-sm uppercase"
                                />
                                <InputError
                                    message={editForm.errors.code}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-cat-description"
                                className="text-tijum-plum dark:text-foreground"
                            >
                                Description
                            </Label>
                            <Textarea
                                id="edit-cat-description"
                                value={editForm.data.description}
                                onChange={(e) =>
                                    editForm.setData(
                                        'description',
                                        e.target.value,
                                    )
                                }
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit-cat-sort"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Sort Order
                                </Label>
                                <Input
                                    id="edit-cat-sort"
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

                            <div className="flex h-10.5 items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 dark:border-border dark:bg-muted/45">
                                <Label
                                    htmlFor="edit-cat-active"
                                    className="text-xs font-medium text-tijum-plum dark:text-foreground"
                                >
                                    Active
                                </Label>
                                <Switch
                                    id="edit-cat-active"
                                    checked={editForm.data.is_active}
                                    onCheckedChange={(val) =>
                                        editForm.setData('is_active', val)
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingCategory(null)}
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

            {/* Delete Category Confirmation */}
            <ConfirmationDialog
                isOpen={Boolean(deletingCategory)}
                onOpenChange={(open) => !open && setDeletingCategory(null)}
                title="Delete Category?"
                description={`Are you sure you want to delete ${deletingCategory?.name}? This action cannot be undone.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete Category'}
                cancelLabel="Cancel"
                variant="destructive"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingCategory(null)}
            />
        </>
    );
}

AdminCategoriesIndex.layout = {
    breadcrumbs: [
        { title: 'Admin Console', href: dashboard() },
        { title: 'System Management', href: adminsIndex() },
        { title: 'Stay Categories', href: categoriesIndex() },
    ],
};
