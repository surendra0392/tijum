<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

trait ReviewTestHelpers
{
    use ReservationTestHelpers;

    protected function createPaidCompletedReservation(
        ?User $user = null,
        ?Property $property = null,
        ?PropertyRoomType $roomType = null,
        int $daysAgoCheckedOut = 2,
    ): Reservation {
        $owner = $property?->owner ?? $this->createActiveOwner();
        $property = $property ?? $this->createBookableProperty($owner);
        $roomType = $roomType ?? $this->createBookableRoomType($property);
        $user = $user ?? $this->createCustomerUser();

        $checkoutDate = CarbonImmutable::now('Asia/Kolkata')->subDays($daysAgoCheckedOut)->startOfDay();
        $checkInDate = $checkoutDate->subDays(3);

        $reservation = new Reservation;
        $reservation->forceFill([
            'booking_reference' => 'TIJUM-'.strtoupper(Str::random(8)),
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => $checkInDate->toDateString(),
            'checkout_date' => $checkoutDate->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'total_stay_days' => 3,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => 'guest_places',
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => $user->name,
            'contact_email' => $user->email,
            'contact_phone' => '+919999999999',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'unit_rate_minor' => 100000,
            'rate_unit' => 'per_guest',
            'total_amount_minor' => 300000,
            'status' => ReservationStatus::Confirmed,
            'submitted_at' => $checkInDate->subDays(1),
            'confirmed_at' => $checkInDate->subDays(1),
            'submission_token' => Str::uuid()->toString(),
        ]);
        $reservation->save();

        // Create captured payment
        ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_test_'.Str::random(10),
            'gateway_payment_id' => 'pay_test_'.Str::random(10),
            'idempotency_key' => Str::uuid()->toString(),
            'amount_minor' => 300000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => $checkInDate->subDays(1),
        ]);

        return $reservation->fresh(['property.owner', 'roomType', 'user', 'payments']);
    }

    protected function createAdminWithPermissions(string $role = 'super_admin'): Admin
    {
        return Admin::factory()->withTwoFactor()->create([
            'role' => $role,
            'two_factor_confirmed_at' => now(),
        ]);
    }
}
