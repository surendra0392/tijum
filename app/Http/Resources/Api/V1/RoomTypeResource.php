<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Enums\PropertyRoomTypeMode;
use App\Models\PropertyRoomType;
use App\Services\ReservationQuoteService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PropertyRoomType
 */
class RoomTypeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isShared = $this->accommodation_mode === PropertyRoomTypeMode::Shared;
        $policy = app(ReservationQuoteService::class)->guestPolicyMetadata($this->resource);
        $sharingCapacity = (int) ($this->sharing_capacity ?? $this->max_guests_per_room);

        return array_merge([
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->slug,
            'accommodation_mode' => $this->accommodation_mode->value,
            'accommodation_mode_label' => $this->accommodation_mode->label(),
            'is_shared' => $isShared,
            'sharing_label' => $isShared ? sprintf('%d Sharing', $sharingCapacity) : 'Private Room',
            'pricing_basis' => $isShared ? 'per_guest' : 'per_room',
            'pricing_basis_label' => $isShared ? 'Per Guest' : 'Per Room',
            'gender_policy' => $this->gender_policy->value,
            'gender_policy_label' => $this->gender_policy->label(),
            'guest_composition_policy' => $this->guest_composition_policy,
            'max_guests_per_room' => (int) $this->max_guests_per_room,
            'sharing_capacity' => $sharingCapacity,
            'is_air_conditioned' => (bool) $this->is_air_conditioned,
            'price_daily_paise' => (int) ($this->daily_rate_minor ?? 0),
            'price_weekly_paise' => (int) ($this->weekly_rate_minor ?? 0),
            'price_monthly_paise' => (int) ($this->monthly_rate_minor ?? 0),
            'early_check_in_enabled' => (bool) $this->early_check_in_enabled,
            'total_rooms' => $this->relationLoaded('rooms') ? $this->rooms->count() : $this->rooms()->count(),
        ], $policy);
    }
}
