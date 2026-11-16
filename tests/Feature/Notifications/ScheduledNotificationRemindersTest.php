<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class ScheduledNotificationRemindersTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.in_app.enabled', true);
        Config::set('tijum.notifications.channels.email.enabled', true);
    }

    public function test_sends_payment_deadline_reminder_5_minutes_before_expiry(): void
    {
        $customer = $this->createCustomer();
        $partner = $this->createPartner();
        $property = $this->createBookableProperty($partner);
        $roomType = $this->createBookableRoomType($property);

        // Payment window expiring in 4 minutes
        $reservation = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now('Asia/Kolkata')->addMinutes(4),
        ]);

        $this->artisan('tijum:send-notification-reminders')->assertSuccessful();

        $this->assertDatabaseHas('notification_deliveries', [
            'template_code' => 'customer.reservation.payment_deadline_reminder.sms',
            'related_reference' => $reservation->booking_reference,
        ]);
    }

    public function test_sends_upcoming_stay_reminder_24_hours_prior_to_check_in(): void
    {
        $customer = $this->createCustomer();
        $partner = $this->createPartner();
        $property = $this->createBookableProperty($partner);
        $roomType = $this->createBookableRoomType($property);

        // Check-in is tomorrow
        $tomorrow = CarbonImmutable::now('Asia/Kolkata')->addDay()->toDateString();

        $reservation = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $tomorrow,
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString(),
        ]);

        $this->artisan('tijum:send-notification-reminders')->assertSuccessful();

        $this->assertDatabaseHas('notification_deliveries', [
            'template_code' => 'customer.reservation.upcoming_stay.in_app',
            'related_reference' => $reservation->booking_reference,
        ]);
    }

    public function test_sends_verified_review_invitation_after_checkout(): void
    {
        $customer = $this->createCustomer();
        $partner = $this->createPartner();
        $property = $this->createBookableProperty($partner);
        $roomType = $this->createBookableRoomType($property);

        // Checked out yesterday
        $yesterday = CarbonImmutable::now('Asia/Kolkata')->subDay()->toDateString();

        $reservation = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(4)->toDateString(),
            'checkout_date' => $yesterday,
        ]);

        $reservation->payments()->create([
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_rev_inv_1',
            'idempotency_key' => 'idemp_rev_inv_1',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now(),
        ]);

        $this->artisan('tijum:send-notification-reminders')->assertSuccessful();

        $this->assertDatabaseHas('notification_deliveries', [
            'template_code' => 'customer.review.invitation.in_app',
            'related_reference' => $reservation->booking_reference,
        ]);
    }

    public function test_sends_grievance_sla_warning_for_urgent_case_older_than_24_hours(): void
    {
        $customer = $this->createCustomer();
        $partner = $this->createPartner();
        $property = $this->createBookableProperty($partner);
        $roomType = $this->createBookableRoomType($property);
        $this->createAdminUser();

        $reservation = Reservation::factory()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
        ]);

        $case = CustomerProtectionCase::query()->create([
            'case_reference' => 'CPC-TEST-SLA-001',
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $partner->id,
            'category' => CaseCategory::SafetyConcern,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Urgent,
            'description' => 'Urgent safety concern requiring review.',
            'sla_due_at' => CarbonImmutable::now('Asia/Kolkata')->subHour(),
            'created_at' => CarbonImmutable::now('Asia/Kolkata')->subHours(25),
            'updated_at' => CarbonImmutable::now('Asia/Kolkata')->subHours(25),
        ]);

        $this->artisan('tijum:send-notification-reminders')->assertSuccessful();

        $this->assertDatabaseHas('notification_deliveries', [
            'template_code' => 'admin.urgent_case.in_app',
            'related_reference' => $case->case_reference,
        ]);
    }
}
