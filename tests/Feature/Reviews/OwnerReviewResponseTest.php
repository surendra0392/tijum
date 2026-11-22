<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class OwnerReviewResponseTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

    public function test_owner_can_view_reviews_for_their_properties(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $res = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $property->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'title' => 'Great experience',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Verified Guest',
            'submitted_at' => CarbonImmutable::now()->subDays(1),
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.reviews.index'));

        $response->assertOk();
    }

    public function test_owner_can_submit_response_to_published_review(): void
    {
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
            'title' => 'Good stay',
            'content' => 'Decent food and clean bed.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest A.',
            'submitted_at' => CarbonImmutable::now()->subDays(1),
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.reviews.response.store', ['review' => $review->id]), [
                'response_text' => 'Thank you for staying with us! We are delighted you enjoyed our food.',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('property_review_responses', [
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => 'Thank you for staying with us! We are delighted you enjoyed our food.',
            'status' => ReviewResponseStatus::PendingModeration->value,
        ]);
    }

    public function test_owner_cannot_respond_to_another_owners_property_review(): void
    {
        $ownerA = $this->createActiveOwner();
        $ownerB = $this->createActiveOwner();
        $propertyA = $this->createBookableProperty($ownerA);
        $roomTypeA = $this->createBookableRoomType($propertyA);
        $res = $this->createPaidCompletedReservation(property: $propertyA, roomType: $roomTypeA);

        $review = PropertyReview::query()->create([
            'reservation_id' => $res->id,
            'property_id' => $propertyA->id,
            'user_id' => $res->user_id,
            'property_room_type_id' => $roomTypeA->id,
            'owner_id' => $ownerA->id,
            'overall_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest A.',
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($ownerB, 'owner')
            ->post(route('owner.reviews.response.store', ['review' => $review->id]), [
                'response_text' => 'Unauthorized response attempt by competitor.',
            ]);

        $response->assertForbidden();
    }

    public function test_owner_cannot_respond_to_unpublished_review(): void
    {
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
            'overall_rating' => 2,
            'status' => ReviewStatus::PendingModeration, // Not published
            'verified_booking' => true,
            'customer_display_name' => 'Guest A.',
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.reviews.response.store', ['review' => $review->id]), [
                'response_text' => 'Attempting to reply to pending review.',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_owner_dashboard_counts_only_published_reviews_without_response(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);

        $unansweredRes = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        $answeredRes = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);
        $pendingRes = $this->createPaidCompletedReservation(property: $property, roomType: $roomType);

        PropertyReview::query()->create([
            'reservation_id' => $unansweredRes->id,
            'property_id' => $property->id,
            'user_id' => $unansweredRes->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest One',
            'published_at' => CarbonImmutable::now(),
        ]);

        $answeredReview = PropertyReview::query()->create([
            'reservation_id' => $answeredRes->id,
            'property_id' => $property->id,
            'user_id' => $answeredRes->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest Two',
            'published_at' => CarbonImmutable::now(),
        ]);

        PropertyReviewResponse::query()->create([
            'property_review_id' => $answeredReview->id,
            'owner_id' => $owner->id,
            'response_text' => 'Thank you for visiting!',
            'status' => ReviewResponseStatus::Published,
            'submitted_at' => CarbonImmutable::now(),
            'published_at' => CarbonImmutable::now(),
        ]);

        PropertyReview::query()->create([
            'reservation_id' => $pendingRes->id,
            'property_id' => $property->id,
            'user_id' => $pendingRes->user_id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 3,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Guest Three',
        ]);

        $otherOwner = $this->createActiveOwner();
        $otherProperty = $this->createBookableProperty($otherOwner);
        $otherRoomType = $this->createBookableRoomType($otherProperty);
        $otherRes = $this->createPaidCompletedReservation(property: $otherProperty, roomType: $otherRoomType);

        PropertyReview::query()->create([
            'reservation_id' => $otherRes->id,
            'property_id' => $otherProperty->id,
            'user_id' => $otherRes->user_id,
            'property_room_type_id' => $otherRoomType->id,
            'owner_id' => $otherOwner->id,
            'overall_rating' => 5,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Other Guest',
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.dashboard'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/dashboard')
                ->where('operationsSummary.pendingReviews', 1)
            );
    }
}
