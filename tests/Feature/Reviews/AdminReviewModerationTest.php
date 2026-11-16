<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\PropertyRatingSummary;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class AdminReviewModerationTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

    public function test_admin_can_view_reviews_index_and_counts(): void
    {
        $admin = $this->createAdminWithPermissions();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        $secondRes = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Verified Guest',
            'submitted_at' => CarbonImmutable::now(),
        ]);

        PropertyReview::query()->create([
            'reservation_id' => $secondRes->id,
            'property_id' => $property->id,
            'user_id' => $secondRes->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Second Guest',
            'submitted_at' => CarbonImmutable::now()->subHour(),
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.reviews.index'));

        $response->assertOk();
    }

    public function test_admin_can_publish_review_and_triggers_rating_recalculation(): void
    {
        $admin = $this->createAdminWithPermissions();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        $review = PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 5,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Verified Guest',
            'submitted_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.reviews.moderate', ['review' => $review->id]), [
                'action' => 'publish',
            ]);

        $response->assertRedirect();

        $review->refresh();
        $this->assertSame(ReviewStatus::Published, $review->status);
        $this->assertNotNull($review->published_at);
        $this->assertSame($admin->id, $review->moderated_by_admin_id);

        // Rating summary updated
        $summary = PropertyRatingSummary::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame(5.00, (float) $summary->average_rating);
        $this->assertSame(1, $summary->published_review_count);
    }

    public function test_admin_can_reject_review_with_objective_reason(): void
    {
        $admin = $this->createAdminWithPermissions();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        $review = PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 1,
            'content' => 'Call this scammer host at 9876543210',
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Bad Guest',
            'submitted_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.reviews.moderate', ['review' => $review->id]), [
                'action' => 'reject',
                'reason' => 'Discloses private personal contact number (PII violation).',
            ]);

        $response->assertRedirect();

        $review->refresh();
        $this->assertSame(ReviewStatus::Rejected, $review->status);
        $this->assertSame('Discloses private personal contact number (PII violation).', $review->moderation_reason);
        $this->assertSame($admin->id, $review->moderated_by_admin_id);
    }

    public function test_admin_can_hide_and_restore_published_review(): void
    {
        $admin = $this->createAdminWithPermissions();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        $review = PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest',
            'published_at' => CarbonImmutable::now(),
        ]);

        // Hide
        $this->actingAs($admin, 'admin')
            ->post(route('admin.reviews.moderate', ['review' => $review->id]), [
                'action' => 'hide',
                'reason' => 'Temporarily hidden while investigating owner report.',
            ])
            ->assertRedirect();

        $review->refresh();
        $this->assertSame(ReviewStatus::Hidden, $review->status);

        // Restore
        $this->actingAs($admin, 'admin')
            ->post(route('admin.reviews.moderate', ['review' => $review->id]), [
                'action' => 'restore',
            ])
            ->assertRedirect();

        $review->refresh();
        $this->assertSame(ReviewStatus::Published, $review->status);
    }

    public function test_admin_can_moderate_owner_response(): void
    {
        $admin = $this->createAdminWithPermissions();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        $review = PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest',
            'published_at' => CarbonImmutable::now(),
        ]);

        $responseObj = PropertyReviewResponse::query()->create([
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => 'We are glad you enjoyed the stay! Welcome back anytime.',
            'status' => ReviewResponseStatus::PendingModeration,
        ]);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.reviews.moderate-response', ['review' => $review->id]), [
                'action' => 'publish',
            ])
            ->assertRedirect();

        $responseObj->refresh();
        $this->assertSame(ReviewResponseStatus::Published, $responseObj->status);
        $this->assertNotNull($responseObj->published_at);
        $this->assertSame($admin->id, $responseObj->moderated_by_admin_id);
    }
}
