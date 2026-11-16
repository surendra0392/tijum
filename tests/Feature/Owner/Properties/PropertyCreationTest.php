<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PropertyCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_customers_and_non_active_owners_cannot_create_properties(): void
    {
        $customer = User::factory()->create();
        $unverifiedOwner = Owner::factory()->unverified()->create();
        $pendingOwner = Owner::factory()->pendingReview()->create();
        $rejectedOwner = Owner::factory()->rejected()->create();

        $this->get(route('owner.properties.create'))->assertRedirect(route('owner.login'));
        $this->actingAs($customer, 'web')->get(route('owner.properties.create'))->assertRedirect(route('owner.login'));
        $this->actingAs($unverifiedOwner, 'owner')->get(route('owner.properties.create'))->assertForbidden();

        $this->actingAs($pendingOwner, 'owner')->get(route('owner.properties.create'))->assertForbidden();
        $this->actingAs($rejectedOwner, 'owner')->get(route('owner.properties.create'))->assertRedirect();
        $this->actingAs($pendingOwner, 'owner')->post(route('owner.properties.store'), [])->assertForbidden();
    }

    public function test_approved_owner_can_create_draft_property_with_revision_one_and_timing_defaults(): void
    {
        $owner = Owner::factory()->active()->create();
        $category = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->first()
            ?? PropertyCategory::query()->where('slug', 'independent-hostel')->firstOrFail();
        $city = City::query()->where('slug', 'vijayawada')->firstOrFail();

        $response = $this->actingAs($owner, 'owner')->post(route('owner.properties.store'), [
            'property_category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Benz Circle Scholar Hostel',
            'description' => 'Safe student and working professional hostel with home-style meals near Benz Circle.',
            'contact_person_name' => 'Srinivas Varma',
            'contact_phone' => '+919908012345',
            'contact_email' => 'HOSTEL@BENZ.TEST',
            'address_line_1' => 'Door No 40-1-12, MG Road',
            'address_line_2' => 'Opposite Trendset Mall',
            'locality' => 'Benz Circle',
            'landmark' => 'NTR Circle',
            'postal_code' => '520010',
            'latitude' => '16.5061743',
            'longitude' => '80.6480153',
            'ownership_arrangement' => PropertyOwnershipArrangement::LeasedOperator->value,
        ]);

        $property = Property::query()->where('owner_id', $owner->id)->firstOrFail();

        $response->assertRedirect(route('owner.properties.room-types.index', $property));

        $this->assertStringStartsWith('TJP-'.now()->format('Y').'-', $property->property_reference);
        $this->assertSame(PropertyOperationalStatus::Draft, $property->status);
        $this->assertFalse($property->is_verified);
        $this->assertFalse($property->booking_eligible);
        $this->assertSame('Andhra Pradesh', $property->state);
        $this->assertSame('hostel@benz.test', $property->contact_email);

        $application = PropertyVerificationApplication::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame(PropertyVerificationStatus::Draft, $application->status);
        $this->assertSame(1, $application->revision_number);
        $this->assertFalse($application->is_amendment);
        $this->assertSame(PropertyOwnershipArrangement::LeasedOperator, $application->ownership_arrangement);
        $this->assertSame($property->id, $application->active_property_id);

        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'verification_application_id' => $application->id,
            'event_type' => PropertyVerificationEventType::DraftCreated->value,
            'actor_type' => 'owner',
            'actor_id' => $owner->id,
        ]);

        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.show', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/properties/show')
                ->where('timingRules.standard_check_in_time', '09:00')
                ->where('timingRules.standard_check_out_time', '08:00')
                ->where('timingRules.earliest_early_check_in_time', '07:00')
                ->where('timingRules.timezone', 'Asia/Kolkata')
            );
    }
}
