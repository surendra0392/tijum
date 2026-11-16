<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SavePropertyRoomType
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(
        Owner $owner,
        Property $property,
        array $attributes,
        ?PropertyRoomType $existingRoomType = null,
    ): PropertyRoomType {
        $mode = PropertyRoomTypeMode::tryFrom((string) ($attributes['accommodation_mode'] ?? ''))
            ?? throw ValidationException::withMessages([
                'accommodation_mode' => 'Select Shared Occupancy or Private Single Room mode.',
            ]);

        $sharingCapacity = $mode === PropertyRoomTypeMode::Shared
            ? (int) ($attributes['sharing_capacity'] ?? 0)
            : null;

        if ($mode === PropertyRoomTypeMode::Shared && ! in_array($sharingCapacity, [2, 3, 4], true)) {
            throw ValidationException::withMessages([
                'sharing_capacity' => 'Shared occupancy room types must be 2, 3, or 4 Sharing.',
            ]);
        }

        if ($mode === PropertyRoomTypeMode::Private) {
            $requestedGuests = (int) ($attributes['max_guests_per_room'] ?? 1);
            if ($requestedGuests !== 1) {
                throw ValidationException::withMessages([
                    'max_guests_per_room' => 'Single Room configurations are strictly limited to 1 occupant per room in Phase 06.',
                ]);
            }
            $maxGuests = 1;
        } else {
            $maxGuests = (int) $sharingCapacity;
        }

        $genderPolicy = PropertyGenderPolicy::tryFrom((string) ($attributes['gender_policy'] ?? ''))
            ?? throw ValidationException::withMessages([
                'gender_policy' => 'Select a valid gender eligibility policy.',
            ]);

        $rawCompositions = is_array($attributes['guest_composition_policy'] ?? null)
            ? $attributes['guest_composition_policy']
            : [];
        $guestCompositions = array_values(array_unique(array_filter(
            $rawCompositions,
            static fn (mixed $v): bool => is_string($v) && PropertyGuestComposition::tryFrom($v) !== null,
        )));

        if ($guestCompositions === []) {
            throw ValidationException::withMessages([
                'guest_composition_policy' => 'Select at least one permitted guest composition category.',
            ]);
        }

        $name = trim((string) ($attributes['name'] ?? ''));
        if ($name === '') {
            throw ValidationException::withMessages([
                'name' => 'Room type name is required.',
            ]);
        }

        $isAirConditioned = (bool) ($attributes['is_air_conditioned'] ?? false);
        $earlyCheckInEnabled = (bool) ($attributes['early_check_in_enabled'] ?? false);
        $isActive = array_key_exists('is_active', $attributes) ? (bool) $attributes['is_active'] : true;
        $description = is_string($attributes['description'] ?? null) && trim($attributes['description']) !== ''
            ? trim($attributes['description'])
            : null;
        $displayOrder = max(0, (int) ($attributes['display_order'] ?? 0));

        return DB::transaction(function () use (
            $owner,
            $property,
            $existingRoomType,
            $name,
            $mode,
            $sharingCapacity,
            $maxGuests,
            $isAirConditioned,
            $genderPolicy,
            $guestCompositions,
            $earlyCheckInEnabled,
            $isActive,
            $description,
            $displayOrder,
        ): PropertyRoomType {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'room_type' => 'You are not authorised to modify room types for this property.',
                ]);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
            $hasApproved = $lockedProperty->hasApprovedBaseline();

            if ($hasApproved && (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner())) {
                throw ValidationException::withMessages([
                    'room_type' => 'Room types on an approved property require an active Draft or Needs Information amendment.',
                ]);
            }

            if (! $hasApproved && $activeApp instanceof PropertyVerificationApplication && ! $activeApp->status->isEditableByOwner()) {
                throw ValidationException::withMessages([
                    'room_type' => 'Room types cannot be modified while verification is currently in review.',
                ]);
            }

            // Enforce unique room-type names within this property (case-insensitive).
            $duplicateQuery = PropertyRoomType::query()
                ->where('property_id', $lockedProperty->id)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)]);

            if ($existingRoomType instanceof PropertyRoomType) {
                $duplicateQuery->where('id', '!=', $existingRoomType->id);
            }

            if ($duplicateQuery->exists()) {
                throw ValidationException::withMessages([
                    'name' => sprintf('Room type "%s" already exists for this property. Use a distinct variant name.', $name),
                ]);
            }

            if ($existingRoomType instanceof PropertyRoomType) {
                $lockedRoomType = PropertyRoomType::query()
                    ->where('property_id', $lockedProperty->id)
                    ->whereKey($existingRoomType->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $hasRooms = $lockedRoomType->rooms()->exists();
                $structuralChanged = $lockedRoomType->accommodation_mode !== $mode
                    || $lockedRoomType->sharing_capacity !== $sharingCapacity
                    || $lockedRoomType->max_guests_per_room !== $maxGuests
                    || $lockedRoomType->is_air_conditioned !== $isAirConditioned;

                if ($hasRooms && $structuralChanged) {
                    throw ValidationException::withMessages([
                        'accommodation_mode' => 'Mode, sharing capacity, max occupancy, and AC configuration cannot be changed while physical rooms reference this room type. Create a new room type variant instead.',
                    ]);
                }

                $payload = [
                    'name' => $name,
                    'accommodation_mode' => $mode->value,
                    'sharing_capacity' => $sharingCapacity,
                    'max_guests_per_room' => $maxGuests,
                    'is_air_conditioned' => $isAirConditioned,
                    'gender_policy' => $genderPolicy->value,
                    'guest_composition_policy' => $guestCompositions,
                    'early_check_in_enabled' => $earlyCheckInEnabled,
                    'description' => $description,
                    'is_active' => $isActive,
                    'display_order' => $displayOrder,
                ];

                if ($hasApproved && $lockedRoomType->is_approved_version) {
                    $lockedRoomType->forceFill([
                        'pending_amendment_data' => $payload,
                        'pending_changes_application_id' => $activeApp->id,
                    ])->save();
                } else {
                    $lockedRoomType->forceFill([
                        ...$payload,
                        'slug' => Str::slug($name).'-'.$lockedRoomType->id,
                    ])->save();
                }

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::RoomTypeUpdated,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf('Updated room type configuration "%s".', $name),
                );

                return $lockedRoomType->fresh() ?? $lockedRoomType;
            }

            $roomType = new PropertyRoomType;
            $roomType->forceFill([
                'property_id' => $lockedProperty->id,
                'amendment_application_id' => $hasApproved ? $activeApp->id : null,
                'name' => $name,
                'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
                'accommodation_mode' => $mode,
                'sharing_capacity' => $sharingCapacity,
                'max_guests_per_room' => $maxGuests,
                'is_air_conditioned' => $isAirConditioned,
                'gender_policy' => $genderPolicy,
                'guest_composition_policy' => $guestCompositions,
                'early_check_in_enabled' => $earlyCheckInEnabled,
                'description' => $description,
                'is_active' => $isActive,
                'is_approved_version' => false,
                'display_order' => $displayOrder,
            ]);
            $roomType->save();

            $roomType->forceFill([
                'slug' => Str::slug($name).'-'.$roomType->id,
            ])->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $activeApp,
                eventType: PropertyVerificationEventType::RoomTypeAdded,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf('Added room type "%s" (%s, max %d guest/room).', $name, $mode->label(), $maxGuests),
                metadata: [
                    'room_type_id' => $roomType->id,
                    'mode' => $mode->value,
                    'max_guests_per_room' => $maxGuests,
                ],
            );

            return $roomType->fresh() ?? $roomType;
        });
    }
}
