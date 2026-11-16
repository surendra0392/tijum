import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    Pencil,
    Plus,
    Trash2,
    UserCheck,
    Users,
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
import type { ContentAuthor } from '@/types/cms';

interface Props {
    authors: ContentAuthor[];
}

export default function AdminContentAuthorsIndex({ authors }: Props) {
    const [editingAuthor, setEditingAuthor] = useState<ContentAuthor | null>(
        null,
    );
    const [deletingAuthor, setDeletingAuthor] = useState<ContentAuthor | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);

    const { data, setData, post, put, reset, clearErrors, processing, errors } =
        useForm({
            name: '',
            slug: '',
            designation: '',
            bio: '',
            avatar_url: '',
            is_active: true,
        });

    const activeCount = authors.filter((author) => author.is_active).length;
    const totalArticles = authors.reduce(
        (sum, author) => sum + (author.articles_count ?? 0),
        0,
    );

    const startEdit = (author: ContentAuthor) => {
        setEditingAuthor(author);
        clearErrors();
        setData({
            name: author.name,
            slug: author.slug,
            designation: author.designation || '',
            bio: author.bio || '',
            avatar_url: author.avatar_url || '',
            is_active: author.is_active,
        });
    };

    const cancelEdit = () => {
        setEditingAuthor(null);
        reset();
        clearErrors();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAuthor) {
            put(`/admin/content/authors/${editingAuthor.id}`, {
                preserveScroll: true,
                onSuccess: () => cancelEdit(),
            });
        } else {
            post('/admin/content/authors', {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    clearErrors();
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingAuthor) return;
        setIsDeleting(true);
        router.delete(`/admin/content/authors/${deletingAuthor.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingAuthor?.id === deletingAuthor.id) {
                    cancelEdit();
                }
                setDeletingAuthor(null);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const columns: DataTableColumn<ContentAuthor>[] = [
        {
            key: 'author',
            header: 'Author',
            isRowHeader: true,
            render: (author) => (
                <div className="flex items-center gap-3">
                    {author.avatar_url ? (
                        <img
                            src={author.avatar_url}
                            alt={author.name}
                            className="size-9 shrink-0 rounded-full border border-tijum-surface/80 object-cover dark:border-border"
                        />
                    ) : (
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-tijum-peach/70 bg-tijum-peach/45 font-heading text-xs font-bold text-tijum-plum dark:border-tijum-coral/35 dark:bg-tijum-coral/20 dark:text-tijum-peach">
                            {author.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="truncate font-heading font-semibold text-tijum-plum dark:text-foreground">
                            {author.name}
                        </div>
                        <div className="truncate font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            /{author.slug}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'designation',
            header: 'Designation',
            render: (author) => (
                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    {author.designation || 'Staff Writer'}
                </span>
            ),
        },
        {
            key: 'articles',
            header: 'Articles',
            align: 'right',
            render: (author) => (
                <Badge variant="secondary" className="font-mono tabular-nums">
                    {author.articles_count ?? 0}
                </Badge>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (author) => (
                <StatusBadge
                    status={author.is_active ? 'active' : 'neutral'}
                    label={author.is_active ? 'Active' : 'Inactive'}
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (author) => (
                <div className="inline-flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => startEdit(author)}
                    >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        <span>Edit</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Delete ${author.name}`}
                        className="h-8 border-status-error-border text-xs text-status-error-fg hover:bg-status-error-bg/70"
                        onClick={() => setDeletingAuthor(author)}
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
                { title: 'Authors', href: '/admin/content/authors' },
            ]}
        >
            <Head title="Content Authors — Admin" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title="Content Authors"
                    description="Manage editorial staff, community contributors, and article bylines."
                />

                <section
                    aria-label="Content authors overview"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Total Authors"
                        value={authors.length}
                        helperText="Registered editorial profiles"
                        icon={Users}
                    />
                    <StatCard
                        label="Active Contributors"
                        value={`${activeCount} / ${authors.length}`}
                        helperText="Available for new articles"
                        icon={UserCheck}
                    />
                    <StatCard
                        label="Published Bylines"
                        value={totalArticles.toLocaleString()}
                        helperText="Attributed blog articles"
                        icon={BookOpen}
                    />
                </section>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <DataTable
                            caption="Content Authors"
                            title="Author Directory"
                            description="Editorial contributors and article attribution profiles."
                            headerActions={
                                <Badge
                                    variant="outline"
                                    className="tabular-nums"
                                >
                                    {authors.length} authors
                                </Badge>
                            }
                            columns={columns}
                            rows={authors}
                            getRowKey={(author) => author.id}
                            pageSize={15}
                            emptyTitle="No authors yet"
                            emptyDescription="Create your first editorial author profile using the form on the right."
                        />
                    </div>

                    <Card className="lg:col-span-1">
                        <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                            <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-base sm:text-lg">
                                        {editingAuthor
                                            ? `Edit: ${editingAuthor.name}`
                                            : 'Add New Author'}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {editingAuthor
                                            ? 'Update contributor details, avatar, and active status.'
                                            : 'Create a contributor profile for blog article attribution.'}
                                    </CardDescription>
                                </div>
                                {editingAuthor && (
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
                                        htmlFor="author-name"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Author Name *
                                    </Label>
                                    <Input
                                        id="author-name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="e.g. Ananya Rao"
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
                                        htmlFor="author-slug"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        URL Slug
                                    </Label>
                                    <Input
                                        id="author-slug"
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
                                        htmlFor="author-designation"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Designation
                                    </Label>
                                    <Input
                                        id="author-designation"
                                        type="text"
                                        value={data.designation}
                                        onChange={(e) =>
                                            setData(
                                                'designation',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Student Wellness Editor"
                                        aria-invalid={Boolean(
                                            errors.designation,
                                        )}
                                        className="h-10.5"
                                    />
                                    <InputError
                                        message={errors.designation}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="author-avatar"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Avatar Image URL
                                    </Label>
                                    <div className="flex items-center gap-2.5">
                                        {data.avatar_url && (
                                            <img
                                                src={data.avatar_url}
                                                alt="Avatar preview"
                                                className="size-10 shrink-0 rounded-full border border-tijum-surface/80 object-cover dark:border-border"
                                            />
                                        )}
                                        <Input
                                            id="author-avatar"
                                            type="text"
                                            value={data.avatar_url}
                                            onChange={(e) =>
                                                setData(
                                                    'avatar_url',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="/images/public/partner-hospitality.jpg"
                                            aria-invalid={Boolean(
                                                errors.avatar_url,
                                            )}
                                            className="h-10.5 font-mono text-xs"
                                        />
                                    </div>
                                    <InputError
                                        message={errors.avatar_url}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="author-bio"
                                        className="text-tijum-plum dark:text-foreground"
                                    >
                                        Short Biography
                                    </Label>
                                    <Textarea
                                        id="author-bio"
                                        value={data.bio}
                                        onChange={(e) =>
                                            setData('bio', e.target.value)
                                        }
                                        rows={3}
                                        placeholder="Brief background summary..."
                                        aria-invalid={Boolean(errors.bio)}
                                    />
                                    <InputError
                                        message={errors.bio}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 dark:border-border dark:bg-muted/45">
                                    <Label
                                        htmlFor="author-active"
                                        className="cursor-pointer text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Active Author
                                    </Label>
                                    <Switch
                                        id="author-active"
                                        checked={data.is_active}
                                        onCheckedChange={(checked) =>
                                            setData('is_active', checked)
                                        }
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        loading={processing}
                                        className="flex-1"
                                    >
                                        {!editingAuthor && (
                                            <Plus
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>
                                            {editingAuthor
                                                ? 'Update Author'
                                                : 'Add Author'}
                                        </span>
                                    </Button>
                                    {editingAuthor && (
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
                isOpen={Boolean(deletingAuthor)}
                onOpenChange={(open) => !open && setDeletingAuthor(null)}
                title="Delete Author?"
                description={`Are you sure you want to delete author "${deletingAuthor?.name}"? Authors with associated articles cannot be deleted.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete Author'}
                cancelLabel="Cancel"
                variant="destructive"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingAuthor(null)}
            />
        </AdminLayout>
    );
}
