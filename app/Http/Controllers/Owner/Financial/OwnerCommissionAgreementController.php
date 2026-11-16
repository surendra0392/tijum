<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Financial;

use App\Actions\Owner\AcceptCommissionAgreement;
use App\Enums\CommissionAgreementStatus;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\PartnerCommissionAgreement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerCommissionAgreementController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        $agreements = $owner->commissionAgreements()
            ->with(['property'])
            ->get()
            ->map(fn (PartnerCommissionAgreement $a): array => [
                'id' => $a->id,
                'agreement_reference' => $a->agreement_reference,
                'property_name' => $a->property?->name ?? 'All Properties (Owner-Wide)',
                'commission_rate_bps' => $a->commission_rate_bps,
                'commission_rate_percentage' => $a->getCommissionPercentage(),
                'commission_base_type' => $a->commission_base_type->value,
                'commission_base_label' => $a->commission_base_type->label(),
                'commission_gst_type' => $a->commission_gst_type->value,
                'commission_gst_label' => $a->commission_gst_type->label(),
                'terms_version' => $a->terms_version,
                'status' => $a->status->value,
                'status_label' => $a->status->label(),
                'effective_from' => $a->effective_from->toDateString(),
                'effective_until' => $a->effective_until?->toDateString(),
                'accepted_at' => $a->accepted_at?->toIso8601String(),
                'is_pending_acceptance' => $a->status === CommissionAgreementStatus::PendingAcceptance,
                'is_active' => $a->status === CommissionAgreementStatus::Active,
            ]);

        $activeAgreement = $agreements->firstWhere('is_active', true);
        $pendingAgreement = $agreements->firstWhere('is_pending_acceptance', true);

        return Inertia::render('owner/commissions/index', [
            'agreements' => $agreements,
            'active_agreement' => $activeAgreement,
            'pending_agreement' => $pendingAgreement,
        ]);
    }

    public function accept(
        PartnerCommissionAgreement $agreement,
        Request $request,
        AcceptCommissionAgreement $action,
    ): RedirectResponse {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        $action->execute($agreement, $owner);

        return redirect()->route('owner.commission-agreements.index')
            ->with('success', 'You have accepted the commercial agreement terms.');
    }
}
