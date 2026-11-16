import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Copy,
    Edit3,
    FileText,
    HardDrive,
    Image as ImageIcon,
    Layers,
    Search,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import AdminLayout from '@/layouts/admin-layout';
import type { MediaAsset } from '@/types/cms';

interface Props {
    assets: {
        data: MediaAsset[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search?: string | null;
        mime_type?: string | null;
    };
}

export default function AdminMediaIndex({ assets, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [mimeFilter, setMimeFilter] = useState(filters.mime_type || 'all');
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<MediaAsset | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const uploadForm = useForm({
        file: null as File | null,
        title: '',
        alt_text: '',
        caption: '',
    });

    const editForm = useForm({
        title: '',
        alt_text: '',
        caption: '',
    });

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const pageStorageBytes = assets.data.reduce(
        (sum, asset) => sum + (asset.file_size_bytes || 0),
        0,
    );
    const hasActiveFilters = Boolean(filters.search || filters.mime_type);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/content/media',
            {
                search: searchTerm.trim() || undefined,
                mime_type: mimeFilter !== 'all' ? mimeFilter : undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setMimeFilter('all');
        router.get('/admin/content/media', {}, { preserveState: true });
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        uploadForm.post('/admin/content/media', {
            preserveScroll: true,
            onSuccess: () => {
                uploadForm.reset();
                uploadForm.clearErrors();
                setIsUploadOpen(false);
            },
        });
    };

    const handleCopyUrl = (asset: MediaAsset) => {
        if (navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(asset.url);
        }
        setCopiedId(asset.id);
        window.setTimeout(() => setCopiedId(null), 2000);
    };

    const handleEditOpen = (asset: MediaAsset) => {
        setEditingAsset(asset);
        editForm.clearErrors();
        editForm.setData({
            title: asset.title || '',
            alt_text: asset.alt_text || '',
            caption: asset.caption || '',
        });
    };

    const handleEditSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAsset) return;
        editForm.put(`/admin/content/media/${editingAsset.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingAsset(null);
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deletingAsset) return;
        setIsDeleting(true);
        router.delete(`/admin/content/media/${deletingAsset.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingAsset?.id === deletingAsset.id) {
                    setEditingAsset(null);
                }
                setDeletingAsset(null);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/admin/dashboard' },
                { title: 'Content Management', href: '/admin/content/pages' },
                { title: 'Media Library', href: '/admin/content/media' },
            ]}
        >
            <Head title="Media Library — Marketplace CMS" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Content Management"
                    title="Media Library"
                    description="Centralized asset repository for blog articles, CMS pages, city guides, and promotional banners."
                    actions={
                        <Button
                            type="button"
                            variant="plum"
                            size="sm"
                            onClick={() => setIsUploadOpen((prev) => !prev)}
                        >
                            <UploadCloud
                                className="size-4"
                                aria-hidden="true"
                            />
                            <span>
                                {isUploadOpen
                                    ? 'Hide Uploader'
                                    : 'Upload Asset'}
                            </span>
                        </Button>
                    }
                />

                <section
                    aria-label="Media repository overview"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <StatCard
                        label="Total Assets"
                        value={assets.total}
                        helperText="Indexed media files"
                        icon={ImageIcon}
                    />
                    <StatCard
                        label="Assets (This Page)"
                        value={assets.data.length}
                        helperText={`Page ${assets.current_page} of ${Math.max(1, assets.last_page)}`}
                        icon={Layers}
                    />
                    <StatCard
                        label="Page Payload"
                        value={formatBytes(pageStorageBytes)}
                        helperText="Combined size on page"
                        icon={HardDrive}
                    />
                </section>

