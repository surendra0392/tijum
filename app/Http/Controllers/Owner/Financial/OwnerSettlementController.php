<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Financial;

use App\Enums\SettlementStatus;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OwnerSettlementController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        $query = $owner->settlements()->with(['items']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $settlements = $query->paginate(15)->withQueryString();

        // Calculate owner lifetime metrics
        $all = $owner->settlements()->get();
        $settledTotal = (int) $all->where('status', SettlementStatus::Settled)->sum('net_settlement_amount_minor');
        $approvedTotal = (int) $all->where('status', SettlementStatus::Approved)->sum('net_settlement_amount_minor');
        $pendingTotal = (int) $all->whereIn('status', [SettlementStatus::Draft, SettlementStatus::PendingApproval])->sum('net_settlement_amount_minor');
        $onHoldTotal = (int) $all->where('status', SettlementStatus::OnHold)->sum('net_settlement_amount_minor');
        $totalCommissionPaid = (int) $all->sum('commission_amount_minor');
        $totalTaxDeducted = (int) $all->sum('statutory_deductions_minor');

        return Inertia::render('owner/settlements/index', [
            'settlements' => [
                'data' => $settlements->getCollection()->map(fn (PartnerSettlement $s): array => [
                    'id' => $s->id,
                    'settlement_reference' => $s->settlement_reference,
                    'period_start' => $s->period_start->toDateString(),
                    'period_end' => $s->period_end->toDateString(),
                    'currency' => $s->currency,
                    'gross_booking_value_minor' => $s->gross_booking_value_minor,
                    'commission_amount_minor' => $s->commission_amount_minor,
                    'commission_tax_amount_minor' => $s->commission_tax_amount_minor,
                    'statutory_deductions_minor' => $s->statutory_deductions_minor,
                    'refund_adjustments_minor' => $s->refund_adjustments_minor,
                    'net_settlement_amount_minor' => $s->net_settlement_amount_minor,
                    'status' => $s->status->value,
                    'status_label' => $s->status->label(),
                    'provider_status' => $s->provider_status,
                    'settled_at' => $s->settled_at?->toIso8601String(),
                    'created_at' => $s->created_at?->toIso8601String(),
                    'items_count' => $s->items->count(),
                ]),
                'current_page' => $settlements->currentPage(),
                'last_page' => $settlements->lastPage(),
                'per_page' => $settlements->perPage(),
                'total' => $settlements->total(),
            ],
            'metrics' => [
                'settled_total_minor' => $settledTotal,
                'approved_total_minor' => $approvedTotal,
                'pending_total_minor' => $pendingTotal,
                'on_hold_total_minor' => $onHoldTotal,
                'commission_paid_minor' => $totalCommissionPaid,
                'tax_deducted_minor' => $totalTaxDeducted,
            ],
            'filters' => [
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function show(PartnerSettlement $settlement, Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        if ($settlement->owner_id !== $owner->id) {
            abort(403);
        }

        $settlement->loadMissing(['items.reservation.property', 'financialProfile', 'providerTransfers']);

        return Inertia::render('owner/settlements/show', [
            'settlement' => [
                'id' => $settlement->id,
                'settlement_reference' => $settlement->settlement_reference,
                'period_start' => $settlement->period_start->toDateString(),
                'period_end' => $settlement->period_end->toDateString(),
                'currency' => $settlement->currency,
                'gross_booking_value_minor' => $settlement->gross_booking_value_minor,
                'commission_amount_minor' => $settlement->commission_amount_minor,
                'commission_tax_amount_minor' => $settlement->commission_tax_amount_minor,
                'statutory_deductions_minor' => $settlement->statutory_deductions_minor,
                'refund_adjustments_minor' => $settlement->refund_adjustments_minor,
                'relocation_adjustments_minor' => $settlement->relocation_adjustments_minor,
                'other_adjustments_minor' => $settlement->other_adjustments_minor,
                'net_settlement_amount_minor' => $settlement->net_settlement_amount_minor,
                'status' => $settlement->status->value,
                'status_label' => $settlement->status->label(),
                'provider_transfer_id' => $settlement->provider_transfer_id,
                'provider_status' => $settlement->provider_status,
                'failure_reason' => $settlement->failure_reason,
                'settled_at' => $settlement->settled_at?->toIso8601String(),
                'transfer_initiated_at' => $settlement->transfer_initiated_at?->toIso8601String(),
                'created_at' => $settlement->created_at?->toIso8601String(),
                'bank_account_masked' => $settlement->financialProfile?->bank_account_number_masked,
                'bank_name' => $settlement->financialProfile?->bank_name,
                'bank_ifsc' => $settlement->financialProfile?->bank_ifsc,
                'items' => $settlement->items->map(fn (PartnerSettlementItem $item): array => [
                    'id' => $item->id,
                    'booking_reference' => $item->reservation->booking_reference,
                    'property_name' => $item->reservation->property?->name,
                    'stay_dates' => $item->reservation->check_in_date->format('M d, Y').' – '.$item->reservation->checkout_date->format('M d, Y'),
                    'item_type' => $item->item_type->value,
                    'item_type_label' => $item->item_type->label(),
                    'gross_amount_minor' => $item->gross_amount_minor,
                    'commission_amount_minor' => $item->commission_amount_minor,
                    'commission_tax_amount_minor' => $item->commission_tax_amount_minor,
                    'tax_deduction_minor' => $item->tax_deduction_minor,
                    'net_payable_minor' => $item->net_payable_minor,
                    'notes' => $item->notes,
                ]),
            ],
        ]);
    }

    public function statement(PartnerSettlement $settlement, Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        if ($settlement->owner_id !== $owner->id) {
            abort(403);
        }

        $settlement->loadMissing(['items.reservation.property', 'financialProfile']);

        return Inertia::render('owner/settlements/statement', [
            'settlement' => [
                'settlement_reference' => $settlement->settlement_reference,
                'period_start' => $settlement->period_start->toDateString(),
                'period_end' => $settlement->period_end->toDateString(),
                'currency' => $settlement->currency,
                'gross_booking_value_minor' => $settlement->gross_booking_value_minor,
                'commission_amount_minor' => $settlement->commission_amount_minor,
                'commission_tax_amount_minor' => $settlement->commission_tax_amount_minor,
                'statutory_deductions_minor' => $settlement->statutory_deductions_minor,
                'refund_adjustments_minor' => $settlement->refund_adjustments_minor,
                'net_settlement_amount_minor' => $settlement->net_settlement_amount_minor,
                'status' => $settlement->status->value,
                'status_label' => $settlement->status->label(),
                'provider_status' => $settlement->provider_status,
                'settled_at' => $settlement->settled_at?->format('F d, Y'),
                'created_at' => $settlement->created_at?->format('F d, Y'),
                'platform_legal_name' => config('tijum.settlements.platform_legal_name', 'TIJUM Marketplace Private Limited'),
                'platform_gstin' => config('tijum.settlements.platform_gstin', '36AAAAA0000A1Z5'),
                'partner_name' => $settlement->financialProfile?->legal_business_name ?? $owner->name,
                'partner_pan' => $settlement->financialProfile?->pan_number,
                'partner_gstin' => $settlement->financialProfile?->gstin,
                'partner_bank_masked' => $settlement->financialProfile?->bank_account_number_masked,
                'partner_bank_ifsc' => $settlement->financialProfile?->bank_ifsc,
                'items' => $settlement->items->map(fn (PartnerSettlementItem $item): array => [
                    'booking_reference' => $item->reservation->booking_reference,
                    'property_name' => $item->reservation->property?->name,
                    'stay_dates' => $item->reservation->check_in_date->format('d/m/Y').' - '.$item->reservation->checkout_date->format('d/m/Y'),
                    'gross_amount_minor' => $item->gross_amount_minor,
                    'commission_amount_minor' => $item->commission_amount_minor,
                    'commission_tax_amount_minor' => $item->commission_tax_amount_minor,
                    'tax_deduction_minor' => $item->tax_deduction_minor,
                    'net_payable_minor' => $item->net_payable_minor,
                ]),
            ],
        ]);
    }

    public function exportCsv(PartnerSettlement $settlement, Request $request): StreamedResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        if ($settlement->owner_id !== $owner->id) {
            abort(403);
        }

        $settlement->loadMissing(['items.reservation.property', 'financialProfile']);

        $filename = sprintf('settlement-%s.csv', $settlement->settlement_reference);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($settlement, $owner): void {
            $file = fopen('php://output', 'w');
            // Add UTF-8 BOM for Microsoft Excel compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            // Metadata section
            fputcsv($file, ['TIJUM PARTNER SETTLEMENT STATEMENT']);
            fputcsv($file, ['Settlement Reference', $settlement->settlement_reference]);
            fputcsv($file, ['Billing Period', sprintf('%s to %s', $settlement->period_start->toDateString(), $settlement->period_end->toDateString())]);
            fputcsv($file, ['Settlement Status', $settlement->status->label()]);
            fputcsv($file, ['Settled At', $settlement->settled_at?->format('Y-m-d H:i:s') ?? 'Pending Transfer']);
            fputcsv($file, ['Partner Legal Name', $settlement->financialProfile?->legal_business_name ?? $owner->name]);
            fputcsv($file, ['Partner PAN', $settlement->financialProfile?->pan_number ?? 'N/A']);
            fputcsv($file, ['Partner GSTIN', $settlement->financialProfile?->gstin ?? 'N/A']);
            fputcsv($file, ['Bank Beneficiary IFSC', $settlement->financialProfile?->bank_ifsc ?? 'N/A']);
            fputcsv($file, ['Bank Account (Masked)', $settlement->financialProfile?->bank_account_number_masked ?? 'N/A']);
            fputcsv($file, ['Platform Legal Name', config('tijum.settlements.platform_legal_name', 'TIJUM Marketplace Private Limited')]);
            fputcsv($file, ['Platform GSTIN', config('tijum.settlements.platform_gstin', '36AAAAA0000A1Z5')]);
            fputcsv($file, []);

            // Summary Totals
            fputcsv($file, ['FINANCIAL TOTALS (INR)']);
            fputcsv($file, ['Gross Booking Value (INR)', number_format($settlement->gross_booking_value_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Platform Commission (INR)', number_format($settlement->commission_amount_minor / 100, 2, '.', '')]);
            fputcsv($file, ['GST on Commission (18%) (INR)', number_format($settlement->commission_tax_amount_minor / 100, 2, '.', '')]);
            fputcsv($file, ['TDS / Statutory Deductions (INR)', number_format($settlement->statutory_deductions_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Refund & Dispute Adjustments (INR)', number_format($settlement->refund_adjustments_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Net Settlement Amount Payable (INR)', number_format($settlement->net_settlement_amount_minor / 100, 2, '.', '')]);
            fputcsv($file, []);

            // Line items header
            fputcsv($file, [
                'Booking Reference',
                'Property Name',
                'Check-In Date',
                'Check-Out Date',
                'Gross Booking Amount (INR)',
                'Commission Fee (INR)',
                'Commission GST (INR)',
                'Tax Deduction TDS (INR)',
                'Net Payable to Partner (INR)',
            ]);

            foreach ($settlement->items as $item) {
                fputcsv($file, [
                    $item->reservation->booking_reference,
                    $item->reservation->property?->name ?? 'N/A',
                    $item->reservation->check_in_date->toDateString(),
                    $item->reservation->checkout_date->toDateString(),
                    number_format($item->gross_amount_minor / 100, 2, '.', ''),
                    number_format($item->commission_amount_minor / 100, 2, '.', ''),
                    number_format($item->commission_tax_amount_minor / 100, 2, '.', ''),
                    number_format($item->tax_deduction_minor / 100, 2, '.', ''),
                    number_format($item->net_payable_minor / 100, 2, '.', ''),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
