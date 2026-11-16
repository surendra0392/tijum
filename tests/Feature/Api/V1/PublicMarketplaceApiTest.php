<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\ContentStatus;
use App\Models\ContentFaq;
use App\Models\ContentPage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PublicMarketplaceApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_public_config_endpoint_returns_stay_timing_and_gateway_settings(): void
    {
        $response = $this->getJson('/api/v1/public/config');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.currency.code', 'INR')
            ->assertJsonPath('data.stay_timing_policy.check_in_time', '09:00:00')
            ->assertJsonPath('data.stay_timing_policy.check_out_time', '08:00:00')
            ->assertJsonPath('data.payment_gateways.primary', 'razorpay');
    }

    public function test_public_cities_endpoint_returns_active_cities(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $response = $this->getJson('/api/v1/public/cities');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                    ],
                ],
            ]);
    }

    public function test_public_properties_endpoint_returns_bookable_properties_with_meals(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner, foodProvided: true);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $response = $this->getJson('/api/v1/public/properties');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'food_provided',
                        'food_inclusions' => [
                            'provided',
                            'breakfast',
                            'lunch',
                            'dinner',
                        ],
                        'starting_price_monthly_paise',
                    ],
                ],
            ]);
    }

    public function test_public_property_detail_endpoint_returns_full_stay_details_and_room_types(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner, foodProvided: true);
        $roomType = $this->createBookableRoomType($property, name: 'Deluxe Private');
        $this->createActiveRoom($property, $roomType);

        $response = $this->getJson('/api/v1/public/properties/'.$property->slug);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', $property->name)
            ->assertJsonPath('data.check_in_time', '09:00:00')
            ->assertJsonPath('data.check_out_time', '08:00:00')
            ->assertJsonPath('data.food_provided', true)
            ->assertJsonPath('data.room_types.0.name', 'Deluxe Private');
    }

    public function test_public_content_endpoints_return_cms_data(): void
    {
        // 1. CMS Page
        ContentPage::query()->create([
            'title' => 'About TIJUM',
            'internal_name' => 'About Us',
            'slug' => 'about-us',
            'summary' => 'TIJUM is the food-inclusive accommodation marketplace.',
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);

        $pageRes = $this->getJson('/api/v1/public/pages/about-us');
        $pageRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title', 'About TIJUM');

        // 2. FAQs
        ContentFaq::query()->create([
            'question' => 'What are the check-in and checkout timings?',
            'answer' => 'Check-in is at 09:00 AM and checkout is at 08:00 AM.',
            'category' => 'Policies',
            'is_published' => true,
            'display_order' => 1,
        ]);

        $faqRes = $this->getJson('/api/v1/public/faqs');
        $faqRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'question',
                        'answer',
                    ],
                ],
            ]);
    }

    public function test_public_reverse_geocode_endpoint_resolves_location(): void
    {
        $response = $this->getJson('/api/v1/public/geocode/reverse?lat=17.4474&lng=78.3762');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'display',
                    'city',
                    'city_slug',
                    'lat',
                    'lng',
                ],
            ]);
    }
}
