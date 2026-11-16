<?php

declare(strict_types=1);

namespace App\Actions\Owner;

use App\Enums\CommissionAgreementStatus;
use App\Models\Owner;
use App\Models\PartnerCommissionAgreement;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcceptCommissionAgreement
{
    public function execute(PartnerCommissionAgreement $agreement, Owner $owner): PartnerCommissionAgreement
    {
        if ($agreement->owner_id !== $owner->id) {
            throw ValidationException::withMessages([
                'agreement' => 'You are not authorised to accept this commission agreement.',
            ]);
        }

        if ($agreement->status !== CommissionAgreementStatus::PendingAcceptance) {
            throw ValidationException::withMessages([
                'agreement' => 'This agreement is not pending acceptance.',
            ]);
        }

        return DB::transaction(function () use ($agreement, $owner): PartnerCommissionAgreement {
            $now = CarbonImmutable::now();

            // Supersede existing active agreements for same scope
            PartnerCommissionAgreement::query()
                ->where('owner_id', $owner->id)
                ->where('property_id', $agreement->property_id)
                ->where('status', CommissionAgreementStatus::Active)
                ->where('id', '!=', $agreement->id)
                ->update([
                    'status' => CommissionAgreementStatus::Superseded,
                    'effective_until' => $agreement->effective_from->subDay(),
                ]);

            $agreement->forceFill([
                'status' => CommissionAgreementStatus::Active,
                'accepted_by_owner_id' => $owner->id,
                'accepted_at' => $now,
                'terms_hash' => $agreement->generateTermsHash(),
            ])->save();

            return $agreement;
        });
    }
}
