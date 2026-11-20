<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Actions\Protection\AddCaseMessage;
use App\Enums\CaseCategory;
use App\Enums\CaseStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\Owner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnerCaseController extends ApiController
{
    /**
     * List customer protection / support cases concerning the owner's properties.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $selectedStatus = (string) $request->input('status', 'all');
        $selectedCategory = $request->input('category');
        $search = trim((string) $request->input('search', ''));

        $query = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->with(['reservation.roomType', 'reservation.user', 'property.city', 'messages'])
            ->latest('id');

        if ($selectedCategory && in_array($selectedCategory, CaseCategory::values(), true)) {
            $query->where('category', $selectedCategory);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('case_reference', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('reservation', function ($rq) use ($search): void {
                        $rq->where('booking_reference', 'like', "%{$search}%")
                            ->orWhereHas('user', function ($uq) use ($search): void {
                                $uq->where('name', 'like', "%{$search}%")
                                    ->orWhere('phone', 'like', "%{$search}%");
                            });
                    });
            });
        }

        // Compute stats across all owner cases
        $allCases = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->get(['id', 'status', 'sla_due_at']);

        $stats = [
            'total_cases' => $allCases->count(),
            'action_required_count' => $allCases->filter(static fn ($c): bool => in_array($c->status, [CaseStatus::AwaitingOwner, CaseStatus::Open], true))->count(),
            'under_review_count' => $allCases->filter(static fn ($c): bool => in_array($c->status, [CaseStatus::UnderReview, CaseStatus::Acknowledged, CaseStatus::RelocationOffered], true))->count(),
            'resolved_count' => $allCases->filter(static fn ($c): bool => in_array($c->status, [CaseStatus::Resolved, CaseStatus::Closed], true))->count(),
        ];

        // Apply tab status filter
        if ($selectedStatus === 'action_required') {
            $query->whereIn('status', [CaseStatus::AwaitingOwner, CaseStatus::Open]);
        } elseif ($selectedStatus === 'under_review') {
            $query->whereIn('status', [CaseStatus::UnderReview, CaseStatus::Acknowledged, CaseStatus::RelocationOffered]);
        } elseif ($selectedStatus === 'resolved') {
            $query->whereIn('status', [CaseStatus::Resolved, CaseStatus::Closed]);
        }

        $paginated = $query->paginate(15);

        $items = $paginated->getCollection()->map(static fn (CustomerProtectionCase $case): array => [
            'id' => $case->id,
            'case_reference' => $case->case_reference,
            'category' => $case->category->value,
            'category_label' => $case->category->label(),
            'status' => $case->status->value,
            'status_label' => $case->status->label(),
            'property_id' => $case->property_id,
            'property_name' => $case->property->name,
            'booking_reference' => $case->reservation->booking_reference,
            'customer_name' => $case->reservation->user->name,
            'description' => $case->description,
            'messages_count' => $case->messages->count(),
            'sla_due_at' => $case->sla_due_at?->toIso8601String(),
            'is_sla_breached' => $case->sla_due_at ? $case->sla_due_at->isPast() && ! in_array($case->status, [CaseStatus::Resolved, CaseStatus::Closed], true) : false,
            'created_at' => $case->created_at->toIso8601String(),
        ])->values()->all();

        return $this->success(
            $items,
            'Support and protection cases retrieved.',
            200,
            [
                'stats' => $stats,
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ]
        );
    }

    /**
     * Show case detail and full message timeline.
     */
    public function show(Request $request, string|int $reference): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $case = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($reference): void {
                if (is_numeric($reference)) {
                    $query->where('id', (int) $reference);
                } else {
                    $query->where('case_reference', (string) $reference);
                }
            })
            ->with([
                'property',
                'reservation.roomType',
                'reservation.user',
                'messages' => fn ($q) => $q->orderBy('id', 'asc'),
            ])
            ->first();

        if ($case === null) {
            return $this->error("Support case '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $messages = $case->messages->map(static fn (CustomerProtectionCaseMessage $m): array => [
            'id' => $m->id,
            'sender_type' => $m->sender_type,
            'sender_name' => $m->sender_name,
            'message' => $m->message,
            'attachment_url' => $m->attachment_path ? url('storage/'.$m->attachment_path) : null,
            'created_at' => $m->created_at->toIso8601String(),
        ])->values()->all();

        return $this->success([
            'id' => $case->id,
            'case_reference' => $case->case_reference,
            'category' => $case->category->value,
            'category_label' => $case->category->label(),
            'status' => $case->status->value,
            'status_label' => $case->status->label(),
            'property_id' => $case->property_id,
            'property_name' => $case->property->name,
            'booking_reference' => $case->reservation->booking_reference,
            'customer_name' => $case->reservation->user->name,
            'stay_dates' => $case->reservation->check_in_date->format('M d, Y').' – '.$case->reservation->checkout_date->format('M d, Y'),
            'description' => $case->description,
            'resolution_summary' => $case->resolution_summary,
            'sla_due_at' => $case->sla_due_at?->toIso8601String(),
            'created_at' => $case->created_at->toIso8601String(),
            'messages' => $messages,
        ], 'Support case details retrieved successfully.');
    }

    /**
     * Add host response or information to the case.
     */
    public function addMessage(
        Request $request,
        string|int $reference,
        AddCaseMessage $action,
    ): JsonResponse {
        /** @var Owner $owner */
        $owner = $request->user();

        $case = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->where(function ($query) use ($reference): void {
                if (is_numeric($reference)) {
                    $query->where('id', (int) $reference);
                } else {
                    $query->where('case_reference', (string) $reference);
                }
            })
            ->first();

        if ($case === null) {
            return $this->error("Support case '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
            'attachment' => ['nullable', 'file', 'max:10240'],
        ]);

        try {
            $msg = $action->execute($case, $owner, [
                'message' => $validated['message'],
                'attachment' => $request->file('attachment'),
            ]);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), 'VALIDATION_ERROR', 422, $e->errors());
        }

        return $this->success([
            'id' => $msg->id,
            'sender_type' => $msg->sender_type,
            'sender_name' => $msg->sender_name,
            'message' => $msg->message,
            'created_at' => $msg->created_at->toIso8601String(),
        ], 'Response submitted successfully.', 201);
    }
}
