import { ChevronLeft, ChevronRight, ImageIcon, Images } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { PropertyDetailPayload } from '@/types/public-search';
import { galleryPhotoLabel } from './utils';

type GalleryPhoto = PropertyDetailPayload['gallery'][number];

type PropertyGalleryShowcaseProps = {
    propertyName: string;
    locationLabel: string;
    images: GalleryPhoto[];
};

function GalleryImageTile({
    photo,
    propertyName,
    index,
    onOpen,
    priority = false,
    badgeLabel,
    moreOverlayCount = 0,
    className = '',
}: {
    photo: GalleryPhoto;
    propertyName: string;
    index: number;
    onOpen: (index: number) => void;
    priority?: boolean;
    badgeLabel?: string;
    moreOverlayCount?: number;
    className?: string;
}) {
    const src = priority ? photo.url || photo.thumbnail_url : photo.thumbnail_url || photo.url;

    return (
        <button
            type="button"
            onClick={() => onOpen(index)}
            aria-label={
                moreOverlayCount > 0
                    ? `View all photos starting from photo ${index + 1}`
                    : `View photo ${index + 1}: ${galleryPhotoLabel(photo)}`
            }
            className={`group relative overflow-hidden bg-tijum-surface/40 text-left focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none ${className}`}
        >
            {src ? (
                <img
                    src={src}
                    alt={
                        photo.alt_text ||
                        `${propertyName} — ${galleryPhotoLabel(photo)}`
                    }
                    width={priority ? 1200 : 600}
                    height={priority ? 800 : 450}
                    fetchPriority={priority ? 'high' : undefined}
                    loading={priority ? undefined : 'lazy'}
                    className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                />
            ) : (
                <span className="flex h-full w-full items-center justify-center text-tijum-lavender">
                    <ImageIcon className="size-7" aria-hidden="true" />
                </span>
            )}

            <span className="pointer-events-none absolute inset-0 bg-tijum-plum/0 transition-colors duration-300 group-hover:bg-tijum-plum/10" />

            {badgeLabel && moreOverlayCount === 0 && (
                <span className="pointer-events-none absolute top-3.5 left-3.5 inline-flex items-center rounded-full bg-tijum-plum/85 px-3 py-1 font-heading text-xs font-semibold text-tijum-cream backdrop-blur-xs">
                    {badgeLabel}
                </span>
            )}

            {moreOverlayCount > 0 && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-tijum-plum/65 font-heading text-sm font-bold text-tijum-cream backdrop-blur-[2px] transition-colors group-hover:bg-tijum-plum/75">
                    <span>+{moreOverlayCount} more</span>
                    <span className="text-xs font-medium text-tijum-cream/85">
                        Open gallery
                    </span>
                </span>
            )}
        </button>
    );
}

