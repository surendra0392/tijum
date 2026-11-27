<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Financial;

use App\Actions\Financial\ApprovePartnerSettlement;
use App\Actions\Financial\CreatePartnerSettlement;
use App\Actions\Financial\ReleasePartnerSettlement;
use App\Enums\SettlementStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateSettlementRequest;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Services\Financial\SettlementCalculationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminSettlementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = PartnerSettlement::query()->with(['owner', 'financialProfile', 'items']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $settlements = $query->latest('id')->paginate(20)->withQueryString();

        $agg = PartnerSettlement::query()
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN status = ? THEN net_settlement_amount_minor ELSE 0 END), 0) as total_settled_minor, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN net_settlement_amount_minor ELSE 0 END), 0) as total_approved_minor, '.
                'COALESCE(SUM(CASE WHEN status IN (?, ?) THEN net_settlement_amount_minor ELSE 0 END), 0) as total_draft_minor, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN net_settlement_amount_minor ELSE 0 END), 0) as total_failed_minor, '.
                'COALESCE(SUM(commission_amount_minor), 0) as total_commission_minor, '.
                'COALESCE(SUM(statutory_deductions_minor), 0) as total_tax_deducted_minor',
                [
                    SettlementStatus::Settled->value,
                    SettlementStatus::Approved->value,
                    SettlementStatus::Draft->value,
                    SettlementStatus::PendingApproval->value,
                    SettlementStatus::Failed->value,
                ]
            )
            ->first();

        $metrics = [
            'total_settled_minor' => (int) ($agg->total_settled_minor ?? 0),
            'total_approved_minor' => (int) ($agg->total_approved_minor ?? 0),
            'total_draft_minor' => (int) ($agg->total_draft_minor ?? 0),
            'total_failed_minor' => (int) ($agg->total_failed_minor ?? 0),
            'total_commission_minor' => (int) ($agg->total_commission_minor ?? 0),
            'total_tax_deducted_minor' => (int) ($agg->total_tax_deducted_minor ?? 0),
        ];

        return Inertia::render('admin/settlements/index', [
            'settlements' => [
                'data' => $settlements->getCollection()->map(fn (PartnerSettlement $s): array => [
                    'id' => $s->id,
                    'settlement_reference' => $s->settlement_reference,
                    'owner_name' => $s->owner->name,
                    'owner_email' => $s->owner->email,
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
                    'created_at' => $s->created_at?->toIso8601String(),
                    'settled_at' => $s->settled_at?->toIso8601String(),
                    'items_count' => $s->items->count(),
                ]),
                'current_page' => $settlements->currentPage(),
                'last_page' => $settlements->lastPage(),
                'per_page' => $settlements->perPage(),
                'total' => $settlements->total(),
            ],
            'metrics' => $metrics,
            'filters' => [
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function candidates(
        Request $request,
        SettlementCalculationService $calculationService,
    ): Response {
        $eligiblePartners = Owner::query()
            ->whereHas('financialProfile', fn ($q) => $q->where('onboarding_status', 'active'))
            ->with(['financialProfile', 'properties'])
            ->get()
            ->map(function (Owner $owner) use ($calculationService): ?array {
                $eligibleRes = $calculationService->getEligibleReservations($owner);
                if ($eligibleRes->isEmpty()) {
                    return null;
                }

                $summary = $calculationService->calculateSettlementSummary($owner, $eligibleRes);

                return [
                    'owner_id' => $owner->id,
                    'owner_name' => $owner->name,
                    'owner_email' => $owner->email,
                    'eligible_reservations_count' => $eligibleRes->count(),
                    'gross_booking_value_minor' => $summary['gross_booking_value_minor'],
                    'commission_amount_minor' => $summary['commission_amount_minor'],
                    'net_settlement_amount_minor' => $summary['net_settlement_amount_minor'],
                    'tax_review_required' => $summary['tax_review_required'],
                    'tax_review_reasons' => $summary['tax_review_reasons'],
                    'reservations' => $eligibleRes->map(fn ($r): array => [
                        'id' => $r->id,
                        'booking_reference' => $r->booking_reference,
                        'property_name' => $r->property?->name,
                        'stay_dates' => $r->check_in_date->format('M d').' – '.$r->checkout_date->format('M d, Y'),
                        'total_amount_minor' => $r->total_amount_minor,
                    ]),
                ];
            })
            ->filter()
            ->values();

        return Inertia::render('admin/settlements/candidates', [
            'candidates' => $eligiblePartners,
        ]);
    }

    public function store(
        CreateSettlementRequest $request,
        CreatePartnerSettlement $action,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        $validated = $request->validated();

        $owner = Owner::findOrFail($validated['owner_id']);

        $settlement = $action->execute(
            owner: $owner,
            admin: $admin,
            reservationIds: $validated['reservation_ids'] ?? null,
        );

        return redirect()->route('admin.settlements.show', $settlement->id)
            ->with('success', "Draft settlement {$settlement->settlement_reference} generated successfully.");
    }

    public function show(PartnerSettlement $settlement): Response
    {
        $settlement->loadMissing([
            'owner',
            'financialProfile',
            'approvedByAdmin',
            'providerTransfers',
            'items.reservation.property',
        ]);

        return Inertia::render('admin/settlements/show', [
            'settlement' => [
                'id' => $settlement->id,
                'settlement_reference' => $settlement->settlement_reference,
                'owner_name' => $settlement->owner->name,
                'owner_email' => $settlement->owner->email,
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
                'approved_by' => $settlement->approvedByAdmin?->name,
                'approved_at' => $settlement->approved_at?->toIso8601String(),
                'transfer_initiated_at' => $settlement->transfer_initiated_at?->toIso8601String(),
                'settled_at' => $settlement->settled_at?->toIso8601String(),
                'provider_transfer_id' => $settlement->provider_transfer_id,
                'provider_status' => $settlement->provider_status,
                'failure_reason' => $settlement->failure_reason,
                'admin_notes' => $settlement->admin_notes,
                'bank_account_masked' => $settlement->financialProfile?->bank_account_number_masked,
                'bank_name' => $settlement->financialProfile?->bank_name,
                'bank_ifsc' => $settlement->financialProfile?->bank_ifsc,
                'razorpay_account_id' => $settlement->financialProfile?->razorpay_account_id,
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

    public function approve(
        PartnerSettlement $settlement,
        Request $request,
        ApprovePartnerSettlement $action,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $action->execute($settlement, $admin);

        return back()->with('success', "Settlement {$settlement->settlement_reference} approved for transfer.");
    }

    public function release(
        PartnerSettlement $settlement,
        Request $request,
        ReleasePartnerSettlement $action,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');

        $result = $action->execute($settlement, $admin);

        if ($result->status === SettlementStatus::Failed) {
            return back()->withErrors(['settlement' => $result->failure_reason ?? 'Provider transfer failed.']);
        }

        if ($result->status === SettlementStatus::TransferPending) {
            return back()->with('success', "Settlement {$settlement->settlement_reference} is awaiting provider confirmation.");
        }

        return back()->with('success', "Settlement {$settlement->settlement_reference} provider transfer dispatched.");
    }

    public function hold(
        PartnerSettlement $settlement,
        Request $request,
    ): RedirectResponse {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        abort_unless($admin->hasPermission('settlements.manage'), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($settlement, $validated): void {
            $lockedSettlement = PartnerSettlement::query()->lockForUpdate()->findOrFail($settlement->id);

            if (! in_array($lockedSettlement->status, [SettlementStatus::Draft, SettlementStatus::PendingApproval, SettlementStatus::Approved], true)
                || $lockedSettlement->transfer_initiated_at !== null
                || $lockedSettlement->settled_at !== null
                || filled($lockedSettlement->provider_transfer_id)
                || $lockedSettlement->providerTransfers()->lockForUpdate()->first(['id']) !== null) {
                throw ValidationException::withMessages([
                    'settlement' => 'Only draft, awaiting approval, or approved settlements with no payout activity can be placed on hold.',
                ]);
            }

            $lockedSettlement->forceFill([
                'status' => SettlementStatus::OnHold,
                'admin_notes' => trim(($lockedSettlement->admin_notes ?? '')."\nPlaced on hold: ".$validated['reason']),
            ])->save();
        }, 3);

        return back()->with('success', "Settlement {$settlement->settlement_reference} placed on hold.");
    }

    public function exportCsv(PartnerSettlement $settlement): StreamedResponse
    {
        $settlement->loadMissing(['owner', 'items.reservation.property', 'financialProfile']);

        $filename = sprintf('admin-settlement-%s.csv', $settlement->settlement_reference);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($settlement): void {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, ['TIJUM ADMIN SETTLEMENT STATEMENT']);
            fputcsv($file, ['Settlement Reference', $settlement->settlement_reference]);
            fputcsv($file, ['Billing Period', sprintf('%s to %s', $settlement->period_start->toDateString(), $settlement->period_end->toDateString())]);
            fputcsv($file, ['Settlement Status', $settlement->status->label()]);
            fputcsv($file, ['Settled At', $settlement->settled_at?->format('Y-m-d H:i:s') ?? 'Pending Transfer']);
            fputcsv($file, ['Partner Name', $this->sanitizeCsvCell($settlement->owner->name)]);
            fputcsv($file, ['Partner Email', $this->sanitizeCsvCell($settlement->owner->email)]);
            fputcsv($file, ['Partner Legal Name', $this->sanitizeCsvCell($settlement->financialProfile?->legal_business_name ?? 'N/A')]);
            fputcsv($file, ['Partner PAN', $this->sanitizeCsvCell($settlement->financialProfile?->pan_number ?? 'N/A')]);
            fputcsv($file, ['Partner GSTIN', $this->sanitizeCsvCell($settlement->financialProfile?->gstin ?? 'N/A')]);
            fputcsv($file, ['Bank IFSC', $this->sanitizeCsvCell($settlement->financialProfile?->bank_ifsc ?? 'N/A')]);
            fputcsv($file, ['Bank Account (Masked)', $this->sanitizeCsvCell($settlement->financialProfile?->bank_account_number_masked ?? 'N/A')]);
            fputcsv($file, ['Razorpay Account ID', $this->sanitizeCsvCell($settlement->financialProfile?->razorpay_account_id ?? 'N/A')]);
            fputcsv($file, ['Provider Transfer ID', $this->sanitizeCsvCell($settlement->provider_transfer_id ?? 'N/A')]);
            fputcsv($file, ['Provider Status', $this->sanitizeCsvCell($settlement->provider_status ?? 'N/A')]);
            fputcsv($file, []);

            fputcsv($file, ['FINANCIAL TOTALS (INR)']);
            fputcsv($file, ['Gross Booking Value (INR)', number_format($settlement->gross_booking_value_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Platform Commission (INR)', number_format($settlement->commission_amount_minor / 100, 2, '.', '')]);
            fputcsv($file, ['GST on Commission (18%) (INR)', number_format($settlement->commission_tax_amount_minor / 100, 2, '.', '')]);
            fputcsv($file, ['TDS / Statutory Deductions (INR)', number_format($settlement->statutory_deductions_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Refund Adjustments (INR)', number_format($settlement->refund_adjustments_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Relocation Adjustments (INR)', number_format($settlement->relocation_adjustments_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Other Adjustments (INR)', number_format($settlement->other_adjustments_minor / 100, 2, '.', '')]);
            fputcsv($file, ['Net Settlement Amount (INR)', number_format($settlement->net_settlement_amount_minor / 100, 2, '.', '')]);
            fputcsv($file, []);

            fputcsv($file, [
                'Booking Reference',
                'Property Name',
                'Stay Dates',
                'Item Type',
                'Gross Amount (INR)',
                'Commission (INR)',
                'Commission GST (INR)',
                'Tax Deduction TDS (INR)',
                'Net Payable (INR)',
                'Notes',
            ]);

            foreach ($settlement->items as $item) {
                fputcsv($file, [
                    $this->sanitizeCsvCell($item->reservation->booking_reference),
                    $this->sanitizeCsvCell($item->reservation->property?->name ?? 'N/A'),
                    $item->reservation->check_in_date->toDateString().' – '.$item->reservation->checkout_date->toDateString(),
                    $item->item_type->label(),
                    number_format($item->gross_amount_minor / 100, 2, '.', ''),
                    number_format($item->commission_amount_minor / 100, 2, '.', ''),
                    number_format($item->commission_tax_amount_minor / 100, 2, '.', ''),
                    number_format($item->tax_deduction_minor / 100, 2, '.', ''),
                    number_format($item->net_payable_minor / 100, 2, '.', ''),
                    $this->sanitizeCsvCell($item->notes ?? ''),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function sanitizeCsvCell(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$value : $value;
    }
}
