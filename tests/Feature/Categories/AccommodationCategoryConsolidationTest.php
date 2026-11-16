<?php

declare(strict_types=1);

namespace Tests\Feature\Categories;

use App\Enums\AccommodationCategory;
use App\Enums\AdminRole;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Admin\AdminDashboardMetricsService;
use App\Services\PropertySearchEligibility;
use App\Services\Seo\SeoService;
use App\Services\Seo\SitemapService;
use Database\Seeders\CitySeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PropertyCategorySeeder;
use Database\Seeders\PropertySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Platform-Wide Accommodation Category Consolidation Test Suite.
 *
 * Validates the strict 3-category taxonomy across Groups A through H:
 * 1. Hostels/PG ('hostels-pg')
 * 2. Homestays ('homestays')
 * 3. Co-Living ('co-living')
 */
class AccommodationCategoryConsolidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CitySeeder::class);
        $this->seed(PropertyCategorySeeder::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Group A — Category Master Data
    |--------------------------------------------------------------------------
    */

    public function test_group_a_exactly_three_official_categories_exist(): void
    {
        $categories = PropertyCategory::query()->ordered()->get();

        $this->assertCount(3, $categories, 'The platform must contain exactly three accommodation categories.');
        $this->assertSame(3, PropertyCategory::query()->active()->count(), 'All three categories must be active.');

        $slugs = $categories->pluck('slug')->all();
        $expectedSlugs = ['hostels-pg', 'homestays', 'co-living'];

        $this->assertSame($expectedSlugs, $slugs, 'Canonical category slugs must be hostels-pg, homestays, and co-living.');
    }

    public function test_group_a_category_slugs_and_codes_are_unique(): void
    {
        $categories = PropertyCategory::all();

        $slugs = $categories->pluck('slug')->all();
        $codes = $categories->pluck('code')->all();

        $this->assertCount(3, array_unique($slugs), 'Category slugs must be unique.');
        $this->assertCount(3, array_unique($codes), 'Category codes must be unique.');
    }

    public function test_group_a_display_names_and_descriptions_match_official_taxonomy(): void
    {
        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $coliving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $this->assertSame('Hostels/PG', $hostelsPg->name);
        $this->assertSame('Homestays', $homestays->name);
        $this->assertSame('Co-Living', $coliving->name);

        $this->assertNotEmpty($hostelsPg->description);
        $this->assertNotEmpty($homestays->description);
        $this->assertNotEmpty($coliving->description);
    }

    public function test_group_a_categories_are_returned_in_intended_sort_order(): void
    {
        $categories = PropertyCategory::query()->ordered()->get();

        $this->assertSame('hostels-pg', $categories[0]->slug);
        $this->assertSame('homestays', $categories[1]->slug);
        $this->assertSame('co-living', $categories[2]->slug);
    }

    public function test_group_a_repeated_seeder_execution_is_strictly_idempotent(): void
    {
        $this->seed(PropertyCategorySeeder::class);
        $this->seed(PropertyCategorySeeder::class);

        $this->assertSame(3, PropertyCategory::query()->count(), 'Repeated seeder execution must not create duplicate categories.');
    }

    /*
    |--------------------------------------------------------------------------
    | Group B — Legacy Mapping & Integrity
    |--------------------------------------------------------------------------
    */

    public function test_group_b_hostel_and_pg_aliases_resolve_to_hostels_pg(): void
    {
        $aliases = [
            'hostel',
            'hostels',
            'pg',
            'independent-hostel',
            'pg-accommodation',
            'Paying Guest',
            'PG Accommodation',
            'Hostel/PG',
        ];

        foreach ($aliases as $alias) {
            $resolved = $this->resolveLegacyCategory($alias);
            $this->assertSame('hostels-pg', $resolved, "Alias '{$alias}' must resolve to 'hostels-pg'.");
        }
    }

    public function test_group_b_homestay_aliases_resolve_to_homestays(): void
    {
        $aliases = [
            'homestay',
            'homestays',
            'home-stay',
            'Home Stay',
        ];

        foreach ($aliases as $alias) {
            $resolved = $this->resolveLegacyCategory($alias);
            $this->assertSame('homestays', $resolved, "Alias '{$alias}' must resolve to 'homestays'.");
        }
    }

    public function test_group_b_coliving_aliases_resolve_to_coliving(): void
    {
        $aliases = [
            'co-living',
            'coliving',
            'co_living',
            'Co Living',
            'Co-Living',
            'shared-living',
        ];

        foreach ($aliases as $alias) {
            $resolved = $this->resolveLegacyCategory($alias);
            $this->assertSame('co-living', $resolved, "Alias '{$alias}' must resolve to 'co-living'.");
        }
    }

    public function test_group_b_ambiguous_categories_hotel_and_guest_house_are_not_automatically_mapped(): void
    {
        $ambiguousCategories = [
            'hotel',
            'hotels',
            'guest house',
            'guest-house',
            'guest_house',
            'lodge',
            'serviced-apartment',
        ];

        foreach ($ambiguousCategories as $ambiguous) {
            $resolved = $this->resolveLegacyCategory($ambiguous);
            $this->assertNull($resolved, "Ambiguous legacy category '{$ambiguous}' must NOT be mapped automatically without explicit admin evidence.");
        }
    }

    public function test_group_b_existing_property_and_reservation_data_remains_intact(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $property = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'property_category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Legacy Central Hostel',
            'slug' => 'legacy-central-hostel-'.Str::random(6),
            'property_reference' => 'TJP-2026-999001',
            'contact_person_name' => 'Kishore Kumar',
            'contact_phone' => '+919876543210',
            'address_line_1' => 'Street 4, Gachibowli',
            'locality' => 'Gachibowli',
            'postal_code' => '500032',
        ]);

        $roomType = $this->createRoomType($property, 'Standard 2-Sharing Non-AC', PropertyRoomTypeMode::Shared);

        $customer = User::factory()->create();

        $reservation = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Hostels/PG',
            'snapshot_room_type_name' => $roomType->name,
        ]);

        $this->assertNotNull($property->fresh()->category);
        $this->assertSame('hostels-pg', $property->fresh()->category->slug);
        $this->assertSame('Hostels/PG', $reservation->fresh()->snapshot_category_name);
        $this->assertSame(ReservationStatus::Confirmed, $reservation->fresh()->status);
    }

    /*
    |--------------------------------------------------------------------------
    | Group C — Owner Portal
    |--------------------------------------------------------------------------
    */

    public function test_group_c_owner_create_screen_provides_exactly_three_canonical_categories(): void
    {
        $owner = Owner::factory()->active()->create();

        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/properties/create')
                ->has('categories', 3)
                ->where('categories.0.slug', 'hostels-pg')
                ->where('categories.1.slug', 'homestays')
                ->where('categories.2.slug', 'co-living')
            );
    }

    public function test_group_c_owner_can_create_hostels_pg_property(): void
    {
        $owner = Owner::factory()->active()->create();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $payload = $this->getBasePropertyPayload($category->id, $city->id, 'Madhapur Executive Hostel & PG');

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), $payload);

        $property = Property::query()->where('owner_id', $owner->id)->where('name', 'Madhapur Executive Hostel & PG')->first();
        $this->assertNotNull($property);
        $this->assertSame($category->id, $property->property_category_id);
        $response->assertRedirect(route('owner.properties.room-types.index', $property));
    }

    public function test_group_c_owner_can_create_homestay_property(): void
    {
        $owner = Owner::factory()->active()->create();
        $category = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $city = City::query()->where('slug', 'vijayawada')->firstOrFail();

        $payload = $this->getBasePropertyPayload($category->id, $city->id, 'Krishna Riverview Homestay');

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), $payload);

        $property = Property::query()->where('owner_id', $owner->id)->where('name', 'Krishna Riverview Homestay')->first();
        $this->assertNotNull($property);
        $this->assertSame($category->id, $property->property_category_id);
        $response->assertRedirect(route('owner.properties.room-types.index', $property));
    }

    public function test_group_c_owner_can_create_coliving_property(): void
    {
        $owner = Owner::factory()->active()->create();
        $category = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();
        $city = City::query()->where('slug', 'visakhapatnam')->firstOrFail();

        $payload = $this->getBasePropertyPayload($category->id, $city->id, 'Bayview Community Co-Living');

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), $payload);

        $property = Property::query()->where('owner_id', $owner->id)->where('name', 'Bayview Community Co-Living')->first();
        $this->assertNotNull($property);
        $this->assertSame($category->id, $property->property_category_id);
        $response->assertRedirect(route('owner.properties.room-types.index', $property));
    }

    public function test_group_c_owner_cannot_create_property_with_invalid_or_inactive_category(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $inactiveCat = PropertyCategory::factory()->create(['is_active' => false]);

        $payload = $this->getBasePropertyPayload($inactiveCat->id, $city->id, 'Invalid Category Stay');

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), $payload)
            ->assertSessionHasErrors('property_category_id');

        $payloadInvalid = $this->getBasePropertyPayload(999999, $city->id, 'Nonexistent Category Stay');

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), $payloadInvalid)
            ->assertSessionHasErrors('property_category_id');
    }

    public function test_group_c_unauthorized_owner_cannot_change_another_owners_property_category(): void
    {
        $ownerA = Owner::factory()->active()->create();
        $ownerB = Owner::factory()->active()->create();
        $category = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $property = Property::factory()->create([
            'owner_id' => $ownerA->id,
            'property_category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Owner A Private Property',
            'slug' => 'owner-a-private-property-'.Str::random(6),
            'property_reference' => 'TJP-2026-999002',
            'contact_person_name' => 'Owner A',
            'contact_phone' => '+919988776655',
            'address_line_1' => 'Road 1, Banjara Hills',
            'locality' => 'Banjara Hills',
            'postal_code' => '500034',
            'status' => PropertyOperationalStatus::Draft,
        ]);

        $colivingCat = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $this->actingAs($ownerB, 'owner')
            ->put(route('owner.properties.update', $property), [
                ...$this->getBasePropertyPayload($colivingCat->id, $city->id, 'Tampered Name'),
            ])
            ->assertForbidden();

        $this->assertSame($category->id, $property->fresh()->property_category_id);
    }

    /*
    |--------------------------------------------------------------------------
    | Group D — Admin Console
    |--------------------------------------------------------------------------
    */

    public function test_group_d_admin_sees_three_canonical_categories(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.properties.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/properties/index')
                ->has('categories', 3)
            );
    }

    public function test_group_d_admin_category_filtering_returns_correct_properties(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();

        $propHostel = Property::factory()->create([
            'owner_id' => $owner->id,
            'property_category_id' => $catHostelsPg->id,
            'city_id' => $city->id,
            'name' => 'Admin Filter Test Hostel',
            'slug' => 'admin-filter-test-hostel-'.Str::random(6),
            'property_reference' => 'TJP-2026-999010',
            'contact_person_name' => 'Manager',
            'contact_phone' => '+919876543211',
            'address_line_1' => 'Addr',
            'locality' => 'Locality',
            'postal_code' => '500001',
            'status' => PropertyOperationalStatus::Draft,
        ]);

        $propHomestay = Property::factory()->create([
            'owner_id' => $owner->id,
            'property_category_id' => $catHomestays->id,
            'city_id' => $city->id,
            'name' => 'Admin Filter Test Homestay',
            'slug' => 'admin-filter-test-homestay-'.Str::random(6),
            'property_reference' => 'TJP-2026-999011',
            'contact_person_name' => 'Host',
            'contact_phone' => '+919876543212',
            'address_line_1' => 'Addr',
            'locality' => 'Locality',
            'postal_code' => '500001',
            'status' => PropertyOperationalStatus::Draft,
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.properties.index', ['category' => $catHostelsPg->id]))
            ->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('admin/properties/index')
            ->where('filters.category', (string) $catHostelsPg->id)
        );
    }

    public function test_group_d_admin_property_totals_by_category_are_accurate(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $this->createSimpleProperty($owner, $city, $catHostelsPg, 'Hostel 1');
        $this->createSimpleProperty($owner, $city, $catHostelsPg, 'Hostel 2');
        $this->createSimpleProperty($owner, $city, $catHomestays, 'Homestay 1');
        $this->createSimpleProperty($owner, $city, $catColiving, 'Coliving 1');

        $this->assertSame(2, Property::query()->where('property_category_id', $catHostelsPg->id)->count());
        $this->assertSame(1, Property::query()->where('property_category_id', $catHomestays->id)->count());
        $this->assertSame(1, Property::query()->where('property_category_id', $catColiving->id)->count());
    }

    /*
    |--------------------------------------------------------------------------
    | Group E — Customer Website & Search
    |--------------------------------------------------------------------------
    */

    public function test_group_e_homepage_provides_exactly_three_categories_to_search(): void
    {
        $response = $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->has('search.categories', 3)
                ->where('search.categories.0.slug', 'hostels-pg')
                ->where('search.categories.1.slug', 'homestays')
                ->where('search.categories.2.slug', 'co-living')
            );
    }

    public function test_group_e_public_search_filters_by_canonical_category(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $prop = $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'Searchable Hostel PG');

        $response = $this->get(route('public.search', [
            'city' => $city->id,
            'check_in' => now('Asia/Kolkata')->addDays(1)->toDateString(),
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
            'category' => [$catHostelsPg->id],
        ]))->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('public/search/index')
            ->has('categories', 3)
        );
    }

    public function test_group_e_hostels_and_pg_records_appear_under_combined_category(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $hostel = $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'Student Independent Hostel');
        $pg = $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'Working Professional PG');

        $results = Property::query()
            ->where('property_category_id', $catHostelsPg->id)
            ->where('booking_eligible', true)
            ->pluck('name')
            ->all();

        $this->assertContains('Student Independent Hostel', $results);
        $this->assertContains('Working Professional PG', $results);
    }

    public function test_group_e_homestays_remain_separate_from_hostels_pg(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();

        $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'Central Hostel PG');
        $homestay = $this->createApprovedBookableProperty($owner, $city, $catHomestays, 'Serene Homestay');

        $hostelsPgProperties = Property::query()
            ->where('property_category_id', $catHostelsPg->id)
            ->pluck('id')
            ->all();

        $this->assertNotContains($homestay->id, $hostelsPgProperties);
    }

    public function test_group_e_coliving_can_be_searched_and_filtered(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $colivingProp = $this->createApprovedBookableProperty($owner, $city, $catColiving, 'Innovate Co-Living Hub');

        $eligibility = app(PropertySearchEligibility::class);
        $query = $eligibility->eligiblePropertiesQuery([
            'city' => $city->id,
            'category' => [$catColiving->id],
        ]);

        $this->assertTrue($query->where('id', $colivingProp->id)->exists());
    }

    /*
    |--------------------------------------------------------------------------
    | Group F — Property Records & Booking Life-Cycle
    |--------------------------------------------------------------------------
    */

    public function test_group_f_property_detail_displays_canonical_category(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $prop = $this->createApprovedBookableProperty($owner, $city, $catColiving, 'Techies Co-Living Suites');

        $this->get(route('public.properties.show', $prop))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/properties/show')
                ->where('property.category.slug', 'co-living')
                ->where('property.category.name', 'Co-Living')
            );
    }

    public function test_group_f_room_types_and_physical_rooms_hierarchy_remains_unchanged(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $property = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'property_category_id' => $catColiving->id,
            'city_id' => $city->id,
            'name' => 'Urban Tribe Co-Living',
            'slug' => 'urban-tribe-co-living-'.Str::random(6),
        ]);

        $roomType = $this->createRoomType($property, 'Studio Private Room', PropertyRoomTypeMode::Private);

        $physicalRoom1 = new PropertyRoom;
        $physicalRoom1->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'room_number' => '101',
            'floor_number' => '1',
            'operational_status' => PropertyRoomStatus::Active->value,
            'is_approved_version' => true,
        ])->save();

        $physicalRoom2 = new PropertyRoom;
        $physicalRoom2->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'room_number' => '102',
            'floor_number' => '1',
            'operational_status' => PropertyRoomStatus::Active->value,
            'is_approved_version' => true,
        ])->save();

        $this->assertCount(1, $property->roomTypes);
        $this->assertCount(2, $roomType->rooms);
        $this->assertSame('101', $physicalRoom1->room_number);
        $this->assertSame('102', $physicalRoom2->room_number);
    }

    public function test_group_f_meal_inclusions_remain_property_specific_not_category_bound(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        // Hostels/PG can have or omit food
        $hostelWithFood = $this->createSimpleProperty($owner, $city, $catHostelsPg, 'Hostel With Food', foodProvided: true);
        $hostelWithoutFood = $this->createSimpleProperty($owner, $city, $catHostelsPg, 'Hostel Room Only', foodProvided: false);

        // Homestay can have or omit food
        $homestayWithFood = $this->createSimpleProperty($owner, $city, $catHomestays, 'Homestay With Meals', foodProvided: true);
        $homestayWithoutFood = $this->createSimpleProperty($owner, $city, $catHomestays, 'Homestay Room Only', foodProvided: false);

        // Co-Living can have or omit food
        $colivingWithFood = $this->createSimpleProperty($owner, $city, $catColiving, 'Coliving Chef Meal', foodProvided: true);
        $colivingWithoutFood = $this->createSimpleProperty($owner, $city, $catColiving, 'Coliving Self Cook', foodProvided: false);

        $this->assertTrue($hostelWithFood->food_provided);
        $this->assertFalse($hostelWithoutFood->food_provided);
        $this->assertTrue($homestayWithFood->food_provided);
        $this->assertFalse($homestayWithoutFood->food_provided);
        $this->assertTrue($colivingWithFood->food_provided);
        $this->assertFalse($colivingWithoutFood->food_provided);
    }

    /*
    |--------------------------------------------------------------------------
    | Group G — Mobile and API V1 Contract
    |--------------------------------------------------------------------------
    */

    public function test_group_g_api_v1_properties_index_returns_canonical_categories(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'API V1 Hostel Test');

        $response = $this->getJson(route('api.v1.public.properties.index'))
            ->assertOk();

        $data = $response->json('data');
        $this->assertNotEmpty($data);

        foreach ($data as $item) {
            $this->assertArrayHasKey('category', $item);
            if ($item['category'] !== null) {
                $this->assertContains($item['category']['slug'], ['hostels-pg', 'homestays', 'co-living']);
            }
        }
    }

    public function test_group_g_api_v1_properties_show_returns_canonical_category(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $prop = $this->createApprovedBookableProperty($owner, $city, $catColiving, 'API V1 Co-Living Show');

        $response = $this->getJson(route('api.v1.public.properties.show', $prop->slug))
            ->assertOk();

        $this->assertSame('co-living', $response->json('data.category.slug'));
        $this->assertSame('Co-Living', $response->json('data.category.name'));
    }

    public function test_group_g_api_v1_owner_properties_reflects_canonical_categories(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();

        $this->createSimpleProperty($owner, $city, $catHomestays, 'Owner API Homestay');

        $token = $owner->createToken('test-mobile-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson(route('api.v1.owner.properties.index'))
            ->assertOk();

        $this->assertSame('homestays', $response->json('data.0.category.slug'));
        $this->assertSame('Homestays', $response->json('data.0.category.name'));
    }

    /*
    |--------------------------------------------------------------------------
    | Group H — Content, SEO & Analytics
    |--------------------------------------------------------------------------
    */

    public function test_group_h_seo_service_generates_lodging_schema_with_property_details(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $prop = $this->createApprovedBookableProperty($owner, $city, $catColiving, 'SEO CoLiving Property');

        $seoService = app(SeoService::class);
        $schema = $seoService->propertySchema($prop, 'Property description', 'https://tijum.com/properties/test', 'https://tijum.com/image.jpg');

        $this->assertSame('LodgingBusiness', $schema['@type']);
        $this->assertSame('SEO CoLiving Property', $schema['name']);
        $this->assertSame('Hyderabad', $schema['address']['addressRegion']);
    }

    public function test_group_h_sitemap_service_includes_properties_across_all_canonical_categories(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'Sitemap Hostel');
        $this->createApprovedBookableProperty($owner, $city, $catHomestays, 'Sitemap Homestay');
        $this->createApprovedBookableProperty($owner, $city, $catColiving, 'Sitemap Coliving');

        $sitemapService = app(SitemapService::class);
        $sitemapService->clearCache();
        $xml = $sitemapService->generateXml();

        $this->assertStringContainsString('sitemap-hostel', $xml);
        $this->assertStringContainsString('sitemap-homestay', $xml);
        $this->assertStringContainsString('sitemap-coliving', $xml);
    }

    public function test_group_h_analytics_metrics_service_groups_by_category_without_duplication(): void
    {
        $owner = Owner::factory()->active()->create();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $catHostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $catHomestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $catColiving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'KPI Hostel 1');
        $this->createApprovedBookableProperty($owner, $city, $catHostelsPg, 'KPI Hostel 2');
        $this->createApprovedBookableProperty($owner, $city, $catHomestays, 'KPI Homestay 1');
        $this->createApprovedBookableProperty($owner, $city, $catColiving, 'KPI Coliving 1');

        $metricsService = app(AdminDashboardMetricsService::class);
        $summary = $metricsService->inventoryDistributionSummary();

        $categoryData = $summary['categories'] ?? [];
        $slugsInReport = array_column($categoryData, 'slug');

        $this->assertSame(count($slugsInReport), count(array_unique($slugsInReport)), 'No duplicate category groupings in metrics reporting.');
    }

    /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

    /**
     * Legacy category resolution simulator based on canonical mapping rules.
     */
    private function resolveLegacyCategory(string $input): ?string
    {
        $cleaned = strtolower(trim($input));

        $directCanonical = [
            'hostels-pg' => 'hostels-pg',
            'homestays' => 'homestays',
            'co-living' => 'co-living',
        ];

        if (isset($directCanonical[$cleaned])) {
            return $directCanonical[$cleaned];
        }

        $aliasMap = [
            'hostel' => 'hostels-pg',
            'hostels' => 'hostels-pg',
            'pg' => 'hostels-pg',
            'independent-hostel' => 'hostels-pg',
            'pg-accommodation' => 'hostels-pg',
            'paying guest' => 'hostels-pg',
            'pg accommodation' => 'hostels-pg',
            'hostel/pg' => 'hostels-pg',
            'homestay' => 'homestays',
            'home-stay' => 'homestays',
            'home stay' => 'homestays',
            'coliving' => 'co-living',
            'co_living' => 'co-living',
            'co living' => 'co-living',
            'shared-living' => 'co-living',
        ];

        return $aliasMap[$cleaned] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    private function getBasePropertyPayload(int $categoryId, int $cityId, string $name): array
    {
        return [
            'property_category_id' => $categoryId,
            'city_id' => $cityId,
            'name' => $name,
            'description' => 'Safe and comfortable verified accommodation with food information and transparent house policies.',
            'contact_person_name' => 'Suresh Reddy',
            'contact_phone' => '+919876501234',
            'contact_email' => 'contact@tijumstay.test',
            'address_line_1' => 'Plot 45, Main Avenue',
            'locality' => 'Hitec City',
            'postal_code' => '500081',
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => true,
            'dinner_included' => true,
        ];
    }

    private function createSimpleProperty(
        Owner $owner,
        City $city,
        PropertyCategory $category,
        string $name,
        bool $foodProvided = true,
    ): Property {
        return Property::factory()->create([
            'owner_id' => $owner->id,
            'property_category_id' => $category->id,
            'city_id' => $city->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'status' => PropertyOperationalStatus::Active,
            'food_provided' => $foodProvided,
            'breakfast_included' => $foodProvided,
            'lunch_included' => $foodProvided,
            'dinner_included' => $foodProvided,
        ]);
    }

    private function createApprovedBookableProperty(
        Owner $owner,
        City $city,
        PropertyCategory $category,
        string $name,
    ): Property {
        $property = Property::factory()->activeApproved()->create([
            'owner_id' => $owner->id,
            'property_category_id' => $category->id,
            'city_id' => $city->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => true,
            'dinner_included' => true,
        ]);

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-'.Str::upper(Str::random(8)),
            'status' => PropertyVerificationStatus::Approved->value,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
            'submitted_at' => now(),
            'reviewed_at' => now(),
            'approved_snapshot' => ['property' => $property->toApprovedPropertyFieldsSnapshot()],
        ])->save();

        $property->forceFill([
            'latest_approved_application_id' => $app->id,
            'approved_snapshot' => ['property' => $property->toApprovedPropertyFieldsSnapshot()],
        ])->save();

        $roomType = $this->createRoomType($property, 'Standard Room Type', PropertyRoomTypeMode::Shared);

        $room = new PropertyRoom;
        $room->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'room_number' => '101',
            'floor_number' => '1',
            'operational_status' => PropertyRoomStatus::Active->value,
            'is_approved_version' => true,
        ])->save();

        return $property->fresh();
    }

    private function createRoomType(
        Property $property,
        string $name = 'Standard Room Type',
        PropertyRoomTypeMode $mode = PropertyRoomTypeMode::Shared,
    ): PropertyRoomType {
        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $property->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'accommodation_mode' => $mode->value,
            'max_guests_per_room' => 2,
            'sharing_capacity' => 2,
            'gender_policy' => PropertyGenderPolicy::AllGenders->value,
            'guest_composition_policy' => [],
            'is_air_conditioned' => true,
            'is_active' => true,
            'is_approved_version' => true,
            'daily_rate_minor' => 50000,
            'weekly_rate_minor' => 300000,
            'monthly_rate_minor' => 900000,
        ])->save();

        return $roomType;
    }

    /*
    |--------------------------------------------------------------------------
    | Group I — Final Category Consolidation Corrections & Safety Invariants
    |--------------------------------------------------------------------------
    */

    public function test_group_i_brand_palette_enforces_no_unapproved_category_colors(): void
    {
        // Unapproved category emerald token (#065F46) must not be present on accommodation categories
        $options = AccommodationCategory::options();

        foreach ($options as $opt) {
            $this->assertArrayNotHasKey('accent_color', $opt);
            $this->assertStringNotContainsString('065F46', json_encode($opt));
        }

        // Verify web and mobile configuration files do not assign #065F46 to Homestays category
        $webSearchPath = resource_path('js/types/public-search.ts');
        if (file_exists($webSearchPath)) {
            $webContent = file_get_contents($webSearchPath);
            $this->assertStringNotContainsString("accentColor: '#065F46'", $webContent);
        }

        $mobileCategoriesPath = base_path('apps/mobile/src/constants/categories.ts');
        if (file_exists($mobileCategoriesPath)) {
            $mobileContent = file_get_contents($mobileCategoriesPath);
            $this->assertStringNotContainsString("accentColor: '#065F46'", $mobileContent);
            $this->assertStringNotContainsString("badgeVariant: 'emerald'", $mobileContent);
        }
    }

    public function test_group_i_category_descriptions_are_neutral_without_guaranteed_meal_or_amenity_promises(): void
    {
        $categories = PropertyCategory::all();

        $forbiddenPhrases = [
            'home-cooked regional food',
            'home-cooked meals included',
            'structured student dining',
            'curated shared spaces',
            'all meals included',
            'guaranteed dining',
        ];

        foreach ($categories as $category) {
            $descriptionLower = strtolower($category->description);
            foreach ($forbiddenPhrases as $forbidden) {
                $this->assertStringNotContainsString(
                    $forbidden,
                    $descriptionLower,
                    "Category [{$category->slug}] contains unsupported promise: [{$forbidden}]."
                );
            }
        }

        // Verify exact approved neutral descriptions
        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $coliving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        $this->assertSame(
            'Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property.',
            $hostelsPg->description
        );
        $this->assertSame(
            'Explore accommodation in residential homes, with property details, room options and available services shown for each property.',
            $homestays->description
        );
        $this->assertSame(
            'Explore shared-living accommodation with room options, property details and available amenities shown for each space.',
            $coliving->description
        );
    }

    public function test_group_i_food_flags_and_amenities_are_property_specific_not_inferred_from_category(): void
    {
        $owner = Owner::factory()->create();
        $city = City::query()->firstOrFail();

        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $coliving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        // 1. Hostels/PG property with NO food provided
        $noFoodHostel = $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Hostel Room Only');
        $noFoodHostel->update([
            'food_provided' => false,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $noFoodHostel->refresh();
        $this->assertFalse($noFoodHostel->food_provided);
        $this->assertFalse($noFoodHostel->breakfast_included);

        // 2. Homestay with only breakfast included
        $breakfastHomestay = $this->createApprovedBookableProperty($owner, $city, $homestays, 'Homestay B&B');
        $breakfastHomestay->update([
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $breakfastHomestay->refresh();
        $this->assertTrue($breakfastHomestay->food_provided);
        $this->assertTrue($breakfastHomestay->breakfast_included);
        $this->assertFalse($breakfastHomestay->lunch_included);
        $this->assertFalse($breakfastHomestay->dinner_included);

        // 3. Co-Living with all 3 meals included
        $fullMealColiving = $this->createApprovedBookableProperty($owner, $city, $coliving, 'Community Co-Living Full Board');
        $fullMealColiving->update([
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => true,
            'dinner_included' => true,
        ]);
        $fullMealColiving->refresh();
        $this->assertTrue($fullMealColiving->food_provided);
        $this->assertTrue($fullMealColiving->breakfast_included);
        $this->assertTrue($fullMealColiving->lunch_included);
        $this->assertTrue($fullMealColiving->dinner_included);
    }

    public function test_group_i_hotels_lodges_and_guest_houses_are_not_blindly_mapped(): void
    {
        // Unapproved/ambiguous legacy names return null and must not be coerced to canonical categories
        $this->assertNull(AccommodationCategory::tryFromLegacy('hotel'));
        $this->assertNull(AccommodationCategory::tryFromLegacy('commercial-hotel'));
        $this->assertNull(AccommodationCategory::tryFromLegacy('lodge'));
        $this->assertNull(AccommodationCategory::tryFromLegacy('guest-house'));
        $this->assertNull(AccommodationCategory::tryFromLegacy('guesthouse'));
        $this->assertNull(AccommodationCategory::tryFromLegacy('resort'));
        $this->assertNull(AccommodationCategory::tryFromLegacy('motel'));

        // Legitimate legacy variants map to their true business model
        $this->assertSame(
            AccommodationCategory::HostelsPg,
            AccommodationCategory::tryFromLegacy('independent-hostel')
        );
        $this->assertSame(
            AccommodationCategory::HostelsPg,
            AccommodationCategory::tryFromLegacy('pg-accommodation')
        );
        $this->assertSame(
            AccommodationCategory::Homestays,
            AccommodationCategory::tryFromLegacy('home-stay')
        );
        $this->assertSame(
            AccommodationCategory::CoLiving,
            AccommodationCategory::tryFromLegacy('shared-living')
        );
    }

    public function test_group_i_production_environment_prevents_fictional_property_seeding(): void
    {
        // Ensure that running PropertySeeder in a simulated production environment
        // safely exits and creates zero properties.
        $initialPropertyCount = Property::query()->count();

        // Simulate production
        app()->detectEnvironment(fn () => 'production');
        $this->assertTrue(app()->isProduction());

        $seeder = new PropertySeeder;
        $seeder->run();

        // Verify count has not changed
        $this->assertSame(
            $initialPropertyCount,
            Property::query()->count(),
            'PropertySeeder must never insert demo or fictional fixtures when running in production.'
        );

        // Reset environment
        app()->detectEnvironment(fn () => 'testing');
        $this->assertFalse(app()->isProduction());
    }

    public function test_group_i_api_v1_categories_endpoint_and_filtering_reconciliation(): void
    {
        // 1. GET /api/v1/public/categories returns exactly 3 canonical categories
        $response = $this->getJson('/api/v1/public/categories');
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'data');

        $data = $response->json('data');
        $slugs = array_column($data, 'slug');
        $this->assertSame(['hostels-pg', 'homestays', 'co-living'], $slugs);

        // 2. GET /api/v1/public/config includes categories
        $configResponse = $this->getJson('/api/v1/public/config');
        $configResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['categories']]);

        // 3. GET /api/v1/public/properties filter by canonical slug
        $owner = Owner::factory()->create();
        $city = City::query()->firstOrFail();
        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();

        $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Balaji Executive Hostel');
        $this->createApprovedBookableProperty($owner, $city, $homestays, 'Godavari Riverside Homestay');

        $filterResponse = $this->getJson('/api/v1/public/properties?category=hostels-pg');
        $filterResponse->assertOk();
        $filteredItems = $filterResponse->json('data');

        foreach ($filteredItems as $item) {
            $catSlug = $item['category']['slug'] ?? $item['category_slug'] ?? null;
            if ($catSlug) {
                $this->assertSame('hostels-pg', $catSlug);
            }
        }
    }

    public function test_group_i_food_and_category_matrix_and_independence_invariants(): void
    {
        $owner = Owner::factory()->create();
        $city = City::query()->firstOrFail();

        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $coliving = PropertyCategory::query()->where('slug', 'co-living')->firstOrFail();

        // 1. Hostels/PG: Food=Yes, Breakfast=Yes, Lunch=No, Dinner=Yes
        $h1 = $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Hostel Breakfast Dinner');
        $h1->update([
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => false,
            'dinner_included' => true,
        ]);
        $h1->refresh();

        // 2. Hostels/PG: Food=No, Breakfast=No, Lunch=No, Dinner=No
        $h2 = $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Hostel Room Only No Food');
        $h2->update([
            'food_provided' => false,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $h2->refresh();

        // 3. Homestays: Food=Yes, Breakfast=No, Lunch=Yes, Dinner=No
        $hm1 = $this->createApprovedBookableProperty($owner, $city, $homestays, 'Homestay Lunch Only');
        $hm1->update([
            'food_provided' => true,
            'breakfast_included' => false,
            'lunch_included' => true,
            'dinner_included' => false,
        ]);
        $hm1->refresh();

        // 4. Homestays: Food=No, Breakfast=No, Lunch=No, Dinner=No
        $hm2 = $this->createApprovedBookableProperty($owner, $city, $homestays, 'Homestay Room Only');
        $hm2->update([
            'food_provided' => false,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $hm2->refresh();

        // 5. Co-Living: Food=Yes, Breakfast=Yes, Lunch=Yes, Dinner=No
        $c1 = $this->createApprovedBookableProperty($owner, $city, $coliving, 'CoLiving Breakfast Lunch');
        $c1->update([
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => true,
            'dinner_included' => false,
        ]);
        $c1->refresh();

        // 6. Co-Living: Food=No, Breakfast=No, Lunch=No, Dinner=No
        $c2 = $this->createApprovedBookableProperty($owner, $city, $coliving, 'CoLiving Room Only');
        $c2->update([
            'food_provided' => false,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $c2->refresh();

        // 7. Hostels/PG: Food=Yes, Breakfast=No, Lunch=No, Dinner=No (Food available on premise, no meals bundled in rate)
        $h3 = $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Hostel Food Available No Meals Bundled');
        $h3->update([
            'food_provided' => true,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $h3->refresh();

        // 8. Homestays: Food=Yes, Breakfast=No, Lunch=No, Dinner=No (Host kitchen available, no pre-included meals)
        $hm3 = $this->createApprovedBookableProperty($owner, $city, $homestays, 'Homestay Kitchen Available No Meals');
        $hm3->update([
            'food_provided' => true,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $hm3->refresh();

        // 9. Co-Living: Food=Yes, Breakfast=No, Lunch=No, Dinner=No (Community mess/kitchen, pay-as-you-eat)
        $c3 = $this->createApprovedBookableProperty($owner, $city, $coliving, 'CoLiving Self Cook Pay Per Meal');
        $c3->update([
            'food_provided' => true,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
        ]);
        $c3->refresh();

        // Principle 1 & 2: Full 9-case matrix covers all canonical categories with and without food, and with food but no meals included
        $this->assertTrue($h1->food_provided && $h1->breakfast_included && ! $h1->lunch_included && $h1->dinner_included);
        $this->assertFalse($h2->food_provided || $h2->breakfast_included || $h2->lunch_included || $h2->dinner_included);
        $this->assertTrue($h3->food_provided && ! $h3->breakfast_included && ! $h3->lunch_included && ! $h3->dinner_included);

        $this->assertTrue($hm1->food_provided && ! $hm1->breakfast_included && $hm1->lunch_included && ! $hm1->dinner_included);
        $this->assertFalse($hm2->food_provided || $hm2->breakfast_included || $hm2->lunch_included || $hm2->dinner_included);
        $this->assertTrue($hm3->food_provided && ! $hm3->breakfast_included && ! $hm3->lunch_included && ! $hm3->dinner_included);

        $this->assertTrue($c1->food_provided && $c1->breakfast_included && $c1->lunch_included && ! $c1->dinner_included);
        $this->assertFalse($c2->food_provided || $c2->breakfast_included || $c2->lunch_included || $c2->dinner_included);
        $this->assertTrue($c3->food_provided && ! $c3->breakfast_included && ! $c3->lunch_included && ! $c3->dinner_included);

        // Principle 3: Meals are not automatically enabled together
        $this->assertTrue($h1->breakfast_included !== $h1->lunch_included);
        $this->assertTrue($hm1->breakfast_included !== $hm1->lunch_included);
        $this->assertTrue($c1->lunch_included !== $c1->dinner_included);

        // Principle 4: Changing a food flag does not alter category
        $originalCategory = $h2->property_category_id;
        $h2->update(['food_provided' => true, 'dinner_included' => true]);
        $h2->refresh();
        $this->assertSame($originalCategory, $h2->property_category_id);
        $this->assertSame('hostels-pg', $h2->category->slug);

        // Principle 5: Changing category does not alter food flags
        $this->assertFalse($hm2->food_provided);
        $hm2->update(['property_category_id' => $coliving->id]);
        $hm2->refresh();
        $this->assertSame($coliving->id, $hm2->property_category_id);
        $this->assertFalse($hm2->food_provided);
        $this->assertFalse($hm2->breakfast_included);

        // Principle 6: Public category filtering returns properties regardless of food configuration
        $hostelFilter = $this->getJson('/api/v1/public/properties?category=hostels-pg');
        $hostelFilter->assertOk();
        $hostelSlugs = array_column($hostelFilter->json('data'), 'slug');
        $this->assertContains($h1->slug, $hostelSlugs);
        $this->assertContains($h2->slug, $hostelSlugs);
        $this->assertContains($h3->slug, $hostelSlugs);

        // Principle 7: Customer-facing food information reflects the property's actual configured values
        $propertyDetail = $this->getJson("/api/v1/public/properties/{$hm1->slug}");
        $propertyDetail->assertOk()
            ->assertJsonPath('data.food_provided', true)
            ->assertJsonPath('data.breakfast_included', false)
            ->assertJsonPath('data.lunch_included', true)
            ->assertJsonPath('data.dinner_included', false);

        // Verification of Food Available (No Meals Bundled in Rate) UI Disclosure
        $noMealsBundledDetail = $this->getJson("/api/v1/public/properties/{$h3->slug}");
        $noMealsBundledDetail->assertOk()
            ->assertJsonPath('data.food_provided', true)
            ->assertJsonPath('data.breakfast_included', false)
            ->assertJsonPath('data.lunch_included', false)
            ->assertJsonPath('data.dinner_included', false)
            ->assertJsonPath('data.included_meals', []);
    }

    public function test_group_i_historical_reservation_snapshot_preservation(): void
    {
        $owner = Owner::factory()->create();
        $city = City::query()->firstOrFail();
        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $property = $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Historical Heritage Residency');
        $roomType = $this->createRoomType($property, 'Deluxe Room', PropertyRoomTypeMode::Private);
        $customer = User::factory()->create();

        // Simulate a legacy reservation created with historical snapshot name
        $legacySnapshotName = 'Independent Hostel';
        $reservation = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => $legacySnapshotName,
            'snapshot_room_type_name' => $roomType->name,
        ]);

        // Property category undergoes updates or reclassification
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $property->update(['property_category_id' => $homestays->id]);
        $property->refresh();

        // Historical reservation snapshot MUST remain untouched as immutable legal contract
        $reservation->refresh();
        $this->assertSame(
            $legacySnapshotName,
            $reservation->snapshot_category_name,
            'Historical reservation snapshot_category_name must never be retroactively altered when a property is reclassified.'
        );
    }

    public function test_group_i_comprehensive_seeder_safety_and_environment_boundaries(): void
    {
        // 1. Independent canonical category seeding is always usable and idempotent
        $categorySeeder = new PropertyCategorySeeder;
        $categorySeeder->run();
        $this->assertSame(3, PropertyCategory::query()->where('is_active', true)->count());

        // 2. DatabaseSeeder in production: calls master seeders but skips PropertySeeder
        $countBefore = Property::query()->count();
        app()->detectEnvironment(fn () => 'production');
        $this->assertTrue(app()->isProduction());

        $dbSeeder = new DatabaseSeeder;
        $dbSeeder->run();

        $this->assertSame(
            $countBefore,
            Property::query()->count(),
            'DatabaseSeeder must not invoke sample property seeders in production.'
        );

        // 3. Direct PropertySeeder in production: fails closed and creates zero properties
        $propSeeder = new PropertySeeder;
        $propSeeder->run();

        $this->assertSame(
            $countBefore,
            Property::query()->count(),
            'PropertySeeder must fail closed in production.'
        );

        // Reset environment
        app()->detectEnvironment(fn () => 'testing');
        $this->assertFalse(app()->isProduction());
    }

    public function test_group_i_historical_reservation_snapshots_are_strictly_preserved(): void
    {
        $owner = Owner::factory()->create();
        $city = City::query()->firstOrFail();
        $hostelsPg = PropertyCategory::query()->where('slug', 'hostels-pg')->firstOrFail();

        $property = $this->createApprovedBookableProperty($owner, $city, $hostelsPg, 'Sri Sai Balaji PG');
        $roomType = $this->createRoomType($property, '2 Sharing AC', PropertyRoomTypeMode::Shared);
        $customer = User::factory()->create();

        // 1. Create a historical reservation with a legacy snapshot category name (from before consolidation)
        $historicalReservation = Reservation::factory()->confirmed()->create([
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'snapshot_property_name' => 'Sri Sai Balaji PG',
            'snapshot_category_name' => 'Independent Hostel',
            'snapshot_room_type_name' => '2 Sharing AC',
        ]);

        $this->assertSame('Independent Hostel', $historicalReservation->snapshot_category_name);

        // 2. Querying or reloading the reservation must never overwrite or mutate the historical snapshot
        $fresh = $historicalReservation->fresh();
        $this->assertSame('Independent Hostel', $fresh->snapshot_category_name);

        // 3. Mutating the property's category to another canonical category does not mutate the reservation's historical snapshot
        $homestays = PropertyCategory::query()->where('slug', 'homestays')->firstOrFail();
        $property->update(['property_category_id' => $homestays->id]);
        $property->refresh();

        $this->assertSame('homestays', $property->category->slug);
        $this->assertSame(
            'Independent Hostel',
            $historicalReservation->fresh()->snapshot_category_name,
            'Historical reservation snapshot_category_name must remain strictly immutable as a point-in-time legal record.'
        );
    }
}
