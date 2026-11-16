<?php

declare(strict_types=1);

namespace Tests\Feature\Protection;

use App\Actions\Payments\InitiateAdminRefund;
use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class CustomerCancellationAndRefundTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_cancelling_unpaid_reservation_cancels_and_releases_capacity_without_refund(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, maxGuests: 1);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $availability = app(ReservationAvailabilityService::class);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString();

        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(0, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        // Cancel unpaid reservation
        $this->actingAs($customer, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), [
                'cancellation_reason' => 'Change of travel plans.',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Cancelled, $reservation->status);
        $this->assertFalse($reservation->requires_refund_review);
        $this->assertSame('Change of travel plans.', $reservation->cancellation_reason);

        // Capacity is released
        $this->assertSame(1, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        // No protection case created for simple unpaid cancellation
        $this->assertDatabaseMissing('customer_protection_cases', [
            'reservation_id' => $reservation->id,
        ]);
    }

    public function test_cancelling_paid_reservation_auto_creates_protection_case_and_flags_refund_review(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, maxGuests: 1);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $lifecycle = app(ReservationLifecycle::class);
        $availability = app(ReservationAvailabilityService::class);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString();

        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // Move to awaiting_payment
        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment->value,
            'payment_deadline_at' => now()->addMinutes(15),
        ])->save();

        // Simulate payment capture
        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_paid_test_100',
            'gateway_payment_id' => 'pay_paid_test_100',
            'idempotency_key' => 'idemp_paid_test_100',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $lifecycle->confirmPaid($reservation, $payment);
        $this->assertSame(ReservationStatus::Confirmed, $reservation->fresh()->status);

        // Customer cancels paid stay
        $this->actingAs($customer, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), [
                'cancellation_reason' => 'Emergency cancellation, please refund.',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Cancelled, $reservation->status);
        $this->assertTrue($reservation->requires_refund_review);

        // Capacity is released
        $this->assertSame(1, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        // Case automatically created for the paid stay
        $case = CustomerProtectionCase::query()->where('reservation_id', $reservation->id)->firstOrFail();
        $this->assertSame(CaseCategory::RefundRequest, $case->category);
        $this->assertSame($customer->id, $case->user_id);
    }

    public function test_admin_initiating_refund_handles_asynchronous_processing_gateway_status(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $lifecycle = app(ReservationLifecycle::class);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment->value,
            'payment_deadline_at' => now()->addMinutes(15),
        ])->save();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_async_refund',
            'gateway_payment_id' => 'pay_async_refund',
            'idempotency_key' => 'idemp_async_refund',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $lifecycle->confirmPaid($reservation, $payment);

        $admin = Admin::factory()->create([
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        // Mock gateway returning asynchronous 'processing' status
        $mockGateway = Mockery::mock(PaymentGateway::class);
        $mockGateway->shouldReceive('createRefund')
            ->once()
            ->andReturn([
                'id' => 'rfnd_async_gateway_123',
                'entity' => 'refund',
                'amount' => 100000,
                'currency' => 'INR',
                'payment_id' => 'pay_async_refund',
                'status' => 'processing', // Asynchronous status from banking rails
            ]);

        $action = new InitiateAdminRefund($mockGateway);
        $refund = $action->execute(
            payment: $payment,
            admin: $admin,
            amountMinor: 100000,
            reason: 'Full customer protection refund',
        );

        $this->assertSame('rfnd_async_gateway_123', $refund->gateway_refund_id);
        // RefundStatus must be Processing, NOT falsely Processed!
        $this->assertSame(RefundStatus::Processing, $refund->status);
        $this->assertSame(PaymentStatus::RefundPending, $payment->fresh()->status);
    }
}
