<?php

declare(strict_types=1);

namespace App\Http\Controllers\Shared;

use App\Enums\ReviewReportReason;
use App\Enums\ReviewReportStatus;
use App\Http\Controllers\Controller;
use App\Models\PropertyReview;
use App\Models\PropertyReviewReport;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReviewReportController extends Controller
{
    public function store(Request $request, PropertyReview $review): RedirectResponse
    {
        $user = $request->user('web');
        if (! $user instanceof User) {
            abort(403, 'You must be signed in to report a review.');
        }

        if (! $review->isPublished()) {
            abort(404, 'Review is not available for reporting.');
        }

        $validated = $request->validate([
            'reason_category' => ['required', 'string', 'in:'.implode(',', ReviewReportReason::values())],
            'explanation' => ['nullable', 'string', 'max:1000'],
        ]);

        $alreadyReported = PropertyReviewReport::query()
            ->where('property_review_id', $review->id)
            ->where('reporter_type', 'user')
            ->where('reporter_id', $user->id)
            ->whereNotIn('status', [ReviewReportStatus::ActionTaken->value, ReviewReportStatus::NoViolationFound->value, ReviewReportStatus::Closed->value])
            ->exists();

        if ($alreadyReported) {
            return back()->with('error', 'You have already reported this review.');
        }

        $explanation = isset($validated['explanation']) && is_string($validated['explanation'])
            ? trim(strip_tags($validated['explanation']))
            : null;

        PropertyReviewReport::query()->create([
            'property_review_id' => $review->id,
            'reporter_type' => 'user',
            'reporter_id' => $user->id,
            'reason_category' => $validated['reason_category'],
            'explanation' => $explanation,
            'status' => ReviewReportStatus::Submitted,
        ]);

        return back()->with('status', 'Thank you. Your report has been submitted to TIJUM moderation for investigation.');
    }
}
