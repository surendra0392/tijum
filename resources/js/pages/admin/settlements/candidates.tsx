import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CalendarCheck,
    CheckCircle2,
    IndianRupee,
    Plus,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface CandidateReservation {
    id: number;
    booking_reference: string;
    property_name: string;
    stay_dates: string;
    total_amount_minor: number;
}

interface CandidatePartner {
    owner_id: number;
    owner_name: string;
    owner_email: string;
    eligible_reservations_count: number;
    gross_booking_value_minor: number;
    commission_amount_minor: number;
    net_settlement_amount_minor: number;
    tax_review_required: boolean;
    tax_review_reasons: string[];
    reservations: CandidateReservation[];
}

interface Props {
    candidates: CandidatePartner[];
}

function formatInr(minor: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

export default function SettlementCandidates({ candidates }: Props) {
    const [generatingId, setGeneratingId] = useState<number | null>(null);

    const handleGenerate = (ownerId: number) => {
        setGeneratingId(ownerId);
        router.post(
            '/admin/settlements',
            { owner_id: ownerId },
            {
                onFinish: () => setGeneratingId(null),
            },
        );
    };

    const totalEligibleStays = candidates.reduce(
        (sum, p) => sum + p.eligible_reservations_count,
        0,
    );
    const aggregateGrossMinor = candidates.reduce(
        (sum, p) => sum + p.gross_booking_value_minor,
        0,
    );
    const aggregateNetMinor = candidates.reduce(
        (sum, p) => sum + p.net_settlement_amount_minor,
        0,
    );

    return (
        <div className="space-y-6">
            <Head title="Eligible Settlement Candidates" />

            <PageHeader
                eyebrow="Payout Batch Discovery"
                title="Eligible Settlement Candidates"
                description="Automated discovery of checkout-passed reservations meeting all hold intervals, verified linked-account requirements, and active commission agreements."
                actions={
                    <Button variant="outline" asChild>
                        <Link href="/admin/settlements">
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            <span>Back to Settlements</span>
                        </Link>
                    </Button>
                }
            />

            {/* Candidate Discovery KPI Strip */}
            <section
                aria-label="Settlement candidate totals"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Eligible Partners"
                    value={candidates.length}
                    helperText="Active KYC & linked Route accounts"
                    icon={Building2}
                />
                <StatCard
                    label="Eligible Stays"
                    value={totalEligibleStays}
                    helperText="Checkout-passed & unsettled"
                    icon={CalendarCheck}
                />
                <StatCard
                    label="Aggregate Gross Value"
                    value={formatInr(aggregateGrossMinor)}
                    helperText="Total fulfilled booking value"
                    icon={IndianRupee}
                />
                <StatCard
                    label="Aggregate Est. Net Payable"
                    value={formatInr(aggregateNetMinor)}
                    helperText="Estimated partner disbursement"
                    icon={Wallet}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Candidate Partner Cards */}
            {candidates.length === 0 ? (
                <EmptyState
                    icon={CheckCircle2}
                    title="All Eligible Bookings Settled"
                    description="There are currently no checkout-completed reservations waiting for settlement generation. All captured payments are either already drafted, on hold, or awaiting scheduled checkout timing."
                    action={
                        <Button variant="outline" asChild>
                            <Link href="/admin/settlements">
                                View Settlements Queue
                            </Link>
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-6">
                    {candidates.map((partner) => (
                        <Card key={partner.owner_id}>
                            <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge
                                                status={
                                                    partner.tax_review_required
                                                        ? 'warning'
                                                        : 'verified'
                                                }
                                                label={
                                                    partner.tax_review_required
                                                        ? 'Tax Review Required'
                                                        : 'Onboarding: Active & Verified'
                                                }
                                            />
                                            <Badge
                                                variant="outline"
                                                className="tabular-nums"
                                            >
                                                {
                                                    partner.eligible_reservations_count
                                                }{' '}
                                                eligible stays
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg">
                                            {partner.owner_name}
                                        </CardTitle>
                                        <CardDescription>
                                            {partner.owner_email}
                                        </CardDescription>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="default"
                                        disabled={
                                            partner.tax_review_required ||
                                            generatingId === partner.owner_id
                                        }
                                        loading={
                                            generatingId === partner.owner_id
                                        }
                                        onClick={() =>
                                            handleGenerate(partner.owner_id)
                                        }
                                    >
                                        <Plus
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Generate Draft Batch (
                                            {
                                                partner.eligible_reservations_count
                                            }{' '}
                                            Stays)
                                        </span>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {partner.tax_review_required && (
                                    <Alert
                                        variant="destructive"
                                        className="border-l-4 border-l-destructive"
                                    >
                                        <AlertCircle className="size-4" />
                                        <AlertTitle>
                                            Tax Classification Review Required
                                        </AlertTitle>
                                        <AlertDescription>
                                            {partner.tax_review_reasons.join(
                                                ', ',
                                            )}
                                            . Live settlements cannot be created
                                            until the partner tax profile is
                                            approved by a finance administrator.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Financial Summary Bar */}
                                <div className="grid grid-cols-1 gap-4 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-xs sm:grid-cols-3 dark:border-border dark:bg-muted/45">
                                    <div>
                                        <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Gross Booking Value
                                        </span>
                                        <p className="mt-1 font-heading text-lg font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                            {formatInr(
                                                partner.gross_booking_value_minor,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Estimated Commission
                                        </span>
                                        <p className="mt-1 font-heading text-lg font-bold text-status-warning-fg tabular-nums">
                                            -{' '}
                                            {formatInr(
                                                partner.commission_amount_minor,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                            Estimated Net Payable
                                        </span>
                                        <p className="mt-1 font-heading text-lg font-bold text-status-success-fg tabular-nums">
                                            {formatInr(
                                                partner.net_settlement_amount_minor,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Included Reservations Sub-table */}
                                <div className="overflow-hidden rounded-xl border border-tijum-surface/80 dark:border-border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="px-4">
                                                    Booking Reference
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Property
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Stay Dates
                                                </TableHead>
                                                <TableHead className="px-4 text-right">
                                                    Booking Amount
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {partner.reservations.map((res) => (
                                                <TableRow key={res.id}>
                                                    <TableCell className="px-4 py-3 font-mono text-xs font-bold text-tijum-coral tabular-nums">
                                                        {res.booking_reference}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 font-medium">
                                                        {res.property_name}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {res.stay_dates}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 text-right font-semibold tabular-nums">
                                                        {formatInr(
                                                            res.total_amount_minor,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
