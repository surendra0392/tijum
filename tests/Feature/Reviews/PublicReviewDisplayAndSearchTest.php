<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRatingSummary;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use App\Services\Reviews\ReviewRatingCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class PublicReviewDisplayAndSearchTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

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

    public function test_public_property_page_displays_published_reviews_and_rating_summary(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $property = $this->createSearchableProperty($owner, $city, 'Serene PG for Men', 'serene-pg-for-men');
        $roomType = $property->roomTypes->first();

        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        $review = PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 4,
            'communication_rating' => 5,
            'value_rating' => 5,
            'title' => 'Fantastic experience and homely food',
            'content' => 'The rooms were spotless, AC was chilled, and three hot South Indian meals were served daily.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Ananya R.',
            'published_at' => CarbonImmutable::now(),
        ]);

        PropertyReviewResponse::query()->create([
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => 'Thank you Ananya! You are always welcome back at our property.',
            'status' => ReviewResponseStatus::Published,
            'published_at' => CarbonImmutable::now(),
        ]);

        app(ReviewRatingCalculationService::class)->recalculateForProperty($property);

        $response = $this->get(route('public.properties.show', ['property' => $property->slug]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/properties/show')
                ->where('property.rating_summary.average_rating', fn ($v) => (float) $v === 5.0)
                ->where('property.rating_summary.published_review_count', 1)
                ->where('property.rating_summary.cleanliness_average', fn ($v) => (float) $v === 5.0)
                ->where('property.rating_summary.food_average', fn ($v) => (float) $v === 4.0)
                ->has('property.published_reviews', 1)
                ->where('property.published_reviews.0.title', 'Fantastic experience and homely food')
                ->where('property.published_reviews.0.customer_display_name', 'Ananya R.')
                ->where('property.published_reviews.0.verified_booking', true)
                ->where('property.published_reviews.0.response.response_text', 'Thank you Ananya! You are always welcome back at our property.')
                ->where('property.published_reviews.0.response.owner_name', $owner->name)
            );
    }

    public function test_zero_review_property_renders_graceful_empty_summary(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $property = $this->createSearchableProperty($owner, $city, 'Zero Review PG', 'zero-review-pg');

        $response = $this->get(route('public.properties.show', ['property' => $property->slug]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/properties/show')
                ->where('property.rating_summary.average_rating', fn ($val) => (float) $val === 0.0)
                ->where('property.rating_summary.published_review_count', 0)
                ->where('property.rating_summary.cleanliness_average', null)
                ->where('property.published_reviews', [])
            );
    }

    public function test_unpublished_or_rejected_reviews_are_not_displayed_publicly(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $property = $this->createSearchableProperty($owner, $city, 'Pending Moderation Stay', 'pending-moderation-stay');
        $roomType = $property->roomTypes->first();

        $res1 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res1->id,
            'property_id' => $property->id,
            'user_id' => $res1->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 1,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Pending Guest',
        ]);

        $res2 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res2->id,
            'property_id' => $property->id,
            'user_id' => $res2->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 1,
            'status' => ReviewStatus::Hidden,
            'verified_booking' => true,
            'customer_display_name' => 'Hidden Guest',
        ]);

        app(ReviewRatingCalculationService::class)->recalculateForProperty($property);

        $response = $this->get(route('public.properties.show', ['property' => $property->slug]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/properties/show')
                ->where('property.rating_summary.published_review_count', 0)
                ->where('property.published_reviews', [])
            );
    }

    public function test_search_results_include_average_rating_and_review_count(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $property = $this->createSearchableProperty($owner, $city, 'Lakshmi Nilayam PG', 'lakshmi-nilayam-pg');

        PropertyRatingSummary::query()->create([
            'property_id' => $property->id,
            'average_rating' => 4.6,
            'published_review_count' => 12,
            'cleanliness_average' => 4.8,
            'food_average' => 4.5,
            'communication_average' => 4.7,
            'value_average' => 4.4,
            'star_5_count' => 8,
            'star_4_count' => 3,
            'star_3_count' => 1,
            'star_2_count' => 0,
            'star_1_count' => 0,
            'last_recalculated_at' => CarbonImmutable::now(),
        ]);

        $response = $this->get(route('public.search', [
            'city' => $city->id,
            'check_in' => CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString(),
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
        ]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/search/index')
                ->has('results.data', 1)
                ->where('results.data.0.slug', $property->slug)
                ->where('results.data.0.average_rating', 4.6)
                ->where('results.data.0.review_count', 12)
            );
    }

    public function test_search_filters_by_min_rating(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $highRated = $this->createSearchableProperty($owner, $city, 'Top Notch PG', 'top-notch-pg');
        PropertyRatingSummary::query()->create([
            'property_id' => $highRated->id,
            'average_rating' => 4.8,
            'published_review_count' => 15,
            'star_5_count' => 13,
            'star_4_count' => 2,
            'star_3_count' => 0,
            'star_2_count' => 0,
            'star_1_count' => 0,
            'last_recalculated_at' => CarbonImmutable::now(),
        ]);

        $lowRated = $this->createSearchableProperty($owner, $city, 'Budget PG', 'budget-pg');
        PropertyRatingSummary::query()->create([
            'property_id' => $lowRated->id,
            'average_rating' => 3.2,
            'published_review_count' => 6,
            'star_5_count' => 0,
            'star_4_count' => 0,
            'star_3_count' => 4,
            'star_2_count' => 2,
            'star_1_count' => 0,
            'last_recalculated_at' => CarbonImmutable::now(),
        ]);

        $response = $this->get(route('public.search', [
            'city' => $city->id,
            'check_in' => CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString(),
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
            'min_rating' => 4.0,
        ]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/search/index')
                ->has('results.data', 1)
                ->where('results.data.0.slug', $highRated->slug)
            );
    }

    public function test_search_sorts_by_highest_rated(): void
    {
        $owner = $this->createActiveOwner();
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $midRated = $this->createSearchableProperty($owner, $city, 'Mid Rated PG', 'mid-rated-pg');
        PropertyRatingSummary::query()->create([
            'property_id' => $midRated->id,
            'average_rating' => 4.2,
            'published_review_count' => 5,
            'star_5_count' => 2,
            'star_4_count' => 2,
            'star_3_count' => 1,
            'star_2_count' => 0,
            'star_1_count' => 0,
            'last_recalculated_at' => CarbonImmutable::now(),
        ]);

        $topRated = $this->createSearchableProperty($owner, $city, 'Top Rated PG', 'top-rated-pg');
        PropertyRatingSummary::query()->create([
            'property_id' => $topRated->id,
            'average_rating' => 4.9,
            'published_review_count' => 20,
            'star_5_count' => 18,
            'star_4_count' => 2,
            'star_3_count' => 0,
            'star_2_count' => 0,
            'star_1_count' => 0,
            'last_recalculated_at' => CarbonImmutable::now(),
        ]);

        $lowRated = $this->createSearchableProperty($owner, $city, 'Low Rated PG', 'low-rated-pg');
        PropertyRatingSummary::query()->create([
            'property_id' => $lowRated->id,
            'average_rating' => 3.5,
            'published_review_count' => 4,
            'star_5_count' => 0,
            'star_4_count' => 2,
            'star_3_count' => 2,
            'star_2_count' => 0,
            'star_1_count' => 0,
            'last_recalculated_at' => CarbonImmutable::now(),
        ]);

        $response = $this->get(route('public.search', [
            'city' => $city->id,
            'check_in' => CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString(),
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
            'sort' => 'highest_rated',
        ]));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/search/index')
                ->has('results.data', 3)
                ->where('results.data.0.slug', $topRated->slug)
                ->where('results.data.1.slug', $midRated->slug)
                ->where('results.data.2.slug', $lowRated->slug)
            );
    }

    private function createSearchableProperty(Owner $owner, City $city, string $name, string $slug): Property
    {
        $category = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->first()
            ?? PropertyCategory::query()->where('slug', 'pg-accommodation')->firstOrFail();

        $property = $this->createProperty($owner, approved: true, appStatus: PropertyVerificationStatus::Approved, opStatus: PropertyOperationalStatus::Active);
        $property->forceFill([
            'name' => $name,
            'slug' => $slug,
            'city_id' => $city->id,
            'property_category_id' => $category->id,
            'locality' => 'Madhapur',
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => true,
            'dinner_included' => true,
            'booking_eligible' => true,
        ])->save();

        $rt = $this->createRoomType($property, 'Standard Shared Room', [
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'daily_rate_minor' => 50000,
            'weekly_rate_minor' => 300000,
            'monthly_rate_minor' => 1000000,
        ]);

        $this->createRoom($property, $rt, '101');

        return $property->fresh(['roomTypes.rooms', 'rooms', 'category', 'city', 'owner']);
    }
}
