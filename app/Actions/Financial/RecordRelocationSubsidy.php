<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\RelocationSubsidyStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\PlatformRelocationSubsidy;
use App\Models\Reservation;
use App\Services\Financial\FinancialLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RecordRelocationSubsidy
{
    public function __construct(
        private readonly FinancialLedgerService $ledgerService,
    ) {}

    public function execute(
        Reservation $sourceReservation,
        Reservation $replacementReservation,
        int $sourceAmountMinor,
        int $destinationAmountMinor,
        ?CustomerProtectionCase $case = null,
        ?Admin $admin = null,
    ): ?PlatformRelocationSubsidy {
        $subsidyDifference = $destinationAmountMinor - $sourceAmountMinor;

        if ($subsidyDifference <= 0) {
            return null; // Cheaper or equal destination requires no platform subsidy
        }

        return DB::transaction(function () use ($sourceReservation, $replacementReservation, $case, $admin, $sourceAmountMinor, $destinationAmountMinor, $subsidyDifference): PlatformRelocationSubsidy {
            $now = CarbonImmutable::now();
            $ref = 'PRS-'.$now->format('Y').'-'.strtoupper(Str::ulid()->toBase32());

            $currency = strtoupper(trim((string) ($replacementReservation->currency_code ?: $sourceReservation->currency_code ?: 'INR')));

            /** @var PlatformRelocationSubsidy $subsidy */
            $subsidy = PlatformRelocationSubsidy::create([
                'subsidy_reference' => $ref,
                'source_reservation_id' => $sourceReservation->id,
                'replacement_reservation_id' => $replacementReservation->id,
                'customer_protection_case_id' => $case?->id,
                'source_amount_minor' => $sourceAmountMinor,
                'destination_amount_minor' => $destinationAmountMinor,
                'subsidy_amount_minor' => $subsidyDifference,
                'currency' => $currency,
                'status' => RelocationSubsidyStatus::Approved,
                'approved_by_admin_id' => $admin?->id,
                'approved_at' => $now,
                'funding_reference' => 'PLATFORM_OPS_SUBSIDY',
                'notes' => "Platform relocation subsidy funding difference for customer reservation {$sourceReservation->booking_reference}",
            ]);

            $this->ledgerService->recordRelocationSubsidy($subsidy);

            return $subsidy;
        });
    }
}
