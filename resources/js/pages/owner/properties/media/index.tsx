import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Camera,
    CheckCircle2,
    Edit3,
    Lock,
    Star,
    Trash2,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { mediaModerationStatusMap } from '@/components/owner/properties/property-status-helpers';
import { PropertyStepNavigation } from '@/components/owner/properties/property-step-navigation';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { FileUploadField, FormField } from '@/components/shared/form-field';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { dashboard } from '@/routes/owner';
import {
    index as propertiesIndexRoute,
    show as showPropertyRoute,
} from '@/routes/owner/properties';
import {
    destroy as destroyMediaRoute,
    index as mediaIndexRoute,
    reorder as reorderMediaRoute,
    store as storeMediaRoute,
    update as updateMediaRoute,
} from '@/routes/owner/properties/media';
import type {
    PropertyMediaCategory,
    PropertyMediaData,
    PropertyRoomData,
    PropertyRoomTypeData,
    PropertySummaryData,
    PropertyVerificationEvaluation,
} from '@/types';

type MediaCategoryOption = {
    value: PropertyMediaCategory;
    label: string;
    is_room_category: boolean;
};

type PropertyMediaPageProps = {
    property: PropertySummaryData;
    canManageInventory: boolean;
    media: PropertyMediaData[];
    roomTypes: PropertyRoomTypeData[];
    rooms: PropertyRoomData[];
    mediaCategories: MediaCategoryOption[];
    evaluation: PropertyVerificationEvaluation;
    maxImageSizeMb: number;
};

