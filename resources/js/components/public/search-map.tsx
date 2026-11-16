import { Link } from '@inertiajs/react';
import {
    Building2,
    Compass,
    Layers,
    MapPin,
    Minus,
    Navigation,
    Plus,
    RotateCcw,
    Star,
    Utensils,
    X,
} from 'lucide-react';
import type {
    MouseEvent as ReactMouseEvent,
    TouchEvent as ReactTouchEvent,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BrandLogo, { TIJUM_BRAND_ASSETS } from '@/components/brand/brand-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { show as propertyShow } from '@/routes/public/properties';
import type { SearchResultCard } from '@/types/public-search';

export type SearchMapProps = {
    properties: SearchResultCard[];
    selectedSlug?: string | null;
    onSelectProperty?: (slug: string | null) => void;
    cityName?: string;
    className?: string;
};

// Canonical City Center Coordinates
const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> =
    {
        hyderabad: { lat: 17.4485, lng: 78.3741, zoom: 13 },
        guntur: { lat: 16.3042, lng: 80.4418, zoom: 14 },
        vijayawada: { lat: 16.5085, lng: 80.6542, zoom: 13 },
        visakhapatnam: { lat: 17.7312, lng: 83.3156, zoom: 13 },
    };

// Fallback offsets when coordinates are identical or null
const DEMO_OFFSETS: Array<{ lat: number; lng: number }> = [
    { lat: 0, lng: 0 },
    { lat: 0.008, lng: 0.01 },
    { lat: -0.007, lng: 0.009 },
    { lat: 0.006, lng: -0.011 },
    { lat: -0.009, lng: -0.008 },
    { lat: 0.012, lng: 0.005 },
    { lat: -0.011, lng: 0.012 },
    { lat: 0.005, lng: 0.015 },
];

function project(
    lat: number,
    lng: number,
    zoom: number,
): { x: number; y: number } {
    const siny = Math.min(
        Math.max(Math.sin((lat * Math.PI) / 180), -0.9999),
        0.9999,
    );
    const scale = 256 * Math.pow(2, zoom);
    return {
        x: ((lng + 180) / 360) * scale,
        y:
            ((1 - Math.log((1 + siny) / (1 - siny)) / (2 * Math.PI)) / 2) *
            scale,
    };
}

function formatPriceShort(amountMinor?: number): string {
    if (!amountMinor) return 'View rate';
    const rupees = Math.round(amountMinor / 100);
    if (rupees >= 100000) {
        return `₹${(rupees / 100000).toFixed(1)}L`;
    }
    if (rupees >= 1000) {
        return `₹${(rupees / 1000).toFixed(1)}k`;
    }
    return `₹${rupees}`;
}

export function SearchMap({
    properties,
    selectedSlug,
    onSelectProperty,
    cityName = 'All Cities',
    className,
}: SearchMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 600 });
    const [mapStyle, setMapStyle] = useState<'voyager' | 'osm'>('voyager');

    // Resolve initial center and zoom based on city or property coordinates
    const defaultCenter = useMemo(() => {
        const slug = cityName.toLowerCase().trim().replace(/\s+/g, '-');
        if (CITY_CENTERS[slug]) {
            return CITY_CENTERS[slug];
        }

        // Compute average center from properties with coordinates
        const withCoords = properties.filter((p) => p.latitude && p.longitude);
        if (withCoords.length > 0) {
            const avgLat =
                withCoords.reduce((sum, p) => sum + (p.latitude ?? 0), 0) /
                withCoords.length;
            const avgLng =
                withCoords.reduce((sum, p) => sum + (p.longitude ?? 0), 0) /
                withCoords.length;
            return { lat: avgLat, lng: avgLng, zoom: 12 };
        }

        // Platform default: Hyderabad hub
        return CITY_CENTERS.hyderabad;
    }, [cityName, properties]);

    const [center, setCenter] = useState<{ lat: number; lng: number }>(
        defaultCenter,
    );
    const [zoom, setZoom] = useState<number>(defaultCenter.zoom);
    const [activeSlug, setActiveSlug] = useState<string | null>(
        selectedSlug ?? null,
    );

    // Track dragging/pan
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Sync dimensions
    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth || 600,
                    height: containerRef.current.clientHeight || 600,
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Sync selectedSlug prop
    useEffect(() => {
        if (selectedSlug !== undefined) {
            setActiveSlug(selectedSlug);
            if (selectedSlug) {
                const target = properties.find((p) => p.slug === selectedSlug);
                if (target?.latitude && target?.longitude) {
                    setCenter({ lat: target.latitude, lng: target.longitude });
                }
            }
        }
    }, [selectedSlug, properties]);

    // Update center when defaultCenter changes
    useEffect(() => {
        setCenter(defaultCenter);
        setZoom(defaultCenter.zoom);
    }, [defaultCenter]);

    // Active property details
    const activeItem = useMemo(() => {
        const target = activeSlug ?? selectedSlug;
        return properties.find((p) => p.slug === target) ?? null;
    }, [activeSlug, selectedSlug, properties]);

    // Markers mapped with real GPS coordinates
    const markers = useMemo(() => {
        return properties.map((item, index) => {
            let lat = item.latitude;
            let lng = item.longitude;

            if (!lat || !lng) {
                const citySlug = (item.city?.slug ?? cityName).toLowerCase();
                const cityBase =
                    CITY_CENTERS[citySlug] ?? CITY_CENTERS.hyderabad;
                const offset = DEMO_OFFSETS[index % DEMO_OFFSETS.length];
                lat = cityBase.lat + offset.lat;
                lng = cityBase.lng + offset.lng;
            }

            return {
                item,
                lat,
                lng,
            };
        });
    }, [properties, cityName]);

    // Tile calculations based on center and zoom
    const { tiles, centerPixel, topLeft } = useMemo(() => {
        const cp = project(center.lat, center.lng, zoom);
        const tlX = cp.x - dimensions.width / 2;
        const tlY = cp.y - dimensions.height / 2;

        const minTileX = Math.floor(tlX / 256);
        const maxTileX = Math.floor((tlX + dimensions.width) / 256);
        const minTileY = Math.floor(tlY / 256);
        const maxTileY = Math.floor((tlY + dimensions.height) / 256);

        const list: Array<{
            x: number;
            y: number;
            posX: number;
            posY: number;
            key: string;
        }> = [];
        const maxTileIndex = Math.pow(2, zoom);

        for (let tx = minTileX; tx <= maxTileX; tx++) {
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                if (ty < 0 || ty >= maxTileIndex) continue;
                const wrappedX =
                    ((tx % maxTileIndex) + maxTileIndex) % maxTileIndex;
                list.push({
                    x: wrappedX,
                    y: ty,
                    posX: tx * 256 - tlX,
                    posY: ty * 256 - tlY,
                    key: `${zoom}-${wrappedX}-${ty}`,
                });
            }
        }

        return { tiles: list, centerPixel: cp, topLeft: { x: tlX, y: tlY } };
    }, [center, zoom, dimensions]);

    // Pan handlers
    const handleMouseDown = (e: ReactMouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: ReactMouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setDragStart({ x: e.clientX, y: e.clientY });

        // Convert delta pixels to lat/lng delta
        const scale = 256 * Math.pow(2, zoom);
        const dLng = (-dx / scale) * 360;
        const dLat = (dy / scale) * 180;

        setCenter((prev) => ({
            lat: Math.max(-85, Math.min(85, prev.lat + dLat)),
            lng: prev.lng + dLng,
        }));
    };

    const handleMouseUp = () => setIsDragging(false);

    // Touch support for mobile/tablets
    const handleTouchStart = (e: ReactTouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleTouchMove = (e: ReactTouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - dragStart.x;
        const dy = e.touches[0].clientY - dragStart.y;
        setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });

        const scale = 256 * Math.pow(2, zoom);
        const dLng = (-dx / scale) * 360;
        const dLat = (dy / scale) * 180;

        setCenter((prev) => ({
            lat: Math.max(-85, Math.min(85, prev.lat + dLat)),
            lng: prev.lng + dLng,
        }));
    };

    const handleTouchEnd = () => setIsDragging(false);

    // Zoom controls
    const zoomIn = () => setZoom((z) => Math.min(17, z + 1));
    const zoomOut = () => setZoom((z) => Math.max(9, z - 1));
    const resetView = () => {
        setCenter(defaultCenter);
        setZoom(defaultCenter.zoom);
        setActiveSlug(null);
        onSelectProperty?.(null);
    };

    const handleSelect = (slug: string) => {
        setActiveSlug(slug);
        onSelectProperty?.(slug);
        const target = properties.find((p) => p.slug === slug);
        if (target?.latitude && target?.longitude) {
            setCenter({ lat: target.latitude, lng: target.longitude });
        }
    };

    // Tile URL generator
    const getTileUrl = (x: number, y: number, z: number) => {
        if (mapStyle === 'osm') {
            return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
        }
        // CartoDB Voyager — high contrast, clean streets, elegant typography
        const subdomains = ['a', 'b', 'c', 'd'];
        const s = subdomains[(x + y) % subdomains.length];
        return `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
    };

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
                'relative h-full w-full overflow-hidden rounded-[24px] border border-tijum-surface bg-[#e8ecef] shadow-tijum-card select-none',
                isDragging ? 'cursor-grabbing' : 'cursor-grab',
                className,
            )}
            role="region"
            aria-label={`Interactive map of stays in ${cityName}`}
        >
            {/* Real Map Tiles Canvas */}
            <div className="pointer-events-none absolute inset-0">
                {tiles.map((t) => (
                    <img
                        key={t.key}
                        src={getTileUrl(t.x, t.y, zoom)}
                        alt=""
                        width={256}
                        height={256}
                        loading="eager"
                        decoding="async"
                        className="absolute block h-[256px] w-[256px] select-none"
                        style={{
                            left: `${t.posX}px`,
                            top: `${t.posY}px`,
                        }}
                    />
                ))}
            </div>

            {/* Custom Interactive Markers Layer */}
            <div className="pointer-events-none absolute inset-0">
                {markers.map(({ item, lat, lng }) => {
                    const pos = project(lat, lng, zoom);
                    const posX = pos.x - topLeft.x;
                    const posY = pos.y - topLeft.y;

                    // Skip markers outside viewport
                    if (
                        posX < -60 ||
                        posX > dimensions.width + 60 ||
                        posY < -60 ||
                        posY > dimensions.height + 60
                    ) {
                        return null;
                    }

                    const isSelected = activeSlug === item.slug;
                    const priceLabel = formatPriceShort(
                        item.price?.amount_minor,
                    );

                    return (
                        <div
                            key={item.slug}
                            style={{
                                transform: `translate3d(${posX}px, ${posY}px, 0)`,
                            }}
                            className="pointer-events-auto absolute top-0 left-0 -translate-x-1/2 -translate-y-full transition-transform duration-200"
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(item.slug);
                                }}
                                className={cn(
                                    'group relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none',
                                    isSelected
                                        ? 'z-30 scale-110 bg-tijum-coral text-tijum-cream ring-4 ring-tijum-coral/40'
                                        : 'z-20 bg-tijum-plum text-tijum-cream hover:scale-105 hover:bg-tijum-coral',
                                )}
                                aria-label={`${item.name}, ${priceLabel}`}
                            >
                                {/* TIJUM Signature Brand Marker Icon */}
                                <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-tijum-cream p-0.5 shadow-xs">
                                    <img
                                        src={TIJUM_BRAND_ASSETS.symbolPng}
                                        alt="TIJUM"
                                        className="size-3.5 object-contain"
                                    />
                                </span>
                                <span className="font-heading font-semibold tracking-tight whitespace-nowrap">
                                    {priceLabel}
                                </span>

                                {/* Pin stem arrow */}
                                <div
                                    className={cn(
                                        'absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 transition-colors',
                                        isSelected
                                            ? 'bg-tijum-coral'
                                            : 'bg-tijum-plum group-hover:bg-tijum-coral',
                                    )}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Selected Property Popup Card */}
            {activeItem && (
                <div className="pointer-events-auto absolute right-4 bottom-4 left-4 z-40 max-w-sm rounded-[20px] border border-tijum-surface bg-tijum-cream p-3.5 shadow-2xl transition-all sm:right-auto sm:left-4 sm:w-80">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveSlug(null);
                            onSelectProperty?.(null);
                        }}
                        className="absolute top-2.5 right-2.5 rounded-full p-1 text-tijum-lavender hover:bg-tijum-surface/50 hover:text-tijum-plum"
                        aria-label="Close preview"
                    >
                        <X className="size-4" />
                    </button>

                    <div className="flex gap-3">
                        {activeItem.cover_image?.thumbnail_url ||
                        activeItem.cover_image?.url ? (
                            <img
                                src={
                                    activeItem.cover_image.thumbnail_url ||
                                    activeItem.cover_image.url ||
                                    ''
                                }
                                alt={activeItem.name}
                                className="size-20 shrink-0 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-tijum-surface text-tijum-lavender">
                                <Building2 className="size-8 opacity-60" />
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <Badge className="mb-1 bg-tijum-plum text-[10px] text-tijum-cream">
                                {activeItem.category?.name ?? 'Hostels/PG'}
                            </Badge>
                            <h4 className="truncate font-heading text-sm font-bold text-tijum-plum">
                                {activeItem.name}
                            </h4>
                            <p className="flex items-center gap-1 truncate text-xs text-tijum-lavender">
                                <MapPin className="size-3 shrink-0 text-tijum-coral" />
                                {activeItem.locality || activeItem.city?.name}
                            </p>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="font-heading text-xs font-bold text-tijum-coral">
                                    {formatPriceShort(
                                        activeItem.price?.amount_minor,
                                    )}
                                    <span className="text-[10px] font-normal text-tijum-lavender">
                                        {' '}
                                        / mo
                                    </span>
                                </span>
                                <Link
                                    href={propertyShow.url({
                                        property: activeItem.slug,
                                    })}
                                    className="text-xs font-semibold text-tijum-plum underline underline-offset-2 hover:text-tijum-coral"
                                >
                                    Details →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Top Bar Controls */}
            <div className="pointer-events-auto absolute top-3.5 left-3.5 z-30 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-tijum-surface/80 bg-tijum-cream/95 px-3 py-1.5 text-xs font-semibold text-tijum-plum shadow-md backdrop-blur-md">
                    <Navigation className="size-3.5 shrink-0 text-tijum-coral" />
                    <span>{cityName}</span>
                    <span className="font-normal text-tijum-lavender">
                        ({properties.length}{' '}
                        {properties.length === 1 ? 'stay' : 'stays'})
                    </span>
                </div>
            </div>

            {/* Map Zoom & Action Controls */}
            <div className="pointer-events-auto absolute top-3.5 right-3.5 z-30 flex flex-col items-center gap-1.5">
                <div className="flex flex-col overflow-hidden rounded-xl border border-tijum-surface/80 bg-tijum-cream/95 shadow-md backdrop-blur-md">
                    <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoom >= 17}
                        className="p-2 text-tijum-plum transition-colors hover:bg-tijum-peach/20 disabled:opacity-40"
                        aria-label="Zoom in"
                    >
                        <Plus className="size-4" />
                    </button>
                    <div className="h-px bg-tijum-surface" />
                    <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoom <= 9}
                        className="p-2 text-tijum-plum transition-colors hover:bg-tijum-peach/20 disabled:opacity-40"
                        aria-label="Zoom out"
                    >
                        <Minus className="size-4" />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={resetView}
                    className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/95 p-2 text-tijum-plum shadow-md backdrop-blur-md transition-colors hover:bg-tijum-peach/20"
                    title="Reset to city center"
                    aria-label="Reset map position"
                >
                    <RotateCcw className="size-4" />
                </button>

                <button
                    type="button"
                    onClick={() =>
                        setMapStyle((s) =>
                            s === 'voyager' ? 'osm' : 'voyager',
                        )
                    }
                    className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/95 p-2 text-tijum-plum shadow-md backdrop-blur-md transition-colors hover:bg-tijum-peach/20"
                    title={`Style: ${mapStyle === 'voyager' ? 'Voyager' : 'OpenStreetMap'}`}
                    aria-label="Toggle map style"
                >
                    <Layers className="size-4" />
                </button>
            </div>

            {/* OpenStreetMap / CartoDB Attribution */}
            <div className="pointer-events-none absolute right-2 bottom-1 z-20 rounded-sm bg-tijum-cream/80 px-2 py-0.5 text-[10px] text-tijum-plum/60 backdrop-blur-xs">
                ©{' '}
                <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="pointer-events-auto underline"
                >
                    OpenStreetMap
                </a>{' '}
                · CartoDB
            </div>
        </div>
    );
}
