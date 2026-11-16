<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationPaymentLifecycleTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_complete_payment_lifecycle_and_capacity_retention(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, maxGuests: 1, dailyRate: 50000);
        $room = $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $availability = app(ReservationAvailabilityService::class);
        $lifecycle = app(ReservationLifecycle::class);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString();

        // 1. Initial capacity is 1.
        $this->assertSame(1, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        // 2. Customer creates reservation -> awaiting_payment with 15-minute deadline automatically.
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);
        $this->assertNotNull($reservation->payment_deadline_at);
        // AwaitingPayment consumes capacity (instant hold).
        $this->assertSame(0, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        // 3. Room allocation is BLOCKED while awaiting payment.
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 1]],
            ])
            ->assertSessionHasErrors('reservation');

        // 5. Payment is captured -> confirmed.
        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_lifecycle_100',
            'gateway_payment_id' => 'pay_lifecycle_100',
            'idempotency_key' => 'idemp_lifecycle_100',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $lifecycle->confirmPaid($reservation, $payment);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
        $this->assertNotNull($reservation->confirmed_at);
        // Confirmed still consumes capacity.
        $this->assertSame(0, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        // 6. Room allocation is now UNLOCKED after payment confirmation.
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        $this->assertSame(1, $reservation->fresh()->allocatedQuantity());

        // 7. Cancellation after payment sets requires_refund_review = true and releases capacity.
        $this->actingAs($user, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), [
                'cancellation_reason' => 'Emergency cancellation after payment',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Cancelled, $reservation->status);
        $this->assertTrue($reservation->requires_refund_review);
        // Capacity is released.
        $this->assertSame(1, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);
    }
}
