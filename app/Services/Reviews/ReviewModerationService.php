<?php

declare(strict_types=1);

namespace App\Services\Reviews;

use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\Admin;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use Carbon\CarbonImmutable;

class ReviewModerationService
{
    public function __construct(
        private readonly ReviewRatingCalculationService $ratingCalculation,
    ) {}

    public function publishReview(PropertyReview $review, Admin $admin): PropertyReview
    {
        $now = CarbonImmutable::now();

        $review->update([
            'status' => ReviewStatus::Published,
            'published_at' => $review->published_at ?? $now,
            'moderated_at' => $now,
            'moderated_by_admin_id' => $admin->id,
            'moderation_reason' => null,
        ]);

        $this->ratingCalculation->recalculateForProperty($review->property_id);

        return $review->fresh(['property', 'user', 'response']);
    }

    public function rejectReview(
        PropertyReview $review,
        Admin $admin,
        string $reason,
        ?string $internalNotes = null,
    ): PropertyReview {
        $now = CarbonImmutable::now();

        $review->update([
            'status' => ReviewStatus::Rejected,
            'moderated_at' => $now,
            'moderated_by_admin_id' => $admin->id,
            'moderation_reason' => $reason,
            'moderation_internal_notes' => $internalNotes,
        ]);

        $this->ratingCalculation->recalculateForProperty($review->property_id);

        return $review->fresh(['property', 'user']);
    }

    public function hideReview(
        PropertyReview $review,
        Admin $admin,
        string $reason,
        ?string $internalNotes = null,
    ): PropertyReview {
        $now = CarbonImmutable::now();

        $review->update([
            'status' => ReviewStatus::Hidden,
            'moderated_at' => $now,
            'moderated_by_admin_id' => $admin->id,
            'moderation_reason' => $reason,
            'moderation_internal_notes' => $internalNotes,
        ]);

        $this->ratingCalculation->recalculateForProperty($review->property_id);

        return $review->fresh(['property', 'user']);
    }

    public function restoreReview(PropertyReview $review, Admin $admin): PropertyReview
    {
        $now = CarbonImmutable::now();

        $review->update([
            'status' => ReviewStatus::Published,
            'published_at' => $review->published_at ?? $now,
            'moderated_at' => $now,
            'moderated_by_admin_id' => $admin->id,
            'moderation_reason' => null,
        ]);

        $this->ratingCalculation->recalculateForProperty($review->property_id);

        return $review->fresh(['property', 'user']);
    }

    public function publishResponse(PropertyReviewResponse $response, Admin $admin): PropertyReviewResponse
    {
        $now = CarbonImmutable::now();

        $response->update([
            'status' => ReviewResponseStatus::Published,
            'published_at' => $response->published_at ?? $now,
            'moderated_at' => $now,
            'moderated_by_admin_id' => $admin->id,
            'moderation_reason' => null,
        ]);

        return $response->fresh(['review', 'owner']);
    }

    public function rejectResponse(PropertyReviewResponse $response, Admin $admin, string $reason): PropertyReviewResponse
    {
        $now = CarbonImmutable::now();

        $response->update([
            'status' => ReviewResponseStatus::Rejected,
            'moderated_at' => $now,
            'moderated_by_admin_id' => $admin->id,
            'moderation_reason' => $reason,
        ]);

        return $response->fresh(['review', 'owner']);
    }
}
