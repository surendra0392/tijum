<?php

declare(strict_types=1);

namespace App\Actions\Admin\Availability;

use App\Enums\PropertyAvailabilityBlockStatus;
use App\Models\Admin;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyAvailabilityBlockEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelAdminAvailabilityRestriction
{
    public function execute(Admin $admin, PropertyAvailabilityBlock $block, ?string $reason = null): PropertyAvailabilityBlock
    {
        return DB::transaction(function () use ($admin, $block, $reason): PropertyAvailabilityBlock {
            $locked = PropertyAvailabilityBlock::query()->whereKey($block->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== PropertyAvailabilityBlockStatus::Active) {
                throw ValidationException::withMessages(['availability' => 'Only active restrictions can be cancelled.']);
            }

            $previous = $locked->toPortalArray(true);
            $cleanReason = is_string($reason) && trim($reason) !== '' ? trim($reason) : null;

            $locked->forceFill([
                'status' => PropertyAvailabilityBlockStatus::Cancelled->value,
                'cancelled_at' => now(),
                'cancellation_reason' => $cleanReason,
            ])->save();

            PropertyAvailabilityBlockEvent::record(
                block: $locked,
                eventType: 'admin_restriction_cancelled',
                actorType: 'admin',
                actorId: $admin->id,
                actorName: $admin->name,
                previousSnapshot: $previous,
                newSnapshot: $locked->fresh()?->toPortalArray(true),
                notes: $cleanReason,
            );

            return $locked->fresh(['roomType', 'room']) ?? $locked;
        });
    }
}
