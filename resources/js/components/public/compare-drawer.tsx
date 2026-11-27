import { Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Check,
    Layers,
    MapPin,
    Utensils,
    X,
} from 'lucide-react';
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
import {
    clearCompare,
    getCompareItems,
    MAX_COMPARE,
    removeCompareItem,
    subscribeToCompare,
    type CompareItem,
} from '@/lib/compare';
import { show as propertyShow } from '@/routes/public/properties';

function formatMoney(amountMinor: number, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    }).format(amountMinor / 100);
}

export function CompareDrawer() {
    const [items, setItems] = useState<CompareItem[]>([]);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        setItems(getCompareItems());
        const unsub = subscribeToCompare((e) => {
            setItems(e.detail.items);
            if (e.detail.items.length === 0) {
                setModalOpen(false);
            }
        });
        return unsub;
    }, []);

    if (items.length === 0) {
        return null;
    }

    return (
        <>
            {/* Floating Comparison Tray */}
            <div
                role="region"
                aria-label="Property comparison tray"
                className="fixed right-4 bottom-4 left-4 z-40 mx-auto max-w-4xl animate-in duration-300 fade-in slide-in-from-bottom-4"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-tijum-plum/20 bg-tijum-plum p-4 text-tijum-cream shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-tijum-coral text-tijum-plum">
                            <Layers className="size-5" />
                        </div>
                        <div>
                            <p className="font-heading text-sm font-bold text-tijum-cream">
                                Compare Stays ({items.length}/{MAX_COMPARE})
                            </p>
                            <p className="text-xs text-tijum-cream/70">
                                Side-by-side room options, meals, and pricing
                            </p>
                        </div>
                    </div>

                    {/* Property Chips */}
                    <div className="hidden items-center gap-2 md:flex">
                        {items.map((item) => (
                            <div
                                key={item.slug}
                                className="flex items-center gap-1.5 rounded-full border border-tijum-cream/20 bg-tijum-cream/10 py-1 pr-1.5 pl-3 text-xs text-tijum-cream"
                            >
                                <span className="max-w-[120px] truncate">
                                    {item.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeCompareItem(item.slug)}
                                    aria-label={`Remove ${item.name} from comparison`}
                                    className="flex size-5 items-center justify-center rounded-full hover:bg-tijum-cream/20"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => clearCompare()}
                            className="bg-tijum-cream/15 text-xs text-tijum-cream hover:bg-tijum-cream/25"
                        >
                            Clear
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setModalOpen(true)}
                            className="bg-tijum-coral text-xs font-bold text-tijum-plum hover:bg-tijum-coral/90"
                        >
                            Compare Now
                        </Button>
                    </div>
                </div>
            </div>

            {/* Comparison Dialog / Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto rounded-[24px] border-tijum-surface bg-tijum-cream p-6 sm:p-8 dark:border-border dark:bg-card">
                    <DialogHeader className="border-b border-tijum-surface pb-4 dark:border-border">
                        <DialogTitle className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                            Side-by-Side Property Comparison
                        </DialogTitle>
                        <DialogDescription className="text-tijum-lavender dark:text-muted-foreground">
                            Compare meal inclusions, resident policies,
                            amenities, and transparent prices across your
                            selected stays.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 overflow-x-auto">
                        <div
                            className="grid min-w-[640px] gap-4"
                            style={{
                                gridTemplateColumns: `160px repeat(${items.length}, minmax(220px, 1fr))`,
                            }}
                        >
                            {/* Header row: Property details */}
                            <div className="self-end pb-2 font-heading text-sm font-semibold text-tijum-lavender dark:text-muted-foreground">
                                Stay Profile
                            </div>
                            {items.map((item) => (
                                <div
                                    key={item.slug}
                                    className="space-y-3 rounded-2xl border border-tijum-surface bg-white p-4 shadow-sm dark:border-border dark:bg-muted/40"
                                >
                                    <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-tijum-surface/40">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-xs text-tijum-lavender dark:text-muted-foreground">
                                                Image pending
                                            </div>
                                        )}
                                        {item.category && (
                                            <Badge className="absolute top-2 left-2 text-[10px]">
                                                {item.category}
                                            </Badge>
                                        )}
                                    </div>
                                    <h4 className="line-clamp-1 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                        {item.name}
                                    </h4>
                                    <p className="flex items-center gap-1 text-xs text-tijum-lavender dark:text-muted-foreground">
                                        <MapPin className="size-3 text-tijum-coral" />
                                        {[item.locality, item.city]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeCompareItem(item.slug)
                                        }
                                        className="text-xs text-tijum-coral hover:underline"
                                    >
                                        Remove from comparison
                                    </button>
                                </div>
                            ))}

                            {/* Row: Price */}
                            <div className="flex items-center border-t border-tijum-surface/60 py-3 text-xs font-semibold text-tijum-plum dark:border-border dark:text-foreground">
                                Starting Price
                            </div>
                            {items.map((item) => (
                                <div
                                    key={item.slug}
                                    className="border-t border-tijum-surface/60 py-3 font-heading text-lg font-bold text-tijum-plum dark:border-border dark:text-foreground"
                                >
                                    {item.price ? (
                                        <>
                                            {formatMoney(
                                                item.price.amountMinor,
                                                item.price.currency,
                                            )}
                                            <span className="block text-xs font-normal text-tijum-lavender dark:text-muted-foreground">
                                                {item.price.rateLabel}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-tijum-lavender dark:text-muted-foreground">
                                            Pricing upon search
                                        </span>
                                    )}
                                </div>
                            ))}

                            {/* Row: Gender Policy */}
                            <div className="flex items-center border-t border-tijum-surface/60 py-3 text-xs font-semibold text-tijum-plum dark:border-border dark:text-foreground">
                                Resident Eligibility
                            </div>
                            {items.map((item) => (
                                <div
                                    key={item.slug}
                                    className="border-t border-tijum-surface/60 py-3 text-xs text-tijum-plum dark:border-border dark:text-foreground"
                                >
                                    {item.genderEligibility ||
                                        'All Genders Welcome'}
                                </div>
                            ))}

                            {/* Row: Meals / Food */}
                            <div className="flex items-center border-t border-tijum-surface/60 py-3 text-xs font-semibold text-tijum-plum dark:border-border dark:text-foreground">
                                Meal Inclusions
                            </div>
                            {items.map((item) => (
                                <div
                                    key={item.slug}
                                    className="space-y-1 border-t border-tijum-surface/60 py-3 text-xs dark:border-border"
                                >
                                    <div className="flex items-center gap-1.5 font-medium text-tijum-plum dark:text-foreground">
                                        <Utensils className="size-3.5 text-tijum-coral" />
                                        {item.food.food_provided
                                            ? 'Meals Provided'
                                            : 'No Meals Included'}
                                    </div>
                                    {item.food.food_provided && (
                                        <p className="text-[11px] text-tijum-lavender dark:text-muted-foreground">
                                            {[
                                                item.food.breakfast_included &&
                                                    'Breakfast',
                                                item.food.lunch_included &&
                                                    'Lunch',
                                                item.food.dinner_included &&
                                                    'Dinner',
                                            ]
                                                .filter(Boolean)
                                                .join(', ') ||
                                                'Meals available on request'}
                                        </p>
                                    )}
                                </div>
                            ))}

                            {/* Row: Amenities */}
                            <div className="flex items-center border-t border-tijum-surface/60 py-3 text-xs font-semibold text-tijum-plum">
                                Top Amenities
                            </div>
                            {items.map((item) => (
                                <div
                                    key={item.slug}
                                    className="space-y-1 border-t border-tijum-surface/60 py-3 text-xs"
                                >
                                    {(item.amenities || [])
                                        .slice(0, 4)
                                        .map((a) => (
                                            <div
                                                key={a.id}
                                                className="flex items-center gap-1 text-tijum-lavender"
                                            >
                                                <Check className="size-3 text-emerald-600" />
                                                <span>{a.name}</span>
                                            </div>
                                        ))}
                                    {(!item.amenities ||
                                        item.amenities.length === 0) && (
                                        <span className="text-[11px] text-tijum-lavender">
                                            Standard amenities
                                        </span>
                                    )}
                                </div>
                            ))}

                            {/* Row: Action */}
                            <div className="flex items-center border-t border-tijum-surface/60 py-4 text-xs font-semibold text-tijum-plum">
                                Action
                            </div>
                            {items.map((item) => (
                                <div
                                    key={item.slug}
                                    className="border-t border-tijum-surface/60 py-4"
                                >
                                    <Button
                                        variant="plum"
                                        size="sm"
                                        className="w-full"
                                        asChild
                                    >
                                        <Link href={propertyShow(item.slug)}>
                                            View Stay
                                            <ArrowUpRight className="size-3.5" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
