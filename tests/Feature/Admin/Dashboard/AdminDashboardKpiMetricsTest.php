<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Dashboard;

use App\Enums\AdminRole;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminDashboardKpiMetricsTest extends TestCase
{
    use RefreshDatabase;

    private function createCity(string $name = 'Hyderabad', string $state = 'Telangana'): City
    {
        return City::query()->firstOrCreate(
            ['slug' => strtolower($name)],
            [
                'name' => $name,
                'slug' => strtolower($name),
                'state' => $state,
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );
    }

    private function createFullBooking(
        City $city,
        PropertyCategory $category,
        int $amountMinor = 600000,
        int $commMinor = 72000,
        int $gstMinor = 12960,
        ?CarbonImmutable $createdAt = null,
    ): Reservation {
        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'is_verified' => true,
            'status' => PropertyOperationalStatus::Active,
        ]);
        $roomType = PropertyRoomType::query()->create([
            'property_id' => $property->id,
            'name' => 'Standard Room',
            'slug' => 'standard-room-'.uniqid(),
            'accommodation_mode' => 'private',
            'sharing_capacity' => 1,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => ['any'],
            'daily_rate_minor' => 150000,
            'is_active' => true,
            'is_approved_version' => true,
        ]);
        $guest = User::factory()->create();

        $bookingDate = $createdAt ?? CarbonImmutable::now('Asia/Kolkata');

        $res = new Reservation;
        $res->forceFill([
            'booking_reference' => 'RES-TEST-'.uniqid(),
            'submission_token' => (string) Str::uuid(),
            'user_id' => $guest->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => $bookingDate->addDays(2)->toDateString(),
            'checkout_date' => $bookingDate->addDays(4)->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => 2,
            'total_stay_days' => 2,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms,
            'guest_gender' => 'all_genders',
            'guest_composition' => 'individuals',
            'contact_name' => $guest->name,
            'contact_email' => $guest->email,
            'contact_phone' => '+919876543210',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'currency_code' => 'INR',
            'unit_rate_minor' => (int) round($amountMinor / 2),
            'rate_unit' => ReservationRateUnit::PerPrivateRoom,
            'total_amount_minor' => $amountMinor,
            'commission_amount_minor' => $commMinor,
            'commission_tax_amount_minor' => $gstMinor,
            'commission_rate_bps' => 1200,
            'status' => ReservationStatus::Confirmed,
            'submitted_at' => $bookingDate,
            'created_at' => $bookingDate,
            'updated_at' => $bookingDate,
        ])->save();

        ReservationPayment::query()->create([
            'reservation_id' => $res->id,
            'user_id' => $guest->id,
            'gateway' => 'razorpay',
            'gateway_payment_id' => 'pay_test_'.uniqid(),
            'gateway_order_id' => 'order_test_'.uniqid(),
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => $amountMinor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => $bookingDate,
            'created_at' => $bookingDate,
        ]);

        return $res;
    }

    public function test_marketplace_overview_and_revenue_separation(): void
    {
        $city = $this->createCity('Hyderabad');
        $category = PropertyCategory::factory()->create(['name' => 'Hostel']);
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();

        // Create booking: ₹6,000 gross, ₹720 commission, ₹129.60 GST
        $this->createFullBooking($city, $category, 600000, 72000, 12960);

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('marketplaceOverview.active_properties', 1)
                ->where('marketplaceOverview.confirmed_reservations', 1)
                ->where('revenueBreakdown.gross_booking_value_minor', 600000)
                ->where('revenueBreakdown.platform_revenue_minor', 72000)
                ->where('revenueBreakdown.commission_gst_minor', 12960)
                ->where('revenueBreakdown.captured_payment_amount_minor', 600000)
                ->where('revenueBreakdown.net_partner_payable_minor', 515040) // 600000 - 72000 - 12960
            );
    }

    public function test_city_filter_restricts_metrics_correctly(): void
    {
        $hyderabad = $this->createCity('Hyderabad');
        $guntur = $this->createCity('Guntur', 'Andhra Pradesh');
        $category = PropertyCategory::factory()->create();
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();

        // 1 booking in Hyderabad, 1 booking in Guntur
        $this->createFullBooking($hyderabad, $category, 500000, 60000, 10800);
        $this->createFullBooking($guntur, $category, 400000, 48000, 8640);

        // Filter by Hyderabad
        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard', ['city_id' => $hyderabad->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filterMetadata.city_id', $hyderabad->id)
                ->where('marketplaceOverview.active_properties', 1)
                ->where('marketplaceOverview.confirmed_reservations', 1)
                ->where('revenueBreakdown.gross_booking_value_minor', 500000)
                ->where('revenueBreakdown.platform_revenue_minor', 60000)
            );
    }

    public function test_customer_protection_sla_tracking(): void
    {
        $city = $this->createCity('Visakhapatnam', 'Andhra Pradesh');
        $category = PropertyCategory::factory()->create();
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $res = $this->createFullBooking($city, $category);
        $now = CarbonImmutable::now('Asia/Kolkata');

        // Create case with overdue acknowledgement (unacknowledged, resolution due in 48h)
        CustomerProtectionCase::query()->create([
            'case_reference' => 'CASE-TEST-001',
            'reservation_id' => $res->id,
            'user_id' => $res->user_id,
            'property_id' => $res->property_id,
            'owner_id' => $res->property->owner_id,
            'category' => 'safety_concern',
            'priority' => CasePriority::Urgent,
            'status' => CaseStatus::Open,
            'description' => 'Urgent safety test',
            'acknowledged_at' => null,
            'sla_due_at' => $now->addHours(48),
        ]);

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('customerProtectionMetrics.open_cases_count', 1)
                ->where('customerProtectionMetrics.urgent_cases_count', 1)
                ->where('customerProtectionMetrics.safety_cases_count', 1)
                ->where('customerProtectionMetrics.overdue_acknowledgement_count', 1)
                ->where('customerProtectionMetrics.overdue_resolution_count', 0)
            );
    }

    public function test_payment_and_refund_metrics_track_processed_refunds(): void
    {
        $city = $this->createCity('Hyderabad');
        $category = PropertyCategory::factory()->create(['name' => 'Hostel']);
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();

        $res = $this->createFullBooking($city, $category, 600000, 72000, 12960);
        $payment = $res->payments()->firstOrFail();

        ReservationRefund::query()->create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $res->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_test_'.uniqid(),
            'idempotency_key' => (string) Str::uuid(),
            'amount_minor' => 150000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Guest requested partial cancellation',
            'gateway_processed_at' => CarbonImmutable::now('Asia/Kolkata'),
        ]);

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('paymentMetrics.refunds_processed_count', 1)
                ->where('paymentMetrics.refunds_processed_amount_minor', 150000)
                ->where('revenueBreakdown.completed_refunds_minor', 150000)
            );
    }
}
