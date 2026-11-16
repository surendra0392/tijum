<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Reviews;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\City;
use App\Models\PropertyReview;
use App\Services\Reviews\ReviewModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminReviewController extends Controller
{
    public function __construct(
        private readonly ReviewModerationService $moderationService,
    ) {}

    public function index(Request $request): Response
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('reviews.view')) {
            abort(403);
        }

        $status = $request->query('status');
        $rating = $request->query('rating') ? (int) $request->query('rating') : null;
        $cityId = $request->query('city_id') ? (int) $request->query('city_id') : null;
        $search = $request->query('search');

        $query = PropertyReview::query()
            ->with(['property.city', 'user', 'reservation', 'response', 'reports'])
            ->latest('created_at');

        if (is_string($status) && in_array($status, ReviewStatus::values(), true)) {
            $query->where('status', $status);
        }

        if ($rating !== null && $rating >= 1 && $rating <= 5) {
            $query->where('overall_rating', $rating);
        }

        if ($cityId !== null) {
            $query->whereHas('property', fn ($q) => $q->where('city_id', $cityId));
        }

        if (is_string($search) && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function ($q) use ($term): void {
                $q->where('title', 'like', $term)
                    ->orWhere('content', 'like', $term)
                    ->orWhere('customer_display_name', 'like', $term)
                    ->orWhereHas('property', fn ($pq) => $pq->where('name', 'like', $term))
                    ->orWhereHas('reservation', fn ($rq) => $rq->where('booking_reference', 'like', $term));
            });
        }

        $reviews = $query->paginate(15)->withQueryString();

        $cities = City::query()->where('is_active', true)->orderBy('sort_order')->get();

        $counts = [
            'pending_moderation' => PropertyReview::query()->where('status', ReviewStatus::PendingModeration)->count(),
            'published' => PropertyReview::query()->where('status', ReviewStatus::Published)->count(),
            'rejected' => PropertyReview::query()->where('status', ReviewStatus::Rejected)->count(),
            'hidden' => PropertyReview::query()->where('status', ReviewStatus::Hidden)->count(),
            'reported' => PropertyReview::query()->whereHas('reports', fn ($q) => $q->whereIn('status', ['submitted', 'under_review']))->count(),
        ];

        return Inertia::render('admin/reviews/index', [
            'reviews' => $reviews->through(fn (PropertyReview $r) => [
                'id' => $r->id,
                'booking_reference' => $r->reservation?->booking_reference ?? 'N/A',
                'property_name' => $r->property->name,
                'city_name' => $r->property->city?->name,
                'customer_display_name' => $r->customer_display_name,
                'customer_email' => $admin->hasPermission('*') ? $r->user->email : null,
                'overall_rating' => $r->overall_rating,
                'title' => $r->title,
                'content' => $r->content,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'verified_booking' => $r->verified_booking,
                'submitted_at' => $r->submitted_at?->format('d M Y, H:i'),
                'published_at' => $r->published_at?->format('d M Y'),
                'reports_count' => $r->reports->count(),
                'has_response' => $r->response !== null,
            ]),
            'filters' => [
                'status' => $status,
                'rating' => $rating,
                'city_id' => $cityId,
                'search' => $search,
            ],
            'counts' => $counts,
            'cities' => $cities->map(fn (City $c) => ['id' => $c->id, 'name' => $c->name])->all(),
        ]);
    }

    public function show(Request $request, PropertyReview $review): Response
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('reviews.view')) {
            abort(403);
        }

        $review->loadMissing([
            'property.city',
            'property.owner',
            'user',
            'reservation.payments',
            'roomType',
            'response.owner',
            'revisions.editedByUser',
            'reports',
            'moderatedByAdmin',
        ]);

        return Inertia::render('admin/reviews/show', [
            'review' => [
                'id' => $review->id,
                'booking_reference' => $review->reservation->booking_reference,
                'reservation_id' => $review->reservation->id,
                'check_in_date' => $review->reservation->check_in_date->format('d M Y'),
                'checkout_date' => $review->reservation->checkout_date->format('d M Y'),
                'property' => [
                    'id' => $review->property->id,
                    'name' => $review->property->name,
                    'city' => $review->property->city?->name,
                    'owner_name' => $review->property->owner->name,
                ],
                'room_type_name' => $review->roomType?->name ?? 'Standard',
                'customer_display_name' => $review->customer_display_name,
                'customer_full_name' => $review->user->name,
                'customer_email' => $admin->hasPermission('*') ? $review->user->email : null,
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
                'submitted_at' => $review->submitted_at?->format('d M Y, H:i'),
                'published_at' => $review->published_at?->format('d M Y, H:i'),
                'moderated_at' => $review->moderated_at?->format('d M Y, H:i'),
                'moderator_name' => $review->moderatedByAdmin?->name,
                'moderation_reason' => $review->moderation_reason,
                'moderation_internal_notes' => $review->moderation_internal_notes,
                'is_edited' => $review->is_edited,
                'response' => $review->response ? [
                    'id' => $review->response->id,
                    'owner_name' => $review->response->owner->name,
                    'response_text' => $review->response->response_text,
                    'status' => $review->response->status->value,
                    'status_label' => $review->response->status->label(),
                    'submitted_at' => $review->response->submitted_at?->format('d M Y, H:i'),
                    'published_at' => $review->response->published_at?->format('d M Y, H:i'),
                ] : null,
                'revisions' => $review->revisions->map(fn ($rev) => [
                    'id' => $rev->id,
                    'previous_title' => $rev->previous_title,
                    'previous_content' => $rev->previous_content,
                    'previous_overall_rating' => $rev->previous_overall_rating,
                    'created_at' => $rev->created_at->format('d M Y, H:i'),
                ])->all(),
                'reports' => $review->reports->map(fn ($rep) => [
                    'id' => $rep->id,
                    'reporter_type' => $rep->reporter_type,
                    'reason_label' => $rep->reason_category->label(),
                    'explanation' => $rep->explanation,
                    'status' => $rep->status->value,
                    'status_label' => $rep->status->label(),
                    'created_at' => $rep->created_at->format('d M Y, H:i'),
                ])->all(),
            ],
        ]);
    }

    public function moderate(Request $request, PropertyReview $review): RedirectResponse
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('reviews.moderate')) {
            abort(403);
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,publish,reject,hide,restore'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'internal_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $action = $validated['action'];
        $reason = $validated['reason'] ?? '';
        $notes = $validated['internal_notes'] ?? null;

        match ($action) {
            'approve', 'publish' => $this->moderationService->publishReview($review, $admin),
            'reject' => $this->moderationService->rejectReview($review, $admin, $reason ?: 'Does not meet content policy guidelines.', $notes),
            'hide' => $this->moderationService->hideReview($review, $admin, $reason ?: 'Temporarily hidden by moderation.', $notes),
            'restore' => $this->moderationService->restoreReview($review, $admin),
        };

        return back()->with('status', 'Review moderation updated successfully.');
    }

    public function moderateResponse(Request $request, PropertyReview $review): RedirectResponse
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('reviews.moderate')) {
            abort(403);
        }

        $response = $review->response;
        if ($response === null) {
            abort(404, 'Response not found.');
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,publish,reject'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validated['action'] === 'approve' || $validated['action'] === 'publish') {
            $this->moderationService->publishResponse($response, $admin);
        } else {
            $this->moderationService->rejectResponse($response, $admin, $validated['reason'] ?? 'Response violates content guidelines.');
        }

        return back()->with('status', 'Owner response moderation updated successfully.');
    }
}
