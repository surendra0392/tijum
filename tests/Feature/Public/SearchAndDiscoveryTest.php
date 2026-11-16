<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyCategory;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyRoomTypeAmenity;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PropertyTestHelpers;
use Tests\TestCase;

class SearchAndDiscoveryTest extends TestCase
{
    use PropertyTestHelpers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            ['name' => 'Hyderabad', 'slug' => 'hyderabad', 'state' => 'Telangana', 'sort_order' => 1],
            ['name' => 'Guntur', 'slug' => 'guntur', 'state' => 'Andhra Pradesh', 'sort_order' => 2],
        ] as $city) {
            City::query()->updateOrCreate(
                ['slug' => $city['slug']],
                $city + ['state_code' => null, 'country_code' => 'IN', 'is_active' => true],
            );
        }
        PropertyCategory::query()->firstOrCreate(
            ['slug' => PropertyCategory::SLUG_HOSTELS_PG],
            ['name' => 'Hostels/PG', 'code' => 'hostel_pg', 'description' => null, 'is_active' => true, 'sort_order' => 1],
        );
    }

    public function test_search_page_renders_without_intent_and_with_default_context(): void
    {
        $this->get(route('public.search'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/search/index')
                ->where('hasSearchIntent', false)
                ->where('locationLabel', null)
                ->has('results')
                ->has('cities')
                ->has('categories')
                ->has('amenities')
                ->has('filters.check_in')
                ->has('seo.title')
                ->has('timing.standard_check_in_time')
            );
    }

    public function test_search_page_preserves_the_exact_location_label_separately_from_locality(): void
    {
        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $locationLabel = '1/23/3/1, HMT Hills, Kukatpally, Hyderabad, Telangana 500072, India';

        $this->get(route('public.search', [
            'city' => $hyderabad->id,
            'locality' => 'Kukatpally',
            'location_label' => $locationLabel,
            'check_in' => now('Asia/Kolkata')->toDateString(),
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.locality', 'Kukatpally')
                ->where('locationLabel', $locationLabel)
            );
    }

    public function test_search_page_exposes_active_cities_and_eligible_property_localities_for_autocomplete(): void
    {
        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $guntur = City::query()->where('slug', 'guntur')->firstOrFail();
        $owner = Owner::factory()->active()->create();

        $madhapur = $this->makePublicProperty($owner, $hyderabad->id, 'Madhapur Stay', 'madhapur-location-stay', locality: 'Madhapur');
        $madhapur->forceFill(['landmark' => 'Cyber Towers'])->save();
        $this->makePublicProperty($owner, $guntur->id, 'Brodipet Stay', 'brodipet-location-stay', locality: 'Brodipet');
        $hidden = $this->makePublicProperty($owner, $hyderabad->id, 'Hidden Stay', 'hidden-location-stay', locality: 'Hidden Locality');
        $hidden->forceFill([
            'status' => PropertyOperationalStatus::Draft,
            'is_verified' => false,
            'booking_eligible' => false,
        ])->save();

        $this->get(route('public.search'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('locations', function ($locations): bool {
                    $options = collect($locations);

                    return $options->contains(fn (array $location): bool => $location['type'] === 'city' && $location['city'] === 'hyderabad')
                        && $options->contains(fn (array $location): bool => $location['type'] === 'city' && $location['city'] === 'guntur')
                        && $options->contains(fn (array $location): bool => $location['type'] === 'locality' && $location['city'] === 'hyderabad' && $location['locality'] === 'Madhapur')
                        && $options->contains(fn (array $location): bool => $location['type'] === 'locality' && $location['city'] === 'guntur' && $location['locality'] === 'Brodipet')
                        && $options->contains(fn (array $location): bool => $location['type'] === 'landmark' && $location['city'] === 'hyderabad' && $location['name'] === 'Cyber Towers')
                        && ! $options->contains(fn (array $location): bool => $location['name'] === 'Hidden Locality');
                })
            );
    }

    public function test_search_requires_core_inputs_when_intent_is_present(): void
    {
        $this->get(route('public.search', ['check_in' => '2026-12-01']))
            ->assertSessionHasErrors(['city', 'duration_type', 'duration_count', 'guests']);
    }

    public function test_search_with_city_alone_auto_populates_intent_defaults_and_executes_search(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $response = $this->get(route('public.search', ['city' => $city->id]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/search/index')
                ->where('hasSearchIntent', true)
                ->where('filters.city', $city->id)
                ->where('filters.duration_type', 'daily')
                ->where('filters.duration_count', 1)
                ->where('filters.guests', 1)
                ->has('filters.check_in')
            );

        // Also works with city slug
        $responseSlug = $this->get(route('public.search', ['city' => 'hyderabad']));
        $responseSlug->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/search/index')
                ->where('hasSearchIntent', true)
                ->where('filters.city', $city->id)
            );
    }

    public function test_search_returns_only_food_inclusive_eligible_bookable_properties(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();

        $eligible = $this->makePublicProperty($owner, $city->id, 'Eligible Stay', 'eligible-stay');
        $this->makePublicProperty($owner, $city->id, 'No Food Stay', 'no-food-stay', food: false);
        $this->makePublicProperty($owner, $city->id, 'No Rooms Stay', 'no-rooms-stay', withRoom: false);
        $draftOwner = Owner::factory()->active()->create();
        $draft = $this->makePublicProperty($draftOwner, $city->id, 'Draft Stay', 'draft-stay');
        $draft->forceFill(['status' => PropertyOperationalStatus::Draft, 'is_verified' => false, 'booking_eligible' => false])->save();

        $filters = $this->baseSearch($city->id);
        $response = $this->get(route('public.search', $filters));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('public/search/index')
            ->where('hasSearchIntent', true)
            ->where('resultTotal', 1)
            ->where('results.data.0.slug', $eligible->slug)
            ->where('results.data.0.food.food_provided', true)
            ->has('results.data.0.price.total_minor')
        );
    }

    public function test_search_filters_by_locality_category_sharing_ac_amenities_food_and_early_check_in(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();

        $cat = PropertyCategory::query()->create([
            'name' => 'Test Homestay', 'slug' => 'test-homestay', 'code' => 'test_homestay', 'is_active' => true, 'sort_order' => 99,
        ]);

        $match = $this->makePublicProperty($owner, $city->id, 'Kukatpally Homestay', 'kukatpally-homestay', locality: 'Kukatpally', categoryId: $cat->id);
        $rt = $match->roomTypes()->firstOrFail();
        $rt->forceFill([
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'early_check_in_enabled' => true,
            'daily_rate_minor' => 50000,
        ])->save();
        $this->attachApprovedPropertyAmenity($match, 'WiFi');
        $this->attachApprovedRoomTypeAmenity($match, $rt, 'Attached Bathroom');

        $this->makePublicProperty($owner, $city->id, 'Madhapur PG', 'madhapur-pg', locality: 'Madhapur');

        $wifi = Amenity::query()->where('name', 'WiFi')->value('id');
        $bath = Amenity::query()->where('name', 'Attached Bathroom')->value('id');

        $filters = array_merge($this->baseSearch($city->id), [
            'locality' => 'kukat',
            'category' => [$cat->id],
            'sharing_capacity' => [2],
            'ac' => ['ac'],
            'food_meals' => ['breakfast'],
            'amenities' => [$wifi, $bath],
            'early_check_in' => true,
        ]);

        $response = $this->get(route('public.search', $filters));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('resultTotal', 1)
            ->where('results.data.0.slug', $match->slug)
            ->where('results.data.0.has_early_check_in', true)
            ->where('results.data.0.property_amenities.0.name', 'WiFi')
            ->where('results.data.0.room_summaries.0.room_type_amenities.0.name', 'Attached Bathroom')
        );
    }

    public function test_search_respects_gender_capacity_overlap_and_pricing(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();

        $property = $this->makePublicProperty($owner, $city->id, 'Capacity Stay', 'capacity-stay');
        $rt = $property->roomTypes()->firstOrFail();
        $rt->forceFill([
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'gender_policy' => 'female_only',
            'daily_rate_minor' => 40000,
        ])->save();

        $rooms = PropertyRoom::query()->where('property_room_type_id', $rt->id)->get();
        foreach ($rooms as $room) {
            $block = new PropertyAvailabilityBlock;
            $block->forceFill([
                'property_id' => $property->id,
                'property_room_type_id' => $rt->id,
                'property_room_id' => $room->id,
                'scope' => PropertyAvailabilityBlockScope::Room->value,
                'block_type' => PropertyAvailabilityBlockType::Maintenance->value,
                'status' => PropertyAvailabilityBlockStatus::Active->value,
                'start_date' => CarbonImmutable::now('Asia/Kolkata')->toDateString(),
                'end_date' => CarbonImmutable::now('Asia/Kolkata')->addDays(2)->toDateString(),
                'is_admin_restriction' => false,
                'reason' => 'Hold',
            ])->save();
        }

        $blocked = $this->get(route('public.search', array_merge($this->baseSearch($city->id), [
            'gender_preference' => 'female',
            'guests' => 1,
        ])));
        $blocked->assertOk()->assertInertia(fn (Assert $page) => $page->where('resultTotal', 0));

        PropertyAvailabilityBlock::query()->delete();
        $ok = $this->get(route('public.search', array_merge($this->baseSearch($city->id), [
            'gender_preference' => 'female',
            'guests' => 2,
        ])));
        $ok->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('resultTotal', 1)
            ->where('results.data.0.price.pricing_basis', 'per_guest')
            ->where('results.data.0.price.amount_minor', 40000)
            ->where('results.data.0.price.total_minor', 80000)
        );

        $male = $this->get(route('public.search', array_merge($this->baseSearch($city->id), ['gender_preference' => 'male'])));
        $male->assertOk()->assertInertia(fn (Assert $page) => $page->where('resultTotal', 0));
    }

    public function test_public_property_detail_renders_for_eligible_slug_and_404s_for_ineligible(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();
        $property = $this->makePublicProperty($owner, $city->id, 'Detail Stay', 'detail-stay', withMedia: true);
        $roomType = $property->roomTypes()->firstOrFail();
        $this->attachApprovedPropertyAmenity($property, 'Power Backup');
        $this->attachApprovedRoomTypeAmenity($property, $roomType, 'Study Table');

        // Also add room-scoped media to ensure PropertyMedia->roomType does not trigger LazyLoadingViolationException
        PropertyMedia::query()->forceCreate([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'property_room_id' => null,
            'property_verification_application_id' => $property->activeVerificationApplication?->id ?? $property->latestVerificationApplication?->id,
            'media_type' => PropertyMediaCategory::RoomInterior->value,
            'storage_path' => 'private/room-photo.jpg',
            'original_filename' => 'room.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 12345,
            'width' => 1200,
            'height' => 800,
            'alt_text' => 'Standard Room Photo',
            'sort_order' => 1,
            'is_cover' => false,
            'moderation_status' => PropertyMediaModerationStatus::Approved->value,
            'moderated_at' => now(),
            'publication_status' => PropertyMediaPublicationStatus::Published->value,
            'published_at' => now(),
            'optimized_private_path' => 'private/optimized-room.jpg',
            'thumbnail_path' => 'private/thumb-room.jpg',
            'public_optimized_path' => 'public/optimized-room.jpg',
            'public_thumbnail_path' => 'public/thumb-room.jpg',
            'is_archived' => false,
        ]);

        $ctx = ['check_in' => now()->toDateString(), 'duration_type' => 'daily', 'duration_count' => 1, 'guests' => 1];
        $this->get(route('public.properties.show', ['property' => $property->slug] + $ctx))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/properties/show')
                ->where('property.slug', $property->slug)
                ->where('property.food.food_provided', true)
                ->has('property.room_types', 1)
                ->has('property.gallery', 2)
                ->where('property.gallery.1.scope', 'room_type')
                ->where('property.gallery.1.room_type_name', 'Standard')
                ->has('seo.structuredData.@graph')
                ->where('property.timing.check_in', '09:00')
                ->where('property.timing.check_out', '08:00')
                ->where('property.timing.earliest_early_check_in_time', '07:00')
                ->where('property.room_types.0.early_check_in_enabled', false)
                ->where('property.property_amenities.0.name', 'Power Backup')
                ->where('property.room_types.0.amenities.0.name', 'Study Table')
            );

        $property->forceFill(['food_provided' => false, 'breakfast_included' => false, 'lunch_included' => false, 'dinner_included' => false])->save();
        $this->get(route('public.properties.show', ['property' => $property->slug]))->assertNotFound();
    }

    public function test_city_landing_page_renders_with_properties_and_gender_eligibility(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();
        $property = $this->makePublicProperty($owner, $city->id, 'City Landing Stay', 'city-landing-stay', withMedia: true);

        $this->get(route('public.cities.stays', ['citySlug' => $city->slug]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/cities/show')
                ->where('city.slug', $city->slug)
                ->has('properties', 1)
                ->where('properties.0.name', 'City Landing Stay')
                ->has('properties.0.gender_eligibility')
            );
    }

    public function test_sitemap_and_production_robots_include_search_routes(): void
    {
        $this->get(route('public.sitemap'))
            ->assertOk()
            ->assertSee('<loc>'.route('public.search').'</loc>', false);

        $this->app->detectEnvironment(fn (): string => 'production');
        $this->get(route('public.robots'))
            ->assertOk()
            ->assertSee('Disallow: /search?', false);
    }

    public function test_distance_asc_and_desc_sorting(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();

        // Close property in Madhapur
        $p1 = $this->makePublicProperty($owner, $city->id, 'Madhapur Stay', 'madhapur-stay', locality: 'Madhapur');
        $p1->forceFill(['latitude' => 17.4485, 'longitude' => 78.3741])->save();

        // Farther property in Dilsukhnagar
        $p2 = $this->makePublicProperty($owner, $city->id, 'Dilsukhnagar Stay', 'dilsukhnagar-stay', locality: 'Dilsukhnagar');
        $p2->forceFill(['latitude' => 17.3688, 'longitude' => 78.5247])->save();

        // Search with Madhapur reference coordinates
        $resAsc = $this->get(route('public.search', array_merge($this->baseSearch($city->id), [
            'lat' => 17.4485,
            'lng' => 78.3741,
            'sort' => 'distance_asc',
        ])));

        $resAsc->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('resultTotal', 2)
            ->where('results.data.0.slug', $p1->slug)
            ->where('results.data.1.slug', $p2->slug)
        );

        // Search with distance_desc (farthest first)
        $resDesc = $this->get(route('public.search', array_merge($this->baseSearch($city->id), [
            'lat' => 17.4485,
            'lng' => 78.3741,
            'sort' => 'distance_desc',
        ])));

        $resDesc->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('resultTotal', 2)
            ->where('results.data.0.slug', $p2->slug)
            ->where('results.data.1.slug', $p1->slug)
        );
    }

    public function test_nearby_locations_in_same_city_continuously_returned(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $owner = Owner::factory()->active()->create();

        $p1 = $this->makePublicProperty($owner, $city->id, 'Kukatpally Stay', 'kukatpally-stay', locality: 'Kukatpally');
        $p1->forceFill(['latitude' => 17.4933, 'longitude' => 78.4018])->save();

        $p2 = $this->makePublicProperty($owner, $city->id, 'Madhapur Stay', 'madhapur-stay', locality: 'Madhapur');
        $p2->forceFill(['latitude' => 17.4485, 'longitude' => 78.3741])->save();

        // User searched "Kukatpally"
        $res = $this->get(route('public.search', array_merge($this->baseSearch($city->id), [
            'locality' => 'Kukatpally',
        ])));

        // Both properties in Hyderabad are included, with Kukatpally prioritized first
        $res->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('resultTotal', 2)
            ->where('results.data.0.slug', $p1->slug)
            ->where('results.data.1.slug', $p2->slug)
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function baseSearch(int $cityId): array
    {
        return [
            'city' => $cityId,
            'check_in' => now('Asia/Kolkata')->addDays(1)->toDateString(),
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
        ];
    }

    private function makePublicProperty(Owner $owner, int $cityId, string $name, string $slug, bool $food = true, bool $withRoom = true, ?string $locality = null, ?int $categoryId = null, bool $withMedia = false): Property
    {
        $property = $this->createProperty($owner, approved: true, appStatus: PropertyVerificationStatus::Approved, opStatus: PropertyOperationalStatus::Active);
        $property->forceFill([
            'name' => $name,
            'slug' => $slug,
            'city_id' => $cityId,
            'property_category_id' => $categoryId ?? $property->property_category_id,
            'locality' => $locality ?? 'Madhapur',
            'food_provided' => $food,
            'breakfast_included' => $food,
            'lunch_included' => false,
            'dinner_included' => false,
        ])->save();

        if ($withRoom) {
            $rt = $this->createRoomType($property, 'Standard', [
                'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
                'sharing_capacity' => 2,
                'max_guests_per_room' => 2,
                'is_air_conditioned' => true,
                'daily_rate_minor' => 60000,
                'weekly_rate_minor' => 350000,
                'monthly_rate_minor' => 1200000,
            ]);
            $this->createRoom($property, $rt, '101');
            $this->createRoom($property, $rt, '102');
        }

        if ($withMedia) {
            PropertyMedia::query()->forceCreate([
                'property_id' => $property->id,
                'property_room_type_id' => null,
                'property_room_id' => null,
                'property_verification_application_id' => $property->activeVerificationApplication?->id ?? $property->latestVerificationApplication?->id,
                'media_type' => PropertyMediaCategory::Exterior->value,
                'storage_path' => 'private/original-cover.jpg',
                'original_filename' => 'cover.jpg',
                'mime_type' => 'image/jpeg',
                'file_size' => 12345,
                'width' => 1200,
                'height' => 800,
                'alt_text' => $name.' cover',
                'sort_order' => 0,
                'is_cover' => true,
                'moderation_status' => PropertyMediaModerationStatus::Approved->value,
                'moderated_at' => now(),
                'publication_status' => PropertyMediaPublicationStatus::Published->value,
                'published_at' => now(),
                'optimized_private_path' => 'private/optimized.jpg',
                'thumbnail_path' => 'private/thumb.jpg',
                'public_optimized_path' => 'public/optimized.jpg',
                'public_thumbnail_path' => 'public/thumb.jpg',
                'is_archived' => false,
            ]);
        }

        return $property->fresh(['roomTypes.rooms', 'rooms', 'category', 'city', 'owner']);
    }

    private function attachApprovedPropertyAmenity(Property $property, string $name): void
    {
        $cat = AmenityCategory::query()->firstOrCreate(['slug' => 'general'], ['name' => 'General', 'code' => 'GENERAL', 'is_active' => true, 'display_order' => 0]);
        $amenity = Amenity::query()->firstOrCreate(
            ['name' => $name],
            ['amenity_category_id' => $cat->id, 'code' => Str::upper(Str::slug($name, '_')), 'slug' => Str::slug($name), 'applicability_scope' => 'property', 'is_customer_visible' => true, 'requires_review' => false, 'is_active' => true, 'display_order' => 0]
        );
        PropertyAmenity::query()->forceCreate([
            'property_id' => $property->id,
            'amenity_id' => $amenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'TPA-'.Str::upper(Str::random(8)),
            'availability' => AmenityAvailability::Included->value,
            'status' => AmenityVerificationStatus::Approved->value,
            'revision_number' => 1,
            'is_current' => true,
            'is_customer_visible' => true,
            'approved_at' => now(),
        ]);
    }

    private function attachApprovedRoomTypeAmenity(Property $property, PropertyRoomType $roomType, string $name): void
    {
        $cat = AmenityCategory::query()->firstOrCreate(['slug' => 'room'], ['name' => 'Room', 'code' => 'ROOM', 'is_active' => true, 'display_order' => 0]);
        $amenity = Amenity::query()->firstOrCreate(
            ['name' => $name],
            ['amenity_category_id' => $cat->id, 'code' => Str::upper(Str::slug($name, '_')), 'slug' => Str::slug($name), 'applicability_scope' => 'room_type', 'is_customer_visible' => true, 'requires_review' => false, 'is_active' => true, 'display_order' => 0]
        );
        PropertyRoomTypeAmenity::query()->forceCreate([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'amenity_id' => $amenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'TRA-'.Str::upper(Str::random(8)),
            'availability' => AmenityAvailability::Included->value,
            'status' => AmenityVerificationStatus::Approved->value,
            'revision_number' => 1,
            'is_current' => true,
            'is_customer_visible' => true,
            'approved_at' => now(),
        ]);
    }
}
