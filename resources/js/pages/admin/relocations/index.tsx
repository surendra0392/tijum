import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Layers,
    Plus,
    Search,
    ShieldAlert,
    Sparkles,
    Utensils,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index as subsidiesIndex } from '@/routes/admin/relocation-subsidies';
import {
    index as relocationsIndex,
    searchAlternatives,
    store as storeRelocation,
} from '@/routes/admin/relocations';
import { show as reservationShow } from '@/routes/admin/reservations';

interface RelocationRow {
    id: number;
    source_booking_reference: string;
    customer_name: string;
    source_property_name: string;
    destination_property_name: string;
    destination_city_name?: string | null;
    destination_room_type_name: string;
    original_amount_minor: number;
    alternative_amount_minor: number;
    price_difference_minor: number;
    status: string;
    status_label: string;
    destination_owner_accepted: boolean;
    customer_decision?: string | null;
    replacement_booking_reference?: string | null;
    offer_expires_at: string;
    created_at: string;
}

interface RelocationsIndexProps {
    relocations: {
        data: RelocationRow[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
}

interface MatchedAlternative {
    property_id: number;
    property_name: string;
    locality?: string | null;
    room_type_id: number;
    room_type_name: string;
    is_air_conditioned: boolean;
    food_provided: boolean;
    breakfast_included: boolean;
    lunch_included: boolean;
    dinner_included: boolean;
    available_units: number;
    original_total_minor: number;
    alternative_total_minor: number;
    price_difference_minor: number;
    refund_due_to_customer_minor: number;
    customer_additional_cost_minor: number;
}

function formatInr(minor: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

function getRelocationSemantic(status: string): SemanticStatus {
    switch (status) {
        case 'accepted':
        case 'completed':
        case 'confirmed':
            return 'completed';
        case 'offered':
        case 'pending':
        case 'draft':
            return 'pending';
        case 'cancelled':
        case 'expired':
            return 'cancelled';
        case 'rejected':
        case 'declined':
            return 'rejected';
        default:
            return 'info';
    }
}

export default function AdminRelocationsIndex({
    relocations,
}: RelocationsIndexProps) {
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchReservationId, setSearchReservationId] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<{
        reservation_id: number;
        booking_reference: string;
        alternatives: MatchedAlternative[];
    } | null>(null);

    const createOfferForm = useForm<{
        reservation_id: number;
        destination_property_id: number;
        destination_room_type_id: number;
        reason?: string;
        notes_to_destination_owner?: string;
        notes_to_customer?: string;
    }>({
        reservation_id: 0,
        destination_property_id: 0,
        destination_room_type_id: 0,
        reason: 'Host unfulfilled stay relocation',
        notes_to_destination_owner: '',
        notes_to_customer: '',
    });

    const closeSearchModal = () => {
        setShowSearchModal(false);
        setSearchResults(null);
        setSearchError(null);
    };

    const handleSearchAlternatives = async (e: FormEvent) => {
        e.preventDefault();
        setSearching(true);
        setSearchError(null);
        setSearchResults(null);

        try {
            const res = await fetch(
                searchAlternatives.url({
                    query: { reservation_id: searchReservationId.trim() },
                }),
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    data.message || 'Failed to search alternatives.',
                );
            }

            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            setSearchError(
                err instanceof Error
                    ? err.message
                    : 'Error searching alternatives',
            );
        } finally {
            setSearching(false);
        }
    };

    const handleCreateOffer = (alt: MatchedAlternative) => {
        if (!searchResults) return;

        const payload = {
            reservation_id: searchResults.reservation_id,
            destination_property_id: alt.property_id,
            destination_room_type_id: alt.room_type_id,
            reason: 'Relocation due to unfulfilled booking',
            notes_to_destination_owner:
                'Urgent guest relocation request by TIJUM operations.',
            notes_to_customer:
                'We have reserved an alternative stay at no extra charge.',
        };

        createOfferForm.setData(payload);
        createOfferForm.transform(() => payload);

        createOfferForm.post(storeRelocation.url(), {
            preserveScroll: true,
            onSuccess: () => {
                closeSearchModal();
                setSearchReservationId('');
            },
        });
    };

    const hostAcceptedCount = relocations.data.filter(
        (r) => r.destination_owner_accepted,
    ).length;
    const hostPendingCount = relocations.data.filter(
        (r) => !r.destination_owner_accepted,
    ).length;
    const protectionExposureMinor = relocations.data.reduce(
        (sum, r) => sum + Math.max(0, r.price_difference_minor),
        0,
    );

    return (
        <div className="space-y-6">
            <Head title="Controlled Relocations — Operations" />

            <PageHeader
                eyebrow="Customer Protection Engine"
                title="Controlled Guest Relocations"
                description="Match and coordinate alternative food-inclusive accommodations when original properties cannot fulfill stays."
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href={subsidiesIndex.url()}>
                                <Sparkles
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Relocation Subsidies</span>
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => setShowSearchModal(true)}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Initiate Relocation Offer</span>
                        </Button>
                    </>
                }
            />