                {/* Upload Drawer/Card */}
                {isUploadOpen && (
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/70 pb-4 dark:border-border">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <CardTitle className="text-base sm:text-lg">
                                        Upload New Media Asset
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        JPEG, PNG, WebP, or SVG up to 5 MB with
                                        descriptive accessibility metadata.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsUploadOpen(false);
                                        uploadForm.reset();
                                        uploadForm.clearErrors();
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div className="rounded-2xl border-2 border-dashed border-tijum-peach/80 bg-tijum-cream/35 p-6 text-center transition-colors hover:border-tijum-coral/60 hover:bg-tijum-cream/60 dark:border-border dark:bg-muted/35 dark:hover:border-tijum-coral/50 dark:hover:bg-muted/55">
                                    <input
                                        type="file"
                                        id="file_upload"
                                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                        onChange={(e) => {
                                            const selected =
                                                e.target.files?.[0];
                                            if (selected) {
                                                uploadForm.setData(
                                                    'file',
                                                    selected,
                                                );
                                                if (!uploadForm.data.title) {
                                                    uploadForm.setData(
                                                        'title',
                                                        selected.name.replace(
                                                            /\.[^/.]+$/,
                                                            '',
                                                        ),
                                                    );
                                                }
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="file_upload"
                                        className="block cursor-pointer space-y-2"
                                    >
                                        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                            <UploadCloud
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="font-heading text-sm font-semibold text-tijum-coral">
                                            {uploadForm.data.file
                                                ? `${uploadForm.data.file.name} (${formatBytes(uploadForm.data.file.size)})`
                                                : 'Click to select or drag and drop image'}
                                        </div>
                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            JPEG, PNG, WebP, SVG up to 5MB. Path
                                            traversal protected.
                                        </p>
                                    </label>
                                </div>
                                <InputError
                                    message={uploadForm.errors.file}
                                    className="text-xs"
                                />

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="upload_title"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Asset Title
                                        </Label>
                                        <Input
                                            id="upload_title"
                                            value={uploadForm.data.title}
                                            onChange={(e) =>
                                                uploadForm.setData(
                                                    'title',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. Hyderabad Hostel Dining Hall"
                                            className="h-10.5"
                                        />
                                        <InputError
                                            message={uploadForm.errors.title}
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="upload_alt"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Alt Text (Accessibility &amp; SEO)
                                        </Label>
                                        <Input
                                            id="upload_alt"
                                            value={uploadForm.data.alt_text}
                                            onChange={(e) =>
                                                uploadForm.setData(
                                                    'alt_text',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. Clean dining room with breakfast buffet"
                                            className="h-10.5"
                                        />
                                        <InputError
                                            message={uploadForm.errors.alt_text}
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="upload_caption"
                                            className="text-tijum-plum dark:text-foreground"
                                        >
                                            Caption (Optional)
                                        </Label>
                                        <Input
                                            id="upload_caption"
                                            value={uploadForm.data.caption}
                                            onChange={(e) =>
                                                uploadForm.setData(
                                                    'caption',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Editorial credit or context..."
                                            className="h-10.5"
                                        />
                                        <InputError
                                            message={uploadForm.errors.caption}
                                            className="text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        variant="plum"
                                        disabled={!uploadForm.data.file}
                                        loading={uploadForm.processing}
                                    >
                                        <UploadCloud
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Upload File</span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Search & Type Filter Bar */}
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
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Search media by title, filename, or alt text..."
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[175px]">
                                <Select
                                    value={mimeFilter}
                                    onValueChange={setMimeFilter}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue placeholder="All Formats" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Formats
                                        </SelectItem>
                                        <SelectItem value="image/jpeg">
                                            JPEG Images
                                        </SelectItem>
                                        <SelectItem value="image/png">
                                            PNG Images
                                        </SelectItem>
                                        <SelectItem value="image/webp">
                                            WebP Images
                                        </SelectItem>
                                        <SelectItem value="image/svg">
                                            SVG Graphics
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="submit" variant="plum" size="sm">
                                    Search
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

                {/* Media Assets Grid */}
                {assets.data.length === 0 ? (
                    <EmptyState
                        icon={ImageIcon}
                        title="No media assets found"
                        description="Upload images to use them in blog articles, CMS pages, and marketing campaigns."
                        action={
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearFilters}
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="plum"
                                    size="sm"
                                    onClick={() => setIsUploadOpen(true)}
                                >
                                    <UploadCloud
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Upload Asset</span>
                                </Button>
                            </div>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {assets.data.map((asset) => (
                            <Card
                                key={asset.id}
                                className="group gap-0 overflow-hidden py-0 transition hover:border-tijum-coral/60 dark:hover:border-tijum-coral/60"
                            >
                                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-tijum-cream/55 dark:bg-muted/60">
                                    {asset.mime_type.startsWith('image/') ? (
                                        <img
                                            src={asset.url}
                                            alt={
                                                asset.alt_text ||
                                                asset.original_name
                                            }
                                            className="size-full object-cover transition duration-300 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <FileText
                                            className="size-10 text-tijum-plum-muted dark:text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    )}

                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-tijum-plum/70 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 dark:bg-black/65">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyUrl(asset)}
                                            title="Copy URL"
                                            aria-label={`Copy URL for ${asset.title || asset.original_name}`}
                                            className="cursor-pointer rounded-full border border-tijum-surface/80 bg-white p-2 text-tijum-plum shadow-sm transition hover:bg-tijum-cream dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                                        >
                                            {copiedId === asset.id ? (
                                                <Check
                                                    className="size-4 text-status-success-fg"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Copy
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleEditOpen(asset)
                                            }
                                            title="Edit Metadata"
                                            aria-label={`Edit metadata for ${asset.title || asset.original_name}`}
                                            className="cursor-pointer rounded-full border border-tijum-surface/80 bg-white p-2 text-tijum-plum shadow-sm transition hover:bg-tijum-cream dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                                        >
                                            <Edit3
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDeletingAsset(asset)
                                            }
                                            title="Delete"
                                            aria-label={`Delete ${asset.title || asset.original_name}`}
                                            className="cursor-pointer rounded-full border border-status-error-border bg-white p-2 text-status-error-fg shadow-sm transition hover:bg-status-error-bg dark:bg-card dark:hover:bg-status-error-bg"
                                        >
                                            <Trash2
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                </div>

                                <CardContent className="flex flex-1 flex-col justify-between space-y-1 p-3 text-xs">
                                    <div
                                        className="truncate font-heading font-semibold text-tijum-plum dark:text-foreground"
                                        title={asset.original_name}
                                    >
                                        {asset.title || asset.original_name}
                                    </div>
                                    <div className="flex items-center justify-between font-mono text-[10px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                        <span>
                                            {formatBytes(asset.file_size_bytes)}
                                        </span>
                                        {asset.width && asset.height && (
                                            <span>
                                                {asset.width}x{asset.height}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {assets.last_page > 1 && (
                    <Pagination
                        currentPage={assets.current_page}
                        totalPages={assets.last_page}
                        onPageChange={(page) =>
                            router.get(
                                '/admin/content/media',
                                {
                                    search: searchTerm.trim() || undefined,
                                    mime_type:
                                        mimeFilter !== 'all'
                                            ? mimeFilter
                                            : undefined,
                                    page,
                                },
                                { preserveState: true, preserveScroll: true },
                            )
                        }
                    />
                )}
            </div>

            {/* Edit Metadata Dialog */}
            <Dialog
                open={Boolean(editingAsset)}
                onOpenChange={(open) => !open && setEditingAsset(null)}
            >
                <DialogContent className="max-w-lg border border-tijum-surface/80 bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle>Edit Asset Metadata</DialogTitle>
                        <DialogDescription>
                            Update title, accessibility alt text, and editorial
                            caption.
                        </DialogDescription>
                    </DialogHeader>

                    {editingAsset && (
                        <form
                            onSubmit={handleEditSave}
                            className="space-y-4 py-1"
                        >
                            {editingAsset.mime_type.startsWith('image/') && (
                                <div className="flex items-center gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-2.5 dark:border-border dark:bg-muted/45">
                                    <img
                                        src={editingAsset.url}
                                        alt={
                                            editingAsset.alt_text ||
                                            editingAsset.original_name
                                        }
                                        className="size-14 shrink-0 rounded-lg border border-tijum-surface/80 object-cover dark:border-border"
                                    />
                                    <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                                        <p className="truncate font-heading font-semibold text-tijum-plum dark:text-foreground">
                                            {editingAsset.original_name}
                                        </p>
                                        <p className="font-mono text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {formatBytes(
                                                editingAsset.file_size_bytes,
                                            )}
                                            {editingAsset.width &&
                                            editingAsset.height
                                                ? ` · ${editingAsset.width}x${editingAsset.height}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit_title"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Title
                                </Label>
                                <Input
                                    id="edit_title"
                                    value={editForm.data.title}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'title',
                                            e.target.value,
                                        )
                                    }
                                    className="h-10.5"
                                />
                                <InputError
                                    message={editForm.errors.title}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit_alt"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Alt Text
                                </Label>
                                <Input
                                    id="edit_alt"
                                    value={editForm.data.alt_text}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'alt_text',
                                            e.target.value,
                                        )
                                    }
                                    className="h-10.5"
                                />
                                <InputError
                                    message={editForm.errors.alt_text}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit_caption"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    Caption
                                </Label>
                                <Input
                                    id="edit_caption"
                                    value={editForm.data.caption}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'caption',
                                            e.target.value,
                                        )
                                    }
                                    className="h-10.5"
                                />
                                <InputError
                                    message={editForm.errors.caption}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="edit_file_url"
                                    className="text-tijum-plum dark:text-foreground"
                                >
                                    File URL
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="edit_file_url"
                                        value={editingAsset.url}
                                        readOnly
                                        className="h-10.5 font-mono text-xs"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-10.5 shrink-0"
                                        onClick={() =>
                                            handleCopyUrl(editingAsset)
                                        }
                                    >
                                        {copiedId === editingAsset.id ? (
                                            <Check
                                                className="size-4 text-status-success-fg"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Copy
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>
                                            {copiedId === editingAsset.id
                                                ? 'Copied'
                                                : 'Copy'}
                                        </span>
                                    </Button>
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingAsset(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="plum"
                                    loading={editForm.processing}
                                >
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={Boolean(deletingAsset)}
                onOpenChange={(open) => !open && setDeletingAsset(null)}
                title="Delete Media Asset?"
                description={`Permanently delete media file "${deletingAsset?.original_name}"? Any CMS pages or articles referencing its URL will lose this asset.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete Asset'}
                cancelLabel="Cancel"
                variant="destructive"
                loading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingAsset(null)}
            />
        </AdminLayout>
    );
}
