import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    Edit3,
    Eye,
    Image as ImageIcon,
    MousePointerClick,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import type { MarketingBanner } from '@/types/marketing';

interface Props {
    banners: {
        data: MarketingBanner[];
        current_page: number;
        last_page: number;
        total: number;
    };
    placements: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
    filters: {
        placement?: string | null;
        status?: string | null;
    };
}

function getBannerSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'scheduled':
            return 'pending';
        case 'paused':
            return 'warning';
        case 'expired':
            return 'cancelled';
        default:
            return 'neutral';
    }
}

export default function AdminBannersIndex({
    banners,
    placements,
    statuses,
    filters,
}: Props) {
    const [bannerToDelete, setBannerToDelete] =
        useState<MarketingBanner | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            '/admin/marketing/banners',
            {
                ...filters,
                [key]: value || undefined,
            },
            { preserveState: true },
        );
    };

    const handleClearFilters = () => {
        router.get('/admin/marketing/banners', {}, { preserveState: true });
    };

    const handleDeleteConfirm = () => {
        if (!bannerToDelete) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/admin/marketing/banners/${bannerToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setBannerToDelete(null);
            },
        });
    };

    const hasActiveFilters = Boolean(filters.placement || filters.status);

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Banners', href: '/admin/marketing/banners' },
            ]}
        >
            <Head title="Promotional Banners — Marketing Admin" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · On-Site Placements"
                    title="Promotional Banners"
                    description="Manage on-site promotional banners on the homepage hero, announcement strips, and city discovery pages."
                    actions={
                        <Button asChild>
                            <Link href="/admin/marketing/banners/create">
                                <Plus className="size-4" aria-hidden="true" />
                                <span>Create Banner</span>
                            </Link>
                        </Button>
                    }
                />

                {/* Filters */}
                <Card className="py-4">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={filters.placement || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange(
                                        'placement',
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="min-w-44"
                                    aria-label="Filter by placement"
                                >
                                    <SelectValue placeholder="All Placements" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Placements
                                    </SelectItem>
                                    {placements.map((p) => (
                                        <SelectItem
                                            key={p.value}
                                            value={p.value}
                                        >
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange(
                                        'status',
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="min-w-40"
                                    aria-label="Filter by status"
                                >
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

                        <Badge
                            variant="secondary"
                            className="font-semibold tabular-nums"
                        >
                            {banners.total.toLocaleString()} banners
                        </Badge>
                    </CardContent>
                </Card>

                {/* Banners List */}
                {banners.data.length === 0 ? (
                    <EmptyState
                        icon={ImageIcon}
                        title="No promotional banners found"
                        description="No promotional banners match the active placement or status filters."
                        action={
                            hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                >
                                    Reset Filters
                                </Button>
                            ) : (
                                <Button asChild size="sm">
                                    <Link href="/admin/marketing/banners/create">
                                        <Plus
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Create Banner</span>
                                    </Link>
                                </Button>
                            )
                        }
                    />
                ) : (
                    <Card className="overflow-hidden py-0">
                        <div className="divide-y divide-tijum-surface/70 dark:divide-border">
                            {banners.data.map((b) => (
                                <div
                                    key={b.id}
                                    className="flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:bg-tijum-cream/35 md:flex-row md:items-center dark:hover:bg-muted/40"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-4">
                                        {b.image_url ? (
                                            <img
                                                src={b.image_url}
                                                alt={b.name}
                                                className="h-16 w-24 shrink-0 rounded-xl border border-tijum-surface/80 object-cover dark:border-border"
                                            />
                                        ) : (
                                            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                                <ImageIcon
                                                    className="size-6"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[11px] capitalize"
                                                >
                                                    {b.placement.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </Badge>
                                                <StatusBadge
                                                    status={getBannerSemanticStatus(
                                                        b.status,
                                                    )}
                                                    label={b.status}
                                                    className="text-[11px] capitalize"
                                                />
                                                {b.campaign && (
                                                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        Campaign:{' '}
                                                        <strong className="text-tijum-plum dark:text-foreground">
                                                            {b.campaign.name}
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                                                {b.name}
                                            </h3>
                                            <p className="line-clamp-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {b.headline}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Eye
                                                        className="size-3.5 text-tijum-coral"
                                                        aria-hidden="true"
                                                    />
                                                    {b.impression_count.toLocaleString()}{' '}
                                                    views
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <MousePointerClick
                                                        className="size-3.5 text-tijum-coral"
                                                        aria-hidden="true"
                                                    />
                                                    {b.click_count.toLocaleString()}{' '}
                                                    clicks
                                                </span>
                                                {b.starts_at && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Calendar
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        {new Date(
                                                            b.starts_at,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link
                                                href={`/admin/marketing/banners/${b.id}/edit`}
                                            >
                                                <Edit3
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>Edit</span>
                                            </Link>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setBannerToDelete(b)}
                                            className="border-status-error-border text-status-error-fg hover:bg-status-error-bg/70 hover:text-status-error-fg"
                                            aria-label={`Delete banner ${b.name}`}
                                        >
                                            <Trash2
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {banners.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {banners.total ?? banners.data.length}
                                </span>{' '}
                                banner(s)
                            </p>
                            <Pagination
                                currentPage={banners.current_page ?? 1}
                                lastPage={banners.last_page ?? 1}
                                total={banners.total}
                                onPageChange={(page) =>
                                    router.get(
                                        '/admin/marketing/banners',
                                        { ...filters, page },
                                        { preserveState: true },
                                    )
                                }
                            />
                        </div>
                    </Card>
                )}

                <ConfirmationDialog
                    open={Boolean(bannerToDelete)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setBannerToDelete(null);
                        }
                    }}
                    title="Delete Promotional Banner"
                    description={
                        bannerToDelete
                            ? `Delete banner "${bannerToDelete.name}"? This placement will immediately be removed from live marketplace pages.`
                            : ''
                    }
                    confirmLabel="Delete Banner"
                    tone="destructive"
                    loading={isDeleting}
                    onConfirm={handleDeleteConfirm}
                />
            </div>
        </AdminLayout>
    );
}
