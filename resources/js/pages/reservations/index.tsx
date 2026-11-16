import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ReservationSummaryCard } from '@/components/reservations/reservation-summary-card';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { index, show } from '@/routes/reservations';
import type { ReservationListPayload, ReservationStatusOption } from '@/types';

type ReservationIndexProps = {
    reservations: ReservationListPayload;
    filters: { status?: string | null };
    statusOptions: ReservationStatusOption[];
};

export default function ReservationIndex({
    reservations,
    filters,
    statusOptions,
}: ReservationIndexProps) {
    const navigate = (status: string, page = 1) => {
        router.get(
            index().url,
            { status: status === 'all' ? undefined : status, page },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <ResponsiveContainer width="wide" className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title="My Reservations" />
                <PageHeader
                    breadcrumbs={[
                        { title: 'Dashboard', href: '/dashboard' },
                        { title: 'My Reservations', href: '/reservations' },
                    ]}
                    eyebrow="Customer account"
                    title="My reservations"
                    description="Track pending requests, confirmed stays, and your complete reservation history."
                    actions={
                        <Button variant="plum" size="sm" asChild>
                            <Link href="/search">
                                <Search className="mr-1.5 size-4" />
                                Explore stays
                            </Link>
                        </Button>
                    }
                />

                <div className="flex flex-col gap-3 rounded-2xl border border-tijum-surface/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-end sm:justify-between dark:border-border dark:bg-card">
                    <div className="w-full max-w-xs space-y-2">
                        <Label
                            htmlFor="reservation-status"
                            className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground"
                        >
                            Filter by Status
                        </Label>
                        <Select
                            value={filters.status ?? 'all'}
                            onValueChange={(value) => navigate(value)}
                        >
                            <SelectTrigger
                                id="reservation-status"
                                className="h-11 rounded-xl border-tijum-surface/80 bg-tijum-cream/40 dark:border-border dark:bg-muted/40"
                            >
                                <SelectValue placeholder="All reservations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All reservations
                                </SelectItem>
                                {statusOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="font-heading text-xs font-semibold text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        Showing {reservations.data.length} of{' '}
                        {reservations.meta.total} reservation
                        {reservations.meta.total === 1 ? '' : 's'}
                    </p>
                </div>

                {reservations.data.length === 0 ? (
                    <EmptyState
                        icon={CalendarClock}
                        title="No reservations found"
                        description="Your food-inclusive stay requests will appear here after submission."
                        action={
                            <Button asChild>
                                <Link href="/search">Browse stays</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-4">
                        {reservations.data.map((reservation) => (
                            <ReservationSummaryCard
                                key={reservation.booking_reference}
                                reservation={reservation}
                                href={show(reservation.booking_reference).url}
                            />
                        ))}
                    </div>
                )}

                {reservations.data.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-4 dark:border-border">
                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {reservations.data.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {reservations.meta.total}
                            </span>{' '}
                            reservation
                            {reservations.meta.total === 1 ? '' : 's'}
                        </p>
                        <Pagination
                            currentPage={reservations.meta.current_page}
                            totalPages={reservations.meta.last_page}
                            getPageHref={(page) =>
                                index({
                                    query: {
                                        status: filters.status ?? undefined,
                                        page,
                                    },
                                }).url
                            }
                        />
                    </div>
                )}
            </div>
        </ResponsiveContainer>
    );
}
