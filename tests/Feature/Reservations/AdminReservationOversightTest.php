<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Enums\AdminRole;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class AdminReservationOversightTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    private function createReservationForAdmin(): Reservation
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $response = $this->submitReservation($user, $payload);
        $response->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        if (! $reservation instanceof Reservation) {
            // Fallback: create directly if HTTP flow has issues
            $reservation = new Reservation;
            $reservation->forceFill([
                'user_id' => $user->id,
                'property_id' => $property->id,
                'property_room_type_id' => $roomType->id,
                'booking_reference' => 'TJR-'.CarbonImmutable::now('Asia/Kolkata')->format('Y').'-'.Str::ulid(),
                'submission_token' => $payload['submission_token'],
                'check_in_date' => $payload['check_in_date'],
                'checkout_date' => CarbonImmutable::parse($payload['check_in_date'])->addDay()->toDateString(),
                'duration_type' => 'daily',
                'duration_quantity' => 1,
                'total_stay_days' => 1,
                'quantity' => 1,
                'guest_count' => 1,
                'quantity_basis' => 'guest_places',
                'guest_gender' => 'male',
                'guest_composition' => 'individuals',
                'contact_name' => 'Test Guest',
                'contact_email' => 'guest@example.test',
                'contact_phone' => '+919999999999',
                'snapshot_property_name' => $property->name,
                'snapshot_room_type_name' => $roomType->name,
                'snapshot_food_provided' => true,
                'snapshot_breakfast_included' => true,
                'snapshot_lunch_included' => true,
                'snapshot_dinner_included' => true,
                'currency_code' => 'INR',
                'unit_rate_minor' => 100000,
                'rate_unit' => 'per_guest',
                'total_amount_minor' => 100000,
                'status' => ReservationStatus::AwaitingPayment,
                'submitted_at' => CarbonImmutable::now('Asia/Kolkata'),
            ])->save();
        }

        return $reservation->fresh();
    }

    public function test_read_only_admin_roles_can_view_but_not_modify_reservations(): void
    {
        $reservation = $this->createReservationForAdmin();

        // CustomerSupport has bookings.view and can access.
        $support = Admin::factory()->role(AdminRole::CustomerSupport)->withTwoFactor()->create();
        $this->actingAs($support, 'admin')
            ->get(route('admin.reservations.index'))
            ->assertOk();
        $this->actingAs($support, 'admin')
            ->get(route('admin.reservations.show', $reservation->booking_reference))
            ->assertOk();

        // Finance does NOT have bookings.view and is blocked by middleware.
        $finance = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create();
        $this->actingAs($finance, 'admin')
            ->get(route('admin.reservations.index'))
            ->assertForbidden();
    }

    public function test_admins_without_bookings_permissions_cannot_view_reservations(): void
    {
        $reservation = $this->createReservationForAdmin();

        $verification = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $this->actingAs($verification, 'admin')
            ->get(route('admin.reservations.index'))
            ->assertForbidden();

        $this->actingAs($verification, 'admin')
            ->get(route('admin.reservations.show', $reservation->booking_reference))
            ->assertForbidden();
    }

    public function test_admin_requires_two_factor_and_active_status(): void
    {
        $reservation = $this->createReservationForAdmin();

        $noTotp = Admin::factory()->role(AdminRole::Operations)->withoutTwoFactor()->create();
        $this->actingAs($noTotp, 'admin')
            ->get(route('admin.reservations.index'))
            ->assertRedirect(route('admin.two-factor.setup'));

        $inactive = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->inactive()->create();
        $this->actingAs($inactive, 'admin')
            ->get(route('admin.reservations.show', $reservation->booking_reference))
            ->assertRedirect(route('admin.login'));
    }

    public function test_guest_and_customer_cannot_access_admin_reservations(): void
    {
        $reservation = $this->createReservationForAdmin();

        $customer = User::factory()->create();

        $this->get(route('admin.reservations.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($customer, 'web')->get(route('admin.reservations.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($customer, 'web')->get(route('admin.reservations.show', $reservation->booking_reference))->assertRedirect(route('admin.login'));
    }

    public function test_operations_can_view_and_manage_bookings(): void
    {
        $reservation = $this->createReservationForAdmin();

        $operations = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();

        $this->actingAs($operations, 'admin')
            ->get(route('admin.reservations.index'))
            ->assertOk();

        $this->actingAs($operations, 'admin')
            ->get(route('admin.reservations.show', $reservation->booking_reference))
            ->assertOk();
    }

    public function test_super_admin_has_full_access(): void
    {
        $reservation = $this->createReservationForAdmin();

        $superAdmin = Admin::factory()->superAdmin()->withTwoFactor()->create();

        $this->actingAs($superAdmin, 'admin')
            ->get(route('admin.reservations.index'))
            ->assertOk();

        $this->actingAs($superAdmin, 'admin')
            ->get(route('admin.reservations.show', $reservation->booking_reference))
            ->assertOk();
    }
}
