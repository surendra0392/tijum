<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reviews\StorePropertyReviewRequest;
use App\Http\Requests\Reviews\UpdatePropertyReviewRequest;
use App\Models\PropertyReview;
use App\Models\PropertyReviewRevision;
use App\Models\Reservation;
use App\Models\User;
use App\Services\ReservationData;
use App\Services\Reviews\ReviewEligibilityService;
use App\Services\Reviews\ReviewRatingCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerReviewController extends Controller
{
    public function __construct(
        private readonly ReviewEligibilityService $eligibilityService,
        private readonly ReviewRatingCalculationService $ratingCalculation,
        private readonly ReservationData $reservationData,
    ) {}

    public function create(Request $request, string $bookingReference): Response|RedirectResponse
    {
        $user = $request->user('web');
        if (! $user instanceof User) {
            abort(403);
        }

        $reservation = Reservation::query()
            ->where('booking_reference', $bookingReference)
            ->where('user_id', $user->id)
            ->with(['property.category', 'property.city', 'roomType'])
            ->firstOrFail();

        $eligibility = $this->eligibilityService->checkEligibility($reservation, $user);

        if (! $eligibility->isEligible) {
            return redirect()
                ->route('reservations.show', ['reservation' => $reservation->booking_reference])
                ->with('error', $eligibility->reason);
        }

        $property = $reservation->property;

        return Inertia::render('customer/reviews/form', [
            'mode' => 'create',
            'reservation' => $this->reservationData->detail($reservation, 'customer'),
            'property' => [
                'name' => $property->name,
                'locality' => $property->locality,
                'city' => $property->city?->name,
                'food_provided' => (bool) $property->food_provided,
                'breakfast_included' => (bool) $property->breakfast_included,
                'lunch_included' => (bool) $property->lunch_included,
                'dinner_included' => (bool) $property->dinner_included,
            ],
            'eligibility' => [
                'window_deadline' => $eligibility->windowDeadline?->format('d M Y, H:i'),
                'days_remaining' => $eligibility->daysRemaining,
            ],
            'review' => null,
            'maxContentLength' => (int) config('tijum.reviews.max_content_length', 3000),
        ]);
    }

    public function store(StorePropertyReviewRequest $request, string $bookingReference): RedirectResponse
    {
        $user = $request->user('web');
        if (! $user instanceof User) {
            abort(403);
        }

        $reservation = Reservation::query()
            ->where('booking_reference', $bookingReference)
            ->where('user_id', $user->id)
            ->with(['property'])
            ->firstOrFail();

        $eligibility = $this->eligibilityService->checkEligibility($reservation, $user);
        if (! $eligibility->isEligible) {
            return redirect()
                ->route('reservations.show', ['reservation' => $reservation->booking_reference])
                ->with('error', $eligibility->reason);
        }

        $validated = $request->validated();
        $displayName = PropertyReview::formatCustomerDisplayName($user->name);

        PropertyReview::query()->create([
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

        return redirect()
            ->route('reservations.show', ['reservation' => $reservation->booking_reference])
            ->with('status', 'Thank you! Your verified review has been submitted for moderation and will appear on the property page upon verification.');
    }

    public function edit(Request $request, PropertyReview $review): Response|RedirectResponse
    {
        $user = $request->user('web');
        if (! $user instanceof User) {
            abort(403);
        }

        abort_if($review->user_id !== $user->id, 403);

        if (! $review->canBeEditedByUser($user)) {
            return redirect()
                ->route('reservations.show', ['reservation' => $review->reservation->booking_reference])
                ->with('error', 'This review is past the allowed 7-day editing window or cannot be edited.');
        }

        $review->loadMissing(['reservation.property.city', 'reservation.roomType']);
        $reservation = $review->reservation;
        $property = $reservation->property;

        return Inertia::render('customer/reviews/form', [
            'mode' => 'edit',
            'reservation' => $this->reservationData->detail($reservation, 'customer'),
            'property' => [
                'name' => $property->name,
                'locality' => $property->locality,
                'city' => $property->city?->name,
                'food_provided' => (bool) $property->food_provided,
                'breakfast_included' => (bool) $property->breakfast_included,
                'lunch_included' => (bool) $property->lunch_included,
                'dinner_included' => (bool) $property->dinner_included,
            ],
            'eligibility' => null,
            'review' => [
                'id' => $review->id,
                'overall_rating' => $review->overall_rating,
                'cleanliness_rating' => $review->cleanliness_rating,
                'food_quality_rating' => $review->food_quality_rating,
                'communication_rating' => $review->communication_rating,
                'value_rating' => $review->value_rating,
                'title' => $review->title,
                'content' => $review->content,
                'status' => $review->status->value,
                'status_label' => $review->status->label(),
            ],
            'maxContentLength' => (int) config('tijum.reviews.max_content_length', 3000),
        ]);
    }

    public function update(UpdatePropertyReviewRequest $request, PropertyReview $review): RedirectResponse
    {
        $user = $request->user('web');
        if (! $user instanceof User) {
            abort(403);
        }

        abort_if($review->user_id !== $user->id, 403);

        if (! $review->canBeEditedByUser($user)) {
            abort(403, 'Review cannot be edited.');
        }

        $validated = $request->validated();

        // 1. Snapshot previous version into revisions audit table
        PropertyReviewRevision::query()->create([
            'property_review_id' => $review->id,
            'previous_title' => $review->title,
            'previous_content' => $review->content,
            'previous_overall_rating' => $review->overall_rating,
            'previous_cleanliness_rating' => $review->cleanliness_rating,
            'previous_food_quality_rating' => $review->food_quality_rating,
            'previous_communication_rating' => $review->communication_rating,
            'previous_value_rating' => $review->value_rating,
            'edited_by_user_id' => $user->id,
            'created_at' => CarbonImmutable::now(),
        ]);

        // 2. Update review and return to moderation
        $review->update([
            'overall_rating' => (int) $validated['overall_rating'],
            'cleanliness_rating' => isset($validated['cleanliness_rating']) ? (int) $validated['cleanliness_rating'] : null,
            'food_quality_rating' => isset($validated['food_quality_rating']) ? (int) $validated['food_quality_rating'] : null,
            'communication_rating' => isset($validated['communication_rating']) ? (int) $validated['communication_rating'] : null,
            'value_rating' => isset($validated['value_rating']) ? (int) $validated['value_rating'] : null,
            'title' => $validated['title'] ?? null,
            'content' => $validated['content'] ?? null,
            'is_edited' => true,
            'edited_at' => CarbonImmutable::now(),
            'status' => ReviewStatus::PendingModeration,
        ]);

        $this->ratingCalculation->recalculateForProperty($review->property_id);

        return redirect()
            ->route('reservations.show', ['reservation' => $review->reservation->booking_reference])
            ->with('status', 'Your review has been updated and resubmitted for moderation.');
    }
}
