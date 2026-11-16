<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Financial;

use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Owner;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminFinancialProfileController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Owner::query()->with(['financialProfile']);

        if ($status = $request->query('status')) {
            $query->whereHas('financialProfile', fn ($q) => $q->where('onboarding_status', $status));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $owners = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/financial/index', [
            'partners' => [
                'data' => $owners->getCollection()->map(function (Owner $owner): array {
                    $profile = $owner->financialProfile;

                    return [
                        'owner_id' => $owner->id,
                        'name' => $owner->name,
                        'email' => $owner->email,
                        'phone' => $owner->phone,
                        'legal_business_name' => $profile?->legal_business_name,
                        'business_constitution' => $profile?->business_constitution,
                        'pan_number' => $profile?->pan_number,
                        'gst_registered' => (bool) ($profile?->gst_registered ?? false),
                        'gstin' => $profile?->gstin,
                        'supplier_classification' => $profile?->supplier_legal_classification,
                        'razorpay_account_id' => $profile?->razorpay_account_id,
                        'linked_account_status' => $profile?->linked_account_status->value ?? 'uncreated',
                        'linked_account_label' => $profile?->linked_account_status->label() ?? 'Not Created',
                        'onboarding_status' => $profile?->onboarding_status->value ?? 'not_started',
                        'onboarding_label' => $profile?->onboarding_status->label() ?? 'Not Started',
                        'is_eligible' => (bool) ($profile?->isSettlementEligible() ?? false),
                        'verified_at' => $profile?->verified_at?->toIso8601String(),
                    ];
                }),
                'current_page' => $owners->currentPage(),
                'last_page' => $owners->lastPage(),
                'per_page' => $owners->perPage(),
                'total' => $owners->total(),
            ],
            'filters' => [
                'status' => $request->query('status'),
                'search' => $request->query('search'),
            ],
        ]);
    }

    public function show(Owner $owner): Response
    {
        $owner->loadMissing(['financialProfile.verifiedByAdmin', 'commissionAgreements', 'properties']);

        $profile = $owner->financialProfile;

        return Inertia::render('admin/financial/show', [
            'partner' => [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
                'phone' => $owner->phone,
                'status' => $owner->status->value,
                'properties_count' => $owner->properties->count(),
                'financial_profile' => $profile ? [
                    'id' => $profile->id,
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
                    'verified_at' => $profile->verified_at?->toIso8601String(),
                    'verified_by_admin' => $profile->verifiedByAdmin?->name,
                    'rejection_reason' => $profile->rejection_reason,
                ] : null,
            ],
        ]);
    }

    public function verify(Owner $owner, Request $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = $request->user('admin');
        $profile = $owner->financialProfile;

        if ($profile === null) {
            return back()->withErrors(['partner' => 'Partner has no submitted financial profile.']);
        }

        $now = CarbonImmutable::now();

        $profile->forceFill([
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'linked_account_status' => LinkedAccountStatus::Active,
            'verified_by_admin_id' => $admin->id,
            'verified_at' => $now,
            'rejection_reason' => null,
        ])->save();

        return back()->with('success', "Financial profile for {$owner->name} verified and approved.");
    }

    public function reject(Owner $owner, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $profile = $owner->financialProfile;
        if ($profile === null) {
            return back()->withErrors(['partner' => 'Partner has no submitted financial profile.']);
        }

        $profile->forceFill([
            'onboarding_status' => FinancialOnboardingStatus::Rejected,
            'linked_account_status' => LinkedAccountStatus::Rejected,
            'rejection_reason' => $validated['rejection_reason'],
        ])->save();

        return back()->with('success', "Financial profile for {$owner->name} marked as rejected.");
    }
}
