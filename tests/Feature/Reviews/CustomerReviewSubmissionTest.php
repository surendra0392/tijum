<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\ReviewStatus;
use App\Models\PropertyReview;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class CustomerReviewSubmissionTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

    public function test_customer_can_view_review_form_for_eligible_reservation(): void
    {
        $user = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);

        $response = $this->actingAs($user, 'web')
            ->get(route('reservations.review.create', ['reservation' => $reservation->booking_reference]));

        $response->assertOk();
    }

    public function test_customer_submits_valid_review_with_initial_pending_moderation_status(): void
    {
        $user = $this->createCustomerUser(['name' => 'Suresh Reddy']);
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);

        $response = $this->actingAs($user, 'web')
            ->post(route('reservations.review.store', ['reservation' => $reservation->booking_reference]), [
                'overall_rating' => 5,
                'cleanliness_rating' => 5,
                'food_quality_rating' => 4,
                'communication_rating' => 5,
                'value_rating' => 4,
                'title' => 'Exceptional food and study environment',
                'content' => 'The South Indian meals were hot and fresh every day. Quiet rooms and very polite staff.',
            ]);

        $response->assertRedirect(route('reservations.show', ['reservation' => $reservation->booking_reference]));

        $this->assertDatabaseHas('property_reviews', [
            'reservation_id' => $reservation->id,
            'property_id' => $reservation->property_id,
            'user_id' => $user->id,
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 4,
            'status' => ReviewStatus::PendingModeration->value,
            'verified_booking' => 1,
            'customer_display_name' => 'Suresh R.',
        ]);
    }

    public function test_review_submission_rejects_invalid_rating(): void
    {
        $user = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);

        $response = $this->actingAs($user, 'web')
            ->post(route('reservations.review.store', ['reservation' => $reservation->booking_reference]), [
                'overall_rating' => 6, // Max is 5
                'title' => 'Invalid Rating',
            ]);

        $response->assertSessionHasErrors(['overall_rating']);
    }

    public function test_review_submission_rejects_content_exceeding_max_characters(): void
    {
        $user = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);

        $response = $this->actingAs($user, 'web')
            ->post(route('reservations.review.store', ['reservation' => $reservation->booking_reference]), [
                'overall_rating' => 4,
                'content' => str_repeat('A', 3001),
            ]);

        $response->assertSessionHasErrors(['content']);
    }

    public function test_customer_can_edit_review_within_7_days_and_creates_revision_snapshot(): void
    {
        $user = $this->createCustomerUser(['name' => 'Kiran Varma']);
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);

        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $reservation->property_id,
            'user_id' => $user->id,
            'property_room_type_id' => $reservation->property_room_type_id,
            'owner_id' => $reservation->property->owner_id,
            'overall_rating' => 4,
            'title' => 'Original Title',
            'content' => 'Original feedback text about accommodation.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Kiran V.',
            'submitted_at' => CarbonImmutable::now()->subDays(2),
            'published_at' => CarbonImmutable::now()->subDays(1),
        ]);

        $response = $this->actingAs($user, 'web')
            ->put(route('reviews.update', ['review' => $review->id]), [
                'overall_rating' => 5,
                'cleanliness_rating' => 5,
                'title' => 'Updated Title after Host Addressed Issue',
                'content' => 'Host solved the hot water issue immediately. Excellent stay.',
            ]);

        $response->assertRedirect(route('reservations.show', ['reservation' => $reservation->booking_reference]));

        $review->refresh();
        $this->assertSame(5, $review->overall_rating);
        $this->assertSame('Updated Title after Host Addressed Issue', $review->title);
        $this->assertTrue($review->is_edited);
        $this->assertSame(ReviewStatus::PendingModeration, $review->status);

        // Audit revision snapshot exists
        $this->assertDatabaseHas('property_review_revisions', [
            'property_review_id' => $review->id,
            'previous_title' => 'Original Title',
            'previous_overall_rating' => 4,
            'edited_by_user_id' => $user->id,
        ]);
    }

    public function test_customer_cannot_edit_review_after_7_days(): void
    {
        $user = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 15);

        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $reservation->property_id,
            'user_id' => $user->id,
            'property_room_type_id' => $reservation->property_room_type_id,
            'owner_id' => $reservation->property->owner_id,
            'overall_rating' => 4,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Test User',
            'submitted_at' => CarbonImmutable::now()->subDays(10), // > 7 days ago
        ]);

        $response = $this->actingAs($user, 'web')
            ->put(route('reviews.update', ['review' => $review->id]), [
                'overall_rating' => 5,
            ]);

        $response->assertForbidden();
    }
}
