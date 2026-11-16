<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Enums\OwnerStatus;
use App\Enums\PropertyOperationalStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CityLandingPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_four_initial_launch_cities_render_custom_editorial_pages(): void
    {
        $citySlugs = [
            'hyderabad' => 'Hyderabad',
            'guntur' => 'Guntur',
            'vijayawada' => 'Vijayawada',
            'visakhapatnam' => 'Visakhapatnam',
        ];

        foreach ($citySlugs as $slug => $cityName) {
            City::query()->firstOrCreate(
                ['slug' => $slug],
                ['name' => $cityName, 'state' => $slug === 'hyderabad' ? 'Telangana' : 'Andhra Pradesh', 'is_active' => true]
            );

            $response = $this->get('/hostels-in-'.$slug);

            $response->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('public/cities/show')
                    ->where('city.slug', $slug)
                    ->where('city.name', $cityName)
                    ->has('editorial.neighborhoods')
                    ->has('editorial.food_inclusions')
                    ->has('editorial.faqs')
                    ->has('timing')
                    ->has('seo')
                );

            $response->assertSee('TIJUM', false);
        }
    }

    public function test_city_page_renders_eligible_property_cards(): void
    {
        $city = City::query()->firstOrCreate(
            ['slug' => 'hyderabad'],
            ['name' => 'Hyderabad', 'state' => 'Telangana', 'is_active' => true]
        );

        $owner = Owner::factory()->create([
            'status' => OwnerStatus::Active,
        ]);

        $property = Property::factory()->create([
            'city_id' => $city->id,
            'owner_id' => $owner->id,
            'status' => PropertyOperationalStatus::Active,
            'is_verified' => true,
            'booking_eligible' => true,
            'name' => 'Gachibowli Food-Inclusive PG',
            'slug' => 'gachibowli-food-inclusive-pg',
            'food_provided' => true,
            'breakfast_included' => true,
            'lunch_included' => false,
            'dinner_included' => true,
        ]);

        $response = $this->get('/hostels-in-hyderabad');

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/cities/show')
                ->has('properties', 1)
                ->where('properties.0.name', 'Gachibowli Food-Inclusive PG')
                ->where('properties.0.breakfast_included', true)
                ->where('properties.0.lunch_included', false)
                ->where('properties.0.dinner_included', true)
                ->where('properties.0.included_meals_label', 'Breakfast • Dinner')
            );
    }
}
