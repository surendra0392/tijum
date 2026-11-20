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
    public function execute(
        PartnerCommissionAgreement $agreement,
        Owner $owner,
        ?string $ip = null,
        ?string $userAgent = null,
    ): PartnerCommissionAgreement {
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

        return DB::transaction(function () use ($agreement, $owner, $ip, $userAgent): PartnerCommissionAgreement {
            $now = CarbonImmutable::now();
            $termsHash = $agreement->generateTermsHash();

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

            $auditNote = sprintf(
                'Electronically accepted by Owner #%d at %s [IP: %s, UA: %s, SHA256: %s]',
                $owner->id,
                $now->toIso8601String(),
                $ip ?? 'N/A',
                $userAgent ?? 'N/A',
                $termsHash,
            );

            $existingNotes = $agreement->admin_notes ? $agreement->admin_notes."\n" : '';

            $agreement->forceFill([
                'status' => CommissionAgreementStatus::Active,
                'accepted_by_owner_id' => $owner->id,
                'accepted_at' => $now,
                'terms_hash' => $termsHash,
                'admin_notes' => $existingNotes.$auditNote,
            ])->save();

            return $agreement;
        });
    }
}
