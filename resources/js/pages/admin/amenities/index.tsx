import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Filter,
    FolderTree,
    Inbox,
    ListChecks,
    Pencil,
    Plus,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatIsoDateTime } from '@/components/owner/onboarding/status-helpers';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import amenitiesRoutes from '@/routes/admin/amenities';
import type {
    AdminAmenityQueueRow,
    AmenityApplicabilityScope,
    AmenityCatalogueItem,
    AmenityCategoryOption,
    AmenityVerificationStatus,
} from '@/types';

type Props = {
    assignments: AdminAmenityQueueRow[];
    stats: {
        awaiting_review: number;
        needs_information: number;
        approved: number;
        rejected: number;
    };
    categories: AmenityCategoryOption[];
    amenities: AmenityCatalogueItem[];
    filters: { status: string; scope: string };
    statuses: { value: AmenityVerificationStatus; label: string }[];
    scopes: { value: AmenityApplicabilityScope; label: string }[];
    canManageCatalogue: boolean;
};

function statusToSemantic(status: string): SemanticStatus {
    if (status === 'approved') return 'verified';
    if (status === 'submitted' || status === 'under_review')
        return 'processing';
    if (status === 'needs_information') return 'pending';
    if (status === 'rejected') return 'rejected';
    if (status === 'inactive') return 'cancelled';
    return 'neutral';
}

