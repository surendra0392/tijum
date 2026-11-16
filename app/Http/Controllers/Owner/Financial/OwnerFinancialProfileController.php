<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Financial;

use App\Actions\Owner\UpdateFinancialProfile;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\UpdateFinancialProfileRequest;
use App\Models\Owner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerFinancialProfileController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        $profile = $owner->financialProfile;

        return Inertia::render('owner/financial/index', [
            'profile' => $profile ? [
                'legal_business_name' => $profile->legal_business_name,
                'business_constitution' => $profile->business_constitution,
                'pan_number' => $profile->pan_number,
                'pan_verified' => $profile->pan_verified_at !== null,
                'gst_registered' => $profile->gst_registered,
                'gstin' => $profile->gstin,
                'supplier_legal_classification' => $profile->supplier_legal_classification,
                'razorpay_account_id' => $profile->razorpay_account_id,
                'linked_account_status' => $profile->linked_account_status->value,
                'linked_account_label' => $profile->linked_account_status->label(),
                'bank_beneficiary_name' => $profile->bank_beneficiary_name,
                'bank_account_number_masked' => $profile->bank_account_number_masked,
                'bank_ifsc' => $profile->bank_ifsc,
                'bank_name' => $profile->bank_name,
                'beneficiary_verified' => $profile->beneficiary_verified_at !== null,
                'onboarding_status' => $profile->onboarding_status->value,
                'onboarding_label' => $profile->onboarding_status->label(),
                'is_eligible' => $profile->isSettlementEligible(),
                'rejection_reason' => $profile->rejection_reason,
                'verified_at' => $profile->verified_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function update(
        UpdateFinancialProfileRequest $request,
        UpdateFinancialProfile $action,
    ): RedirectResponse {
        /** @var Owner $owner */
        $owner = $request->user('owner');

        $action->execute($owner, $request->validated());

        return redirect()->route('owner.financial-profile.show')
            ->with('success', 'Your partner financial profile has been submitted for verification.');
    }
}
