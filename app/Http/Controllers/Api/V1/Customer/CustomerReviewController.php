<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Reviews\StorePropertyReviewRequest;
use App\Models\PropertyReview;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Reviews\ReviewEligibilityService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerReviewController extends ApiController
{
    public function __construct(
        private readonly ReviewEligibilityService $eligibilityService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reviews = PropertyReview::query()
            ->where('user_id', $user->id)
            ->with(['property'])
            ->latest('submitted_at')
            ->paginate(10);

        return $this->success(
            $reviews->items(),
            'Customer reviews retrieved',
            200,
            [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
            ]
        );
    }

    public function eligible(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reservations = Reservation::query()
            ->where('user_id', $user->id)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDoesntHave('review')
            ->with(['property.city', 'roomType'])
            ->latest('checkout_date')
            ->get();

        $eligibleList = [];
        foreach ($reservations as $res) {
            $check = $this->eligibilityService->checkEligibility($res, $user);
            if ($check->isEligible) {
                $eligibleList[] = [
                    'booking_reference' => $res->booking_reference,
                    'property_name' => $res->property?->name,
                    'property_slug' => $res->property?->slug,
                    'check_in_date' => $res->check_in_date->format('Y-m-d'),
                    'check_out_date' => $res->checkout_date->format('Y-m-d'),
                    'days_remaining' => $check->daysRemaining,
                    'deadline' => $check->windowDeadline?->toIso8601String(),
                ];
            }
        }

        return $this->success($eligibleList, 'Eligible reservations for review');
    }

    public function store(StorePropertyReviewRequest $request, string $bookingReference): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $bookingReference)
            ->where('user_id', $user->id)
            ->with(['property'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$bookingReference}' not found.", 'RESERVATION_NOT_FOUND', 404);
        }

        $eligibility = $this->eligibilityService->checkEligibility($reservation, $user);
        if (! $eligibility->isEligible) {
            return $this->error($eligibility->reason ?? 'Not eligible to submit review.', 'NOT_ELIGIBLE', 422);
        }

        $validated = $request->validated();
        $displayName = PropertyReview::formatCustomerDisplayName($user->name);

        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $reservation->property_id,
            'user_id' => $user->id,
            'property_room_type_id' => $reservation->property_room_type_id,
            'owner_id' => $reservation->property->owner_id,
            'overall_rating' => (int) $validated['overall_rating'],
            'cleanliness_rating' => isset($validated['cleanliness_rating']) ? (int) $validated['cleanliness_rating'] : null,
            'food_quality_rating' => isset($validated['food_quality_rating']) ? (int) $validated['food_quality_rating'] : null,
            'communication_rating' => isset($validated['communication_rating']) ? (int) $validated['communication_rating'] : null,
            'value_rating' => isset($validated['value_rating']) ? (int) $validated['value_rating'] : null,
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'] ?? null,
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => $displayName,
            'submitted_at' => CarbonImmutable::now(),
        ]);

        return $this->success(
            $review,
            'Verified review submitted successfully. It will be published upon moderation verification.',
            201
        );
    }
}
