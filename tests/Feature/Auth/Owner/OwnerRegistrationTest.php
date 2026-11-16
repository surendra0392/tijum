<?php

declare(strict_types=1);

namespace Tests\Feature\Auth\Owner;

use App\Enums\OwnerStatus;
use App\Enums\PropertyOperationalStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Notifications\Owner\VerifyEmailNotification;
use Database\Seeders\CitySeeder;
use Database\Seeders\PropertyCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OwnerRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            CitySeeder::class,
            PropertyCategorySeeder::class,
        ]);
    }

    public function test_owner_registration_screen_can_be_rendered(): void
    {
        $response = $this->get(route('owner.register'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('owner/auth/register')
            ->has('auth.owner')
            ->where('auth.owner', null)
            ->missing('auth.user')
            ->missing('auth.admin'),
        );
    }

    public function test_owners_can_register_and_are_stored_exclusively_in_owners_table(): void
    {
        Notification::fake();

        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $response = $this->post(route('owner.register.store'), [
            'name' => 'Ramesh Naidu',
            'email' => 'ramesh@hostel.in',
            'phone' => '+919876543210',
            'password' => 'PartnerPass123!',
            'password_confirmation' => 'PartnerPass123!',
            'property_name' => 'Sri Srinivasa Executive PG',
            'property_category_id' => $category->id,
            'available_for' => 'male_only',
            'city_id' => $city->id,
            'locality' => 'Madhapur',
            'description' => 'Clean accommodation for working professionals with 3 meals.',
            'terms' => true,
        ]);

        $response->assertRedirect(route('owner.dashboard'));

        $this->assertDatabaseHas('owners', [
            'email' => 'ramesh@hostel.in',
            'phone' => '+919876543210',
            'status' => OwnerStatus::PendingVerification->value,
        ]);
        $this->assertDatabaseCount('users', 0);

        $owner = Owner::query()->where('email', 'ramesh@hostel.in')->firstOrFail();

        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertGuest('web');
        $this->assertGuest('admin');

        // Verify initial draft property creation
        $this->assertDatabaseHas('properties', [
            'owner_id' => $owner->id,
            'name' => 'Sri Srinivasa Executive PG',
            'property_category_id' => $category->id,
            'city_id' => $city->id,
            'locality' => 'Madhapur',
            'status' => PropertyOperationalStatus::Draft->value,
            'is_verified' => false,
            'booking_eligible' => false,
        ]);

        Notification::assertSentTo($owner, VerifyEmailNotification::class);
    }

    public function test_owner_registration_validates_duplicate_email_and_password_confirmation(): void
    {
        Owner::factory()->create(['email' => 'existing@hostel.in']);

        $response = $this->post(route('owner.register.store'), [
            'name' => 'Duplicate Owner',
            'email' => 'existing@hostel.in',
            'phone' => '+919876543299',
            'password' => 'PartnerPass123!',
            'password_confirmation' => 'MismatchPass123!',
            'property_name' => 'Duplicate Hostel',
            'property_category_id' => 1,
            'available_for' => 'male',
            'city_id' => 1,
            'locality' => 'Gachibowli',
            'terms' => true,
        ]);

        $response->assertSessionHasErrors(['email', 'password']);
        $this->assertGuest('owner');
    }

    public function test_owner_registration_validates_mandatory_partner_fields(): void
    {
        $response = $this->post(route('owner.register.store'), [
            'name' => 'Incomplete Partner',
            'email' => 'incomplete@hostel.in',
            'password' => 'PartnerPass123!',
            'password_confirmation' => 'PartnerPass123!',
        ]);

        $response->assertSessionHasErrors([
            'phone',
            'property_name',
            'property_category_id',
            'city_id',
            'locality',
            'terms',
        ]);
        $this->assertGuest('owner');
    }
}
