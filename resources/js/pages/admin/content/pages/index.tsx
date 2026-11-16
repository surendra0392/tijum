import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Eye,
    FileText,
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
import type { ContentPage } from '@/types/cms';

interface Props {
    pages: {
        data: ContentPage[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    filters: {
        status?: string;
        search?: string;
    };
    statuses: Array<{ value: string; label: string }>;
}

function getPageStatusMeta(statusValue: string): {
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

export default function AdminContentPagesIndex({
    pages,
    filters,
    statuses,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

    const publishedOnPage = pages.data.filter(
        (page) => page.status === 'published',
    ).length;
    const viewsOnPage = pages.data.reduce(
        (sum, page) => sum + (page.view_count || 0),
        0,
    );
    const hasActiveFilters = Boolean(filters.search || filters.status);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/content/pages',
            {
                search: search.trim() || undefined,
                status: status !== 'all' ? status : undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatus('all');
        router.get('/admin/content/pages', {}, { preserveState: true });
    };

    const columns: DataTableColumn<ContentPage>[] = [
        {
            key: 'title',
            header: 'Page Title / Slug',
            isRowHeader: true,
            render: (page) => (
                <div className="min-w-0 space-y-0.5">
                    <div className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {page.title}
                    </div>
                    <div className="font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        /p/{page.slug}
                    </div>
                    {page.internal_name !== page.title && (
                        <div className="text-[11px] text-tijum-plum-muted italic dark:text-muted-foreground">
                            Internal: {page.internal_name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (page) => {
                const meta = getPageStatusMeta(page.status);
                return <StatusBadge status={meta.status} label={meta.label} />;
            },
        },
        {
            key: 'published_at',
            header: 'Published Date',
            render: (page) => (
                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                    {page.published_at
                        ? new Date(page.published_at).toLocaleDateString()
                        : '—'}
                </span>
            ),
        },
        {
            key: 'views',
            header: 'Views',
            align: 'right',
            render: (page) => (
                <span className="font-mono text-xs text-tijum-plum tabular-nums dark:text-foreground">
                    {page.view_count.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (page) => (
                <div className="inline-flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        asChild
                    >
                        <a
                            href={`/p/${page.slug}?preview=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Eye className="size-3.5" aria-hidden="true" />
                            <span>Preview</span>
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        asChild
                    >
                        <Link href={`/admin/content/pages/${page.id}/edit`}>
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
                { title: 'Pages', href: '/admin/content/pages' },
            ]}
        >
            <Head title="CMS Pages — Admin" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title="CMS Static Pages"
                    description="Manage marketplace content, marketing landing pages, and institutional copy."
                    actions={
                        <Button variant="plum" size="sm" asChild>
                            <Link href="/admin/content/pages/create">
                                <Plus className="size-4" aria-hidden="true" />
                                <span>New Page</span>
                            </Link>
                        </Button>
                    }
                />

                <section
                    aria-label="CMS pages overview"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Total Pages"
                        value={pages.total}
                        helperText="Managed CMS routes"
                        icon={FileText}
                    />
                    <StatCard
                        label="Published (This Page)"
                        value={`${publishedOnPage} / ${pages.data.length}`}
                        helperText="Live public pages"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Page Views (Page)"
                        value={viewsOnPage.toLocaleString()}
                        helperText="Cumulative visits in view"
                        icon={Eye}
                    />
                </section>

                {/* Filter Bar */}
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
                                    placeholder="Search by title, internal name, or slug..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[170px]">
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
                    caption="CMS Static Pages"
                    title="CMS Static Pages"
                    description="Public marketing pages, institutional copy, and legal routes."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {pages.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={pages.data}
                    getRowKey={(page) => page.id}
                    emptyTitle="No content pages found"
                    emptyDescription="No CMS pages matched your filter criteria. Adjust your search or create a new page."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {pages.data.length} of {pages.total}{' '}
                                page(s)
                            </p>
                            <Pagination links={pages.links} />
                        </div>
                    }
                />
            </div>
        </AdminLayout>
    );
}
