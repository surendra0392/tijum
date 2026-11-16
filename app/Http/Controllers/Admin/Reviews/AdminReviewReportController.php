<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Reviews;

use App\Enums\ReviewReportStatus;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\PropertyReviewReport;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminReviewReportController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('review_reports.view')) {
            abort(403);
        }

        $status = $request->query('status');

        $query = PropertyReviewReport::query()
            ->with(['review.property', 'assignedAdmin', 'resolvedByAdmin'])
            ->latest('created_at');

        if (is_string($status) && in_array($status, ReviewReportStatus::values(), true)) {
            $query->where('status', $status);
        }

        $reports = $query->paginate(15)->withQueryString();

        $counts = [
            'submitted' => PropertyReviewReport::query()->where('status', ReviewReportStatus::Submitted)->count(),
            'under_review' => PropertyReviewReport::query()->where('status', ReviewReportStatus::UnderReview)->count(),
            'action_taken' => PropertyReviewReport::query()->where('status', ReviewReportStatus::ActionTaken)->count(),
            'no_violation_found' => PropertyReviewReport::query()->where('status', ReviewReportStatus::NoViolationFound)->count(),
            'closed' => PropertyReviewReport::query()->where('status', ReviewReportStatus::Closed)->count(),
        ];

        return Inertia::render('admin/review-reports/index', [
            'reports' => $reports->through(fn (PropertyReviewReport $r) => [
                'id' => $r->id,
                'review_id' => $r->property_review_id,
                'property_name' => $r->review->property->name,
                'review_title' => $r->review->title,
                'reporter_type' => $r->reporter_type,
                'reason_category' => $r->reason_category->value,
                'reason_label' => $r->reason_category->label(),
                'explanation' => $r->explanation,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'assigned_admin_name' => $r->assignedAdmin?->name,
                'created_at' => $r->created_at->format('d M Y, H:i'),
                'resolved_at' => $r->resolved_at?->format('d M Y'),
            ]),
            'filters' => [
                'status' => $status,
            ],
            'counts' => $counts,
        ]);
    }

    public function show(Request $request, PropertyReviewReport $report): Response
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('review_reports.view')) {
            abort(403);
        }

        $report->loadMissing(['review.property.city', 'review.user', 'review.response', 'assignedAdmin', 'resolvedByAdmin']);

        return Inertia::render('admin/review-reports/show', [
            'report' => [
                'id' => $report->id,
                'reporter_type' => $report->reporter_type,
                'reason_category' => $report->reason_category->value,
                'reason_label' => $report->reason_category->label(),
                'explanation' => $report->explanation,
                'status' => $report->status->value,
                'status_label' => $report->status->label(),
                'resolution_reason' => $report->resolution_reason,
                'resolution_notes' => $report->resolution_notes,
                'resolved_at' => $report->resolved_at?->format('d M Y, H:i'),
                'resolver_name' => $report->resolvedByAdmin?->name,
                'created_at' => $report->created_at->format('d M Y, H:i'),
                'review' => [
                    'id' => $report->review->id,
                    'property_name' => $report->review->property->name,
                    'customer_display_name' => $report->review->customer_display_name,
                    'overall_rating' => $report->review->overall_rating,
                    'title' => $report->review->title,
                    'content' => $report->review->content,
                    'status' => $report->review->status->value,
                    'status_label' => $report->review->status->label(),
                    'published_at' => $report->review->published_at?->format('d M Y'),
                ],
            ],
        ]);
    }

    public function resolve(Request $request, PropertyReviewReport $report): RedirectResponse
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin || ! $admin->hasPermission('review_reports.manage')) {
            abort(403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:action_taken,no_violation_found,closed,under_review'],
            'resolution_reason' => ['nullable', 'string', 'max:1000'],
            'resolution_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $status = ReviewReportStatus::from($validated['status']);
        $isResolved = $status->isResolved();

        $report->update([
            'status' => $status,
            'resolution_reason' => $validated['resolution_reason'] ?? null,
            'resolution_notes' => $validated['resolution_notes'] ?? null,
            'resolved_at' => $isResolved ? CarbonImmutable::now() : null,
            'resolved_by_admin_id' => $isResolved ? $admin->id : null,
            'assigned_admin_id' => $report->assigned_admin_id ?? $admin->id,
        ]);

        return back()->with('status', 'Review report status updated successfully.');
    }
}
