<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyRoomTypeMode;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoomType;
use App\Models\User;
use Database\Seeders\CitySeeder;
use Database\Seeders\PropertyCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WishlistAndDiscoveryFeaturesTest extends TestCase
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

    public function test_guest_cannot_access_wishlist_and_is_redirected_to_login(): void
    {
        $response = $this->get(route('customer.wishlist.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_customer_can_view_wishlist_page(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('customer.wishlist.index'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/wishlist')
                ->has('properties.data')
            );
    }

    public function test_customer_can_add_and_remove_property_from_wishlist(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $property = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'name' => 'Gachibowli Tech Residency',
        ]);

        // 1. Add to wishlist
        $addResponse = $this->actingAs($user)
            ->post(route('customer.wishlist.store', $property));

        $addResponse->assertRedirect();
        $this->assertDatabaseHas('customer_wishlists', [
            'user_id' => $user->id,
            'property_id' => $property->id,
        ]);

        // 2. View in customer wishlist (both Inertia and JSON)
        $viewInertia = $this->actingAs($user)->get(route('customer.wishlist.index'));
        $viewInertia->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/wishlist')
                ->has('properties.data', 1)
                ->where('properties.data.0.id', $property->id)
                ->has('properties.data.0.cover_image_url')
                ->has('properties.data.0.gender_eligibility')
                ->has('properties.data.0.property_amenities')
            );

        $viewResponse = $this->actingAs($user)->getJson(route('customer.wishlist.index'));
        $viewResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $property->id);

        // 3. Remove from wishlist
        $deleteResponse = $this->actingAs($user)
            ->delete(route('customer.wishlist.destroy', $property));

        $deleteResponse->assertRedirect();
        $this->assertDatabaseMissing('customer_wishlists', [
            'user_id' => $user->id,
            'property_id' => $property->id,
        ]);
    }

    public function test_customer_can_toggle_property_in_wishlist(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $property = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
        ]);

        // Toggle on
        $toggleOn = $this->actingAs($user)
            ->postJson(route('customer.wishlist.toggle', $property));

        $toggleOn->assertOk()
            ->assertJson([
                'success' => true,
                'wishlisted' => true,
                'property_id' => $property->id,
            ]);

        $this->assertDatabaseHas('customer_wishlists', [
            'user_id' => $user->id,
            'property_id' => $property->id,
        ]);

        // Toggle off
        $toggleOff = $this->actingAs($user)
            ->postJson(route('customer.wishlist.toggle', $property));

        $toggleOff->assertOk()
            ->assertJson([
                'success' => true,
                'wishlisted' => false,
                'property_id' => $property->id,
            ]);

        $this->assertDatabaseMissing('customer_wishlists', [
            'user_id' => $user->id,
            'property_id' => $property->id,
        ]);
    }

    public function test_wishlist_index_includes_gender_eligibility_and_pricing_summary(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $property = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'name' => 'Sannidhi Luxury Women PG & Co-Living Hub',
        ]);
        $this->createRoomTypeWithGender($property, 'Women Twin Sharing', PropertyGenderPolicy::FemaleOnly);

        $this->actingAs($user)->post(route('customer.wishlist.store', $property))->assertRedirect();

        $this->actingAs($user)
            ->get(route('customer.wishlist.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/wishlist')
                ->where('properties.data.0.name', 'Sannidhi Luxury Women PG & Co-Living Hub')
                ->where('properties.data.0.gender_eligibility', 'Female Only')
                ->where('properties.data.0.starting_price', 50000)
                ->where('properties.data.0.monthly_price', 1000000)
            );
    }

    public function test_search_filters_by_gender_preference(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        // 1. Male-only property
        $maleProp = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'name' => 'Men Executive PG',
        ]);
        $this->createRoomTypeWithGender($maleProp, 'Male Sharing', PropertyGenderPolicy::MaleOnly);

        // 2. Female-only property
        $femaleProp = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'name' => 'Women Executive PG',
        ]);
        $this->createRoomTypeWithGender($femaleProp, 'Female Sharing', PropertyGenderPolicy::FemaleOnly);

        // 3. All-genders property
        $allProp = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'name' => 'Co-Living Mixed Hub',
        ]);
        $this->createRoomTypeWithGender($allProp, 'Mixed Studio', PropertyGenderPolicy::AllGenders);

        // Filter for male: shows male-only properties only
        $maleSearch = $this->getJson('/api/v1/public/properties?city=hyderabad&gender_preference=male');
        $maleSearch->assertOk();
        $maleIds = array_column($maleSearch->json('data'), 'id');
        $this->assertContains($maleProp->id, $maleIds);
        $this->assertNotContains($femaleProp->id, $maleIds);
        $this->assertNotContains($allProp->id, $maleIds);

        // Filter for female: shows female-only properties only
        $femaleSearch = $this->getJson('/api/v1/public/properties?city=hyderabad&gender_preference=female');
        $femaleSearch->assertOk();
        $femaleIds = array_column($femaleSearch->json('data'), 'id');
        $this->assertContains($femaleProp->id, $femaleIds);
        $this->assertNotContains($maleProp->id, $femaleIds);
        $this->assertNotContains($allProp->id, $femaleIds);

        // Filter for both: shows both / co-living properties only
        $bothSearch = $this->getJson('/api/v1/public/properties?city=hyderabad&gender_preference=both');
        $bothSearch->assertOk();
        $bothIds = array_column($bothSearch->json('data'), 'id');
        $this->assertContains($allProp->id, $bothIds);
        $this->assertNotContains($maleProp->id, $bothIds);
        $this->assertNotContains($femaleProp->id, $bothIds);

        // Filter for all: shows all properties (male, female, and both)
        $allSearch = $this->getJson('/api/v1/public/properties?city=hyderabad&gender_preference=all');
        $allSearch->assertOk();
        $allIds = array_column($allSearch->json('data'), 'id');
        $this->assertContains($maleProp->id, $allIds);
        $this->assertContains($femaleProp->id, $allIds);
        $this->assertContains($allProp->id, $allIds);
    }

    private function createRoomTypeWithGender(Property $property, string $name, PropertyGenderPolicy $genderPolicy): PropertyRoomType
    {
        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $property->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => $genderPolicy->value,
            'guest_composition_policy' => 'any',
            'daily_rate_minor' => 50000,
            'weekly_rate_minor' => 300000,
            'monthly_rate_minor' => 1000000,
            'is_active' => true,
            'is_approved_version' => true,
        ])->save();

        return $roomType;
    }
}
