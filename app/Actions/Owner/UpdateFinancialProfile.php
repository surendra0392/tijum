<?php

declare(strict_types=1);

namespace App\Actions\Owner;

use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Services\Payments\RazorpayRouteService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateFinancialProfile
{
    public function __construct(
        private readonly RazorpayRouteService $routeService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Owner $owner, array $data): OwnerFinancialProfile
    {
        $pan = strtoupper(trim((string) ($data['pan_number'] ?? '')));
        if (! preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]$/', $pan)) {
            throw ValidationException::withMessages([
                'pan_number' => 'Please provide a valid 10-character Permanent Account Number (PAN).',
            ]);
        }

        $gstRegistered = (bool) ($data['gst_registered'] ?? false);
        $gstin = $gstRegistered ? strtoupper(trim((string) ($data['gstin'] ?? ''))) : null;

        if ($gstRegistered && (! $gstin || ! preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/', $gstin))) {
            throw ValidationException::withMessages([
                'gstin' => 'Please provide a valid 15-character GSTIN for GST-registered business.',
            ]);
        }

        $rawAccount = trim((string) ($data['bank_account_number'] ?? ''));
        if (strlen($rawAccount) < 9 || strlen($rawAccount) > 18) {
            throw ValidationException::withMessages([
                'bank_account_number' => 'Please enter a valid Indian bank account number (9 to 18 digits).',
            ]);
        }

        $ifsc = strtoupper(trim((string) ($data['bank_ifsc'] ?? '')));
        if (! preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $ifsc)) {
            throw ValidationException::withMessages([
                'bank_ifsc' => 'Please enter a valid 11-character Indian IFSC code (e.g., HDFC0001234).',
            ]);
        }

        // Mask account number: e.g. "•••• •••• 1234"
        $maskedAccount = '•••• •••• '.substr($rawAccount, -4);

        return DB::transaction(function () use ($owner, $data, $pan, $gstRegistered, $gstin, $maskedAccount, $ifsc): OwnerFinancialProfile {
            /** @var OwnerFinancialProfile $profile */
            $profile = OwnerFinancialProfile::firstOrNew(['owner_id' => $owner->id]);

            $isNewAccount = blank($profile->razorpay_account_id);

            $profile->fill([
                'legal_business_name' => trim((string) ($data['legal_business_name'] ?? $owner->name)),
                'business_constitution' => trim((string) ($data['business_constitution'] ?? 'individual')),
                'pan_number' => $pan,
                'pan_verified_at' => CarbonImmutable::now(), // Simulated PAN verification check
                'gst_registered' => $gstRegistered,
                'gstin' => $gstin,
                'supplier_legal_classification' => trim((string) ($data['supplier_legal_classification'] ?? 'unregistered')),
                'bank_beneficiary_name' => trim((string) ($data['bank_beneficiary_name'] ?? $owner->name)),
                'bank_account_number_masked' => $maskedAccount,
                'bank_ifsc' => $ifsc,
                'bank_name' => trim((string) ($data['bank_name'] ?? 'Bank Account')),
                'beneficiary_verified_at' => CarbonImmutable::now(),
                'onboarding_status' => FinancialOnboardingStatus::Submitted,
            ]);

            if ($isNewAccount) {
                try {
                    $routeAccount = $this->routeService->createLinkedAccount($owner, $profile);
                    $profile->razorpay_account_id = $routeAccount['id'] ?? null;
                    $profile->linked_account_status = LinkedAccountStatus::Created;
                } catch (\Throwable) {
                    $profile->linked_account_status = LinkedAccountStatus::UnderReview;
                }
            }

            $profile->save();

            return $profile;
        });
    }
}
