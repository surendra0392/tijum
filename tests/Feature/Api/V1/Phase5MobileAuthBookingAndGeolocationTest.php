<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\PropertyCategory;
use App\Models\PropertyReview;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Models\User;
use App\Notifications\Customer\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class Phase5MobileAuthBookingAndGeolocationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_mobile_customer_registration_sends_verification_and_profile_exposes_auth_and_resend_status(): void
    {
        Notification::fake();

        $registerResponse = $this->postJson('/api/v1/auth/customer/register', [
            'name' => 'Phase Five Guest',
            'email' => 'phase5.guest@example.test',
            'phone' => '+919876500112',
            'password' => 'SecurePass123!',
            'terms_accepted' => true,
        ]);

        $registerResponse->assertCreated()
            ->assertJsonPath('success', true);

        $token = (string) $registerResponse->json('data.token');
        $this->assertNotSame('', $token);

        /** @var User $user */
        $user = User::query()->where('email', 'phase5.guest@example.test')->firstOrFail();
        Notification::assertSentTo($user, VerifyEmailNotification::class);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/profile')
            ->assertOk()
            ->assertJsonPath('data.terms_accepted', true)
            ->assertJsonPath('data.two_factor_enabled', false);

        // Unverified customer can request verification resend
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/email/verification-notification')
            ->assertOk();

        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 2);

        // Verified customer does not trigger redundant verification notifications
        $user->markEmailAsVerified();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('data.email_verified', true);

        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 2);
    }

    public function test_mobile_customer_login_rate_limit_includes_retry_after_header_and_body(): void
    {
        $user = User::factory()->create([
            'email' => 'ratelimit.phase5@example.test',
            'password' => Hash::make('CorrectPass123!'),
        ]);

        $rateLimitedResponse = null;
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $response = $this->postJson('/api/v1/auth/customer/login', [
                'email' => $user->email,
                'password' => 'WrongPassword123!',
            ]);

            if ($response->getStatusCode() === 429) {
                $rateLimitedResponse = $response;
                break;
            }
        }

        $this->assertNotNull($rateLimitedResponse, 'Repeated failed mobile logins must trigger 429 RATE_LIMITED.');
        $rateLimitedResponse->assertJsonPath('error_code', 'RATE_LIMITED');
        $this->assertGreaterThan(0, (int) $rateLimitedResponse->headers->get('Retry-After'));
        $this->assertGreaterThan(0, (int) $rateLimitedResponse->json('errors.retry_after'));
    }

    public function test_customer_reservation_filters_payment_statuses_late_capture_and_review_eligibility_parity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $admin = Admin::factory()->withTwoFactor()->create();

        $awaiting = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => now()->addMinutes(10),
            'total_amount_minor' => 100000,
        ]);

        ReservationPayment::forceCreate([
            'reservation_id' => $awaiting->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_fail_1',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Failed,
            'failure_code' => 'BAD_REQUEST_ERROR',
            'failure_description' => 'Card declined by issuer',
        ]);

        $expiredClean = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Expired,
            'expired_at' => now()->subMinute(),
            'requires_refund_review' => false,
            'total_amount_minor' => 100000,
        ]);

        $expiredLateCapture = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Expired,
            'expired_at' => now()->subMinutes(5),
            'requires_refund_review' => true,
            'total_amount_minor' => 250000,
        ]);

        ReservationPayment::forceCreate([
            'reservation_id' => $expiredLateCapture->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_late_1',
            'gateway_payment_id' => 'pay_late_1',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 250000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subMinute(),
        ]);

        $confirmedCheckedIn = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->subDays(3)->toDateString(),
            'checkout_date' => now()->subDay()->toDateString(),
            'checked_in_at' => now()->subDays(3),
            'checked_out_at' => now()->subDay(),
            'total_amount_minor' => 300000,
        ]);

        ReservationPayment::forceCreate([
            'reservation_id' => $confirmedCheckedIn->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_conf_1',
            'gateway_payment_id' => 'pay_conf_1',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 300000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(3),
        ]);

        $fullyRefunded = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->subDays(4)->toDateString(),
            'checkout_date' => now()->subDays(2)->toDateString(),
            'checked_in_at' => now()->subDays(4),
            'checked_out_at' => now()->subDays(2),
            'total_amount_minor' => 200000,
        ]);

        $refundedPayment = ReservationPayment::forceCreate([
            'reservation_id' => $fullyRefunded->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refunded_1',
            'gateway_payment_id' => 'pay_refunded_1',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Refunded,
            'captured_at' => now()->subDays(2),
        ]);

        ReservationRefund::forceCreate([
            'reservation_payment_id' => $refundedPayment->id,
            'reservation_id' => $fullyRefunded->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_full_1',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Full cancellation refund',
            'gateway_processed_at' => now()->subHour(),
        ]);

        $token = $customer->createToken('customer_mobile')->plainTextToken;

        // stage=awaiting_action includes awaiting_payment stays
        $awaitingList = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/reservations?stage=awaiting_action')
            ->assertOk();
        $awaitingRefs = collect($awaitingList->json('data'))->pluck('booking_reference')->all();
        $this->assertContains($awaiting->booking_reference, $awaitingRefs);
        $this->assertNotContains($confirmedCheckedIn->booking_reference, $awaitingRefs);

        // stage=cancelled includes expired stays alongside cancelled stays
        $cancelledList = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/reservations?stage=cancelled')
            ->assertOk();
        $cancelledRefs = collect($cancelledList->json('data'))->pluck('booking_reference')->all();
        $this->assertContains($expiredClean->booking_reference, $cancelledRefs);
        $this->assertContains($expiredLateCapture->booking_reference, $cancelledRefs);

        // Awaiting payment with failed attempt
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$awaiting->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.can_pay', true)
            ->assertJsonPath('data.can_cancel', true)
            ->assertJsonPath('data.has_captured_payment', false)
            ->assertJsonPath('data.payment_status', 'failed')
            ->assertJsonPath('data.payment_summary.failure_reason', 'Card declined by issuer')
            ->assertJsonPath('data.review_eligibility.is_eligible', false);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$awaiting->booking_reference}/payment/status")
            ->assertOk()
            ->assertJsonPath('data.can_pay', true)
            ->assertJsonPath('data.latest_payment.status', 'failed')
            ->assertJsonPath('data.latest_payment.failure_reason', 'Card declined by issuer');

        // Expired with late captured payment
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$expiredLateCapture->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.status', 'expired')
            ->assertJsonPath('data.can_pay', false)
            ->assertJsonPath('data.can_cancel', false)
            ->assertJsonPath('data.requires_refund_review', true)
            ->assertJsonPath('data.has_captured_payment', true)
            ->assertJsonPath('data.review_eligibility.is_eligible', false);

        // Confirmed + completed stay with captured payment IS eligible for review
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$confirmedCheckedIn->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.is_checked_in', true)
            ->assertJsonPath('data.is_checked_out', true)
            ->assertJsonPath('data.can_pay', false)
            ->assertJsonPath('data.can_cancel', true)
            ->assertJsonPath('data.has_captured_payment', true)
            ->assertJsonPath('data.review_eligibility.is_eligible', true);

        $eligibleList = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/reviews/eligible')
            ->assertOk();
        $eligibleRefs = collect($eligibleList->json('data'))->pluck('booking_reference')->all();
        $this->assertContains($confirmedCheckedIn->booking_reference, $eligibleRefs);
        $this->assertNotContains($fullyRefunded->booking_reference, $eligibleRefs);

        // Fully refunded stay must NOT be eligible for review
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$fullyRefunded->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.review_eligibility.is_eligible', false);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reviews/{$fullyRefunded->booking_reference}", [
                'overall_rating' => 5,
                'title' => 'Should be rejected',
                'content' => 'Attempted review on a fully refunded booking.',
            ])
            ->assertStatus(422);

        $this->assertSame(0, PropertyReview::query()->where('reservation_id', $fullyRefunded->id)->count());

        // Eligible stay can submit review and updates review fields cleanly
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reviews/{$confirmedCheckedIn->booking_reference}", [
                'overall_rating' => 5,
                'cleanliness_rating' => 5,
                'food_quality_rating' => 4,
                'communication_rating' => 5,
                'value_rating' => 5,
                'title' => 'Comfortable stay',
                'content' => 'Clean room and helpful host throughout our stay.',
            ])
            ->assertCreated();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$confirmedCheckedIn->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.is_reviewed', true)
            ->assertJsonPath('data.review_eligibility.is_eligible', false);
    }

    public function test_confirmed_paid_reservation_past_scheduled_checkout_is_eligible_without_host_checkin_or_checkout_timestamps_per_review_policy(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $otherCustomer = $this->createCustomerUser();
        $admin = Admin::factory()->create();

        // Confirmed, paid stay past scheduled checkout with NULL checked_in_at & checked_out_at
        // Aligns with TIJUM-POL-REV-2026.1 (no host review gating; scheduled checkout elapsed)
        $untrackedPastStay = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->subDays(4)->toDateString(),
            'checkout_date' => now()->subDays(2)->toDateString(),
            'checked_in_at' => null,
            'checked_out_at' => null,
            'total_amount_minor' => 200000,
        ]);

        ReservationPayment::forceCreate([
            'reservation_id' => $untrackedPastStay->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_policy_ok',
            'gateway_payment_id' => 'pay_policy_ok',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(4),
        ]);

        // Blocked past stays: unpaid, cancelled, expired, and fully refunded
        $unpaidPast = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->subDays(4)->toDateString(),
            'checkout_date' => now()->subDays(2)->toDateString(),
            'checked_in_at' => null,
            'checked_out_at' => null,
            'total_amount_minor' => 200000,
        ]);

        $cancelledPast = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Cancelled,
            'check_in_date' => now()->subDays(4)->toDateString(),
            'checkout_date' => now()->subDays(2)->toDateString(),
            'checked_in_at' => null,
            'checked_out_at' => null,
            'cancelled_at' => now()->subDays(3),
            'total_amount_minor' => 200000,
        ]);

        $expiredPast = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Expired,
            'check_in_date' => now()->subDays(4)->toDateString(),
            'checkout_date' => now()->subDays(2)->toDateString(),
            'checked_in_at' => null,
            'checked_out_at' => null,
            'expired_at' => now()->subDays(4),
            'total_amount_minor' => 200000,
        ]);

        $refundedPast = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->subDays(4)->toDateString(),
            'checkout_date' => now()->subDays(2)->toDateString(),
            'checked_in_at' => null,
            'checked_out_at' => null,
            'total_amount_minor' => 200000,
        ]);

        $refundedPastPayment = ReservationPayment::forceCreate([
            'reservation_id' => $refundedPast->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_policy_refunded',
            'gateway_payment_id' => 'pay_policy_refunded',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Refunded,
            'captured_at' => now()->subDays(4),
        ]);

        ReservationRefund::forceCreate([
            'reservation_payment_id' => $refundedPastPayment->id,
            'reservation_id' => $refundedPast->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_policy_1',
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Full refund verification',
            'gateway_processed_at' => now()->subDays(2),
        ]);

        $token = $customer->createToken('customer_review_policy')->plainTextToken;
        $otherToken = $otherCustomer->createToken('other_customer')->plainTextToken;

        // Different user cannot view or review the reservation
        $this->withHeader('Authorization', 'Bearer '.$otherToken)
            ->getJson("/api/v1/customer/reservations/{$untrackedPastStay->booking_reference}")
            ->assertStatus(404);

        $this->withHeader('Authorization', 'Bearer '.$otherToken)
            ->postJson("/api/v1/customer/reviews/{$untrackedPastStay->booking_reference}", [
                'overall_rating' => 5,
                'title' => 'Unauthorized',
                'content' => 'Another customer must not review this stay.',
            ])
            ->assertStatus(404);

        $this->app['auth']->forgetGuards();

        // Unpaid, cancelled, expired, and fully refunded remain ineligible & rejected
        foreach ([$unpaidPast, $cancelledPast, $expiredPast, $refundedPast] as $blockedStay) {
            $this->withHeader('Authorization', 'Bearer '.$token)
                ->getJson("/api/v1/customer/reservations/{$blockedStay->booking_reference}")
                ->assertOk()
                ->assertJsonPath('data.review_eligibility.is_eligible', false);

            $this->withHeader('Authorization', 'Bearer '.$token)
                ->postJson("/api/v1/customer/reviews/{$blockedStay->booking_reference}", [
                    'overall_rating' => 4,
                    'content' => 'Blocked booking review attempt.',
                ])
                ->assertStatus(422);
        }

        // Confirmed + captured + past scheduled checkout IS eligible even with null check-in/out
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/customer/reservations/{$untrackedPastStay->booking_reference}")
            ->assertOk()
            ->assertJsonPath('data.is_checked_in', false)
            ->assertJsonPath('data.is_checked_out', false)
            ->assertJsonPath('data.review_eligibility.is_eligible', true);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reviews/{$untrackedPastStay->booking_reference}", [
                'overall_rating' => 5,
                'cleanliness_rating' => 5,
                'food_quality_rating' => 5,
                'communication_rating' => 4,
                'value_rating' => 5,
                'title' => 'Honest stay feedback',
                'content' => 'Stay completed cleanly regardless of manual front-desk stamp.',
            ])
            ->assertCreated();
    }

    public function test_check_out_requires_prior_check_in_across_owner_api_owner_web_and_admin_web(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $admin = Admin::factory()->withTwoFactor()->create();

        $reservation = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'checked_in_at' => null,
            'checked_out_at' => null,
        ]);

        $ownerToken = $owner->createToken('owner_mobile')->plainTextToken;

        // Owner mobile API checkout without check-in -> 422
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/check-out")
            ->assertStatus(422);
        $this->assertNull($reservation->fresh()->checked_out_at);

        // Owner web checkout without check-in -> 422 JSON error or validation failure
        $this->actingAs($owner, 'owner')
            ->postJson(route('owner.reservations.check-out', $reservation))
            ->assertStatus(422);
        $this->assertNull($reservation->fresh()->checked_out_at);

        // Admin web checkout without check-in -> validation failure
        $this->actingAs($admin, 'admin')
            ->postJson(route('admin.operations.check-outs.mark', $reservation))
            ->assertStatus(422);
        $this->assertNull($reservation->fresh()->checked_out_at);

        // Once checked in via Owner API, checkout succeeds cleanly
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/check-in")
            ->assertOk();
        $this->assertNotNull($reservation->fresh()->checked_in_at);

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/check-out")
            ->assertOk();
        $this->assertNotNull($reservation->fresh()->checked_out_at);
    }

    public function test_property_coordinate_validation_null_island_protection_and_reverse_geocode_fallback(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->first() ?? City::query()->create([
            'name' => 'Hyderabad',
            'slug' => 'hyderabad',
            'state' => 'Telangana',
            'state_code' => 'TG',
            'country_code' => 'IN',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $category = PropertyCategory::query()->active()->first() ?? PropertyCategory::factory()->create(['is_active' => true]);
        $ownerToken = $owner->createToken('owner_geo')->plainTextToken;

        $basePayload = [
            'name' => 'Gachibowli Residency',
            'category_id' => $category->id,
            'city_id' => $city->id,
            'description' => 'Clean accommodation in Gachibowli near IT park.',
            'contact_person_name' => 'Host Manager',
            'contact_phone' => '9876543210',
            'address_line_1' => 'Plot 42, DLF Road',
            'locality' => 'Gachibowli',
            'postal_code' => '500032',
        ];

        // Out-of-range latitude -> 422
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson('/api/v1/owner/properties', array_merge($basePayload, [
                'latitude' => 95.0,
                'longitude' => 78.35,
            ]))
            ->assertStatus(422);

        // Partial coordinate pair -> 422
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson('/api/v1/owner/properties', array_merge($basePayload, [
                'latitude' => 17.44,
            ]))
            ->assertStatus(422);

        // Null Island (0, 0) -> 422
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson('/api/v1/owner/properties', array_merge($basePayload, [
                'latitude' => 0.0,
                'longitude' => 0.0,
            ]))
            ->assertStatus(422);

        // Valid coordinates -> 201 and stored cleanly
        $created = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson('/api/v1/owner/properties', array_merge($basePayload, [
                'latitude' => 17.4401,
                'longitude' => 78.3489,
            ]))
            ->assertCreated();

        $propertyId = (int) $created->json('data.id');
        $this->assertEqualsWithDelta(17.4401, (float) $created->json('data.latitude'), 0.0001);
        $this->assertEqualsWithDelta(78.3489, (float) $created->json('data.longitude'), 0.0001);

        // Updating without sending coordinate keys preserves stored coordinates
        $updated = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->putJson("/api/v1/owner/properties/{$propertyId}", array_merge($basePayload, [
                'name' => 'Gachibowli Residency Updated',
            ]))
            ->assertOk();

        $this->assertEqualsWithDelta(17.4401, (float) $updated->json('data.latitude'), 0.0001);
        $this->assertEqualsWithDelta(78.3489, (float) $updated->json('data.longitude'), 0.0001);

        // Public API coordinates parity: mapped vs Null Island / unmapped
        $mapped = $this->createBookableProperty($owner);
        $mapped->forceFill(['latitude' => 17.4401, 'longitude' => 78.3489])->save();

        $unmapped = $this->createBookableProperty($owner);
        $unmapped->forceFill(['latitude' => 0.0, 'longitude' => 0.0])->save();

        $this->getJson("/api/v1/public/properties/{$mapped->slug}")
            ->assertOk()
            ->assertJsonPath('data.has_coordinates', true)
            ->assertJsonPath('data.location_precision', 'exact')
            ->assertJsonPath('data.google_maps_url', fn (?string $url): bool => is_string($url) && str_contains($url, '17.4401'));

        $this->getJson("/api/v1/public/properties/{$unmapped->slug}")
            ->assertOk()
            ->assertJsonPath('data.has_coordinates', false)
            ->assertJsonPath('data.location_precision', 'area_only')
            ->assertJsonPath('data.google_maps_url', null)
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null);

        // Reverse geocode outside 80 km launch city threshold must NOT fabricate Hyderabad
        Http::fake(['*' => Http::response([], 500)]);

        $this->getJson('/api/v1/public/geocode/reverse?lat=51.5074&lng=-0.1278')
            ->assertOk()
            ->assertJsonPath('data.location_available', false)
            ->assertJsonPath('data.provider', 'unavailable')
            ->assertJsonPath('data.display', 'Location unavailable')
            ->assertJsonPath('data.city_slug', null);

        // Coordinates within 80 km of Hyderabad resolve to Hyderabad when upstream providers fail
        $this->getJson('/api/v1/public/geocode/reverse?lat=17.4100&lng=78.4700')
            ->assertOk()
            ->assertJsonPath('data.location_available', true)
            ->assertJsonPath('data.city_slug', 'hyderabad');
    }
}
