<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyVerificationStatus;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;

class PropertyPortalData
{
    /**
     * Build consistent summary array for Owner property cards & headers without exposing internal storage paths.
     *
     * @return array<string, mixed>
     */
    public static function ownerSummary(Property $property): array
    {
        $property->loadMissing([
            'category',
            'city',
            'roomTypes',
            'rooms',
            'media',
            'activeVerificationApplication',
            'latestVerificationApplication',
        ]);

        $activeApp = $property->activeVerificationApplication;
        $latestApp = $activeApp ?? $property->latestVerificationApplication;
        $effectiveFields = $property->effectiveFieldsForRevision($activeApp);

        $verificationStatus = $latestApp instanceof PropertyVerificationApplication
            ? $latestApp->status
            : PropertyVerificationStatus::Draft;

        $activeRooms = $property->rooms->where('operational_status', PropertyRoomStatus::Active);
        $roomTypesById = $property->roomTypes->keyBy('id');
        $nominalActiveCapacity = (int) $activeRooms->sum(static function (PropertyRoom $room) use ($roomTypesById, $activeApp): int {
            $rt = $roomTypesById->get($room->property_room_type_id);
            if (! $rt instanceof PropertyRoomType) {
                return 0;
            }
            $effective = $rt->effectiveAttributes($activeApp);

            return (bool) $effective['is_active'] ? (int) $effective['max_guests_per_room'] : 0;
        });

        $cover = $property->media
            ->where('is_archived', false)
            ->first(static fn (PropertyMedia $m): bool => $m->is_cover)
            ?? $property->media->where('is_archived', false)->first();

        return [
            'id' => $property->id,
            'property_reference' => $property->property_reference,
            'name' => (string) ($effectiveFields['name'] ?? $property->name),
            'approved_name' => $property->name,
            'slug' => $property->slug,
            'category' => $property->category?->toOptionArray(),
            'city' => $property->city?->toSelectorArray(),
            'locality' => (string) ($effectiveFields['locality'] ?? $property->locality),
            'state' => (string) ($effectiveFields['state'] ?? $property->state),
            'status' => $property->status->value,
            'status_label' => $property->status->label(),
            'is_verified' => $property->is_verified,
            'booking_eligible' => $property->booking_eligible,
            'has_approved_baseline' => $property->hasApprovedBaseline(),
            'verification_status' => $verificationStatus->value,
            'verification_status_label' => $verificationStatus->label(),
            'is_amendment_active' => $activeApp instanceof PropertyVerificationApplication && $activeApp->is_amendment,
            'active_application' => $activeApp?->toOwnerArray(),
            'latest_application' => $latestApp?->toOwnerArray(),
            'room_types_count' => $property->roomTypes->count(),
            'rooms_count' => $property->rooms->count(),
            'active_rooms_count' => $activeRooms->count(),
            'nominal_active_capacity' => $nominalActiveCapacity,
            'cover_media' => $cover instanceof PropertyMedia ? $cover->toPortalArray('owner') : null,
            'can_toggle_operational_status' => $property->hasApprovedBaseline()
                && $property->status !== PropertyOperationalStatus::Suspended,
            'can_close_completely' => $property->status !== PropertyOperationalStatus::Suspended
                && $property->status !== PropertyOperationalStatus::Archived
                && (! $activeApp instanceof PropertyVerificationApplication || $activeApp->status->isEditableByOwner()),
            'can_start_amendment' => $property->hasApprovedBaseline()
                && ! $activeApp instanceof PropertyVerificationApplication,
            'food' => $property->foodSummary(),
            'approved_at' => $property->approved_at?->toISOString(),
            'updated_at' => $property->updated_at?->toISOString(),
        ];
    }

    /**
     * Build Admin listing row for Admin Partner / Property console tables.
     *
     * @return array<string, mixed>
     */
    public static function adminQueueRow(Property $property): array
    {
        $property->loadMissing([
            'owner:id,name,email,status',
            'category:id,name,slug,code',
            'city:id,name,slug,state',
            'activeVerificationApplication.assignedAdmin:id,name,email,role',
            'latestVerificationApplication.assignedAdmin:id,name,email,role',
        ]);

        $application = $property->activeVerificationApplication ?? $property->latestVerificationApplication;
        $verificationStatus = $application instanceof PropertyVerificationApplication
            ? $application->status
            : PropertyVerificationStatus::Draft;

        return [
            'id' => $property->id,
            'property_reference' => $property->property_reference,
            'name' => $property->name,
            'locality' => $property->locality,
            'category_name' => $property->category->name,
            'city_name' => $property->city->name,
            'owner_name' => $property->owner->name,
            'owner_email' => $property->owner->email,
            'room_types_count' => (int) ($property->room_types_count ?? $property->roomTypes()->count()),
            'rooms_count' => (int) ($property->rooms_count ?? $property->rooms()->count()),
            'operational_status' => $property->status->value,
            'operational_status_label' => $property->status->label(),
            'is_verified' => $property->is_verified,
            'booking_eligible' => $property->booking_eligible,
            'has_approved_baseline' => $property->hasApprovedBaseline(),
            'application_id' => $application?->id,
            'application_number' => $application?->application_number,
            'revision_number' => $application instanceof PropertyVerificationApplication ? $application->revision_number : 1,
            'is_amendment' => $application instanceof PropertyVerificationApplication ? $application->is_amendment : false,
            'verification_status' => $verificationStatus->value,
            'verification_status_label' => $verificationStatus->label(),
            'submitted_at' => $application?->submitted_at?->toISOString(),
            'assigned_reviewer_name' => $application?->assignedAdmin?->name,
            'food_provided' => (bool) $property->food_provided,
        ];
    }
}
