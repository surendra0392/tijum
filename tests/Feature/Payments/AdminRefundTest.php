<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Models\Admin;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class AdminRefundTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    protected function createSuperAdmin(): Admin
    {
        $admin = new Admin;
        $admin->forceFill([
            'name' => 'Operations Admin',
            'email' => 'admin_test@tijum.test',
            'password' => bcrypt('AdminSecret123!'),
            'role' => 'super_admin',
            'is_active' => true,
            'two_factor_secret' => 'test-2fa-secret',
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $admin;
    }

    public function test_admin_can_process_partial_and_full_refund(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $admin = $this->createSuperAdmin();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_101',
            'gateway_payment_id' => 'pay_refund_101',
            'amount_minor' => 100000, // ₹1,000
            'currency' => 'INR',
            'idempotency_key' => 'idemp_refund_101',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_101/refund' => Http::sequence()
                ->push([
                    'id' => 'rfnd_part_001',
                    'entity' => 'refund',
                    'amount' => 40000,
                    'currency' => 'INR',
                    'payment_id' => 'pay_refund_101',
                    'status' => 'processed',
                ], 200)
                ->push([
                    'id' => 'rfnd_full_002',
                    'entity' => 'refund',
                    'amount' => 60000,
                    'currency' => 'INR',
                    'payment_id' => 'pay_refund_101',
                    'status' => 'processed',
                ], 200),
        ]);

        // 1. Partial refund of ₹400 (40,000 paise).
        $response1 = $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment->id), [
                'amount_minor' => 40000,
                'reason' => 'Customer requested partial cancellation allowance',
            ]);

        $response1->assertRedirect();

        $payment->refresh();
        $this->assertSame(40000, $payment->refunded_amount_minor);
        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->status);
        $this->assertSame(60000, $payment->refundableBalanceMinor());

        $this->assertDatabaseHas('reservation_refunds', [
            'reservation_payment_id' => $payment->id,
            'gateway_refund_id' => 'rfnd_part_001',
            'amount_minor' => 40000,
            'status' => RefundStatus::Processed->value,
            'initiated_by_admin_id' => $admin->id,
        ]);

        // 2. Full remaining refund of ₹600 (60,000 paise).
        $response2 = $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment->id), [
                'amount_minor' => 60000,
                'reason' => 'Remaining balance refund',
            ]);

        $response2->assertRedirect();

        $payment->refresh();
        $this->assertSame(100000, $payment->refunded_amount_minor);
        $this->assertSame(PaymentStatus::Refunded, $payment->status);
        $this->assertSame(0, $payment->refundableBalanceMinor());
    }

    public function test_prevents_refunding_more_than_available_balance(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $admin = $this->createSuperAdmin();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_exceed',
            'gateway_payment_id' => 'pay_refund_exceed',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_refund_exceed',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment->id), [
                'amount_minor' => 999999, // Exceeds 50000
                'reason' => 'Excess refund attempt',
            ])
            ->assertSessionHasErrors('amount');
    }
}
