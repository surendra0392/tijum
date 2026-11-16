<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Operations;

use App\Actions\Protection\AddCaseMessage;
use App\Enums\CaseCategory;
use App\Enums\CaseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Protection\AddCaseMessageRequest;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\Property;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

class OwnerComplaintsController extends Controller
{
    public function index(Request $request): Response
    {
        $owner = $this->resolveOwner($request);

        $properties = Property::query()
            ->where('owner_id', $owner->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        $selectedStatus = $request->input('status', 'all');
        $selectedCategory = $request->input('category');
        $selectedPropertyId = $request->integer('property_id') ?: null;
        $search = trim((string) $request->input('search', ''));

        $baseQuery = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->with(['reservation.roomType', 'reservation.user', 'property.city', 'messages']);

        if ($selectedPropertyId) {
            $baseQuery->where('property_id', $selectedPropertyId);
        }

        if ($selectedCategory && in_array($selectedCategory, CaseCategory::values(), true)) {
            $baseQuery->where('category', $selectedCategory);
        }

        if ($search !== '') {
            $baseQuery->where(function ($q) use ($search): void {
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

        // Calculate KPI counts across all owner cases
        $allOwnerCases = CustomerProtectionCase::query()->where('owner_id', $owner->id)->get(['id', 'status', 'sla_due_at']);
        $now = CarbonImmutable::now();

        $stats = [
            'total_complaints' => $allOwnerCases->count(),
            'action_required_count' => $allOwnerCases->filter(fn ($c) => in_array($c->status, [CaseStatus::AwaitingOwner, CaseStatus::Open], true))->count(),
            'under_review_count' => $allOwnerCases->filter(fn ($c) => in_array($c->status, [CaseStatus::UnderReview, CaseStatus::Acknowledged, CaseStatus::RelocationOffered], true))->count(),
            'resolved_count' => $allOwnerCases->filter(fn ($c) => in_array($c->status, [CaseStatus::Resolved, CaseStatus::Closed], true))->count(),
            'sla_breached_count' => $allOwnerCases->filter(fn ($c) => ! in_array($c->status, [CaseStatus::Resolved, CaseStatus::Closed], true) && $c->sla_due_at && $c->sla_due_at->isPast())->count(),
        ];

        // Apply tab status filtering
        if ($selectedStatus === 'action_required') {
            $baseQuery->whereIn('status', [CaseStatus::AwaitingOwner, CaseStatus::Open]);
        } elseif ($selectedStatus === 'under_review') {
            $baseQuery->whereIn('status', [CaseStatus::UnderReview, CaseStatus::Acknowledged, CaseStatus::RelocationOffered]);
        } elseif ($selectedStatus === 'resolved') {
            $baseQuery->whereIn('status', [CaseStatus::Resolved, CaseStatus::Closed]);
        } elseif ($selectedStatus !== 'all' && in_array($selectedStatus, CaseStatus::values(), true)) {
            $baseQuery->where('status', $selectedStatus);
        }

        $cases = $baseQuery
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (CustomerProtectionCase $case): array => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'booking_reference' => $case->reservation->booking_reference,
                'property_id' => $case->property_id,
                'property_name' => $case->property->name,
                'room_type_name' => $case->reservation->snapshot_room_type_name ?? $case->reservation->roomType?->name,
                'guest_name' => $case->reservation->user->name,
                'guest_phone' => $case->reservation->user?->phone,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'description' => $case->description,
                'created_at' => $case->created_at->toISOString(),
                'sla_due_at' => $case->sla_due_at?->toISOString(),
                'is_sla_breached' => $case->sla_due_at && $case->sla_due_at->isPast() && ! in_array($case->status, [CaseStatus::Resolved, CaseStatus::Closed], true),
                'sla_remaining_human' => $case->sla_due_at ? $case->sla_due_at->diffForHumans() : null,
                'messages_count' => $case->messages->where('is_internal_note', false)->count(),
            ]);

        return Inertia::render('owner/complaints/index', [
            'cases' => $cases,
            'properties' => $properties->map(fn (Property $p) => [
                'id' => $p->id,
                'name' => $p->name,
            ])->values()->all(),
            'categories' => array_map(fn (CaseCategory $cat) => [
                'value' => $cat->value,
                'label' => $cat->label(),
            ], CaseCategory::cases()),
            'filters' => [
                'status' => $selectedStatus,
                'category' => $selectedCategory,
                'property_id' => $selectedPropertyId,
                'search' => $search,
            ],
            'stats' => $stats,
        ]);
    }

    public function show(Request $request, CustomerProtectionCase $case): Response
    {
        $owner = $this->resolveOwner($request);
        abort_if($case->owner_id !== $owner->id, 403);

        $case->loadMissing([
            'reservation.property.city',
            'reservation.roomType',
            'reservation.user',
            'messages',
        ]);

        $messages = $case->messages
            ->where('is_internal_note', false)
            ->map(fn ($msg): array => [
                'id' => $msg->id,
                'sender_type' => $msg->sender_type,
                'sender_name' => $msg->sender_name,
                'message' => $msg->message,
                'attachment_path' => $msg->attachment_path,
                'attachment_name' => $msg->attachment_name,
                'created_at' => $msg->created_at->toISOString(),
            ])
            ->values()
            ->all();

        return Inertia::render('owner/complaints/show', [
            'case' => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'description' => $case->description,
                'created_at' => $case->created_at->toISOString(),
                'sla_due_at' => $case->sla_due_at?->toISOString(),
                'is_sla_breached' => $case->sla_due_at && $case->sla_due_at->isPast() && ! in_array($case->status, [CaseStatus::Resolved, CaseStatus::Closed], true),
                'sla_remaining_human' => $case->sla_due_at ? $case->sla_due_at->diffForHumans() : null,
            ],
            'reservation' => [
                'id' => $case->reservation->id,
                'booking_reference' => $case->reservation->booking_reference,
                'property_name' => $case->property->name,
                'room_type_name' => $case->reservation->snapshot_room_type_name ?? $case->reservation->roomType?->name,
                'guest_name' => $case->reservation->user->name,
                'guest_phone' => $case->reservation->user?->phone,
                'guest_email' => $case->reservation->user?->email,
                'check_in_date' => $case->reservation->check_in_date->toDateString(),
                'checkout_date' => $case->reservation->checkout_date->toDateString(),
                'quantity' => $case->reservation->quantity,
                'status_label' => $case->reservation->statusLabel(),
            ],
            'messages' => $messages,
            'status' => $request->session()->get('status'),
        ]);
    }

    public function storeMessage(
        AddCaseMessageRequest $request,
        CustomerProtectionCase $case,
        AddCaseMessage $action,
    ): RedirectResponse {
        $owner = $this->resolveOwner($request);
        abort_if($case->owner_id !== $owner->id, 403);

        /** @var array{message: string, attachment?: UploadedFile|null, is_internal_note?: bool, status?: string|null} $data */
        $data = $request->validated();

        $action->execute(
            $case,
            $owner,
            $data,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your reply was submitted successfully.')]);

        return back()->with('status', 'message-sent');
    }

    private function resolveOwner(Request $request): Owner
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner) {
            abort(401);
        }

        return $owner;
    }
}
