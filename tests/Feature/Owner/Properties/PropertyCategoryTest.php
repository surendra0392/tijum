<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyOwnershipArrangement;
use App\Models\City;
use App\Models\Owner;
use App\Models\PropertyCategory;
use Database\Seeders\PropertyCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PropertyCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_launch_property_categories_are_seeded_idempotently(): void
    {
        $this->seed(PropertyCategorySeeder::class);
        $this->seed(PropertyCategorySeeder::class);

        $slugs = PropertyCategory::query()->ordered()->pluck('slug')->all();

        $this->assertSame([
            'hostels-pg',
            'homestays',
            'co-living',
        ], $slugs);
    }

    public function test_inactive_category_or_inactive_city_cannot_be_used_for_property_creation(): void
    {
        $owner = Owner::factory()->active()->create();

        $inactiveCategory = PropertyCategory::factory()->create(['is_active' => false]);
        $activeCategory = PropertyCategory::query()->where('slug', 'hostels-pg')->first()
            ?? PropertyCategory::query()->where('slug', 'pg-accommodation')->firstOrFail();

        $inactiveCity = City::query()->create([
            'name' => 'Kurnool',
            'slug' => 'kurnool',
            'state' => 'Andhra Pradesh',
            'state_code' => 'AP',
            'country_code' => 'IN',
            'is_active' => false,
            'sort_order' => 99,
        ]);
        $activeCity = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $basePayload = [
            'name' => 'Green Meadow PG',
            'description' => 'Clean food-inclusive accommodation located near transit corridors.',
            'contact_person_name' => 'Ramesh Rao',
            'contact_phone' => '+919848011223',
            'contact_email' => 'contact@greenmeadow.test',
            'address_line_1' => 'Plot 12, Ameerpet',
            'locality' => 'Ameerpet',
            'postal_code' => '500016',
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
        ];

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), [
                ...$basePayload,
                'property_category_id' => $inactiveCategory->id,
                'city_id' => $activeCity->id,
            ])
            ->assertSessionHasErrors('property_category_id');

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.store'), [
                ...$basePayload,
                'property_category_id' => $activeCategory->id,
                'city_id' => $inactiveCity->id,
            ])
            ->assertSessionHasErrors('city_id');
    }

    public function test_create_screen_provides_only_active_categories_and_launch_cities(): void
    {
        $owner = Owner::factory()->active()->create();
        PropertyCategory::factory()->create(['name' => 'Retired Category', 'is_active' => false]);

        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/properties/create')
                ->has('categories', 3)
                ->has('cities', 4)
            );
    }

    public function test_no_bed_management_tables_models_or_routes_exist(): void
    {
        $this->assertFalse(Schema::hasTable('property_beds'));
        $this->assertFalse(Schema::hasTable('beds'));
        $this->assertFalse(class_exists('App\\Models\\PropertyBed'));
        $this->assertFalse(class_exists('App\\Models\\Bed'));

        foreach (Route::getRoutes() as $route) {
            $name = (string) ($route->getName() ?? '');
            $uri = $route->uri();
            $this->assertStringNotContainsString('bed', strtolower($name));
            $this->assertStringNotContainsString('/beds', strtolower($uri));
        }
    }
}
