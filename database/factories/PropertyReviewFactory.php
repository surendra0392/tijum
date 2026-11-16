<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ReviewStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PropertyReview>
 */
class PropertyReviewFactory extends Factory
{
    protected $model = PropertyReview::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'property_id' => Property::factory(),
            'user_id' => User::factory(),
            'property_room_type_id' => PropertyRoomType::factory(),
            'owner_id' => Owner::factory(),
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 4,
            'communication_rating' => 5,
            'value_rating' => 5,
            'title' => 'Comfortable stay with delicious meals',
            'content' => 'The property was clean, the staff was accommodating, and the included south Indian breakfast was warm and fresh.',
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Suresh R.',
            'submitted_at' => now(),
            'published_at' => null,
            'moderated_at' => null,
            'is_edited' => false,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReviewStatus::Published,
            'published_at' => now(),
            'moderated_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ReviewStatus::Rejected,
            'moderated_at' => now(),
            'moderation_reason' => 'Violates content policy (spam/external link).',
        ]);
    }
}
