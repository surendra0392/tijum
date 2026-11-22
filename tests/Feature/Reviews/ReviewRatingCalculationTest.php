<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\ReviewStatus;
use App\Models\PropertyRatingSummary;
use App\Models\PropertyReview;
use App\Services\Reviews\ReviewModerationService;
use App\Services\Reviews\ReviewRatingCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class ReviewRatingCalculationTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

    private ReviewRatingCalculationService $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = app(ReviewRatingCalculationService::class);
    }

    public function test_property_with_zero_reviews_calculates_zero_rating_without_fake_defaults(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $summary = $this->calculator->recalculateForProperty($property->id);

        $this->assertSame(0.00, (float) $summary->average_rating);
        $this->assertSame(0, $summary->published_review_count);
        $this->assertNull($summary->cleanliness_average);
        $this->assertSame(0, $summary->star_5_count);
    }

    public function test_rating_summary_calculates_accurate_arithmetic_mean_and_star_distribution(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);

        // Review 1: 5 stars, Cleanliness: 5, Food: 4
        $res1 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res1->id,
            'property_id' => $property->id,
            'user_id' => $res1->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 4,
            'communication_rating' => 5,
            'value_rating' => 5,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'User A.',
            'published_at' => CarbonImmutable::now(),
        ]);

        // Review 2: 4 stars, Cleanliness: 4, Food: 5
        $res2 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res2->id,
            'property_id' => $property->id,
            'user_id' => $res2->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'cleanliness_rating' => 4,
            'food_quality_rating' => 5,
            'communication_rating' => 4,
            'value_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'User B.',
            'published_at' => CarbonImmutable::now(),
        ]);

        // (5 + 4) / 2 = 4.50
        $summary = $this->calculator->recalculateForProperty($property->id);

        $this->assertSame(4.50, (float) $summary->average_rating);
        $this->assertSame(2, $summary->published_review_count);
        $this->assertSame(1, $summary->star_5_count);
        $this->assertSame(1, $summary->star_4_count);
        $this->assertSame(0, $summary->star_3_count);
        $this->assertSame(4.50, (float) $summary->cleanliness_average);
        $this->assertSame(4.50, (float) $summary->food_average);

        $distribution = $summary->starDistribution();
        $this->assertSame(1, $distribution[5]);
        $this->assertSame(1, $distribution[4]);
        $this->assertSame(0, $distribution[3]);
    }

    public function test_only_published_reviews_affect_the_rating_summary(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);

        // Published 5-star review
        $res1 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res1->id,
            'property_id' => $property->id,
            'user_id' => $res1->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'User 1.',
            'published_at' => CarbonImmutable::now(),
        ]);

        // Pending 1-star review
        $res2 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res2->id,
            'property_id' => $property->id,
            'user_id' => $res2->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 1,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'User 2.',
        ]);

        // Rejected 1-star review
        $res3 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        PropertyReview::query()->create([
            'reservation_id' => $res3->id,
            'property_id' => $property->id,
            'user_id' => $res3->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 1,
            'status' => ReviewStatus::Rejected,
            'verified_booking' => true,
            'customer_display_name' => 'User 3.',
        ]);

        $summary = $this->calculator->recalculateForProperty($property->id);

        $this->assertSame(5.00, (float) $summary->average_rating);
        $this->assertSame(1, $summary->published_review_count);
        $this->assertSame(1, $summary->star_5_count);
        $this->assertSame(0, $summary->star_1_count);
    }

    public function test_moderation_service_recomputes_ratings_on_status_change(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $admin = $this->createAdminWithPermissions();

        $res1 = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        $review = PropertyReview::query()->create([
            'reservation_id' => $res1->id,
            'property_id' => $property->id,
            'user_id' => $res1->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'User 1.',
        ]);

        $modService = app(ReviewModerationService::class);

        // 1. Publish review -> average becomes 5.00
        $modService->publishReview($review, $admin);
        $summary = PropertyRatingSummary::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame(5.00, (float) $summary->average_rating);
        $this->assertSame(1, $summary->published_review_count);

        // 2. Hide review -> average drops back to 0.00
        $modService->hideReview($review, $admin, 'Hiding for investigation');
        $summary->refresh();
        $this->assertSame(0.00, (float) $summary->average_rating);
        $this->assertSame(0, $summary->published_review_count);
    }
}
