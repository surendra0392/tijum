import { Head, Link, router } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    Eye,
    Pencil,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import type { BlogArticle, BlogCategory } from '@/types/cms';

interface Props {
    articles: {
        data: BlogArticle[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    categories: BlogCategory[];
    filters: {
        status?: string;
        category_id?: string;
        search?: string;
    };
    statuses: Array<{ value: string; label: string }>;
}

function getArticleStatusMeta(statusValue: string): {
    status: SemanticStatus;
    label: string;
} {
    switch (statusValue) {
        case 'published':
            return { status: 'active', label: 'Published' };
        case 'scheduled':
            return { status: 'info', label: 'Scheduled' };
        case 'archived':
            return { status: 'neutral', label: 'Archived' };
        default:
            return { status: 'pending', label: 'Draft' };
    }
}

export default function AdminBlogArticlesIndex({
    articles,
    categories,
    filters,
    statuses,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [categoryId, setCategoryId] = useState(
        filters.category_id ? String(filters.category_id) : 'all',
    );

    const publishedOnPage = articles.data.filter(
        (article) => article.status === 'published',
    ).length;
    const viewsOnPage = articles.data.reduce(
        (sum, article) => sum + (article.view_count || 0),
        0,
    );
    const hasActiveFilters = Boolean(
        filters.search || filters.status || filters.category_id,
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/content/blog',
            {
                search: search.trim() || undefined,
                status: status !== 'all' ? status : undefined,
                category_id: categoryId !== 'all' ? categoryId : undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatus('all');
        setCategoryId('all');
        router.get('/admin/content/blog', {}, { preserveState: true });
    };

    const columns: DataTableColumn<BlogArticle>[] = [
        {
            key: 'title',
            header: 'Article Title',
            isRowHeader: true,
            render: (art) => (
                <div className="min-w-0 space-y-0.5">
                    <div className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {art.title}
                    </div>
                    <div className="font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        /blog/{art.slug}
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            render: (art) => (
                <Badge variant="outline">
                    {art.category?.name || 'Uncategorized'}
                </Badge>
            ),
        },
        {
            key: 'author',
            header: 'Author',
            render: (art) => (
                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    {art.author?.name || 'Staff Writer'}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (art) => {
                const meta = getArticleStatusMeta(art.status);
                return <StatusBadge status={meta.status} label={meta.label} />;
            },
        },
        {
            key: 'views',
            header: 'Views',
            align: 'right',
            render: (art) => (
                <span className="font-mono text-xs text-tijum-plum tabular-nums dark:text-foreground">
                    {art.view_count.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (art) => (
                <div className="inline-flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        asChild
                    >
                        <a
                            href={`/blog/${art.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Eye className="size-3.5" aria-hidden="true" />
                            <span>View</span>
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        asChild
                    >
                        <Link href={`/admin/content/blog/${art.id}/edit`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                            <span>Edit</span>
                        </Link>
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
                { title: 'Blog Articles', href: '/admin/content/blog' },
            ]}
        >
            <Head title="Blog Articles — Admin" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title="Blog Articles & Guides"
                    description="Publish educational articles, hostel guides, student budgeting tips, and city guides."
                    actions={
                        <Button variant="plum" size="sm" asChild>
                            <Link href="/admin/content/blog/create">
                                <Plus className="size-4" aria-hidden="true" />
                                <span>Write Article</span>
                            </Link>
                        </Button>
                    }
                />

                <section
                    aria-label="Blog articles overview"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Total Articles"
                        value={articles.total}
                        helperText="All editorial entries"
                        icon={BookOpen}
                    />
                    <StatCard
                        label="Published (This Page)"
                        value={`${publishedOnPage} / ${articles.data.length}`}
                        helperText="Live on marketplace blog"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Article Reads (Page)"
                        value={viewsOnPage.toLocaleString()}
                        helperText="Recorded cumulative views"
                        icon={Eye}
                    />
                </section>

                {/* Filters */}
                <Card className="py-4">
                    <CardContent className="px-5">
                        <form
                            onSubmit={handleSearch}
                            className="flex flex-wrap items-center gap-3"
                        >
                            <div className="relative min-w-[220px] flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    placeholder="Search by article title or excerpt..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[185px]">
                                <Select
                                    value={categoryId}
                                    onValueChange={setCategoryId}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Categories
                                        </SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full sm:w-[165px]">
                                <Select
                                    value={status}
                                    onValueChange={setStatus}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Statuses
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
                    caption="Blog Articles"
                    title="Editorial Articles Ledger"
                    description="Manage published guides, scheduled posts, and editorial drafts."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {articles.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={articles.data}
                    getRowKey={(art) => art.id}
                    emptyTitle="No blog articles found"
                    emptyDescription="No blog articles matched your current filters. Adjust your search or write a new article."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {articles.data.length} of{' '}
                                {articles.total} article(s)
                            </p>
                            <Pagination links={articles.links} />
                        </div>
                    }
                />
            </div>
        </AdminLayout>
    );
}
