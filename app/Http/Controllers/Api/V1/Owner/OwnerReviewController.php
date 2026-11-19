<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\ReviewResponseStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use App\Models\PropertyRoomType;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerReviewController extends ApiController
{
    /**
     * List reviews for properties owned by the authenticated owner.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $propertyIds = Property::query()->where('owner_id', $owner->id)->pluck('id');

        $query = PropertyReview::query()
            ->whereIn('property_id', $propertyIds)
            ->with([
                'property:id,name,slug',
                'roomType:id,name',
                'reservation:id,booking_reference,check_in_date,checkout_date',
                'response',
            ])
            ->latest('created_at');

        if ($request->filled('property_id')) {
            $query->where('property_id', (int) $request->query('property_id'));
        }

        if ($request->filled('rating')) {
            $query->where('overall_rating', (int) $request->query('rating'));
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->query('status'));
        }

        $perPage = min((int) ($request->query('per_page', 15)), 50);
        $paginated = $query->paginate($perPage);

        $items = $paginated->getCollection()->map(static fn (PropertyReview $review): array => [
            'id' => $review->id,
            'property_id' => $review->property_id,
            'property_name' => $review->property->name,
            'booking_reference' => $review->reservation->booking_reference,
            'guest_name' => $review->customer_display_name,
            'customer_display_name' => $review->customer_display_name,
            'room_type_name' => $review->roomType instanceof PropertyRoomType ? $review->roomType->name : 'Standard',
            'stay_dates' => [
                'check_in_date' => $review->reservation->check_in_date->format('Y-m-d'),
                'checkout_date' => $review->reservation->checkout_date->format('Y-m-d'),
            ],
            'overall_rating' => $review->overall_rating,
            'cleanliness_rating' => $review->cleanliness_rating,
            'food_quality_rating' => $review->food_quality_rating,
            'communication_rating' => $review->communication_rating,
            'value_rating' => $review->value_rating,
            'title' => $review->title,
            'content' => $review->content,
            'status' => $review->status->value,
            'status_label' => $review->status->label(),
            'verified_booking' => $review->verified_booking,
            'submitted_at' => $review->submitted_at?->toIso8601String(),
            'published_at' => $review->published_at?->toIso8601String(),
            'response' => $review->response ? [
                'id' => $review->response->id,
                'response_text' => $review->response->response_text,
                'status' => $review->response->status->value,
                'status_label' => $review->response->status->label(),
                'submitted_at' => $review->response->submitted_at?->toIso8601String(),
                'published_at' => $review->response->published_at?->toIso8601String(),
            ] : null,
        ])->values()->all();

        return $this->success(
            $items,
            'Partner reviews retrieved successfully.',
            200,
            [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ]
        );
    }

    /**
     * Submit or update an owner response to a published review.
     */
    public function respond(Request $request, int|string $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $review = PropertyReview::query()
            ->whereKey($id)
            ->with(['property', 'response'])
            ->first();

        if ($review === null || (int) $review->owner_id !== (int) $owner->id) {
            return $this->error("Review '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        if (! $review->isPublished()) {
            return $this->error('Responses can only be submitted for published reviews.', 'INVALID_STATUS', 422);
        }

        $responseText = (string) ($request->input('response') ?? $request->input('response_text') ?? '');
        $trimmedResponse = trim($responseText);

        if ($trimmedResponse === '') {
            return $this->error('The response field is required.', 'VALIDATION_ERROR', 422, [
                'response' => ['The response field is required.'],
            ]);
        }

        if (mb_strlen($trimmedResponse) > 2500) {
            return $this->error('The response cannot exceed 2500 characters.', 'VALIDATION_ERROR', 422, [
                'response' => ['The response cannot exceed 2500 characters.'],
            ]);
        }

        $existingResponse = $review->response;
        if ($existingResponse instanceof PropertyReviewResponse) {
            $existingResponse->update([
                'response_text' => $trimmedResponse,
                'status' => ReviewResponseStatus::PendingModeration,
                'is_edited' => true,
                'edited_at' => CarbonImmutable::now(),
            ]);
            $responseModel = $existingResponse->fresh();
        } else {
            /** @var PropertyReviewResponse $responseModel */
            $responseModel = PropertyReviewResponse::query()->create([
                'property_review_id' => $review->id,
                'owner_id' => $owner->id,
                'response_text' => $trimmedResponse,
                'status' => ReviewResponseStatus::PendingModeration,
                'submitted_at' => CarbonImmutable::now(),
            ]);
        }

        $data = [
            'id' => $responseModel->id,
            'property_review_id' => $responseModel->property_review_id,
            'response_text' => $responseModel->response_text,
            'status' => $responseModel->status->value,
            'status_label' => $responseModel->status->label(),
            'submitted_at' => $responseModel->submitted_at?->toIso8601String(),
            'published_at' => $responseModel->published_at?->toIso8601String(),
        ];

        return $this->success(
            $data,
            'Review response submitted successfully and is pending moderation.'
        );
    }
}
