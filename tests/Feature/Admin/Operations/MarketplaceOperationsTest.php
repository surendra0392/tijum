<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Operations;

use App\Enums\AdminRole;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MarketplaceOperationsTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): Admin
    {
        return Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
    }

    private function operationsAdmin(): Admin
    {
        return Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();
    }

    private function createConfirmedReservation(Property $property, string $checkIn, string $checkout): Reservation
    {
        $name = 'Deluxe Room '.Str::random(4);
        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $property->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'accommodation_mode' => 'private',
            'max_guests_per_room' => 2,
            'sharing_capacity' => 1,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => [],
            'is_air_conditioned' => true,
        ]);
        $roomType->save();

        $user = User::factory()->create();

        return Reservation::factory()->confirmed()->create([
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => $checkIn,
            'checkout_date' => $checkout,
            'contact_name' => 'John Doe',
            'contact_email' => 'john@example.com',
            'contact_phone' => '+919876543210',
            'status' => ReservationStatus::Confirmed,
        ]);
    }

    public function test_operations_checkins_page_accessible_and_renders_stats(): void
    {
        $admin = $this->operationsAdmin();
        $city = City::firstOrCreate(
            ['slug' => 'hyderabad'],
            [
                'name' => 'Hyderabad',
                'state' => 'Telangana',
                'country_code' => 'IN',
                'is_active' => true,
            ]
        );
        $owner = Owner::factory()->create();
        $property = Property::factory()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'name' => 'Gachibowli Comfort Stay',
        ]);

        $today = CarbonImmutable::now()->toDateString();
        $reservation = $this->createConfirmedReservation($property, $today, CarbonImmutable::now()->addDays(3)->toDateString());

        $this->actingAs($admin, 'admin')
            ->get(route('admin.operations.check-ins.index', ['date' => $today]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations/check-ins/index')
                ->has('reservations.data', 1)
                ->where('reservations.data.0.booking_reference', $reservation->booking_reference)
                ->where('stats.total_expected', 1)
                ->where('stats.pending', 1)
                ->where('stats.checked_in', 0)
            );
    }

    public function test_admin_can_mark_checkin_and_undo_checkin(): void
    {
        $admin = $this->operationsAdmin();
        $owner = Owner::factory()->create();
        $property = Property::factory()->create(['owner_id' => $owner->id]);
        $today = CarbonImmutable::now()->toDateString();
        $reservation = $this->createConfirmedReservation($property, $today, CarbonImmutable::now()->addDays(2)->toDateString());

        $this->assertNull($reservation->checked_in_at);

        // Mark check-in
        $this->actingAs($admin, 'admin')
            ->post(route('admin.operations.check-ins.mark', $reservation), [
                'notes' => 'Government ID verified at front desk.',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertTrue($reservation->isCheckedIn());
        $this->assertSame('admin', $reservation->checked_in_by_type);
        $this->assertSame($admin->id, $reservation->checked_in_by_id);
        $this->assertSame('Government ID verified at front desk.', $reservation->check_in_notes);

        // Undo check-in
        $this->actingAs($admin, 'admin')
            ->post(route('admin.operations.check-ins.undo', $reservation))
            ->assertRedirect();

        $reservation->refresh();
        $this->assertFalse($reservation->isCheckedIn());
        $this->assertNull($reservation->checked_in_at);
        $this->assertNull($reservation->check_in_notes);
    }

    public function test_operations_checkouts_page_accessible_and_detects_overstays(): void
    {
        $admin = $this->operationsAdmin();
        $owner = Owner::factory()->create();
        $property = Property::factory()->create(['owner_id' => $owner->id]);

        $today = CarbonImmutable::now()->toDateString();
        $pastDate = CarbonImmutable::now()->subDays(2)->toDateString();

        // Normal departure today
        $normalDeparture = $this->createConfirmedReservation($property, CarbonImmutable::now()->subDays(2)->toDateString(), $today);

        // Overstay: checkout was yesterday, not checked out
        $overstayReservation = $this->createConfirmedReservation($property, CarbonImmutable::now()->subDays(5)->toDateString(), CarbonImmutable::now()->subDay()->toDateString());

        $this->actingAs($admin, 'admin')
            ->get(route('admin.operations.check-outs.index', ['date' => $today]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations/check-outs/index')
                ->where('stats.total_due', 1)
                ->where('stats.overstays', 1)
            );

        // Filter by overstay
        $this->actingAs($admin, 'admin')
            ->get(route('admin.operations.check-outs.index', ['status' => 'overstay']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations/check-outs/index')
                ->has('reservations.data', 1)
                ->where('reservations.data.0.booking_reference', $overstayReservation->booking_reference)
                ->where('reservations.data.0.is_overstay', true)
            );
    }

    public function test_admin_can_mark_checkout_and_undo_checkout(): void
    {
        $admin = $this->operationsAdmin();
        $owner = Owner::factory()->create();
        $property = Property::factory()->create(['owner_id' => $owner->id]);
        $today = CarbonImmutable::now()->toDateString();
        $reservation = $this->createConfirmedReservation($property, CarbonImmutable::now()->subDays(2)->toDateString(), $today);

        // Mark check-out
        $this->actingAs($admin, 'admin')
            ->post(route('admin.operations.check-outs.mark', $reservation), [
                'notes' => 'Keys returned, room 101 inspected.',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertTrue($reservation->isCheckedOut());
        $this->assertSame('admin', $reservation->checked_out_by_type);
        $this->assertSame($admin->id, $reservation->checked_out_by_id);
        $this->assertSame('Keys returned, room 101 inspected.', $reservation->checkout_notes);

        // Undo check-out
        $this->actingAs($admin, 'admin')
            ->post(route('admin.operations.check-outs.undo', $reservation))
            ->assertRedirect();

        $reservation->refresh();
        $this->assertFalse($reservation->isCheckedOut());
        $this->assertNull($reservation->checked_out_at);
        $this->assertNull($reservation->checkout_notes);
    }

    public function test_partner_can_mark_checkin_and_checkout_on_owned_reservation(): void
    {
        $owner = Owner::factory()->create();
        $property = Property::factory()->create(['owner_id' => $owner->id]);
        $today = CarbonImmutable::now()->toDateString();
        $reservation = $this->createConfirmedReservation($property, $today, CarbonImmutable::now()->addDays(2)->toDateString());

        // Partner check-in
        $this->actingAs($owner, 'owner')
            ->post(route('owner.reservations.check-in', $reservation->booking_reference), [
                'notes' => 'Welcome drink served, checked in by partner.',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertTrue($reservation->isCheckedIn());
        $this->assertSame('owner', $reservation->checked_in_by_type);
        $this->assertSame($owner->id, $reservation->checked_in_by_id);
        $this->assertSame('Welcome drink served, checked in by partner.', $reservation->check_in_notes);

        // Partner check-out
        $this->actingAs($owner, 'owner')
            ->post(route('owner.reservations.check-out', $reservation->booking_reference), [
                'notes' => 'Farewell gift given.',
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertTrue($reservation->isCheckedOut());
        $this->assertSame('owner', $reservation->checked_out_by_type);
        $this->assertSame($owner->id, $reservation->checked_out_by_id);
        $this->assertSame('Farewell gift given.', $reservation->checkout_notes);
    }

    public function test_partner_cannot_mark_checkin_on_unowned_reservation(): void
    {
        $ownerA = Owner::factory()->create();
        $ownerB = Owner::factory()->create();
        $propertyA = Property::factory()->create(['owner_id' => $ownerA->id]);

        $today = CarbonImmutable::now()->toDateString();
        $reservation = $this->createConfirmedReservation($propertyA, $today, CarbonImmutable::now()->addDays(2)->toDateString());

        // Owner B attempts to check-in Owner A's reservation
        $this->actingAs($ownerB, 'owner')
            ->post(route('owner.reservations.check-in', $reservation->booking_reference))
            ->assertNotFound();
    }

    public function test_customer_complaints_and_relocations_accessible_by_operations(): void
    {
        $admin = $this->operationsAdmin();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.customer-cases.index'))
            ->assertOk();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.relocations.index'))
            ->assertOk();
    }
}
