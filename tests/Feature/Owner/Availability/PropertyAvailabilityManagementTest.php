<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Availability;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Models\Owner;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyAvailabilityBlockEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PropertyTestHelpers;
use Tests\TestCase;

class PropertyAvailabilityManagementTest extends TestCase
{
    use PropertyTestHelpers;
    use RefreshDatabase;

    public function test_owner_can_create_and_cancel_property_availability_block(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.pricing.availability-blocks.store', $property), [
                'scope' => PropertyAvailabilityBlockScope::Property->value,
                'block_type' => PropertyAvailabilityBlockType::Maintenance->value,
                'start_date' => now()->addDays(3)->toDateString(),
                'end_date' => now()->addDays(5)->toDateString(),
                'reason' => 'Renovation',
            ])
            ->assertRedirect();

        $block = PropertyAvailabilityBlock::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame(PropertyAvailabilityBlockStatus::Active, $block->status);
        $this->assertFalse($block->is_admin_restriction);
        $this->assertTrue(
            PropertyAvailabilityBlockEvent::query()
                ->where('property_availability_block_id', $block->id)
                ->where('event_type', 'created')
                ->exists()
        );

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.pricing.availability-blocks.cancel', [$property, $block]), [
                'reason' => 'Work finished early',
            ])
            ->assertRedirect();

        $block->refresh();
        $this->assertSame(PropertyAvailabilityBlockStatus::Cancelled, $block->status);
        $this->assertNotNull($block->cancelled_at);
    }

    public function test_owner_cannot_cancel_admin_restriction(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);

        $block = new PropertyAvailabilityBlock;
        $block->forceFill([
            'property_id' => $property->id,
            'scope' => PropertyAvailabilityBlockScope::Property->value,
            'block_type' => PropertyAvailabilityBlockType::StopSell->value,
            'status' => PropertyAvailabilityBlockStatus::Active->value,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addDays(2)->toDateString(),
            'is_admin_restriction' => true,
            'reason' => 'Compliance hold',
        ])->save();

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.pricing.availability-blocks.cancel', [$property, $block]))
            ->assertSessionHasErrors('availability');

        $this->assertSame(PropertyAvailabilityBlockStatus::Active, $block->fresh()->status);
    }
}
