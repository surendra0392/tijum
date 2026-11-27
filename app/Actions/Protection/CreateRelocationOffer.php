<?php

declare(strict_types=1);

namespace App\Actions\Protection;

use App\Enums\AdminRole;
use App\Enums\CaseStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\RelocationStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationRelocation;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateRelocationOffer
{
    public function __construct(
        private readonly ReservationAvailabilityService $availability,
    ) {}

    /**
     * @param  array{
     *     destination_property_id: int,
     *     destination_room_type_id: int,
     *     destination_owner_accepted?: bool,
     *     admin_notes?: string|null,
     *     validity_hours?: int|null,
     * }  $data
     */
    public function execute(
        Reservation $sourceReservation,
        Admin $admin,
        array $data,
        ?CustomerProtectionCase $case = null,
    ): ReservationRelocation {
        if (! $admin->isActive() || (! $admin->hasPermission('relocations.manage') && ! $admin->hasPermission('bookings.manage') && ! $admin->isSuperAdmin() && $admin->role !== AdminRole::SuperAdmin)) {
            throw ValidationException::withMessages([
                'admin' => 'You are not authorised to create relocation offers.',
            ]);
        }

        $property = Property::query()->whereKey((int) $data['destination_property_id'])->firstOrFail();
        $roomType = PropertyRoomType::query()->where('property_id', $property->id)->whereKey((int) $data['destination_room_type_id'])->firstOrFail();

        if (! $property->food_provided) {
            throw ValidationException::withMessages([
                'destination_property_id' => 'Destination property must provide food inclusions.',
            ]);
        }

        if ($property->status !== PropertyOperationalStatus::Active || ! $property->is_verified || ! $property->booking_eligible || ! $roomType->is_active) {
            throw ValidationException::withMessages([
                'destination_property_id' => 'Destination property and room type must be verified, active, and booking-eligible.',
            ]);
        }

        $checkIn = $sourceReservation->check_in_date->toDateString();
        $checkout = $sourceReservation->checkout_date->toDateString();
        $quantity = $sourceReservation->quantity;

        // Verify capacity
        $capacity = $this->availability->stayCapacity($roomType, $checkIn, $checkout, $quantity);
        if (! $capacity['available']) {
            throw ValidationException::withMessages([
                'destination_room_type_id' => 'Selected room type does not have sufficient capacity for the stay dates.',
            ]);
        }

        // Calculate alternative price
        $rawUnitRate = match ($sourceReservation->duration_type) {
            'monthly' => $roomType->monthly_rate_minor,
            'weekly' => $roomType->weekly_rate_minor,
            default => $roomType->daily_rate_minor,
        };
        if ($rawUnitRate === null || (int) $rawUnitRate <= 0) {
            throw ValidationException::withMessages([
                'destination_room_type_id' => "Selected room type does not have an active {$sourceReservation->duration_type} rate configured.",
            ]);
        }
        $unitRate = (int) $rawUnitRate;
        $alternativePriceMinor = $unitRate * $sourceReservation->duration_quantity * $quantity;
        $priceDifferenceMinor = $sourceReservation->total_amount_minor - $alternativePriceMinor;

        $validityHours = (int) ($data['validity_hours'] ?? config('tijum.customer_protection.relocation.default_offer_validity_hours', 24));
        $expiresAt = CarbonImmutable::now()->addHours($validityHours);
        $destinationOwnerAccepted = (bool) ($data['destination_owner_accepted'] ?? false);

        return DB::transaction(function () use (
            $sourceReservation,
            $property,
            $roomType,
            $admin,
            $alternativePriceMinor,
            $priceDifferenceMinor,
            $expiresAt,
            $destinationOwnerAccepted,
            $case,
            $data,
        ): ReservationRelocation {
            $lockedSource = Reservation::query()->whereKey($sourceReservation->id)->lockForUpdate()->firstOrFail();

            // Cancel any previous open relocation offers for this reservation
            ReservationRelocation::query()
                ->where('source_reservation_id', $lockedSource->id)
                ->whereIn('status', [RelocationStatus::Draft->value, RelocationStatus::Offered->value])
                ->update(['status' => RelocationStatus::Cancelled->value]);

            /** @var ReservationRelocation $relocation */
            $relocation = ReservationRelocation::create([
                'customer_protection_case_id' => $case?->id,
                'source_reservation_id' => $lockedSource->id,
                'destination_property_id' => $property->id,
                'destination_room_type_id' => $roomType->id,
                'destination_owner_id' => $property->owner_id,
                'status' => $destinationOwnerAccepted ? RelocationStatus::Offered : RelocationStatus::Draft,
                'offered_quantity' => $lockedSource->quantity,
                'offered_check_in_date' => $lockedSource->check_in_date,
                'offered_checkout_date' => $lockedSource->checkout_date,
                'original_amount_minor' => $lockedSource->total_amount_minor,
                'alternative_amount_minor' => $alternativePriceMinor,
                'price_difference_minor' => $priceDifferenceMinor,
                'destination_owner_accepted_at' => $destinationOwnerAccepted ? CarbonImmutable::now() : null,
                'offer_expires_at' => $expiresAt,
                'created_by_admin_id' => $admin->id,
                'admin_notes' => $data['admin_notes'] ?? null,
            ]);

            if ($case instanceof CustomerProtectionCase && $destinationOwnerAccepted) {
                $case->forceFill(['status' => CaseStatus::RelocationOffered])->save();
            }

            return $relocation->fresh() ?? $relocation;
        }, 3);
    }
}
