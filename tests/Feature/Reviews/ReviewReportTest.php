<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\ReviewReportReason;
use App\Enums\ReviewReportStatus;
use App\Enums\ReviewStatus;
use App\Models\PropertyReview;
use App\Models\PropertyReviewReport;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class ReviewReportTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

    public function test_customer_can_report_review_for_content_violation(): void
    {
        $user = $this->createCustomerUser();
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
            'title' => 'Abusive text',
            'content' => 'Call the owner at 9999999999 and do not stay here.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Anonymous',
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($user, 'web')
            ->post(route('reviews.report', ['review' => $review->id]), [
                'reason_category' => ReviewReportReason::PersonalInfoDisclosed->value,
                'explanation' => 'Review exposes private phone number.',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('property_review_reports', [
            'property_review_id' => $review->id,
            'reporter_type' => 'user',
            'reporter_id' => $user->id,
            'reason_category' => ReviewReportReason::PersonalInfoDisclosed->value,
            'status' => ReviewReportStatus::Submitted->value,
        ]);

        // Assert review remains published pending investigation
        $review->refresh();
        $this->assertSame(ReviewStatus::Published, $review->status);
    }

    public function test_owner_can_report_review_on_their_property(): void
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
            'overall_rating' => 1,
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Host Guest',
            'published_at' => CarbonImmutable::now(),
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->post(route('owner.reviews.report', ['review' => $review->id]), [
                'reason_category' => ReviewReportReason::FakeFraudulent->value,
                'explanation' => 'Guest claims we charged extra for AC which is false as per booking.',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('property_review_reports', [
            'property_review_id' => $review->id,
            'reporter_type' => 'owner',
            'reporter_id' => $owner->id,
            'reason_category' => ReviewReportReason::FakeFraudulent->value,
            'status' => ReviewReportStatus::Submitted->value,
        ]);
    }

    public function test_duplicate_active_reports_from_same_user_are_prevented(): void
    {
        $user = $this->createCustomerUser();
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
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest',
            'published_at' => CarbonImmutable::now(),
        ]);

        // First report
        $this->actingAs($user, 'web')
            ->post(route('reviews.report', ['review' => $review->id]), [
                'reason_category' => ReviewReportReason::SpamAdvertising->value,
            ])
            ->assertRedirect();

        // Second duplicate report
        $response = $this->actingAs($user, 'web')
            ->post(route('reviews.report', ['review' => $review->id]), [
                'reason_category' => ReviewReportReason::SpamAdvertising->value,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_admin_can_resolve_review_report_with_finding(): void
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
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Guest',
            'published_at' => CarbonImmutable::now(),
        ]);

        $report = PropertyReviewReport::query()->create([
            'property_review_id' => $review->id,
            'reporter_type' => 'owner',
            'reporter_id' => $owner->id,
            'reason_category' => ReviewReportReason::AbusiveThreatening,
            'explanation' => 'Profanity used.',
            'status' => ReviewReportStatus::Submitted,
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.review-reports.resolve', ['report' => $report->id]), [
                'status' => ReviewReportStatus::ActionTaken->value,
                'resolution_reason' => 'Review hidden and customer notified to edit profane wording.',
                'resolution_notes' => 'Internal moderation note.',
            ]);

        $response->assertRedirect();

        $report->refresh();
        $this->assertSame(ReviewReportStatus::ActionTaken, $report->status);
        $this->assertSame('Review hidden and customer notified to edit profane wording.', $report->resolution_reason);
        $this->assertSame($admin->id, $report->resolved_by_admin_id);
    }
}