export default function AdminAmenitiesIndex({
    assignments,
    stats,
    categories,
    amenities,
    filters,
    statuses,
    scopes,
    canManageCatalogue,
}: Props) {
    const [status, setStatus] = useState(filters.status);
    const [scope, setScope] = useState(filters.scope);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
        null,
    );
    const [editingAmenityId, setEditingAmenityId] = useState<number | null>(
        null,
    );

    const apply = (e?: FormEvent) => {
        e?.preventDefault();
        const query = Object.fromEntries(
            Object.entries({ status, scope }).filter(
                ([, v]) => v !== '' && v !== 'all',
            ),
        );
        router.get(
            amenitiesRoutes.index.url({ query }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const clear = () => {
        setStatus('');
        setScope('');
        router.get(amenitiesRoutes.index.url());
    };

    const categoryForm = useForm({
        code: '',
        name: '',
        slug: '',
        description: '',
        display_order: '0',
        is_active: true as boolean,
    });
    const amenityForm = useForm({
        amenity_category_id: '',
        code: '',
        name: '',
        slug: '',
        description: '',
        applicability_scope: 'both' as AmenityApplicabilityScope,
        icon_key: '',
        is_customer_visible: true as boolean,
        requires_review: true as boolean,
        display_order: '0',
        is_active: true as boolean,
    });

    const submitCategory = (e: FormEvent) => {
        e.preventDefault();
        if (editingCategoryId) {
            categoryForm.patch(
                amenitiesRoutes.categories.update.url(editingCategoryId),
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setEditingCategoryId(null);
                        categoryForm.reset();
                    },
                },
            );
            return;
        }
        categoryForm.post(amenitiesRoutes.categories.store.url(), {
            preserveScroll: true,
            onSuccess: () => categoryForm.reset(),
        });
    };

    const editCategory = (c: AmenityCategoryOption) => {
        setEditingCategoryId(c.id);
        categoryForm.setData({
            code: c.code,
            name: c.name,
            slug: c.slug,
            description: c.description ?? '',
            display_order: String(c.display_order ?? 0),
            is_active: c.is_active ?? true,
        });
    };

    const submitAmenity = (e: FormEvent) => {
        e.preventDefault();
        if (editingAmenityId) {
            amenityForm.patch(
                amenitiesRoutes.items.update.url(editingAmenityId),
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setEditingAmenityId(null);
                        amenityForm.reset();
                    },
                },
            );
            return;
        }
        amenityForm.post(amenitiesRoutes.items.store.url(), {
            preserveScroll: true,
            onSuccess: () => amenityForm.reset(),
        });
    };

    const editAmenity = (a: AmenityCatalogueItem) => {
        setEditingAmenityId(a.id);
        amenityForm.setData({
            amenity_category_id: String(a.amenity_category_id),
            code: a.code,
            name: a.name,
            slug: a.slug,
            description: a.description ?? '',
            applicability_scope: a.applicability_scope,
            icon_key: a.icon_key ?? '',
            is_customer_visible: a.is_customer_visible,
            requires_review: a.requires_review,
            display_order: String(a.display_order ?? 0),
            is_active: a.is_active,
        });
    };

    const columns: DataTableColumn<AdminAmenityQueueRow>[] = [
        {
            key: 'amenity',
            header: 'Amenity Assignment',
            isRowHeader: true,
            render: (row) => (
                <div className="space-y-1">
                    <Link
                        href={
                            row.scope === 'property'
                                ? amenitiesRoutes.property.show.url(row.id)
                                : amenitiesRoutes.roomType.show.url(row.id)
                        }
                        className="font-heading font-semibold text-tijum-plum underline-offset-4 transition-colors hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                    >
                        {row.amenity_name ?? 'Amenity'}
                    </Link>
                    <p className="text-xs font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {row.assignment_reference} ·{' '}
                        {row.scope === 'property'
                            ? 'Property'
                            : `Room type: ${row.room_type_name ?? row.property_room_type_id}`}
                    </p>
                </div>
            ),
        },
        {
            key: 'property',
            header: 'Property & Partner',
            render: (row) => (
                <div className="space-y-0.5 text-xs">
                    <p className="font-medium text-tijum-plum dark:text-foreground">
                        {row.property_name}
                    </p>
                    <p className="text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {row.property_reference} · {row.city_name}
                    </p>
                    <p className="text-tijum-plum-muted dark:text-muted-foreground">
                        {row.owner_name} · {row.owner_email}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Verification',
            render: (row) => (
                <div className="flex flex-wrap gap-2">
                    <StatusBadge
                        status={statusToSemantic(row.status)}
                        label={row.status_label}
                    />
                    <Badge variant="outline">{row.availability_label}</Badge>
                </div>
            ),
        },
        {
            key: 'review',
            header: 'Reviewer / Submitted',
            render: (row) => (
                <div className="space-y-0.5 text-xs">
                    <p className="font-medium text-tijum-plum dark:text-foreground">
                        {row.assigned_reviewer_name ?? 'Unassigned'}
                    </p>
                    <p className="text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {formatIsoDateTime(row.submitted_at)}
                    </p>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <Button variant="outline" size="sm" asChild>
                    <Link
                        href={
                            row.scope === 'property'
                                ? amenitiesRoutes.property.show.url(row.id)
                                : amenitiesRoutes.roomType.show.url(row.id)
                        }
                    >
                        Review
                    </Link>
                </Button>
            ),
        },
    ];

    const categoryColumns: DataTableColumn<AmenityCategoryOption>[] = [
        {
            key: 'name',
            header: 'Category',
            isRowHeader: true,
            render: (c) => (
                <div className="space-y-0.5">
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {c.name}
                    </p>
                    <p className="text-xs font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {c.code} · {c.slug}
                    </p>
                </div>
            ),
        },
        {
            key: 'count',
            header: 'Amenities',
            render: (c) => (
                <span className="text-xs font-medium text-tijum-plum tabular-nums dark:text-foreground">
                    {c.amenities_count ?? 0} items
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (c) => (
                <StatusBadge
                    status={c.is_active ? 'active' : 'cancelled'}
                    label={c.is_active ? 'Active' : 'Inactive'}
                />
            ),
        },
        ...(canManageCatalogue
            ? [
                  {
                      key: 'actions',
                      header: 'Actions',
                      align: 'right' as const,
                      render: (c: AmenityCategoryOption) => (
                          <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => editCategory(c)}
                          >
                              <Pencil aria-hidden="true" />
                              <span>Edit</span>
                          </Button>
                      ),
                  },
              ]
            : []),
    ];

    const amenityColumns: DataTableColumn<AmenityCatalogueItem>[] = [
        {
            key: 'name',
            header: 'Amenity',
            isRowHeader: true,
            render: (a) => (
                <div className="space-y-0.5">
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {a.name}
                    </p>
                    <p className="text-xs font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {a.code} · {a.category?.name ?? '—'}
                    </p>
                </div>
            ),
        },
        {
            key: 'scope',
            header: 'Scope & Visibility',
            render: (a) => (
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                        {a.applicability_scope_label}
                    </Badge>
                    {a.is_customer_visible && (
                        <Badge variant="secondary">Visible</Badge>
                    )}
                    {a.requires_review && (
                        <Badge variant="peach">Reviewed</Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (a) => (
                <StatusBadge
                    status={a.is_active ? 'active' : 'cancelled'}
                    label={a.is_active ? 'Active' : 'Inactive'}
                />
            ),
        },
        ...(canManageCatalogue
            ? [
                  {
                      key: 'actions',
                      header: 'Actions',
                      align: 'right' as const,
                      render: (a: AmenityCatalogueItem) => (
                          <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => editAmenity(a)}
                          >
                              <Pencil aria-hidden="true" />
                              <span>Edit</span>
                          </Button>
                      ),
                  },
              ]
            : []),
    ];

    return (
        <>
            <Head title="Amenities Review &amp; Catalogue" />
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Amenities Verification"
                    title="Amenities &amp; Facilities"
                    description="Review property and room-type amenity assignments and manage the master catalogue. AC/Non-AC and food remain separate systems."
                />

                <section
                    aria-label="Amenity metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Awaiting review"
                        value={stats.awaiting_review}
                        icon={Inbox}
                    />
                    <StatCard
                        label="Needs information"
                        value={stats.needs_information}
                        icon={Clock}
                    />
                    <StatCard
                        label="Approved (current)"
                        value={stats.approved}
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Rejected"
                        value={stats.rejected}
                        icon={X}
                    />
                </section>

                <Tabs defaultValue="queue" className="w-full space-y-6">
                    <TabsList
                        variant="pill"
                        label="Amenities workspace sections"
                    >
                        <TabsTrigger value="queue" className="tabular-nums">
                            <ListChecks
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <span>
                                Verification Queue ({assignments.length})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="categories"
                            className="tabular-nums"
                        >
                            <FolderTree
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <span>Master Categories ({categories.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="amenities" className="tabular-nums">
                            <Sparkles className="size-3.5" aria-hidden="true" />
                            <span>Master Amenities ({amenities.length})</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="queue" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2.5 text-base">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <Filter
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span>Queue Filters</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={apply}
                                    className="grid gap-4 sm:grid-cols-3"
                                >
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="amenity-status"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Status
                                        </Label>
                                        <Select
                                            value={status || 'all'}
                                            onValueChange={(v) =>
                                                setStatus(v === 'all' ? '' : v)
                                            }
                                        >
                                            <SelectTrigger
                                                id="amenity-status"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All statuses
                                                </SelectItem>
                                                {statuses.map((s) => (
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
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="amenity-scope"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Scope
                                        </Label>
                                        <Select
                                            value={scope || 'all'}
                                            onValueChange={(v) =>
                                                setScope(v === 'all' ? '' : v)
                                            }
                                        >
                                            <SelectTrigger
                                                id="amenity-scope"
                                                className="w-full"
                                            >
                                                <SelectValue placeholder="All scopes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All scopes
                                                </SelectItem>
                                                <SelectItem value="property">
                                                    Property-level
                                                </SelectItem>
                                                <SelectItem value="room_type">
                                                    Room-type
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Button type="submit" variant="plum">
                                            <Search aria-hidden="true" />
                                            <span>Apply</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={clear}
                                        >
                                            <X aria-hidden="true" />
                                            <span>Clear</span>
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <DataTable
                            caption="Amenity verification queue"
                            title="Amenity verification queue"
                            description="Inspect submitted property and room-type amenity claims awaiting moderation or already reviewed."
                            headerActions={
                                <Badge
                                    variant="outline"
                                    className="tabular-nums"
                                >
                                    {assignments.length} total
                                </Badge>
                            }
                            columns={columns}
                            rows={assignments}
                            getRowKey={(row) => `${row.scope}-${row.id}`}
                            pageSize={15}
                            emptyTitle="No amenity assignments"
                            emptyDescription="Submitted property and room-type amenity assignments will appear here for review."
                        />
                    </TabsContent>

                    <TabsContent value="categories">
                        <div className="grid items-start gap-6 lg:grid-cols-12">
                            {canManageCatalogue && (
                                <Card
                                    className={cn(
                                        'lg:col-span-5',
                                        editingCategoryId &&
                                            'border-l-4 border-l-tijum-coral',
                                    )}
                                >
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                                {editingCategoryId ? (
                                                    <Pencil
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Plus
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <div className="space-y-1">
                                                <CardTitle className="text-base">
                                                    {editingCategoryId
                                                        ? 'Update category'
                                                        : 'Create category'}
                                                </CardTitle>
                                                <CardDescription>
                                                    Stable catalogue categories.
                                                    Referenced categories are
                                                    not physically deleted.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <form
                                            onSubmit={submitCategory}
                                            className="space-y-4 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm dark:border-border dark:bg-muted/45"
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="cat-code"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Code
                                                    </Label>
                                                    <Input
                                                        id="cat-code"
                                                        value={
                                                            categoryForm.data
                                                                .code
                                                        }
                                                        onChange={(e) =>
                                                            categoryForm.setData(
                                                                'code',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {categoryForm.errors
                                                        .code && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                categoryForm
                                                                    .errors.code
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="cat-name"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="cat-name"
                                                        value={
                                                            categoryForm.data
                                                                .name
                                                        }
                                                        onChange={(e) =>
                                                            categoryForm.setData(
                                                                'name',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {categoryForm.errors
                                                        .name && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                categoryForm
                                                                    .errors.name
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="cat-slug"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Slug
                                                    </Label>
                                                    <Input
                                                        id="cat-slug"
                                                        value={
                                                            categoryForm.data
                                                                .slug
                                                        }
                                                        onChange={(e) =>
                                                            categoryForm.setData(
                                                                'slug',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {categoryForm.errors
                                                        .slug && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                categoryForm
                                                                    .errors.slug
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="cat-order"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Display order
                                                    </Label>
                                                    <Input
                                                        id="cat-order"
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            categoryForm.data
                                                                .display_order
                                                        }
                                                        onChange={(e) =>
                                                            categoryForm.setData(
                                                                'display_order',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor="cat-desc"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Description
                                                </Label>
                                                <Textarea
                                                    id="cat-desc"
                                                    value={
                                                        categoryForm.data
                                                            .description
                                                    }
                                                    onChange={(e) =>
                                                        categoryForm.setData(
                                                            'description',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <label
                                                htmlFor="cat-active"
                                                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-tijum-surface/80 bg-card px-3 py-2 text-xs font-medium text-tijum-plum dark:border-border dark:text-foreground"
                                            >
                                                <Checkbox
                                                    id="cat-active"
                                                    checked={
                                                        categoryForm.data
                                                            .is_active
                                                    }
                                                    onCheckedChange={(v) =>
                                                        categoryForm.setData(
                                                            'is_active',
                                                            v === true,
                                                        )
                                                    }
                                                />
                                                <span>Active</span>
                                            </label>
                                            {categoryForm.errors.is_active && (
                                                <p className="text-xs text-status-error-fg">
                                                    {
                                                        categoryForm.errors
                                                            .is_active
                                                    }
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    variant="plum"
                                                    disabled={
                                                        categoryForm.processing
                                                    }
                                                    loading={
                                                        categoryForm.processing
                                                    }
                                                >
                                                    {editingCategoryId
                                                        ? 'Save category'
                                                        : 'Create category'}
                                                </Button>
                                                {editingCategoryId && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingCategoryId(
                                                                null,
                                                            );
                                                            categoryForm.reset();
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            <div
                                className={
                                    canManageCatalogue
                                        ? 'lg:col-span-7'
                                        : 'lg:col-span-12'
                                }
                            >
                                <DataTable
                                    caption="Master amenity categories"
                                    title="Master categories"
                                    description="Stable catalogue categories. Referenced categories are not physically deleted."
                                    headerActions={
                                        <Badge
                                            variant="outline"
                                            className="tabular-nums"
                                        >
                                            {categories.length} categories
                                        </Badge>
                                    }
                                    columns={categoryColumns}
                                    rows={categories}
                                    getRowKey={(c) => c.id}
                                    pageSize={15}
                                    emptyTitle="No categories"
                                    emptyDescription="Create a master amenity category to organize catalogue items."
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="amenities">
                        <div className="grid items-start gap-6 lg:grid-cols-12">
                            {canManageCatalogue && (
                                <Card
                                    className={cn(
                                        'lg:col-span-5',
                                        editingAmenityId &&
                                            'border-l-4 border-l-tijum-coral',
                                    )}
                                >
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                                {editingAmenityId ? (
                                                    <Pencil
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Plus
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <div className="space-y-1">
                                                <CardTitle className="text-base">
                                                    {editingAmenityId
                                                        ? 'Update amenity'
                                                        : 'Create amenity'}
                                                </CardTitle>
                                                <CardDescription>
                                                    Controlled catalogue items.
                                                    Referenced/historical
                                                    amenities cannot be
                                                    physically deleted.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <form
                                            onSubmit={submitAmenity}
                                            className="space-y-4 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-sm dark:border-border dark:bg-muted/45"
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5 sm:col-span-2">
                                                    <Label
                                                        htmlFor="am-cat"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Category
                                                    </Label>
                                                    <Select
                                                        value={
                                                            amenityForm.data
                                                                .amenity_category_id
                                                        }
                                                        onValueChange={(v) =>
                                                            amenityForm.setData(
                                                                'amenity_category_id',
                                                                v,
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            id="am-cat"
                                                            className="w-full"
                                                        >
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories.map(
                                                                (c) => (
                                                                    <SelectItem
                                                                        key={
                                                                            c.id
                                                                        }
                                                                        value={String(
                                                                            c.id,
                                                                        )}
                                                                    >
                                                                        {c.name}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {amenityForm.errors
                                                        .amenity_category_id && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                amenityForm
                                                                    .errors
                                                                    .amenity_category_id
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="am-code"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Code
                                                    </Label>
                                                    <Input
                                                        id="am-code"
                                                        value={
                                                            amenityForm.data
                                                                .code
                                                        }
                                                        onChange={(e) =>
                                                            amenityForm.setData(
                                                                'code',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {amenityForm.errors
                                                        .code && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                amenityForm
                                                                    .errors.code
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="am-name"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="am-name"
                                                        value={
                                                            amenityForm.data
                                                                .name
                                                        }
                                                        onChange={(e) =>
                                                            amenityForm.setData(
                                                                'name',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {amenityForm.errors
                                                        .name && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                amenityForm
                                                                    .errors.name
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="am-slug"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Slug
                                                    </Label>
                                                    <Input
                                                        id="am-slug"
                                                        value={
                                                            amenityForm.data
                                                                .slug
                                                        }
                                                        onChange={(e) =>
                                                            amenityForm.setData(
                                                                'slug',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    {amenityForm.errors
                                                        .slug && (
                                                        <p className="text-xs text-status-error-fg">
                                                            {
                                                                amenityForm
                                                                    .errors.slug
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="am-scope"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Applicability scope
                                                    </Label>
                                                    <Select
                                                        value={
                                                            amenityForm.data
                                                                .applicability_scope
                                                        }
                                                        onValueChange={(v) =>
                                                            amenityForm.setData(
                                                                'applicability_scope',
                                                                v as AmenityApplicabilityScope,
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            id="am-scope"
                                                            className="w-full"
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {scopes.map((s) => (
                                                                <SelectItem
                                                                    key={
                                                                        s.value
                                                                    }
                                                                    value={
                                                                        s.value
                                                                    }
                                                                >
                                                                    {s.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="am-icon"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Icon key (controlled)
                                                    </Label>
                                                    <Input
                                                        id="am-icon"
                                                        value={
                                                            amenityForm.data
                                                                .icon_key
                                                        }
                                                        onChange={(e) =>
                                                            amenityForm.setData(
                                                                'icon_key',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor="am-order"
                                                        className="text-tijum-plum dark:text-foreground"
                                                    >
                                                        Display order
                                                    </Label>
                                                    <Input
                                                        id="am-order"
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            amenityForm.data
                                                                .display_order
                                                        }
                                                        onChange={(e) =>
                                                            amenityForm.setData(
                                                                'display_order',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor="am-desc"
                                                    className="text-tijum-plum dark:text-foreground"
                                                >
                                                    Description
                                                </Label>
                                                <Textarea
                                                    id="am-desc"
                                                    value={
                                                        amenityForm.data
                                                            .description
                                                    }
                                                    onChange={(e) =>
                                                        amenityForm.setData(
                                                            'description',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-tijum-surface/80 bg-card px-3 py-2 text-xs font-medium text-tijum-plum dark:border-border dark:text-foreground">
                                                    <Checkbox
                                                        checked={
                                                            amenityForm.data
                                                                .is_customer_visible
                                                        }
                                                        onCheckedChange={(v) =>
                                                            amenityForm.setData(
                                                                'is_customer_visible',
                                                                v === true,
                                                            )
                                                        }
                                                    />
                                                    <span>
                                                        Customer visible
                                                    </span>
                                                </label>
                                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-tijum-surface/80 bg-card px-3 py-2 text-xs font-medium text-tijum-plum dark:border-border dark:text-foreground">
                                                    <Checkbox
                                                        checked={
                                                            amenityForm.data
                                                                .requires_review
                                                        }
                                                        onCheckedChange={(v) =>
                                                            amenityForm.setData(
                                                                'requires_review',
                                                                v === true,
                                                            )
                                                        }
                                                    />
                                                    <span>Requires review</span>
                                                </label>
                                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-tijum-surface/80 bg-card px-3 py-2 text-xs font-medium text-tijum-plum dark:border-border dark:text-foreground">
                                                    <Checkbox
                                                        checked={
                                                            amenityForm.data
                                                                .is_active
                                                        }
                                                        onCheckedChange={(v) =>
                                                            amenityForm.setData(
                                                                'is_active',
                                                                v === true,
                                                            )
                                                        }
                                                    />
                                                    <span>Active</span>
                                                </label>
                                            </div>
                                            {amenityForm.errors.is_active && (
                                                <p className="text-xs text-status-error-fg">
                                                    {
                                                        amenityForm.errors
                                                            .is_active
                                                    }
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    variant="plum"
                                                    disabled={
                                                        amenityForm.processing
                                                    }
                                                    loading={
                                                        amenityForm.processing
                                                    }
                                                >
                                                    {editingAmenityId
                                                        ? 'Save amenity'
                                                        : 'Create amenity'}
                                                </Button>
                                                {editingAmenityId && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingAmenityId(
                                                                null,
                                                            );
                                                            amenityForm.reset();
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            <div
                                className={
                                    canManageCatalogue
                                        ? 'lg:col-span-7'
                                        : 'lg:col-span-12'
                                }
                            >
                                <DataTable
                                    caption="Master amenity catalogue"
                                    title="Master amenities"
                                    description="Controlled catalogue items. Referenced/historical amenities cannot be physically deleted."
                                    headerActions={
                                        <Badge
                                            variant="outline"
                                            className="tabular-nums"
                                        >
                                            {amenities.length} items
                                        </Badge>
                                    }
                                    columns={amenityColumns}
                                    rows={amenities}
                                    getRowKey={(a) => a.id}
                                    pageSize={15}
                                    emptyTitle="No amenities"
                                    emptyDescription="Create master amenities under a category to publish them to partners."
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
