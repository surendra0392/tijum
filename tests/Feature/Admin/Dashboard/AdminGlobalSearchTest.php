<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Dashboard;

use App\Enums\AdminRole;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminGlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    private function createCity(string $name = 'Vijayawada', string $state = 'Andhra Pradesh'): City
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

    public function test_global_search_returns_grouped_results_for_authorized_admin(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $city = $this->createCity('Vijayawada');
        $category = PropertyCategory::factory()->create(['name' => 'Homestay']);
        $owner = Owner::factory()->create(['name' => 'Venkata Rao', 'email' => 'venkata@example.com']);
        $property = Property::factory()->create([
            'name' => 'Krishna Riverside Homestay',
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
        ]);
        $roomType = PropertyRoomType::query()->create([
            'property_id' => $property->id,
            'name' => 'Riverside Room',
            'slug' => 'riverside-room-'.uniqid(),
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
        $guest = User::factory()->create(['name' => 'Ramesh Kumar']);

        $res = new Reservation;
        $res->forceFill([
            'booking_reference' => 'RES-VIJAYAWADA-9988',
            'submission_token' => (string) Str::uuid(),
            'user_id' => $guest->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => now()->toDateString(),
            'checkout_date' => now()->addDays(2)->toDateString(),
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
            'unit_rate_minor' => 225000,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom,
            'total_amount_minor' => 450000,
            'status' => ReservationStatus::Confirmed,
            'submitted_at' => now(),
        ])->save();

        // 1. Search by booking reference
        $response = $this->actingAs($admin, 'admin')->getJson(route('admin.search', ['q' => 'RES-VIJAYAWADA']));
        $response->assertOk()
            ->assertJsonPath('results.reservations.0.title', 'RES-VIJAYAWADA-9988');

        // 2. Search by partner name
        $response = $this->actingAs($admin, 'admin')->getJson(route('admin.search', ['q' => 'Venkata']));
        $response->assertOk()
            ->assertJsonPath('results.partners.0.title', 'Venkata Rao');

        // 3. Search by property name
        $response = $this->actingAs($admin, 'admin')->getJson(route('admin.search', ['q' => 'Riverside']));
        $response->assertOk()
            ->assertJsonPath('results.properties.0.title', 'Krishna Riverside Homestay');
    }

    public function test_search_respects_permissions_for_finance_records(): void
    {
        $superAdmin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $operationsAdmin = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();

        $owner = Owner::factory()->create();
        $profile = OwnerFinancialProfile::query()->create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Test Legal',
        ]);

        PartnerSettlement::query()->create([
            'settlement_reference' => 'SETTLE-AUDIT-777',
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(7),
            'period_end' => now(),
            'net_settlement_amount_minor' => 350000,
            'status' => SettlementStatus::PendingApproval,
        ]);

        // SuperAdmin can find the settlement
        $this->actingAs($superAdmin, 'admin')
            ->getJson(route('admin.search', ['q' => 'SETTLE-AUDIT']))
            ->assertOk()
            ->assertJsonCount(1, 'results.settlements')
            ->assertJsonPath('results.settlements.0.title', 'SETTLE-AUDIT-777');

        // Operations admin cannot see settlements in search results
        $this->actingAs($operationsAdmin, 'admin')
            ->getJson(route('admin.search', ['q' => 'SETTLE-AUDIT']))
            ->assertOk()
            ->assertJsonCount(0, 'results.settlements');
    }
}
