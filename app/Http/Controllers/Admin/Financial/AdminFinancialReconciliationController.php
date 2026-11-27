<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Financial;

use App\Enums\SettlementStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\PartnerSettlement;
use App\Services\Financial\FinancialReconciliationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminFinancialReconciliationController extends Controller
{
    public function index(FinancialReconciliationService $reconciliationService): Response
    {
        $exceptions = $reconciliationService->getUnreconciledExceptions();
        $ledgerAudit = $reconciliationService->getLedgerAuditSummary();

        $agg = PartnerSettlement::query()
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? THEN net_settlement_amount_minor ELSE 0 END), 0) as total_settled_minor, '.
                'COALESCE(SUM(commission_amount_minor), 0) as total_commission_minor, '.
                'COALESCE(SUM(statutory_deductions_minor), 0) as total_tax_deductions_minor',
                [SettlementStatus::Settled->value]
            )
            ->first();

        return Inertia::render('admin/reconciliation/index', [
            'exceptions' => $exceptions,
            'summary' => [
                'total_settled_minor' => (int) ($agg->total_settled_minor ?? 0),
                'total_commission_minor' => (int) ($agg->total_commission_minor ?? 0),
                'total_tax_deductions_minor' => (int) ($agg->total_tax_deductions_minor ?? 0),
                'unreconciled_count' => $exceptions->count(),
            ],
            'ledger_audit' => $ledgerAudit,
        ]);
    }

    public function resolve(PartnerSettlement $settlement, Request $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin->hasPermission('financial.reconciliation'), 403);

        $validated = $request->validate([
            'notes' => ['required', 'string', 'max:1000'],
        ]);

        $settlement->forceFill([
            'reconciled_at' => CarbonImmutable::now(),
            'admin_notes' => trim(($settlement->admin_notes ?? '')."\nManual Reconciliation by {$admin->name}: ".$validated['notes']),
        ])->save();

        return back()->with('success', "Settlement {$settlement->settlement_reference} marked as manually reconciled.");
    }

    public function export(): StreamedResponse
    {
        $filename = 'tijum_financial_settlements_export_'.now()->format('Y_m_d_His').'.csv';

        return response()->streamDownload(function (): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            // CSV Header
            fputcsv($handle, [
                'Settlement Reference',
                'Partner Name',
                'Period Start',
                'Period End',
                'Gross Booking Amount (INR)',
                'TIJUM Commission (INR)',
                'Commission GST 18% (INR)',
                'TDS Withheld (INR)',
                'Refund Deductions (INR)',
                'Net Partner Payable (INR)',
                'Settlement Status',
                'Provider Transfer ID',
                'Settled At',
            ]);

            PartnerSettlement::query()
                ->with(['owner'])
                ->chunk(100, function ($settlements) use ($handle): void {
                    foreach ($settlements as $s) {
                        fputcsv($handle, [
                            $this->sanitizeCsvCell($s->settlement_reference),
                            $this->sanitizeCsvCell($s->owner->name),
                            $s->period_start->toDateString(),
                            $s->period_end->toDateString(),
                            number_format($s->gross_booking_value_minor / 100, 2, '.', ''),
                            number_format($s->commission_amount_minor / 100, 2, '.', ''),
                            number_format($s->commission_tax_amount_minor / 100, 2, '.', ''),
                            number_format($s->statutory_deductions_minor / 100, 2, '.', ''),
                            number_format($s->refund_adjustments_minor / 100, 2, '.', ''),
                            number_format($s->net_settlement_amount_minor / 100, 2, '.', ''),
                            $s->status->label(),
                            $this->sanitizeCsvCell($s->provider_transfer_id ?? 'N/A'),
                            $s->settled_at?->toIso8601String() ?? 'N/A',
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function sanitizeCsvCell(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$value : $value;
    }
}
