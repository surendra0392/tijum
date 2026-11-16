import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowRightLeft,
    CheckCircle2,
    Plus,
    Save,
    Search,
    ShieldAlert,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import type { SeoRedirect } from '@/types/cms';

interface Props {
    redirects: {
        data: SeoRedirect[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search?: string | null;
    };
}

export default function AdminSeoRedirectsIndex({ redirects, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [redirectToDelete, setRedirectToDelete] =
        useState<SeoRedirect | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm({
        source_path: '',
        destination_url: '',
        http_status: 301,
        is_active: true,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/seo/redirects',
            { search: searchTerm || undefined },
            { preserveState: true },
        );
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        router.get('/admin/seo/redirects', {}, { preserveState: true });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/admin/seo/redirects', {
            onSuccess: () => {
                form.reset();
                setIsCreateOpen(false);
            },
        });
    };

    const handleDeleteConfirm = () => {
        if (!redirectToDelete) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/admin/seo/redirects/${redirectToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setRedirectToDelete(null);
            },
        });
    };

    const handleToggleActive = (redirect: SeoRedirect) => {
        router.put(`/admin/seo/redirects/${redirect.id}`, {
            destination_url: redirect.destination_url,
            http_status: redirect.http_status,
            is_active: !redirect.is_active,
        });
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'SEO Management', href: '/admin/seo' },
                { title: 'Redirect Rules', href: '/admin/seo/redirects' },
            ]}
        >
            <Head title="301 & 302 URL Redirects — Marketplace SEO" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="SEO · Link Equity & Routing"
                    title="URL Redirect Rules Manager"
                    description="Maintain inbound link equity and eliminate 404s with permanent (301) and temporary (302) redirects."
                    badges={
                        <Badge
                            variant="secondary"
                            className="font-semibold tabular-nums"
                        >
                            {redirects.total.toLocaleString()} rules
                        </Badge>
                    }
                    actions={
                        <Button
                            type="button"
                            onClick={() => setIsCreateOpen(!isCreateOpen)}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>
                                {isCreateOpen
                                    ? 'Close Rule Form'
                                    : 'Add Redirect Rule'}
                            </span>
                        </Button>
                    }
                />

                {/* Create Form Drawer / Card */}
                {isCreateOpen && (
                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base sm:text-lg">
                                    Create New Redirect Rule
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Route legacy URLs safely to canonical
                                    marketplace destinations.
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-5">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="source_path">
                                            Source Path (Relative URL)
                                        </Label>
                                        <Input
                                            id="source_path"
                                            value={form.data.source_path}
                                            onChange={(e) =>
                                                form.setData(
                                                    'source_path',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="/old-hyderabad-hostels"
                                            required
                                        />
                                        <InputError
                                            message={form.errors.source_path}
                                            className="text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="destination_url">
                                            Destination URL (Relative or
                                            Internal)
                                        </Label>
                                        <Input
                                            id="destination_url"
                                            value={form.data.destination_url}
                                            onChange={(e) =>
                                                form.setData(
                                                    'destination_url',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="/hostels-in-hyderabad"
                                            required
                                        />
                                        <InputError
                                            message={
                                                form.errors.destination_url
                                            }
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-tijum-surface/80 pt-4 dark:border-border">
                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2.5">
                                            <Label
                                                htmlFor="http_status"
                                                className="text-xs"
                                            >
                                                HTTP Status
                                            </Label>
                                            <Select
                                                value={String(
                                                    form.data.http_status,
                                                )}
                                                onValueChange={(value) =>
                                                    form.setData(
                                                        'http_status',
                                                        parseInt(value, 10),
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="http_status"
                                                    size="sm"
                                                    className="min-w-52"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="301">
                                                        301 Moved Permanently
                                                    </SelectItem>
                                                    <SelectItem value="302">
                                                        302 Found (Temporary)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Label
                                            htmlFor="is_active"
                                            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-tijum-plum dark:text-foreground"
                                        >
                                            <Checkbox
                                                id="is_active"
                                                checked={form.data.is_active}
                                                onCheckedChange={(checked) =>
                                                    form.setData(
                                                        'is_active',
                                                        Boolean(checked),
                                                    )
                                                }
                                            />
                                            <span>Active Immediately</span>
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        loading={form.processing}
                                        disabled={form.processing}
                                    >
                                        {!form.processing && (
                                            <Save
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>Save Redirect Rule</span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Safety Warning Info */}
                <Card className="border-l-4 border-l-amber-500 py-4">
                    <CardContent className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
                            <ShieldAlert
                                className="size-4.5"
                                aria-hidden="true"
                            />
                        </span>
                        <div className="space-y-1 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            <span className="block font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                Marketplace Redirect Security Protections
                            </span>
                            <p>
                                Redirect rules are automatically protected
                                against infinite circular loops and
                                open-redirect phishing attacks. Target URLs must
                                belong to the verified TIJUM marketplace domain.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Search */}
                <Card className="py-4">
                    <CardContent>
                        <form
                            onSubmit={handleSearch}
                            className="flex flex-wrap items-center gap-2.5"
                        >
                            <div className="relative min-w-60 flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Search redirects by source path or destination..."
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>
                            <Button type="submit" variant="outline" size="sm">
                                Search
                            </Button>
                            {filters.search && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearSearch}
                                >
                                    <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Clear</span>
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Redirects Table */}
                {redirects.data.length === 0 ? (
                    <EmptyState
                        icon={ArrowRightLeft}
                        title="No redirect rules configured"
                        description="Create a 301 or 302 redirect rule to preserve SEO link equity and eliminate 404 errors."
                        action={
                            filters.search ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearSearch}
                                >
                                    Clear Search
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setIsCreateOpen(true)}
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Add Redirect Rule</span>
                                </Button>
                            )
                        }
                    />
                ) : (
                    <Card className="overflow-hidden py-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Source Path</TableHead>
                                    <TableHead>Destination URL</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Hits</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {redirects.data.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-mono text-xs font-semibold text-tijum-plum dark:text-foreground">
                                            {r.source_path}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {r.destination_url}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    r.http_status === 301
                                                        ? 'plum'
                                                        : 'secondary'
                                                }
                                                className="text-[11px] tabular-nums"
                                            >
                                                {r.http_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                            {r.hits_count.toLocaleString()}
                                            {r.last_hit_at && (
                                                <span className="mt-0.5 block text-[10px] text-tijum-plum-muted dark:text-muted-foreground">
                                                    Last:{' '}
                                                    {new Date(
                                                        r.last_hit_at,
                                                    ).toLocaleDateString()}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleToggleActive(r)
                                                }
                                                title="Toggle Active"
                                                className={
                                                    r.is_active
                                                        ? 'border-status-success-border bg-status-success-bg text-status-success-fg hover:bg-status-success-bg/80 hover:text-status-success-fg'
                                                        : 'text-tijum-plum-muted dark:text-muted-foreground'
                                                }
                                            >
                                                {r.is_active ? (
                                                    <>
                                                        <CheckCircle2
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Inactive</span>
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setRedirectToDelete(r)
                                                }
                                                className="border-status-error-border text-status-error-fg hover:bg-status-error-bg/70 hover:text-status-error-fg"
                                                aria-label={`Delete redirect from ${r.source_path}`}
                                            >
                                                <Trash2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {redirects.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {redirects.total ?? redirects.data.length}
                                </span>{' '}
                                redirect(s)
                            </p>
                            <Pagination
                                currentPage={redirects.current_page ?? 1}
                                lastPage={redirects.last_page ?? 1}
                                total={redirects.total}
                                onPageChange={(page) =>
                                    router.get(
                                        '/admin/seo/redirects',
                                        {
                                            ...(filters.search
                                                ? { search: filters.search }
                                                : {}),
                                            page,
                                        },
                                        { preserveState: true },
                                    )
                                }
                            />
                        </div>
                    </Card>
                )}

                <ConfirmationDialog
                    open={Boolean(redirectToDelete)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setRedirectToDelete(null);
                        }
                    }}
                    title="Delete Redirect Rule"
                    description={
                        redirectToDelete
                            ? `Delete redirect rule from "${redirectToDelete.source_path}"? Traffic to this path will no longer forward automatically.`
                            : ''
                    }
                    confirmLabel="Delete Rule"
                    tone="destructive"
                    loading={isDeleting}
                    onConfirm={handleDeleteConfirm}
                />
            </div>
        </AdminLayout>
    );
}
