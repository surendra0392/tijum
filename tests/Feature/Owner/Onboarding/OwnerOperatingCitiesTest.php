<?php

namespace Tests\Feature\Owner\Onboarding;

use App\Enums\OwnerVerificationEventType;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerVerificationEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerOperatingCitiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_exactly_four_approved_launch_cities_are_seeded_by_default(): void
    {
        $slugs = City::query()->ordered()->pluck('slug')->all();

        $this->assertSame(['hyderabad', 'guntur', 'vijayawada', 'visakhapatnam'], $slugs);
        $this->assertSame(4, City::query()->count());
    }

    public function test_owner_can_select_single_and_multiple_active_operating_cities(): void
    {
        $owner = Owner::factory()->pendingReview()->create();
        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $vizag = City::query()->where('slug', 'visakhapatnam')->firstOrFail();

        $response = $this->actingAs($owner, 'owner')->put(
            route('owner.onboarding.cities.update'),
            ['city_ids' => [$hyderabad->id, $vizag->id]],
        );

        $response->assertSessionHasNoErrors()->assertRedirect(route('owner.onboarding.cities'));
        $this->assertSame([$hyderabad->id, $vizag->id], $owner->operatingCities()->pluck('cities.id')->all());

        $this->assertDatabaseHas('owner_verification_events', [
            'event_type' => OwnerVerificationEventType::OperatingCitiesUpdated->value,
            'actor_id' => $owner->id,
        ]);
    }

    public function test_inactive_duplicate_and_empty_city_selections_are_rejected(): void
    {
        $owner = Owner::factory()->pendingReview()->create();
        $inactiveCity = City::query()->create([
            'name' => 'Warangal',
            'slug' => 'warangal',
            'state' => 'Telangana',
            'state_code' => 'TG',
            'country_code' => 'IN',
            'is_active' => false,
            'sort_order' => 10,
        ]);
        $guntur = City::query()->where('slug', 'guntur')->firstOrFail();

        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.cities'))
            ->put(route('owner.onboarding.cities.update'), ['city_ids' => []])
            ->assertSessionHasErrors('city_ids');

        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.cities'))
            ->put(route('owner.onboarding.cities.update'), ['city_ids' => [$inactiveCity->id]])
            ->assertSessionHasErrors('city_ids.0');

        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.cities'))
            ->put(route('owner.onboarding.cities.update'), ['city_ids' => [$guntur->id, $guntur->id]])
            ->assertSessionHasErrors('city_ids.1');

        $this->assertSame(0, OwnerVerificationEvent::query()->where('event_type', OwnerVerificationEventType::OperatingCitiesUpdated->value)->count());
    }

    public function test_customer_cannot_modify_owner_operating_cities(): void
    {
        $customer = User::factory()->create();
        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $this->actingAs($customer, 'web')
            ->put(route('owner.onboarding.cities.update'), ['city_ids' => [$hyderabad->id]])
            ->assertRedirect(route('owner.login'));
    }
}