            {/* KPI Stat Cards */}
            <section
                aria-label="Relocation engine metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Total Relocations"
                    value={relocations.total}
                    helperText="Recorded relocation offers"
                    icon={Layers}
                />
                <StatCard
                    label="Host Accepted (Page)"
                    value={hostAcceptedCount}
                    helperText="Confirmed by destination host"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Pending Host (Page)"
                    value={hostPendingCount}
                    helperText="Awaiting partner acceptance"
                    icon={Clock}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="Price Protection (Page)"
                    value={formatInr(protectionExposureMinor)}
                    helperText="Positive tariff delta covered"
                    icon={ShieldAlert}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Search Alternatives & Create Relocation Offer Modal */}
            <Dialog
                open={showSearchModal}
                onOpenChange={(open) => {
                    if (!open) {
                        closeSearchModal();
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-2xl dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg text-tijum-plum dark:text-foreground">
                            <Search
                                className="size-5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>
                                Find Verified Alternative Accommodations
                            </span>
                        </DialogTitle>
                        <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                            Enter the numeric reservation ID to discover live
                            matching inventory in the same city with
                            food-inclusions and capacity verification.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-1">
                        <form
                            onSubmit={handleSearchAlternatives}
                            className="flex flex-wrap items-end gap-2.5"
                        >
                            <div className="min-w-[200px] flex-1 space-y-1.5">
                                <Label
                                    htmlFor="relocation-reservation-id"
                                    className="text-xs font-medium text-tijum-plum dark:text-foreground"
                                >
                                    Reservation ID
                                </Label>
                                <Input
                                    id="relocation-reservation-id"
                                    placeholder="Enter Reservation ID (e.g. 14)..."
                                    value={searchReservationId}
                                    onChange={(e) =>
                                        setSearchReservationId(e.target.value)
                                    }
                                    required
                                    className="h-10"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="plum"
                                size="sm"
                                loading={searching}
                                disabled={
                                    searching || !searchReservationId.trim()
                                }
                            >
                                <Search className="size-4" aria-hidden="true" />
                                <span>
                                    {searching
                                        ? 'Searching…'
                                        : 'Match Inventory'}
                                </span>
                            </Button>
                        </form>

                        {searchError && (
                            <Alert variant="destructive">
                                <AlertCircle
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <AlertTitle>Matching failed</AlertTitle>
                                <AlertDescription>
                                    {searchError}
                                </AlertDescription>
                            </Alert>
                        )}

                        {searchResults && (
                            <div className="space-y-3 pt-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        Matches for Booking{' '}
                                        <span className="font-mono text-tijum-coral tabular-nums">
                                            {searchResults.booking_reference}
                                        </span>
                                    </p>
                                    <Badge
                                        variant="outline"
                                        className="tabular-nums"
                                    >
                                        {searchResults.alternatives.length}{' '}
                                        properties available
                                    </Badge>
                                </div>

                                {searchResults.alternatives.length === 0 ? (
                                    <EmptyState
                                        icon={Search}
                                        title="No eligible alternatives found"
                                        description="No verified alternative properties found in the same city with sufficient capacity and food-policy match."
                                        className="border-0 bg-tijum-cream/35 py-6 shadow-none dark:bg-muted/35"
                                    />
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {searchResults.alternatives.map(
                                            (alt) => {
                                                const meals = [
                                                    alt.breakfast_included &&
                                                        'Breakfast',
                                                    alt.lunch_included &&
                                                        'Lunch',
                                                    alt.dinner_included &&
                                                        'Dinner',
                                                ].filter(Boolean);

                                                return (
                                                    <div
                                                        key={`${alt.property_id}-${alt.room_type_id}`}
                                                        className="flex flex-col justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <p className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                                                        {
                                                                            alt.property_name
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                                        {alt.locality
                                                                            ? `${alt.locality} · `
                                                                            : ''}
                                                                        {
                                                                            alt.room_type_name
                                                                        }{' '}
                                                                        {alt.is_air_conditioned
                                                                            ? '(AC)'
                                                                            : '(Non-AC)'}
                                                                    </p>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="shrink-0 text-[11px] tabular-nums"
                                                                >
                                                                    {
                                                                        alt.available_units
                                                                    }{' '}
                                                                    free
                                                                </Badge>
                                                            </div>

                                                            {alt.food_provided && (
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <Badge
                                                                        variant="food"
                                                                        className="text-[10px]"
                                                                    >
                                                                        <Utensils
                                                                            className="size-3"
                                                                            aria-hidden="true"
                                                                        />
                                                                        <span>
                                                                            {meals.length >
                                                                            0
                                                                                ? meals.join(
                                                                                      ' · ',
                                                                                  )
                                                                                : 'Meals Included'}
                                                                        </span>
                                                                    </Badge>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-between border-t border-tijum-surface/60 pt-2 text-xs dark:border-border">
                                                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                                                    Customer
                                                                    Extra Cost:
                                                                </span>
                                                                <span className="font-heading font-bold text-status-success-fg tabular-nums">
                                                                    ₹0.00
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            size="sm"
                                                            loading={
                                                                createOfferForm.processing
                                                            }
                                                            onClick={() =>
                                                                handleCreateOffer(
                                                                    alt,
                                                                )
                                                            }
                                                            className="w-full"
                                                        >
                                                            Create Relocation
                                                            Offer
                                                        </Button>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeSearchModal}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Relocations List Table / Empty State */}
            {relocations.data.length === 0 ? (
                <EmptyState
                    icon={Layers}
                    title="No relocation offers recorded yet"
                    description="When hosts cannot fulfill a confirmed stay, matched relocation offers and guest decisions will appear here."
                    action={
                        <Button
                            type="button"
                            variant="default"
                            onClick={() => setShowSearchModal(true)}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Initiate Relocation Offer</span>
                        </Button>
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Relocations Ledger
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {relocations.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4">
                                        Source Booking
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Guest
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Source Property
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Destination Property
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Destination Room
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Host Accept
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Guest Decision
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Replacement Booking
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Expires At
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {relocations.data.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="px-4 py-3.5">
                                            <Link
                                                href={reservationShow.url(
                                                    r.source_booking_reference,
                                                )}
                                                className="font-mono text-xs font-bold text-tijum-coral tabular-nums hover:underline"
                                            >
                                                {r.source_booking_reference}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 font-medium text-tijum-plum dark:text-foreground">
                                            {r.customer_name}
                                        </TableCell>
                                        <TableCell className="max-w-[160px] truncate px-4 py-3.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {r.source_property_name}
                                        </TableCell>
                                        <TableCell className="max-w-[180px] truncate px-4 py-3.5 font-semibold text-tijum-plum dark:text-foreground">
                                            {r.destination_property_name}
                                            {r.destination_city_name && (
                                                <span className="ml-1 font-normal text-tijum-plum-muted dark:text-muted-foreground">
                                                    ({r.destination_city_name})
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {r.destination_room_type_name}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <StatusBadge
                                                status={getRelocationSemantic(
                                                    r.status,
                                                )}
                                                label={r.status_label}
                                            />
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <StatusBadge
                                                status={
                                                    r.destination_owner_accepted
                                                        ? 'completed'
                                                        : 'pending'
                                                }
                                                label={
                                                    r.destination_owner_accepted
                                                        ? 'Accepted'
                                                        : 'Pending'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-xs capitalize">
                                            {r.customer_decision ? (
                                                <span className="font-medium text-tijum-plum dark:text-foreground">
                                                    {r.customer_decision}
                                                </span>
                                            ) : (
                                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 font-mono text-xs font-semibold tabular-nums">
                                            {r.replacement_booking_reference ? (
                                                <Link
                                                    href={reservationShow.url(
                                                        r.replacement_booking_reference,
                                                    )}
                                                    className="text-tijum-plum hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                                                >
                                                    {
                                                        r.replacement_booking_reference
                                                    }
                                                </Link>
                                            ) : (
                                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {new Date(
                                                r.offer_expires_at,
                                            ).toLocaleString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {relocations.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {relocations.total}
                                </span>{' '}
                                relocation offer
                                {relocations.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={relocations.current_page}
                                totalPages={relocations.last_page}
                                getPageHref={(page) =>
                                    relocationsIndex.url({
                                        query: { page },
                                    })
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
