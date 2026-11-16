<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationStatus;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use Illuminate\Support\Str;

class CreatePropertyApplicationRecord
{
    /**
     * @param  array<string, mixed>|null  $proposedPropertyData
     * @param  array<string, mixed>|null  $baselineSnapshot
     */
    public function execute(
        Property $property,
        int $revisionNumber = 1,
        bool $isAmendment = false,
        ?PropertyVerificationApplication $parentApplication = null,
        PropertyOwnershipArrangement $arrangement = PropertyOwnershipArrangement::OwnerOperator,
        ?array $proposedPropertyData = null,
        ?array $baselineSnapshot = null,
    ): PropertyVerificationApplication {
        $application = new PropertyVerificationApplication;
        $application->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TMP-'.Str::ulid()->toString(),
            'status' => PropertyVerificationStatus::Draft,
            'revision_number' => $revisionNumber,
            'is_amendment' => $isAmendment,
            'parent_application_id' => $parentApplication?->id,
            'ownership_arrangement' => $arrangement,
            'proposed_property_data' => $proposedPropertyData,
            'baseline_snapshot' => $baselineSnapshot,
        ]);
        $application->save();

        $application->forceFill([
            'application_number' => sprintf('TJPV-%s-%06d', now()->format('Y'), $application->id),
        ])->save();

        return $application;
    }
}
