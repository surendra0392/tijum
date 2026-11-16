import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    FolderTree,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type { BlogCategory } from '@/types/cms';

interface Props {
    categories: BlogCategory[];
}

export default function AdminBlogCategoriesIndex({ categories }: Props) {
    const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(
        null,
    );
    const [deletingCategory, setDeletingCategory] =
        useState<BlogCategory | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data, setData, post, put, reset, clearErrors, processing, errors } =
        useForm({
            name: '',
            slug: '',
            description: '',
            seo_title: '',
            seo_description: '',
            display_order: 0,
            is_active: true,
        });

    const activeCount = categories.filter((cat) => cat.is_active).length;
    const totalArticles = categories.reduce(
        (sum, cat) => sum + (cat.articles_count ?? 0),
        0,
    );

    const startEdit = (cat: BlogCategory) => {
        setEditingCategory(cat);
        clearErrors();
        setData({
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            seo_title: cat.seo_title || '',
            seo_description: cat.seo_description || '',
            display_order: cat.display_order,
            is_active: cat.is_active,
        });
    };

    const cancelEdit = () => {
        setEditingCategory(null);
        reset();
        clearErrors();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            put(`/admin/content/categories/${editingCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => cancelEdit(),
            });
        } else {
            post('/admin/content/categories', {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    clearErrors();
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingCategory) return;
        setIsDeleting(true);
        router.delete(`/admin/content/categories/${deletingCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingCategory?.id === deletingCategory.id) {
                    cancelEdit();
                }
                setDeletingCategory(null);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const columns: DataTableColumn<BlogCategory>[] = [
        {
            key: 'category',
            header: 'Category',
            isRowHeader: true,
            render: (cat) => (
                <div className="min-w-0 space-y-0.5">
                    <div className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {cat.name}
                    </div>
                    {cat.description && (
                        <div className="line-clamp-1 text-xs font-normal text-tijum-plum-muted dark:text-muted-foreground">
                            {cat.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'slug',
            header: 'Slug',
            render: (cat) => (
                <span className="font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    /blog/category/{cat.slug}
                </span>
            ),
        },
        {
            key: 'order',
            header: 'Order',
            render: (cat) => (
                <Badge variant="outline" className="font-mono tabular-nums">
                    #{cat.display_order}
                </Badge>
            ),
        },
        {
            key: 'articles',
            header: 'Articles',
            align: 'right',
            render: (cat) => (
                <Badge variant="secondary" className="font-mono tabular-nums">
                    {cat.articles_count ?? 0}
                </Badge>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (cat) => (
                <StatusBadge
                    status={cat.is_active ? 'active' : 'neutral'}
                    label={cat.is_active ? 'Active' : 'Inactive'}
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (cat) => (
                <div className="inline-flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => startEdit(cat)}
                    >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        <span>Edit</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Delete ${cat.name}`}
                        className="h-8 border-status-error-border text-xs text-status-error-fg hover:bg-status-error-bg/70"
                        onClick={() => setDeletingCategory(cat)}
                    >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/admin/dashboard' },
                { title: 'Content Management', href: '/admin/content/pages' },
                { title: 'Categories', href: '/admin/content/categories' },
            ]}
        >
            <Head title="Blog Categories — Admin" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title="Blog Categories"
                    description="Organize articles and landing page content by topic, ordering, and SEO metadata."
                />

                <section
                    aria-label="Blog categories overview"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Total Categories"
                        value={categories.length}
                        helperText="Editorial topic buckets"
                        icon={FolderTree}
                    />
                    <StatCard
                        label="Active Categories"
                        value={`${activeCount} / ${categories.length}`}
                        helperText="Visible on public blog"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Categorized Articles"
                        value={totalArticles.toLocaleString()}
                        helperText="Articles assigned to topics"
                        icon={BookOpen}
                    />
                </section>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <DataTable
                            caption="Blog Categories"
                            title="Editorial Categories"
                            description="Topic taxonomy, display ordering, and archive SEO metadata."
                            headerActions={
                                <Badge
                                    variant="outline"
                                    className="tabular-nums"
                                >
                                    {categories.length} categories
                                </Badge>
                            }
                            columns={columns}
                            rows={categories}
                            getRowKey={(cat) => cat.id}
                            pageSize={15}
                            emptyTitle="No blog categories yet"
                            emptyDescription="Create your first blog category using the form on the right."
                        />
                    </div>

                    <Card className="lg:col-span-1">
                        <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-base sm:text-lg">
                                        {editingCategory
                                            ? `Edit: ${editingCategory.name}`
                                            : 'Create New Category'}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {editingCategory
                                            ? 'Update topic label, ordering, and SEO attributes.'
                                            : 'Define a new editorial topic for blog discovery.'}
                                    </CardDescription>
                                </div>
                                {editingCategory && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0"
                                        aria-label="Cancel editing"
                                        onClick={cancelEdit}
                                    >
                                        <X
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="cat-name"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Category Name *
                                    </Label>
                                    <Input
                                        id="cat-name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="e.g. Student Budgeting"
                                        aria-invalid={Boolean(errors.name)}
                                        className="h-10.5"
                                        required
                                    />
                                    <InputError
                                        message={errors.name}
                                        className="text-xs"
                                    />
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
                                        type="text"
                                        value={data.slug}
                                        onChange={(e) =>
                                            setData('slug', e.target.value)
                                        }
                                        placeholder="auto-generated from name"
                                        aria-invalid={Boolean(errors.slug)}
                                        className="h-10.5 font-mono text-sm"
                                    />
                                    <InputError
                                        message={errors.slug}
                                        className="text-xs"
                                    />
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
                                        value={data.description}
                                        onChange={(e) =>
                                            setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        rows={2}
                                        placeholder="Brief summary of articles in this topic..."
                                        aria-invalid={Boolean(
                                            errors.description,
                                        )}
                                    />
                                    <InputError
                                        message={errors.description}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="cat-display-order"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Display Order
                                        </Label>
                                        <Input
                                            id="cat-display-order"
                                            type="number"
                                            min={0}
                                            value={data.display_order}
                                            onChange={(e) =>
                                                setData(
                                                    'display_order',
                                                    Number(e.target.value) || 0,
                                                )
                                            }
                                            className="h-10.5 tabular-nums"
                                        />
                                        <InputError
                                            message={errors.display_order}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="flex items-end">
                                        <div className="flex h-10.5 w-full items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 dark:border-border dark:bg-muted/45">
                                            <Label
                                                htmlFor="cat-active"
                                                className="cursor-pointer text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                Active
                                            </Label>
                                            <Switch
                                                id="cat-active"
                                                checked={data.is_active}
                                                onCheckedChange={(checked) =>
                                                    setData(
                                                        'is_active',
                                                        checked,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                                    <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Optional SEO Metadata
                                    </p>
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="cat-seo-title"
                                            className="text-xs text-tijum-plum dark:text-foreground"
                                        >
                                            SEO Title
                                        </Label>
                                        <Input
                                            id="cat-seo-title"
                                            type="text"
                                            value={data.seo_title}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_title',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Category archive title tag"
                                            className="h-9.5 text-xs"
                                        />
                                        <InputError
                                            message={errors.seo_title}
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="cat-seo-desc"
                                            className="text-xs text-tijum-plum dark:text-foreground"
                                        >
                                            SEO Description
                                        </Label>
                                        <Textarea
                                            id="cat-seo-desc"
                                            value={data.seo_description}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_description',
                                                    e.target.value,
                                                )
                                            }
                                            rows={2}
                                            placeholder="Meta description for category index..."
                                            className="min-h-16 text-xs"
                                        />
                                        <InputError
                                            message={errors.seo_description}
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        loading={processing}
                                        className="flex-1"
                                    >
                                        {!editingCategory && (
                                            <Plus
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>
                                            {editingCategory
                                                ? 'Update Category'
                                                : 'Create Category'}
                                        </span>
                                    </Button>
                                    {editingCategory && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={cancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={Boolean(deletingCategory)}
                onOpenChange={(open) => !open && setDeletingCategory(null)}
                title="Delete Category?"
                description={`Are you sure you want to delete category "${deletingCategory?.name}"? Categories containing articles cannot be deleted.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete Category'}
                cancelLabel="Cancel"
                variant="destructive"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingCategory(null)}
            />
        </AdminLayout>
    );
}
