<?php

declare(strict_types=1);

namespace Tests\Feature\Protection;

use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ProtectionAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_cannot_access_admin_case_routes(): void
    {
        $customer = $this->createCustomerUser();

        $this->actingAs($customer, 'web')
            ->get('/admin/customer-cases')
            ->assertRedirect(route('admin.login'));

        $this->actingAs($customer, 'web')
            ->get('/admin/relocations')
            ->assertRedirect(route('admin.login'));
    }

    public function test_owner_cannot_access_other_owners_case(): void
    {
        $owner1 = $this->createActiveOwner(['email' => 'o1@example.com']);
        $owner2 = $this->createActiveOwner(['email' => 'o2@example.com']);

        $property = $this->createBookableProperty($owner1);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $case = CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-OWNERAUTHTEST01',
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $owner1->id,
            'category' => CaseCategory::RoomMismatch,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Standard,
            'description' => 'Test case for owner isolation.',
            'sla_due_at' => now()->addDays(30),
        ]);

        // Owner 2 tries to access Owner 1's case -> 403 Forbidden
        $this->actingAs($owner2, 'owner')
            ->get(route('owner.cases.show', $case->case_reference))
            ->assertForbidden();

        // Owner 2 tries to post message to Owner 1's case -> 403 Forbidden
        $this->actingAs($owner2, 'owner')
            ->post(route('owner.cases.messages.store', $case->case_reference), [
                'message' => 'Unauthorized owner attempt.',
            ])
            ->assertForbidden();
    }

    public function test_admin_without_totp_is_redirected_to_two_factor_setup(): void
    {
        $admin = Admin::factory()->create([
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
            'two_factor_confirmed_at' => null, // TOTP NOT confirmed
        ]);

        $this->actingAs($admin, 'admin')
            ->get('/admin/customer-cases')
            ->assertRedirect(route('admin.two-factor.setup'));
    }
}
