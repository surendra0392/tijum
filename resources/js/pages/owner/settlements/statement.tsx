import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { Button } from '@/components/ui/button';

interface StatementItem {
    booking_reference: string;
    property_name: string;
    stay_dates: string;
    gross_amount_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    tax_deduction_minor: number;
    net_payable_minor: number;
}

interface StatementData {
    settlement_reference: string;
    period_start: string;
    period_end: string;
    currency: string;
    gross_booking_value_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    statutory_deductions_minor: number;
    refund_adjustments_minor: number;
    net_settlement_amount_minor: number;
    status: string;
    status_label: string;
    provider_status?: string;
    settled_at?: string;
    created_at?: string;
    platform_legal_name: string;
    platform_gstin: string;
    partner_name: string;
    partner_pan?: string;
    partner_gstin?: string;
    partner_bank_masked?: string;
    partner_bank_ifsc?: string;
    items: StatementItem[];
}

interface Props {
    settlement: StatementData;
}

function formatInr(minor: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

export default function SettlementStatement({ settlement }: Props) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8 print:min-h-0 print:bg-white print:p-0 print:text-neutral-950">
            <Head
                title={`Settlement Statement - ${settlement.settlement_reference}`}
            />

            {/* Print & Export action toolbar (hidden on print) */}
            <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
                <Button variant="outline" size="sm" asChild>
                    <Link
                        href={`/owner/settlements/${settlement.settlement_reference}`}
                    >
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to Settlement
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={`/owner/settlements/${settlement.settlement_reference}/export-csv`}
                            download={`settlement-${settlement.settlement_reference}.csv`}
                        >
                            <Download className="mr-1.5 size-4 text-tijum-coral" />
                            Export CSV / Excel
                        </a>
                    </Button>
                    <Button variant="default" size="sm" onClick={handlePrint}>
                        <Printer className="mr-1.5 size-4" />
                        Print Statement (A4)
                    </Button>
                </div>
            </div>

            {/* A4 Printable Sheet */}
            <div className="mx-auto max-w-4xl rounded-2xl border border-tijum-surface bg-card p-8 text-xs text-card-foreground shadow-tijum-card sm:p-12 dark:border-border print:rounded-none print:border-0 print:bg-white print:p-0 print:text-neutral-800 print:shadow-none">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-tijum-surface pb-6 dark:border-border print:border-neutral-300">
                    <div>
                        <span className="dark:hidden print:inline-block">
                            <BrandLogo
                                variant="horizontal"
                                tone="light"
                                size="md"
                            />
                        </span>
                        <span className="hidden dark:inline-block print:hidden">
                            <BrandLogo
                                variant="horizontal"
                                tone="dark"
                                size="md"
                            />
                        </span>
                        <p className="mt-2 text-[11px] text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-500">
                            {settlement.platform_legal_name}
                        </p>
                        <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-500">
                            GSTIN: {settlement.platform_gstin} • SAC: 998552
                        </p>
                        <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-500">
                            Hyderabad · Guntur · Vijayawada · Visakhapatnam
                        </p>
                    </div>

                    <div className="text-right">
                        <span className="mb-1 inline-block rounded-md bg-tijum-cream px-3 py-1 font-heading text-sm font-bold tracking-wider text-tijum-plum uppercase dark:bg-muted dark:text-foreground print:bg-neutral-100 print:text-neutral-900">
                            Partner Settlement Statement
                        </span>
                        <p className="mt-1 font-mono text-xs font-bold text-tijum-plum dark:text-foreground print:text-neutral-900">
                            {settlement.settlement_reference}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-500">
                            Period: {settlement.period_start} –{' '}
                            {settlement.period_end}
                        </p>
                        <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-500">
                            Status:{' '}
                            <strong className="text-tijum-plum dark:text-foreground print:text-neutral-800">
                                {settlement.status_label}
                            </strong>
                        </p>
                    </div>
                </div>

                {/* Partner Details & Bank Destination */}
                <div className="grid grid-cols-2 gap-8 border-b border-tijum-surface py-6 dark:border-border print:border-neutral-200">
                    <div>
                        <span className="text-[10px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground print:text-neutral-500">
                            Settlement Issued To:
                        </span>
                        <p className="mt-0.5 font-heading text-sm font-bold text-tijum-plum dark:text-foreground print:text-neutral-900">
                            {settlement.partner_name}
                        </p>
                        <p className="mt-0.5 text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            PAN: {settlement.partner_pan ?? 'Not Provided'}
                        </p>
                        <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            GSTIN:{' '}
                            {settlement.partner_gstin ??
                                'Unregistered / Not Applicable'}
                        </p>
                    </div>

                    <div className="text-right tabular-nums">
                        <span className="text-[10px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground print:text-neutral-500">
                            Disbursement Details:
                        </span>
                        <p className="mt-0.5 font-heading font-semibold text-tijum-plum dark:text-foreground print:text-neutral-900">
                            Account:{' '}
                            {settlement.partner_bank_masked ??
                                'Verified Route Linked Account'}
                        </p>
                        <p className="mt-0.5 text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            IFSC: {settlement.partner_bank_ifsc ?? 'N/A'}
                        </p>
                        <p className="text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            Settlement Date:{' '}
                            {settlement.settled_at ??
                                'Pending Provider Transfer'}
                        </p>
                    </div>
                </div>

                {/* Financial Breakdown Table */}
                <div className="py-6">
                    <h3 className="mb-3 font-heading text-sm font-bold text-tijum-plum dark:text-foreground print:text-neutral-900">
                        Fulfilled Booking Summary
                    </h3>
                    <table className="w-full border-collapse border border-tijum-surface text-left tabular-nums dark:border-border print:border-neutral-300">
                        <thead className="bg-tijum-cream/55 font-heading text-[10px] font-semibold tracking-wider text-tijum-plum uppercase dark:bg-muted/55 dark:text-foreground print:bg-neutral-100 print:text-neutral-700">
                            <tr>
                                <th className="border border-tijum-surface p-2.5 dark:border-border print:border-neutral-300">
                                    Booking Ref
                                </th>
                                <th className="border border-tijum-surface p-2.5 dark:border-border print:border-neutral-300">
                                    Property
                                </th>
                                <th className="border border-tijum-surface p-2.5 dark:border-border print:border-neutral-300">
                                    Stay Dates
                                </th>
                                <th className="border border-tijum-surface p-2.5 text-right dark:border-border print:border-neutral-300">
                                    Gross Booking
                                </th>
                                <th className="border border-tijum-surface p-2.5 text-right dark:border-border print:border-neutral-300">
                                    Commission
                                </th>
                                <th className="border border-tijum-surface p-2.5 text-right dark:border-border print:border-neutral-300">
                                    GST (18%)
                                </th>
                                <th className="border border-tijum-surface p-2.5 text-right dark:border-border print:border-neutral-300">
                                    TDS (0.10%)
                                </th>
                                <th className="border border-tijum-surface p-2.5 text-right font-bold dark:border-border print:border-neutral-300">
                                    Net Partner Payable
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-tijum-surface dark:divide-border print:divide-neutral-200">
                            {settlement.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-tijum-cream/25 dark:hover:bg-muted/35 print:hover:bg-transparent">
                                    <td className="border border-tijum-surface p-2.5 font-mono font-semibold dark:border-border print:border-neutral-300">
                                        {item.booking_reference}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 dark:border-border print:border-neutral-300">
                                        {item.property_name}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 text-tijum-plum-muted dark:border-border dark:text-muted-foreground print:border-neutral-300 print:text-neutral-600">
                                        {item.stay_dates}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 text-right dark:border-border print:border-neutral-300">
                                        {formatInr(item.gross_amount_minor)}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 text-right text-red-700 dark:border-border dark:text-red-400 print:border-neutral-300 print:text-red-700">
                                        -{' '}
                                        {formatInr(
                                            item.commission_amount_minor,
                                        )}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 text-right text-red-700 dark:border-border dark:text-red-400 print:border-neutral-300 print:text-red-700">
                                        -{' '}
                                        {formatInr(
                                            item.commission_tax_amount_minor,
                                        )}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 text-right text-amber-800 dark:border-border dark:text-amber-300 print:border-neutral-300 print:text-amber-800">
                                        - {formatInr(item.tax_deduction_minor)}
                                    </td>
                                    <td className="border border-tijum-surface p-2.5 text-right font-bold text-emerald-800 dark:border-border dark:text-emerald-300 print:border-neutral-300 print:text-emerald-800">
                                        {formatInr(item.net_payable_minor)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-tijum-cream/55 font-heading font-bold text-tijum-plum dark:bg-muted/55 dark:text-foreground print:bg-neutral-100 print:text-neutral-900">
                            <tr>
                                <td
                                    colSpan={3}
                                    className="border border-tijum-surface p-2.5 dark:border-border print:border-neutral-300"
                                >
                                    Total Settlement Figures (INR)
                                </td>
                                <td className="border border-tijum-surface p-2.5 text-right dark:border-border print:border-neutral-300">
                                    {formatInr(
                                        settlement.gross_booking_value_minor,
                                    )}
                                </td>
                                <td className="border border-tijum-surface p-2.5 text-right text-red-700 dark:border-border dark:text-red-400 print:border-neutral-300 print:text-red-700">
                                    -{' '}
                                    {formatInr(
                                        settlement.commission_amount_minor,
                                    )}
                                </td>
                                <td className="border border-tijum-surface p-2.5 text-right text-red-700 dark:border-border dark:text-red-400 print:border-neutral-300 print:text-red-700">
                                    -{' '}
                                    {formatInr(
                                        settlement.commission_tax_amount_minor,
                                    )}
                                </td>
                                <td className="border border-tijum-surface p-2.5 text-right text-amber-800 dark:border-border dark:text-amber-300 print:border-neutral-300 print:text-amber-800">
                                    -{' '}
                                    {formatInr(
                                        settlement.statutory_deductions_minor,
                                    )}
                                </td>
                                <td className="border border-tijum-surface p-2.5 text-right text-sm text-emerald-900 dark:border-border dark:text-emerald-300 print:border-neutral-300 print:text-emerald-900">
                                    {formatInr(
                                        settlement.net_settlement_amount_minor,
                                    )}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Net Settlement Summary Box */}
                <div className="my-4 flex justify-end tabular-nums">
                    <div className="w-72 space-y-2 rounded-xl border border-tijum-surface bg-tijum-cream/45 p-4 dark:border-border dark:bg-muted/45 print:border-neutral-300 print:bg-neutral-50">
                        <div className="flex justify-between text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            <span>Gross Booking Value:</span>
                            <span className="font-semibold text-tijum-plum dark:text-foreground print:text-neutral-900">
                                {formatInr(
                                    settlement.gross_booking_value_minor,
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            <span>Marketplace Commission:</span>
                            <span className="text-red-700 dark:text-red-400 print:text-red-700">
                                -{' '}
                                {formatInr(settlement.commission_amount_minor)}
                            </span>
                        </div>
                        <div className="flex justify-between text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            <span>GST on Commission (18%):</span>
                            <span className="text-red-700 dark:text-red-400 print:text-red-700">
                                -{' '}
                                {formatInr(
                                    settlement.commission_tax_amount_minor,
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                            <span>TDS u/s 393(1) (0.10%):</span>
                            <span className="text-amber-800 dark:text-amber-300 print:text-amber-800">
                                -{' '}
                                {formatInr(
                                    settlement.statutory_deductions_minor,
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-tijum-surface pt-2 font-heading text-sm font-bold text-tijum-plum dark:border-border dark:text-foreground print:border-neutral-300 print:text-neutral-900">
                            <span>Net Bank Transfer:</span>
                            <span className="text-emerald-900 dark:text-emerald-300 print:text-emerald-900">
                                {formatInr(
                                    settlement.net_settlement_amount_minor,
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Legal & Regulatory Notes */}
                <div className="mt-8 space-y-1.5 border-t border-tijum-surface pt-4 text-[10px] leading-relaxed text-tijum-plum-muted dark:border-border dark:text-muted-foreground print:border-neutral-300 print:text-neutral-500">
                    <p>
                        <strong>Non-Negotiable Marketplace Disclaimer:</strong>{' '}
                        TIJUM operates purely as an online accommodation
                        aggregator. TIJUM does not act as a Payment Aggregator
                        or operate partner wallets/escrows. All fund
                        disbursements are transferred through RBI-authorized
                        payment aggregator infrastructure.
                    </p>
                    <p>
                        <strong>Tax Treatment:</strong> Income-tax withholding
                        is deducted in compliance with Income-tax Act, 2025
                        Section 393(1) Table Sl. No. 8(v) (effective April 1,
                        2026). This document is an internal settlement voucher
                        and does not substitute for a statutory GST tax invoice.
                    </p>
                    <p>
                        For any queries regarding this statement, please contact
                        TIJUM Partner Support or email finance@tijum.in
                        referencing settlement number{' '}
                        {settlement.settlement_reference}.
                    </p>
                </div>
            </div>
        </div>
    );
}
