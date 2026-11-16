<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Dashboard;

use App\Enums\AdminRole;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminReportExportTest extends TestCase
{
    use RefreshDatabase;

    private function createCity(string $name = 'Visakhapatnam', string $state = 'Andhra Pradesh'): City
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

    public function test_reservations_csv_export_streams_proper_data(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $city = $this->createCity('Visakhapatnam');
        $category = PropertyCategory::factory()->create(['name' => 'Hostel']);
        $owner = Owner::factory()->create(['name' => 'Anil Varma']);
        $property = Property::factory()->create([
            'name' => 'Beach View Hostel',
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
        ]);
        $roomType = PropertyRoomType::query()->create([
            'property_id' => $property->id,
            'name' => 'Beach Room',
            'slug' => 'beach-room-'.uniqid(),
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
        $guest = User::factory()->create(['name' => 'Suresh Reddy', 'email' => 'suresh@example.com']);

        $res = new Reservation;
        $res->forceFill([
            'booking_reference' => 'RES-VIZAG-001',
            'submission_token' => (string) Str::uuid(),
            'user_id' => $guest->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->toDateString(),
            'checkout_date' => now()->addDays(3)->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'total_stay_days' => 3,
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
            'unit_rate_minor' => 250000,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom,
            'total_amount_minor' => 750000,
            'commission_amount_minor' => 90000,
            'status' => ReservationStatus::Confirmed,
            'submitted_at' => now(),
            'created_at' => now(),
        ])->save();

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.reports.export', ['report' => 'reservations', 'range' => 'last_30_days']));

        $response->assertOk();
        $this->assertEquals('text/csv; charset=UTF-8', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename="reservations-report-', (string) $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('Booking Reference', $content);
        $this->assertStringContainsString('RES-VIZAG-001', $content);
        $this->assertStringContainsString('Suresh Reddy', $content);
        $this->assertStringContainsString('7500.00', $content);
    }

    public function test_formula_injection_sanitization(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $city = $this->createCity('Hyderabad');
        $category = PropertyCategory::factory()->create();
        $owner = Owner::factory()->create();
        $property = Property::factory()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
        ]);
        $roomType = PropertyRoomType::query()->create([
            'property_id' => $property->id,
            'name' => 'Formula Room',
            'slug' => 'formula-room-'.uniqid(),
            'accommodation_mode' => 'private',
            'sharing_capacity' => 1,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => ['any'],
            'daily_rate_minor' => 100000,
            'is_active' => true,
            'is_approved_version' => true,
        ]);
        $guest = User::factory()->create(['name' => '=1+1', 'email' => 'formula@example.com']);

        $res = new Reservation;
        $res->forceFill([
            'booking_reference' => '+RES-INJECT-001',
            'submission_token' => (string) Str::uuid(),
            'user_id' => $guest->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->toDateString(),
            'checkout_date' => now()->addDays(1)->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => 1,
            'total_stay_days' => 1,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms,
            'guest_gender' => 'all_genders',
            'guest_composition' => 'individuals',
            'contact_name' => $guest->name, // starts with '='
            'contact_email' => $guest->email,
            'contact_phone' => '+919876543210',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom,
            'total_amount_minor' => 100000,
            'status' => ReservationStatus::Confirmed,
            'submitted_at' => now(),
            'created_at' => now(),
        ])->save();

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.reports.export', ['report' => 'reservations']));

        $content = $response->streamedContent();

        // Formula prefix should be sanitized with a single quote
        $this->assertStringContainsString("'+RES-INJECT-001", $content);
        $this->assertStringContainsString("'=1+1", $content);
    }

    public function test_unauthorized_admin_cannot_export_financial_reports(): void
    {
        $operationsAdmin = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();

        $this->actingAs($operationsAdmin, 'admin')
            ->get(route('admin.reports.export', ['report' => 'settlements']))
            ->assertForbidden();

        $this->actingAs($operationsAdmin, 'admin')
            ->get(route('admin.reports.export', ['report' => 'payments']))
            ->assertForbidden();
    }
}
