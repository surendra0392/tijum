<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner;

use App\Enums\ReviewReportReason;
use App\Enums\ReviewReportStatus;
use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyReviewReport;
use App\Models\PropertyReviewResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner) {
            abort(403);
        }

        $propertyId = $request->query('property_id') ? (int) $request->query('property_id') : null;
        $ratingFilter = $request->query('rating') ? (int) $request->query('rating') : null;
        $statusFilter = $request->query('status');

        $properties = Property::query()
            ->where('owner_id', $owner->id)
            ->with(['ratingSummary'])
            ->get();

        $allowedPropertyIds = $properties->pluck('id')->all();

        $query = PropertyReview::query()
            ->whereIn('property_id', $allowedPropertyIds)
            ->with(['property.city', 'roomType', 'response'])
            ->latest('created_at');

        if ($propertyId !== null && in_array($propertyId, $allowedPropertyIds, true)) {
            $query->where('property_id', $propertyId);
        }

        if ($ratingFilter !== null && $ratingFilter >= 1 && $ratingFilter <= 5) {
            $query->where('overall_rating', $ratingFilter);
        }

        if (is_string($statusFilter) && in_array($statusFilter, ReviewStatus::values(), true)) {
            $query->where('status', $statusFilter);
        }

        $reviews = $query->paginate(15)->withQueryString();

        $totalReviews = PropertyReview::query()->whereIn('property_id', $allowedPropertyIds)->count();
        $publishedReviews = PropertyReview::query()->whereIn('property_id', $allowedPropertyIds)->where('status', ReviewStatus::Published)->count();
        $unansweredReviews = PropertyReview::query()
            ->whereIn('property_id', $allowedPropertyIds)
            ->where('status', ReviewStatus::Published)
            ->whereDoesntHave('response')
            ->count();

        return Inertia::render('owner/reviews/index', [
            'properties' => $properties->map(fn (Property $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'average_rating' => $p->ratingSummary?->average_rating ?? 0.00,
                'published_count' => $p->ratingSummary?->published_review_count ?? 0,
            ])->values()->all(),
            'stats' => [
                'total_reviews' => $totalReviews,
                'published_reviews' => $publishedReviews,
                'unanswered_reviews' => $unansweredReviews,
            ],
            'filters' => [
                'property_id' => $propertyId,
                'rating' => $ratingFilter,
                'status' => $statusFilter,
            ],
            'reviews' => $reviews->through(fn (PropertyReview $r) => [
                'id' => $r->id,
                'property_name' => $r->property->name,
                'customer_display_name' => $r->customer_display_name,
                'room_type_name' => $r->roomType?->name ?? 'Standard',
                'overall_rating' => $r->overall_rating,
                'cleanliness_rating' => $r->cleanliness_rating,
                'food_quality_rating' => $r->food_quality_rating,
                'communication_rating' => $r->communication_rating,
                'value_rating' => $r->value_rating,
                'title' => $r->title,
                'content' => $r->content,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'verified_booking' => $r->verified_booking,
                'submitted_at' => $r->submitted_at?->format('d M Y, H:i'),
                'published_at' => $r->published_at?->format('d M Y'),
                'response' => $r->response ? [
                    'id' => $r->response->id,
                    'response_text' => $r->response->response_text,
                    'status' => $r->response->status->value,
                    'status_label' => $r->response->status->label(),
                    'published_at' => $r->response->published_at?->format('d M Y'),
                ] : null,
            ]),
        ]);
    }

    public function storeResponse(Request $request, PropertyReview $review): RedirectResponse
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner || (int) $review->owner_id !== (int) $owner->id) {
            abort(403, 'Unauthorized to respond to this review.');
        }

        if (! $review->isPublished()) {
            return back()->with('error', 'Responses can only be submitted for published reviews.');
        }

        if ($review->response()->exists()) {
            return back()->with('error', 'A response has already been submitted for this review.');
        }

        $validated = $request->validate([
            'response_text' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        PropertyReviewResponse::query()->create([
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => trim((string) $validated['response_text']),
            'status' => ReviewResponseStatus::PendingModeration,
            'submitted_at' => CarbonImmutable::now(),
        ]);

        return back()->with('status', 'Your response has been submitted for moderation and will appear once approved.');
    }

    public function updateResponse(Request $request, PropertyReview $review): RedirectResponse
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner || (int) $review->owner_id !== (int) $owner->id) {
            abort(403, 'Unauthorized.');
        }

        $response = $review->response;
        if (! $response instanceof PropertyReviewResponse) {
            abort(404, 'Response not found.');
        }

        $validated = $request->validate([
            'response_text' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $response->update([
            'response_text' => trim((string) $validated['response_text']),
            'is_edited' => true,
            'edited_at' => CarbonImmutable::now(),
            'status' => ReviewResponseStatus::PendingModeration,
        ]);

        return back()->with('status', 'Your response has been updated and resubmitted for moderation.');
    }

    public function reportReview(Request $request, PropertyReview $review): RedirectResponse
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner || (int) $review->owner_id !== (int) $owner->id) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'reason_category' => ['required', 'string', 'in:'.implode(',', ReviewReportReason::values())],
            'explanation' => ['nullable', 'string', 'max:1000'],
        ]);

        // Duplicate report check
        $alreadyReported = PropertyReviewReport::query()
            ->where('property_review_id', $review->id)
            ->where('reporter_type', 'owner')
            ->where('reporter_id', $owner->id)
            ->whereNotIn('status', [ReviewReportStatus::ActionTaken->value, ReviewReportStatus::NoViolationFound->value, ReviewReportStatus::Closed->value])
            ->exists();

        if ($alreadyReported) {
            return back()->with('error', 'You have already submitted an active report for this review.');
        }

        PropertyReviewReport::query()->create([
            'property_review_id' => $review->id,
            'reporter_type' => 'owner',
            'reporter_id' => $owner->id,
            'reason_category' => $validated['reason_category'],
            'explanation' => $validated['explanation'] ?? null,
            'status' => ReviewReportStatus::Submitted,
        ]);

        return back()->with('status', 'Thank you. Your report has been submitted to TIJUM operations for investigation. The review remains published pending review.');
    }
}