export function PropertyGalleryShowcase({
    propertyName,
    locationLabel,
    images,
}: PropertyGalleryShowcaseProps) {
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        if (!galleryOpen || images.length <= 1) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setActiveImage(
                    (current) => (current - 1 + images.length) % images.length,
                );
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                setActiveImage((current) => (current + 1) % images.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [galleryOpen, images.length]);

    const openAt = (index: number) => {
        setActiveImage(index);
        setGalleryOpen(true);
    };

    const goToPrevious = () => {
        if (images.length <= 1) {
            return;
        }
        setActiveImage(
            (current) => (current - 1 + images.length) % images.length,
        );
    };

    const goToNext = () => {
        if (images.length <= 1) {
            return;
        }
        setActiveImage((current) => (current + 1) % images.length);
    };

    if (images.length === 0) {
        return (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-tijum-surface bg-white/80 px-6 py-14 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-tijum-peach/30 text-tijum-plum">
                    <ImageIcon className="size-7" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                    <p className="font-heading text-base font-semibold text-tijum-plum">
                        Property photography coming soon
                    </p>
                    <p className="text-sm text-tijum-lavender">
                        Verified room types, pricing, and meal details below are
                        live for {propertyName}.
                    </p>
                </div>
            </div>
        );
    }

    const activePhoto = images[activeImage] ?? images[0];
    const activePhotoLabel = galleryPhotoLabel(activePhoto);

    return (
        <>
            <div className="relative overflow-hidden rounded-[28px] border border-tijum-surface bg-white shadow-tijum-soft">
                {images.length === 1 && (
                    <div className="grid">
                        <GalleryImageTile
                            photo={images[0]}
                            propertyName={propertyName}
                            index={0}
                            onOpen={openAt}
                            priority
                            badgeLabel={galleryPhotoLabel(images[0])}
                            className="aspect-[16/10] max-h-[500px] w-full lg:aspect-[21/10]"
                        />
                    </div>
                )}

                {images.length === 2 && (
                    <div className="grid gap-2 sm:grid-cols-12 lg:h-[440px]">
                        <GalleryImageTile
                            photo={images[0]}
                            propertyName={propertyName}
                            index={0}
                            onOpen={openAt}
                            priority
                            badgeLabel={galleryPhotoLabel(images[0])}
                            className="aspect-[16/11] sm:col-span-7 sm:aspect-auto sm:h-full"
                        />
                        <GalleryImageTile
                            photo={images[1]}
                            propertyName={propertyName}
                            index={1}
                            onOpen={openAt}
                            badgeLabel={galleryPhotoLabel(images[1])}
                            className="aspect-[16/11] sm:col-span-5 sm:aspect-auto sm:h-full"
                        />
                    </div>
                )}

                {images.length === 3 && (
                    <div className="grid gap-2 lg:h-[460px] lg:grid-cols-12">
                        <GalleryImageTile
                            photo={images[0]}
                            propertyName={propertyName}
                            index={0}
                            onOpen={openAt}
                            priority
                            badgeLabel={galleryPhotoLabel(images[0])}
                            className="aspect-[16/10] lg:col-span-8 lg:aspect-auto lg:h-full"
                        />
                        <div className="grid grid-cols-2 gap-2 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-2">
                            <GalleryImageTile
                                photo={images[1]}
                                propertyName={propertyName}
                                index={1}
                                onOpen={openAt}
                                badgeLabel={galleryPhotoLabel(images[1])}
                                className="aspect-[4/3] lg:aspect-auto lg:h-full"
                            />
                            <GalleryImageTile
                                photo={images[2]}
                                propertyName={propertyName}
                                index={2}
                                onOpen={openAt}
                                badgeLabel={galleryPhotoLabel(images[2])}
                                className="aspect-[4/3] lg:aspect-auto lg:h-full"
                            />
                        </div>
                    </div>
                )}

                {images.length === 4 && (
                    <div className="grid gap-2 lg:h-[470px] lg:grid-cols-12">
                        <GalleryImageTile
                            photo={images[0]}
                            propertyName={propertyName}
                            index={0}
                            onOpen={openAt}
                            priority
                            badgeLabel={galleryPhotoLabel(images[0])}
                            className="aspect-[16/10] lg:col-span-7 lg:aspect-auto lg:h-full"
                        />
                        <div className="grid grid-cols-3 gap-2 lg:col-span-5 lg:grid-cols-2 lg:grid-rows-2">
                            <GalleryImageTile
                                photo={images[1]}
                                propertyName={propertyName}
                                index={1}
                                onOpen={openAt}
                                className="aspect-[4/3] lg:col-span-2 lg:aspect-auto lg:h-full"
                            />
                            <GalleryImageTile
                                photo={images[2]}
                                propertyName={propertyName}
                                index={2}
                                onOpen={openAt}
                                className="aspect-[4/3] lg:aspect-auto lg:h-full"
                            />
                            <GalleryImageTile
                                photo={images[3]}
                                propertyName={propertyName}
                                index={3}
                                onOpen={openAt}
                                className="aspect-[4/3] lg:aspect-auto lg:h-full"
                            />
                        </div>
                    </div>
                )}

                {images.length >= 5 && (
                    <div className="grid gap-2 lg:h-[480px] lg:grid-cols-12">
                        <GalleryImageTile
                            photo={images[0]}
                            propertyName={propertyName}
                            index={0}
                            onOpen={openAt}
                            priority
                            badgeLabel={galleryPhotoLabel(images[0])}
                            className="aspect-[16/10] lg:col-span-6 lg:aspect-auto lg:h-full"
                        />
                        <div className="grid grid-cols-4 gap-2 lg:col-span-6 lg:grid-cols-2 lg:grid-rows-2">
                            {images.slice(1, 5).map((photo, offset) => {
                                const index = offset + 1;
                                const isLastVisible = offset === 3;
                                const remaining =
                                    isLastVisible && images.length > 5
                                        ? images.length - 5
                                        : 0;

                                return (
                                    <GalleryImageTile
                                        key={`${photo.url ?? 'tile'}-${index}`}
                                        photo={photo}
                                        propertyName={propertyName}
                                        index={index}
                                        onOpen={openAt}
                                        moreOverlayCount={remaining}
                                        className="aspect-square sm:aspect-[4/3] lg:aspect-auto lg:h-full"
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="pointer-events-none absolute right-3 bottom-3 sm:right-4 sm:bottom-4">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openAt(0)}
                        className="pointer-events-auto gap-1.5 rounded-full border-tijum-plum/20 bg-white/95 font-heading text-xs font-semibold text-tijum-plum shadow-md backdrop-blur-xs hover:bg-tijum-cream"
                    >
                        <Images className="size-3.5" aria-hidden="true" />
                        <span>
                            {images.length === 1
                                ? 'View photo'
                                : `Show all ${images.length} photos`}
                        </span>
                    </Button>
                </div>
            </div>

            <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
                <DialogContent className="tijum-public max-h-[94vh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto border-tijum-surface bg-tijum-cream p-5 sm:max-w-5xl sm:p-6 lg:max-w-6xl">
                    <DialogHeader className="space-y-1.5 pr-8">
                        <div className="flex flex-wrap items-center gap-2">
                            <DialogTitle className="font-heading text-lg font-bold text-tijum-plum sm:text-xl">
                                {propertyName}
                            </DialogTitle>
                            <Badge variant="peach" className="tabular-nums">
                                Photo {activeImage + 1} of {images.length}
                            </Badge>
                            {activePhotoLabel && (
                                <Badge variant="outline">
                                    {activePhotoLabel}
                                </Badge>
                            )}
                        </div>
                        <DialogDescription className="text-xs text-tijum-lavender sm:text-sm">
                            {activePhoto?.alt_text || locationLabel}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-[22px] border border-tijum-surface bg-tijum-plum">
                            <div className="h-[48vh] max-h-[640px] min-h-[300px] w-full sm:h-[60vh]">
                                {activePhoto?.url ? (
                                    <img
                                        src={activePhoto.url}
                                        alt={
                                            activePhoto.alt_text ||
                                            `${propertyName} photo ${activeImage + 1}`
                                        }
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-tijum-cream/70">
                                        <ImageIcon
                                            className="size-10"
                                            aria-hidden="true"
                                        />
                                    </div>
                                )}
                            </div>

                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={goToPrevious}
                                        aria-label="Previous gallery photo"
                                        className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-tijum-surface bg-white text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:left-4 sm:size-11"
                                    >
                                        <ChevronLeft
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goToNext}
                                        aria-label="Next gallery photo"
                                        className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-tijum-surface bg-white text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:right-4 sm:size-11"
                                    >
                                        <ChevronRight
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </>
                            )}
                        </div>

                        {images.length > 1 && (
                            <div
                                className="flex gap-2 overflow-x-auto pb-1"
                                role="list"
                                aria-label="Gallery filmstrip"
                            >
                                {images.map((image, index) => (
                                    <button
                                        key={`${image.url ?? 'modal-thumb'}-${index}`}
                                        type="button"
                                        onClick={() => setActiveImage(index)}
                                        aria-label={`Jump to photo ${index + 1}`}
                                        aria-pressed={activeImage === index}
                                        className={`size-16 shrink-0 overflow-hidden rounded-xl border transition-all focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:size-20 ${
                                            activeImage === index
                                                ? 'border-tijum-coral ring-2 ring-tijum-coral/40'
                                                : 'border-tijum-surface opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {image.thumbnail_url || image.url ? (
                                            <img
                                                src={
                                                    image.thumbnail_url ||
                                                    image.url ||
                                                    ''
                                                }
                                                alt={
                                                    image.alt_text ||
                                                    `${propertyName} thumbnail ${index + 1}`
                                                }
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center bg-tijum-surface/40 text-tijum-lavender">
                                                <ImageIcon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
