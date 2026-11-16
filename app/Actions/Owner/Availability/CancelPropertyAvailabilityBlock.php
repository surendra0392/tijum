<?php

declare(strict_types=1);

namespace App\Actions\Owner\Availability;

use App\Enums\PropertyAvailabilityBlockStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyAvailabilityBlockEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelPropertyAvailabilityBlock
{
    public function execute(
        Owner $owner,
        Property $property,
        PropertyAvailabilityBlock $block,
        ?string $reason = null,
        string $actorType = 'owner',
        ?Model $actor = null,
    ): PropertyAvailabilityBlock {
        return DB::transaction(function () use ($owner, $property, $block, $reason, $actorType, $actor): PropertyAvailabilityBlock {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();
            $locked = PropertyAvailabilityBlock::query()->whereKey($block->id)->lockForUpdate()->firstOrFail();

            if ($locked->property_id !== $lockedProperty->id || $lockedProperty->owner_id !== $owner->id) {
                throw ValidationException::withMessages(['availability' => 'You are not authorised to cancel this availability block.']);
            }

            $isAdminActor = $actorType === 'admin' || $actor instanceof Admin;
            if (! $isAdminActor) {
                if (! $owner->canPublishProperties()) {
                    throw ValidationException::withMessages(['availability' => 'You are not authorised to cancel this availability block.']);
                }
                if ($locked->is_admin_restriction) {
                    throw ValidationException::withMessages(['availability' => 'Admin-applied restrictions cannot be cancelled by the partner.']);
                }
            }

            if ($locked->status !== PropertyAvailabilityBlockStatus::Active) {
                throw ValidationException::withMessages(['availability' => 'Only active availability blocks can be cancelled.']);
            }

            $previous = $locked->toPortalArray(true);
            $cleanReason = $this->nullableString($reason);
            $resolvedActor = $actor ?? $owner;

            $locked->forceFill([
                'status' => PropertyAvailabilityBlockStatus::Cancelled->value,
                'cancelled_at' => now(),
                'cancellation_reason' => $cleanReason,
            ])->save();

            PropertyAvailabilityBlockEvent::record(
                block: $locked,
                eventType: 'cancelled',
                actorType: $isAdminActor ? 'admin' : 'owner',
                actorId: (int) $resolvedActor->getKey(),
                actorName: $resolvedActor instanceof Owner ? $resolvedActor->name : ($resolvedActor instanceof Admin ? $resolvedActor->name : $owner->name),
                previousSnapshot: $previous,
                newSnapshot: $locked->fresh()?->toPortalArray(true),
                notes: $cleanReason,
            );

            return $locked->fresh(['roomType', 'room']) ?? $locked;
        });
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return trim($value);
    }
}
