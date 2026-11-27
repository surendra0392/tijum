<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Reports;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\FinancialLedgerEntry;
use App\Models\PartnerCommissionAgreement;
use App\Models\PartnerSettlement;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Admin\AdminDashboardMetricsService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportExportController extends Controller
{
    public function __construct(
        private readonly AdminDashboardMetricsService $metricsService,
    ) {}

    public function export(Request $request): StreamedResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $report = $request->query('report', 'reservations');
        $range = $request->query('range', 'last_30_days');
        $cityId = $request->filled('city_id') ? (int) $request->query('city_id') : null;
        $customFrom = $request->query('from');
        $customTo = $request->query('to');

        [$start, $end] = $this->metricsService->resolveDateRange($range, $customFrom, $customTo);
        $startUtc = $start->utc();
        $endUtc = $end->utc();

        return match ($report) {
            'reservations' => $this->exportReservations($admin, $startUtc, $endUtc, $cityId),
            'payments' => $this->exportPayments($admin, $startUtc, $endUtc, $cityId),
            'refunds' => $this->exportRefunds($admin, $startUtc, $endUtc, $cityId),
            'customer-cases' => $this->exportCustomerCases($admin, $startUtc, $endUtc, $cityId),
            'settlements' => $this->exportSettlements($admin, $startUtc, $endUtc),
            'partner-commissions' => $this->exportCommissions($admin, $startUtc, $endUtc),
            'reconciliation-exceptions' => $this->exportReconciliationExceptions($admin, $startUtc, $endUtc),
            default => abort(400, 'Unsupported report type requested.'),
        };
    }

    private function exportReservations(Admin $admin, CarbonImmutable $start, CarbonImmutable $end, ?int $cityId): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('bookings.view') || $admin->hasPermission('bookings.manage'))) {
            abort(403, 'Unauthorized to export reservation reports.');
        }

        $query = Reservation::query()
            ->whereBetween('created_at', [$start, $end])
            ->when($cityId !== null, fn (Builder $q) => $q->whereHas('property', fn (Builder $pq) => $pq->where('city_id', $cityId)))
            ->with(['property.city', 'user'])
            ->latest('created_at');

        $headers = [
            'Booking Reference',
            'Guest Name',
            'Guest Email',
            'Property Name',
            'City',
            'Check-In Date',
            'Check-Out Date',
            'Status',
            'Total Amount (INR)',
            'Commission Amount (INR)',
            'Booked At',
        ];

        return $this->streamCsv('reservations-report', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($reservations) use ($handle): void {
                foreach ($reservations as $r) {
                    fputcsv($handle, [
                        $this->sanitizeCell($r->booking_reference),
                        $this->sanitizeCell($r->contact_name),
                        $this->sanitizeCell($r->contact_email),
                        $this->sanitizeCell($r->property?->name ?? 'N/A'),
                        $this->sanitizeCell($r->property?->city?->name ?? 'N/A'),
                        $r->check_in_date->toDateString(),
                        $r->checkout_date->toDateString(),
                        $r->status->label(),
                        number_format($r->total_amount_minor / 100, 2, '.', ''),
                        number_format(($r->commission_amount_minor ?? 0) / 100, 2, '.', ''),
                        $r->created_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    private function exportPayments(Admin $admin, CarbonImmutable $start, CarbonImmutable $end, ?int $cityId): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('settlements.view'))) {
            abort(403, 'Unauthorized to export payment reports.');
        }

        $query = ReservationPayment::query()
            ->whereBetween('created_at', [$start, $end])
            ->when($cityId !== null, fn (Builder $q) => $q->whereHas('reservation.property', fn (Builder $pq) => $pq->where('city_id', $cityId)))
            ->with(['reservation.property.city'])
            ->latest('created_at');

        $headers = [
            'Payment ID',
            'Gateway Payment ID',
            'Booking Reference',
            'Property Name',
            'City',
            'Amount (INR)',
            'Currency',
            'Status',
            'Method',
            'Captured At',
            'Created At',
        ];

        return $this->streamCsv('payments-report', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($payments) use ($handle): void {
                foreach ($payments as $p) {
                    fputcsv($handle, [
                        $p->id,
                        $this->sanitizeCell($p->gateway_payment_id ?? 'N/A'),
                        $this->sanitizeCell($p->reservation?->booking_reference ?? 'N/A'),
                        $this->sanitizeCell($p->reservation?->property?->name ?? 'N/A'),
                        $this->sanitizeCell($p->reservation?->property?->city?->name ?? 'N/A'),
                        number_format($p->amount_minor / 100, 2, '.', ''),
                        $p->currency,
                        $p->status->value,
                        'razorpay',
                        $p->captured_at?->toIso8601String(),
                        $p->created_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    private function exportRefunds(Admin $admin, CarbonImmutable $start, CarbonImmutable $end, ?int $cityId): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('settlements.view') || $admin->hasPermission('refunds.manage'))) {
            abort(403, 'Unauthorized to export refund reports.');
        }

        $query = ReservationRefund::query()
            ->whereBetween('created_at', [$start, $end])
            ->when($cityId !== null, fn (Builder $q) => $q->whereHas('reservation.property', fn (Builder $pq) => $pq->where('city_id', $cityId)))
            ->with(['reservation.property'])
            ->latest('created_at');

        $headers = [
            'Refund ID',
            'Gateway Refund ID',
            'Booking Reference',
            'Property Name',
            'Amount (INR)',
            'Status',
            'Reason',
            'Processed At',
            'Created At',
        ];

        return $this->streamCsv('refunds-report', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($refunds) use ($handle): void {
                foreach ($refunds as $r) {
                    fputcsv($handle, [
                        $r->id,
                        $this->sanitizeCell($r->gateway_refund_id ?? 'N/A'),
                        $this->sanitizeCell($r->reservation?->booking_reference ?? 'N/A'),
                        $this->sanitizeCell($r->reservation?->property?->name ?? 'N/A'),
                        number_format($r->amount_minor / 100, 2, '.', ''),
                        $r->status->value,
                        $this->sanitizeCell($r->reason ?? 'Customer cancellation/protection'),
                        $r->gateway_processed_at?->toIso8601String(),
                        $r->created_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    private function exportCustomerCases(Admin $admin, CarbonImmutable $start, CarbonImmutable $end, ?int $cityId): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('support.manage') || $admin->hasPermission('operations.manage'))) {
            abort(403, 'Unauthorized to export customer protection reports.');
        }

        $query = CustomerProtectionCase::query()
            ->whereBetween('created_at', [$start, $end])
            ->when($cityId !== null, fn (Builder $q) => $q->whereHas('reservation.property', fn (Builder $pq) => $pq->where('city_id', $cityId)))
            ->with(['user', 'reservation.property.city'])
            ->latest('created_at');

        $headers = [
            'Case Reference',
            'Category',
            'Priority',
            'Status',
            'Guest Name',
            'Property Name',
            'City',
            'Acknowledged At',
            'SLA Due At',
            'Resolved At',
            'Created At',
        ];

        return $this->streamCsv('customer-protection-report', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($cases) use ($handle): void {
                foreach ($cases as $c) {
                    fputcsv($handle, [
                        $this->sanitizeCell($c->case_reference),
                        $c->category->label(),
                        $c->priority->label(),
                        $c->status->label(),
                        $this->sanitizeCell($c->user?->name ?? 'Guest'),
                        $this->sanitizeCell($c->reservation?->property?->name ?? 'N/A'),
                        $this->sanitizeCell($c->reservation?->property?->city?->name ?? 'N/A'),
                        $c->acknowledged_at?->toIso8601String(),
                        $c->sla_due_at?->toIso8601String(),
                        $c->resolved_at?->toIso8601String(),
                        $c->created_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    private function exportSettlements(Admin $admin, CarbonImmutable $start, CarbonImmutable $end): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('settlements.view'))) {
            abort(403, 'Unauthorized to export settlement reports.');
        }

        $query = PartnerSettlement::query()
            ->whereBetween('created_at', [$start, $end])
            ->with(['owner.financialProfile'])
            ->latest('created_at');

        $headers = [
            'Settlement Reference',
            'Partner Name',
            'Bank Masked',
            'Period Start',
            'Period End',
            'Gross Booking Value (INR)',
            'Commission (INR)',
            'Commission GST (INR)',
            'TDS Deduction (INR)',
            'Net Settlement (INR)',
            'Status',
            'Provider Transfer ID',
            'Settled At',
        ];

        return $this->streamCsv('settlements-report', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($settlements) use ($handle): void {
                foreach ($settlements as $s) {
                    fputcsv($handle, [
                        $this->sanitizeCell($s->settlement_reference),
                        $this->sanitizeCell($s->owner?->name ?? 'Partner'),
                        $this->sanitizeCell($s->owner?->financialProfile?->bank_account_number_masked ?? 'N/A'),
                        $s->period_start->toDateString(),
                        $s->period_end->toDateString(),
                        number_format($s->gross_booking_value_minor / 100, 2, '.', ''),
                        number_format($s->commission_amount_minor / 100, 2, '.', ''),
                        number_format($s->commission_tax_amount_minor / 100, 2, '.', ''),
                        number_format($s->statutory_deductions_minor / 100, 2, '.', ''),
                        number_format($s->net_settlement_amount_minor / 100, 2, '.', ''),
                        $s->status->value,
                        $this->sanitizeCell($s->provider_transfer_id ?? 'N/A'),
                        $s->settled_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    private function exportCommissions(Admin $admin, CarbonImmutable $start, CarbonImmutable $end): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('commissions.view') || $admin->hasPermission('settlements.view'))) {
            abort(403, 'Unauthorized to export commission agreements.');
        }

        $query = PartnerCommissionAgreement::query()
            ->with('owner')
            ->latest('created_at');

        $headers = [
            'Agreement Reference',
            'Partner Name',
            'Commission Rate (BPS)',
            'Commission Rate (%)',
            'Base Type',
            'GST Type',
            'Status',
            'Terms Version',
            'Effective From',
            'Effective Until',
            'Accepted At',
        ];

        return $this->streamCsv('commissions-report', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($agreements) use ($handle): void {
                foreach ($agreements as $a) {
                    fputcsv($handle, [
                        $this->sanitizeCell($a->agreement_reference),
                        $this->sanitizeCell($a->owner?->name ?? 'Partner'),
                        $a->commission_rate_bps,
                        number_format($a->commission_rate_bps / 100, 2, '.', '').'%',
                        $a->commission_base_type instanceof \BackedEnum ? $a->commission_base_type->value : (string) $a->commission_base_type,
                        $a->commission_gst_type instanceof \BackedEnum ? $a->commission_gst_type->value : (string) $a->commission_gst_type,
                        $a->status instanceof \BackedEnum ? $a->status->value : (string) $a->status,
                        $a->terms_version,
                        $a->effective_from->toDateString(),
                        $a->effective_until?->toDateString() ?? 'Open-ended',
                        $a->accepted_at?->toIso8601String() ?? 'Pending Acceptance',
                    ]);
                }
            });
        });
    }

    private function exportReconciliationExceptions(Admin $admin, CarbonImmutable $start, CarbonImmutable $end): StreamedResponse
    {
        if (! ($admin->hasPermission('*') || $admin->hasPermission('financial.reconciliation') || $admin->hasPermission('settlements.view'))) {
            abort(403, 'Unauthorized to export reconciliation exceptions.');
        }

        $query = FinancialLedgerEntry::query()
            ->whereBetween('posted_at', [$start, $end])
            ->latest('posted_at');

        $headers = [
            'Entry Reference',
            'Journal Reference',
            'Category',
            'Debit (INR)',
            'Credit (INR)',
            'Currency',
            'Entity Type',
            'Entity ID',
            'Notes',
            'Posted At',
        ];

        return $this->streamCsv('reconciliation-exceptions', $headers, function ($handle) use ($query): void {
            $query->chunk(200, function ($entries) use ($handle): void {
                foreach ($entries as $e) {
                    fputcsv($handle, [
                        $this->sanitizeCell($e->entry_reference),
                        $this->sanitizeCell($e->journal_reference),
                        $e->entry_category instanceof \BackedEnum ? $e->entry_category->value : (string) $e->entry_category,
                        number_format($e->debit_minor / 100, 2, '.', ''),
                        number_format($e->credit_minor / 100, 2, '.', ''),
                        $e->currency,
                        $e->entity_type,
                        $e->entity_id,
                        $this->sanitizeCell($e->notes ?? ''),
                        $e->posted_at->toIso8601String(),
                    ]);
                }
            });
        });
    }

    /**
     * Sanitize cell value to prevent CSV / Spreadsheet formula injection.
     */
    private function sanitizeCell(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $firstChar = substr($value, 0, 1);
        if (in_array($firstChar, ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }

    /**
     * Stream CSV with appropriate headers and filename.
     */
    private function streamCsv(string $filenamePrefix, array $headers, callable $callback): StreamedResponse
    {
        $filename = sprintf('%s-%s.csv', $filenamePrefix, CarbonImmutable::now('Asia/Kolkata')->format('Ymd-His'));

        return response()->stream(function () use ($headers, $callback): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, $headers);
            $callback($handle);
            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