export default function PropertyMediaPage({
    property,
    canManageInventory,
    media,
    roomTypes,
    rooms,
    mediaCategories,
    evaluation,
    maxImageSizeMb,
}: PropertyMediaPageProps) {
    const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(
        null,
    );
    const [editingItem, setEditingItem] = useState<PropertyMediaData | null>(
        null,
    );
    const [editAltText, setEditAltText] = useState('');
    const [deletingItem, setDeletingItem] = useState<PropertyMediaData | null>(
        null,
    );
    const [busy, setBusy] = useState(false);
    const [uploadFieldKey, setUploadFieldKey] = useState(0);

    const uploadForm = useForm({
        image: null as File | null,
        media_type: 'exterior' as PropertyMediaCategory,
        alt_text: '',
        property_room_type_id: '',
        property_room_id: '',
        is_cover: !evaluation.has_cover_image,
        replaces_media_id: '',
    });

    const selectedCategory = mediaCategories.find(
        (c) => c.value === uploadForm.data.media_type,
    );
    const isRoomCategory = Boolean(selectedCategory?.is_room_category);

    useEffect(() => {
        if (!uploadForm.data.image) {
            setPreviewObjectUrl(null);
            return;
        }
        const url = URL.createObjectURL(uploadForm.data.image);
        setPreviewObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [uploadForm.data.image]);

    const handleUpload = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        uploadForm.post(storeMediaRoute.url(property.id), {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset(
                    'image',
                    'alt_text',
                    'property_room_type_id',
                    'property_room_id',
                    'replaces_media_id',
                );
                uploadForm.setData('is_cover', false);
                setUploadFieldKey((prev) => prev + 1);
            },
        });
    };

    const handleSetCover = (item: PropertyMediaData) => {
        router.patch(
            updateMediaRoute.url([property.id, item.id]),
            {
                alt_text: item.alt_text,
                media_type: item.media_type,
                is_cover: true,
            },
            { preserveScroll: true },
        );
    };

    const handleMove = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= media.length) {
            return;
        }
        const reordered = [...media];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);

        router.patch(
            reorderMediaRoute.url(property.id),
            { media_ids: reordered.map((m) => m.id) },
            { preserveScroll: true },
        );
    };

    const handleSaveAltText = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingItem) {
            return;
        }

        setBusy(true);
        router.patch(
            updateMediaRoute.url([property.id, editingItem.id]),
            {
                alt_text: editAltText,
                media_type: editingItem.media_type,
                is_cover: editingItem.is_cover,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setEditingItem(null);
                },
            },
        );
    };

    const handleDeleteConfirm = () => {
        if (!deletingItem) {
            return;
        }
        setBusy(true);
        router.delete(destroyMediaRoute.url([property.id, deletingItem.id]), {
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                setDeletingItem(null);
            },
        });
    };

    return (
        <>
            <Head title={`Photos & Gallery · ${property.name}`} />

            <div className="space-y-6">
                <PageHeader
                    eyebrow={`Step 5 · ${property.property_reference}`}
                    title={`Property & Room Photographs — ${property.name}`}
                    description={`Upload genuine property and room photographs (JPG, JPEG, PNG, or WebP up to ${maxImageSizeMb} MB). All uploaded files remain private and EXIF-stripped until BOTH individual image moderation and property verification are approved.`}
                />

                <PropertyStepNavigation
                    propertyId={property.id}
                    activeStep="media"
                    roomTypesCount={property.room_types_count}
                    roomsCount={property.rooms_count}
                />

                {!canManageInventory && (
                    <Alert variant="warning">
                        <Lock aria-hidden="true" />
                        <AlertTitle>Photograph Uploads Locked</AlertTitle>
                        <AlertDescription>
                            Photographs are locked while verification is under
                            review or on an approved listing without an active
                            Re-Verification Amendment.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-3 tabular-nums">
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Property-Level Photos
                            </p>
                            <p className="mt-1 font-heading text-xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.property_photos_count} /{' '}
                                {evaluation.min_property_photos} minimum
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Cover Image Designated
                            </p>
                            <p className="mt-1 font-heading text-xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.has_cover_image
                                    ? 'Selected'
                                    : 'Required'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Room-Type Photo Coverage
                            </p>
                            <p className="mt-1 font-heading text-xl font-bold text-tijum-plum dark:text-foreground">
                                {evaluation.room_types_missing_photos.length ===
                                0
                                    ? 'All Room Types Covered'
                                    : `${evaluation.room_types_missing_photos.length} Missing`}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {canManageInventory && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Upload Property or Room Photograph
                            </CardTitle>
                            <CardDescription>
                                Originals and unpublished WebP derivatives stay
                                strictly on private storage until moderation and
                                property approval complete.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleUpload}
                                className="grid gap-4 lg:grid-cols-3"
                            >
                                <div className="space-y-4">
                                    <FileUploadField
                                        key={uploadFieldKey}
                                        id="property-media-upload"
                                        name="image"
                                        label="Photograph File"
                                        accept=".jpg,.jpeg,.png,.webp"
                                        required
                                        disabled={uploadForm.processing}
                                        hint="Recommended min 800x600 px. SVG & executables blocked."
                                        error={uploadForm.errors.image}
                                        onFileChange={(file) =>
                                            uploadForm.setData('image', file)
                                        }
                                    />

                                    {previewObjectUrl && (
                                        <div className="overflow-hidden rounded-xl border border-tijum-surface bg-tijum-cream/40 dark:border-border dark:bg-muted/45">
                                            <img
                                                src={previewObjectUrl}
                                                alt="Selected upload preview"
                                                className="aspect-[16/9] w-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                                    <FormField
                                        id="media-category"
                                        label="Photograph Category"
                                        required
                                        error={uploadForm.errors.media_type}
                                        className="min-w-0"
                                    >
                                        {(a11y) => (
                                            <Select
                                                value={
                                                    uploadForm.data.media_type
                                                }
                                                onValueChange={(v) =>
                                                    uploadForm.setData(
                                                        'media_type',
                                                        v as PropertyMediaCategory,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id={a11y.id}
                                                    className="w-full min-w-0"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {mediaCategories.map(
                                                        (cat) => (
                                                            <SelectItem
                                                                key={cat.value}
                                                                value={
                                                                    cat.value
                                                                }
                                                            >
                                                                {cat.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </FormField>

                                    <FormField
                                        id="media-alt-text"
                                        label="Alt Text / Photo Caption"
                                        required
                                        error={uploadForm.errors.alt_text}
                                        className="min-w-0"
                                    >
                                        {(a11y) => (
                                            <Input
                                                {...a11y}
                                                name="alt_text"
                                                value={uploadForm.data.alt_text}
                                                placeholder="e.g. Front entrance & reception signage"
                                                onChange={(e) =>
                                                    uploadForm.setData(
                                                        'alt_text',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        )}
                                    </FormField>

                                    <FormField
                                        id="media-room-type"
                                        label={
                                            isRoomCategory
                                                ? 'Room Type (Required for Room Photos)'
                                                : 'Linked Room Type (Optional)'
                                        }
                                        required={isRoomCategory}
                                        error={
                                            uploadForm.errors
                                                .property_room_type_id
                                        }
                                        className="min-w-0"
                                    >
                                        {(a11y) => (
                                            <Select
                                                value={
                                                    uploadForm.data
                                                        .property_room_type_id ||
                                                    'none'
                                                }
                                                onValueChange={(v) =>
                                                    uploadForm.setData(
                                                        'property_room_type_id',
                                                        v === 'none' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id={a11y.id}
                                                    className="w-full min-w-0"
                                                >
                                                    <SelectValue placeholder="Property-wide visual" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        None (Property-level)
                                                    </SelectItem>
                                                    {roomTypes.map((rt) => (
                                                        <SelectItem
                                                            key={rt.id}
                                                            value={String(
                                                                rt.id,
                                                            )}
                                                        >
                                                            {rt.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </FormField>

                                    <FormField
                                        id="media-room-id"
                                        label="Linked Physical Room (Optional)"
                                        error={
                                            uploadForm.errors.property_room_id
                                        }
                                        className="min-w-0"
                                    >
                                        {(a11y) => (
                                            <Select
                                                value={
                                                    uploadForm.data
                                                        .property_room_id ||
                                                    'none'
                                                }
                                                onValueChange={(v) =>
                                                    uploadForm.setData(
                                                        'property_room_id',
                                                        v === 'none' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id={a11y.id}
                                                    className="w-full min-w-0"
                                                >
                                                    <SelectValue placeholder="Optional physical room" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        No specific physical
                                                        room
                                                    </SelectItem>
                                                    {rooms.map((r) => (
                                                        <SelectItem
                                                            key={r.id}
                                                            value={String(r.id)}
                                                        >
                                                            Room {r.room_number}{' '}
                                                            ({r.room_type_name})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </FormField>

                                    <div className="flex items-center justify-between rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3 sm:col-span-2 dark:border-border dark:bg-muted/35">
                                        <div>
                                            <Label
                                                htmlFor="media-is-cover"
                                                className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                Designate as Primary Cover Image
                                            </Label>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                At least one active property
                                                cover image is required prior to
                                                submission.
                                            </p>
                                        </div>
                                        <Switch
                                            id="media-is-cover"
                                            checked={uploadForm.data.is_cover}
                                            onCheckedChange={(checked) =>
                                                uploadForm.setData(
                                                    'is_cover',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="flex justify-end sm:col-span-2">
                                        <Button
                                            type="submit"
                                            loading={uploadForm.processing}
                                            data-test="upload-property-photo-btn"
                                        >
                                            <Camera aria-hidden="true" />
                                            <span>Upload Photograph</span>
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {media.length === 0 ? (
                    <EmptyState
                        icon={Camera}
                        title="No photographs uploaded yet"
                        description="Upload at least 3 genuine property photos (including 1 cover image) plus 1 room photo for each configured room type."
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {media.map((item, idx) => (
                            <Card
                                key={item.id}
                                className="flex flex-col overflow-hidden py-0 transition-all hover:border-tijum-coral/40 hover:shadow-md"
                            >
                                <div className="relative aspect-[16/9] w-full bg-tijum-cream dark:bg-muted">
                                    <img
                                        src={
                                            item.public_thumbnail_url ??
                                            item.thumbnail_preview_url
                                        }
                                        alt={item.alt_text}
                                        className="size-full object-cover"
                                    />
                                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                                        {item.is_cover && (
                                            <Badge variant="default">
                                                <Star
                                                    className="mr-1 size-3"
                                                    aria-hidden="true"
                                                />
                                                Cover Image
                                            </Badge>
                                        )}
                                        <Badge variant="plum">
                                            {item.media_type_label}
                                        </Badge>
                                    </div>
                                </div>

                                <CardContent className="flex flex-1 flex-col justify-between gap-3 py-4 text-xs">
                                    <div className="space-y-2">
                                        <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            {item.alt_text}
                                        </p>
                                        <p className="text-tijum-plum-muted dark:text-muted-foreground tabular-nums">
                                            {item.width}x{item.height} px ·{' '}
                                            {item.file_size_label}
                                            {item.room_type_name
                                                ? ` · ${item.room_type_name}`
                                                : ''}
                                            {item.room_number
                                                ? ` · Room ${item.room_number}`
                                                : ''}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <StatusBadge
                                                status={
                                                    mediaModerationStatusMap[
                                                        item.moderation_status
                                                    ]
                                                }
                                                label={
                                                    item.moderation_status_label
                                                }
                                            />
                                            <Badge variant="outline">
                                                {item.publication_status_label}
                                            </Badge>
                                        </div>
                                        {item.moderation_note && (
                                            <p className="rounded-lg bg-status-error-bg px-2.5 py-1.5 text-status-error-fg">
                                                Reviewer note:{' '}
                                                {item.moderation_note}
                                            </p>
                                        )}
                                        {item.pending_removal_in_application_id && (
                                            <p className="rounded-lg bg-status-warning-bg px-2.5 py-1.5 text-status-warning-fg">
                                                Scheduled for removal when
                                                amendment promotes.
                                            </p>
                                        )}
                                    </div>

                                    {canManageInventory && (
                                        <div className="flex flex-wrap items-center gap-1.5 border-t border-tijum-surface pt-3 dark:border-border">
                                            {!item.is_cover && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleSetCover(item)
                                                    }
                                                >
                                                    <CheckCircle2
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Set Cover</span>
                                                </Button>
                                            )}

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                aria-label={`Move ${item.alt_text} earlier`}
                                                disabled={idx === 0}
                                                onClick={() =>
                                                    handleMove(idx, -1)
                                                }
                                            >
                                                <ArrowUp aria-hidden="true" />
                                            </Button>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                aria-label={`Move ${item.alt_text} later`}
                                                disabled={
                                                    idx === media.length - 1
                                                }
                                                onClick={() =>
                                                    handleMove(idx, 1)
                                                }
                                            >
                                                <ArrowDown aria-hidden="true" />
                                            </Button>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                aria-label={`Edit metadata for ${item.alt_text}`}
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setEditAltText(
                                                        item.alt_text,
                                                    );
                                                }}
                                            >
                                                <Edit3 aria-hidden="true" />
                                            </Button>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="destructive"
                                                aria-label={`Delete ${item.alt_text}`}
                                                onClick={() =>
                                                    setDeletingItem(item)
                                                }
                                            >
                                                <Trash2 aria-hidden="true" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog
                    open={editingItem !== null}
                    onOpenChange={(open) => !open && setEditingItem(null)}
                >
                    <DialogContent>
                        <form
                            onSubmit={handleSaveAltText}
                            className="space-y-4"
                        >
                            <DialogHeader>
                                <DialogTitle>
                                    Update Alt Description
                                </DialogTitle>
                                <DialogDescription>
                                    Clear photo captions help guests and
                                    administrators understand property spaces.
                                </DialogDescription>
                            </DialogHeader>
                            <FormField
                                id="edit-media-alt"
                                label="Descriptive Alt Text"
                                required
                            >
                                {(a11y) => (
                                    <Input
                                        {...a11y}
                                        value={editAltText}
                                        onChange={(e) =>
                                            setEditAltText(e.target.value)
                                        }
                                    />
                                )}
                            </FormField>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingItem(null)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" loading={busy}>
                                    Save Caption
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <ConfirmationDialog
                    open={deletingItem !== null}
                    onOpenChange={(open) => !open && setDeletingItem(null)}
                    tone="destructive"
                    title="Remove Photograph?"
                    description="Unpublished draft photographs are deleted cleanly. Previously published photos in an active amendment stay live until the amendment promotes."
                    confirmLabel="Remove Photograph"
                    loading={busy}
                    onConfirm={handleDeleteConfirm}
                />
            </div>
        </>
    );
}

PropertyMediaPage.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'My Properties', href: propertiesIndexRoute() },
        { title: 'Property Overview', href: showPropertyRoute(1) },
        { title: 'Photos', href: mediaIndexRoute(1) },
    ],
};
