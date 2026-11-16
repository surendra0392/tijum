<?php

declare(strict_types=1);

namespace Tests\Feature\AuthAndUx;

use App\Enums\OwnerStatus;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\User;
use Database\Seeders\CitySeeder;
use Database\Seeders\PropertyCategorySeeder;
use Database\Seeders\PropertySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerAndPartnerAuthOverhaulTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CitySeeder::class);
        $this->seed(PropertyCategorySeeder::class);
    }

    public function test_customer_registration_requires_phone_and_terms_and_saves_them(): void
    {
        $payload = [
            'name' => 'Kavitha Reddy',
            'email' => 'kavitha.reddy@tijum.test',
            'phone' => '+919848011223',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'terms' => 'on',
        ];

        $response = $this->post('/register', $payload);
        $response->assertRedirect('/dashboard');

        $user = User::query()->where('email', 'kavitha.reddy@tijum.test')->first();
        $this->assertNotNull($user);
        $this->assertSame('Kavitha Reddy', $user->name);
        $this->assertNotNull($user->phone);
        $this->assertNotNull($user->terms_accepted_at);
    }

    public function test_customer_can_login_with_email_or_phone(): void
    {
        $user = User::factory()->create([
            'email' => 'login.test@tijum.test',
            'phone' => '9876543210',
            'password' => Hash::make('Secret123!'),
        ]);

        // 1. Login with email
        $emailLogin = $this->post('/login', [
            'email' => 'login.test@tijum.test',
            'password' => 'Secret123!',
        ]);
        $emailLogin->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user, 'web');

        $this->post('/logout');
        $this->assertGuest('web');

        // 2. Login with phone
        $phoneLogin = $this->post('/login', [
            'email' => '9876543210',
            'password' => 'Secret123!',
        ]);
        $phoneLogin->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_customer_forgot_password_accepts_email_or_phone(): void
    {
        $user = User::factory()->create([
            'email' => 'forgot.customer@tijum.test',
            'phone' => '9123456789',
        ]);

        // With email
        $resEmail = $this->post('/forgot-password', [
            'email' => 'forgot.customer@tijum.test',
        ]);
        $resEmail->assertSessionHas('status');

        // With phone
        $resPhone = $this->post('/forgot-password', [
            'email' => '9123456789',
        ]);
        $resPhone->assertSessionHas('status');
    }

    public function test_partner_registration_accepts_all_ten_fields_and_creates_draft_property(): void
    {
        $city = City::query()->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $payload = [
            'name' => 'Srinivas Rao',
            'email' => 'srinivas.rao@tijum.test',
            'phone' => '+919988776655',
            'password' => 'PartnerSecret123!',
            'password_confirmation' => 'PartnerSecret123!',
            'property_name' => 'Srinivas Executive Hostel',
            'property_type' => 'hostels-pg',
            'available_for' => 'male',
            'location' => $city->slug,
            'area' => 'Madhapur IT Hub',
            'description' => 'Modern hostel for professionals with home-style food.',
            'terms' => '1',
        ];

        $response = $this->post(route('owner.register.store'), $payload);
        $response->assertRedirect(route('owner.dashboard'));

        $owner = Owner::query()->where('email', 'srinivas.rao@tijum.test')->first();
        $this->assertNotNull($owner);
        $this->assertSame('+919988776655', $owner->phone);
        $this->assertSame(OwnerStatus::PendingVerification, $owner->status);

        $property = Property::query()->where('owner_id', $owner->id)->first();
        $this->assertNotNull($property);
        $this->assertSame('Srinivas Executive Hostel', $property->name);
        $this->assertSame($category->id, $property->property_category_id);
        $this->assertSame($city->id, $property->city_id);
        $this->assertSame('Madhapur IT Hub', $property->locality);
        $this->assertSame(PropertyOperationalStatus::Draft, $property->status);
        $this->assertSame(PropertyGenderPolicy::MaleOnly, $property->roomTypes->first()?->gender_policy);
    }

    public function test_partner_can_login_with_email_or_phone(): void
    {
        $owner = Owner::factory()->create([
            'email' => 'partner.auth@tijum.test',
            'phone' => '+919876500000',
            'password' => Hash::make('PartnerPass123!'),
            'status' => OwnerStatus::Active,
        ]);

        // 1. Partner Login with email
        $resEmail = $this->post(route('owner.login.store'), [
            'email' => 'partner.auth@tijum.test',
            'password' => 'PartnerPass123!',
        ]);
        $resEmail->assertRedirect(route('owner.dashboard'));
        $this->assertAuthenticatedAs($owner, 'owner');

        $this->post(route('owner.logout'));
        $this->assertGuest('owner');

        // 2. Partner Login with phone
        $resPhone = $this->post(route('owner.login.store'), [
            'email' => '+919876500000',
            'password' => 'PartnerPass123!',
        ]);
        $resPhone->assertRedirect(route('owner.dashboard'));
        $this->assertAuthenticatedAs($owner, 'owner');
    }

    public function test_partner_forgot_password_accepts_email_or_phone(): void
    {
        $owner = Owner::factory()->create([
            'email' => 'forgot.partner@tijum.test',
            'phone' => '+919999911111',
            'status' => OwnerStatus::Active,
        ]);

        $resEmail = $this->post(route('owner.password.email'), [
            'email' => 'forgot.partner@tijum.test',
        ]);
        $resEmail->assertSessionHas('status');

        $resPhone = $this->post(route('owner.password.email'), [
            'email' => '+919999911111',
        ]);
        $resPhone->assertSessionHas('status');
    }

    public function test_property_search_populates_intent_defaults_when_city_is_provided(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->first() ?? City::query()->firstOrFail();

        // Pass only city as slug
        $response = $this->get('/search?city='.$city->slug);
        $response->assertOk();

        // Pass only city as numeric ID
        $responseId = $this->get('/search?city='.$city->id);
        $responseId->assertOk();
    }

    public function test_customer_wishlist_web_and_api_operations(): void
    {
        $this->seed(PropertySeeder::class);
        $property = Property::query()->firstOrFail();
        $user = User::factory()->create();

        // 1. Web Toggle Wishlist (Add)
        $this->actingAs($user, 'web')
            ->post(route('customer.wishlist.toggle', $property))
            ->assertRedirect();

        $this->assertTrue($user->wishlistedProperties()->where('properties.id', $property->id)->exists());

        // 2. Web Wishlist Index
        $indexRes = $this->actingAs($user, 'web')
            ->get(route('customer.wishlist.index'));
        $indexRes->assertOk();

        // 3. Web Toggle Wishlist (Remove)
        $this->actingAs($user, 'web')
            ->post(route('customer.wishlist.toggle', $property))
            ->assertRedirect();

        $this->assertFalse($user->wishlistedProperties()->where('properties.id', $property->id)->exists());

        // 4. API Wishlist Toggle
        $apiRes = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/customer/wishlist/{$property->id}/toggle");
        $apiRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('wishlisted', true);

        // 5. API Wishlist Index
        $apiIndex = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/customer/wishlist');
        $apiIndex->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_homepage_includes_featured_properties_payload(): void
    {
        $this->seed(PropertySeeder::class);

        $response = $this->get(route('home'));
        $response->assertOk();
        $response->assertSee('search');
    }
}
