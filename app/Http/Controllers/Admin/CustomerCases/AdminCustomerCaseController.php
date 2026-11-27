<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\CustomerCases;

use App\Actions\Protection\AddCaseMessage;
use App\Actions\Protection\UpdateCaseStatus;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Protection\AddCaseMessageRequest;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Services\ReservationData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminCustomerCaseController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $status = $request->query('status');
        $category = $request->query('category');
        $priority = $request->query('priority');
        $overdue = $request->boolean('overdue');
        $search = $request->query('search');

        $query = CustomerProtectionCase::query()
            ->with(['reservation.property', 'user', 'property.city', 'assignedAdmin'])
            ->latest('id');

        if (is_string($status) && $status !== '' && CaseStatus::tryFrom($status) !== null) {
            $query->where('status', $status);
        }

        if (is_string($category) && $category !== '' && CaseCategory::tryFrom($category) !== null) {
            $query->where('category', $category);
        }

        if (is_string($priority) && $priority !== '' && CasePriority::tryFrom($priority) !== null) {
            $query->where('priority', $priority);
        }

        if ($overdue) {
            $query->whereNotIn('status', [CaseStatus::Resolved->value, CaseStatus::Closed->value])
                ->where('sla_due_at', '<', now());
        }

        if (is_string($search) && trim($search) !== '') {
            $term = trim($search);
            $query->where(function (Builder $q) use ($term): void {
                $q->where('case_reference', 'like', "%{$term}%")
                    ->orWhereHas('reservation', fn ($rq) => $rq->where('booking_reference', 'like', "%{$term}%"))
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"))
                    ->orWhereHas('property', fn ($pq) => $pq->where('name', 'like', "%{$term}%"));
            });
        }

        $cases = $query->paginate(15)->withQueryString()->through(fn (CustomerProtectionCase $case): array => [
            'id' => $case->id,
            'case_reference' => $case->case_reference,
            'booking_reference' => $case->reservation->booking_reference,
            'customer_name' => $case->user->name,
            'property_name' => $case->property->name,
            'city_name' => $case->property->city?->name,
            'category' => $case->category->value,
            'category_label' => $case->category->label(),
            'status' => $case->status->value,
            'status_label' => $case->status->label(),
            'priority' => $case->priority->value,
            'priority_label' => $case->priority->label(),
            'assigned_admin_name' => $case->assignedAdmin?->name,
            'sla_due_at' => $case->sla_due_at?->toISOString(),
            'is_overdue' => $case->isOverdue(),
            'created_at' => $case->created_at->toISOString(),
        ]);

        $admins = Admin::query()->where('is_active', true)->get(['id', 'name']);

        return Inertia::render('admin/cases/index', [
            'cases' => $cases,
            'filters' => [
                'status' => is_string($status) ? $status : '',
                'category' => is_string($category) ? $category : '',
                'priority' => is_string($priority) ? $priority : '',
                'overdue' => $overdue,
                'search' => is_string($search) ? $search : '',
            ],
            'statusOptions' => collect(CaseStatus::cases())->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->all(),
            'categoryOptions' => collect(CaseCategory::cases())->map(fn ($c) => ['value' => $c->value, 'label' => $c->label()])->all(),
            'priorityOptions' => collect(CasePriority::cases())->map(fn ($p) => ['value' => $p->value, 'label' => $p->label()])->all(),
            'admins' => $admins,
        ]);
    }

    public function show(CustomerProtectionCase $case, ReservationData $reservationData): Response
    {
        $case->loadMissing([
            'reservation.property.city',
            'reservation.roomType',
            'reservation.payments.refunds',
            'reservation.refunds.initiatedByAdmin',
            'user',
            'property.owner',
            'assignedAdmin',
            'messages',
            'relocations.destinationProperty.city',
            'relocations.destinationRoomType',
        ]);

        $messages = $case->messages->map(fn ($msg): array => [
            'id' => $msg->id,
            'sender_type' => $msg->sender_type,
            'sender_name' => $msg->sender_name,
            'message' => $msg->message,
            'attachment_url' => is_string($msg->attachment_path) && $msg->attachment_path !== ''
                ? route('admin.customer-cases.messages.attachment', [
                    'case' => $case->case_reference,
                    'message' => $msg->id,
                ])
                : null,
            'attachment_name' => $msg->attachment_name,
            'is_internal_note' => (bool) $msg->is_internal_note,
            'created_at' => $msg->created_at->toISOString(),
        ])->all();

        $relocations = $case->relocations->map(fn ($r): array => [
            'id' => $r->id,
            'status' => $r->status->value,
            'status_label' => $r->status->label(),
            'destination_property_name' => $r->destinationProperty->name,
            'destination_locality' => $r->destinationProperty->locality,
            'destination_city_name' => $r->destinationProperty->city?->name,
            'destination_room_type_name' => $r->destinationRoomType->name,
            'original_amount_minor' => $r->original_amount_minor,
            'alternative_amount_minor' => $r->alternative_amount_minor,
            'price_difference_minor' => $r->price_difference_minor,
            'destination_owner_accepted_at' => $r->destination_owner_accepted_at?->toISOString(),
            'customer_decision' => $r->customer_decision,
            'customer_decision_at' => $r->customer_decision_at?->toISOString(),
            'offer_expires_at' => $r->offer_expires_at->toISOString(),
            'is_expired' => $r->isExpired(),
        ])->all();

        $admins = Admin::query()->where('is_active', true)->get(['id', 'name']);

        return Inertia::render('admin/cases/show', [
            'case' => [
                'id' => $case->id,
                'case_reference' => $case->case_reference,
                'category' => $case->category->value,
                'category_label' => $case->category->label(),
                'status' => $case->status->value,
                'status_label' => $case->status->label(),
                'priority' => $case->priority->value,
                'priority_label' => $case->priority->label(),
                'description' => $case->description,
                'assigned_admin_id' => $case->assigned_admin_id,
                'assigned_admin_name' => $case->assignedAdmin?->name,
                'acknowledged_at' => $case->acknowledged_at?->toISOString(),
                'sla_due_at' => $case->sla_due_at?->toISOString(),
                'is_overdue' => $case->isOverdue(),
                'resolved_at' => $case->resolved_at?->toISOString(),
                'resolution_type' => $case->resolution_type,
                'resolution_summary' => $case->resolution_summary,
                'closed_at' => $case->closed_at?->toISOString(),
                'created_at' => $case->created_at->toISOString(),
            ],
            'reservation' => $reservationData->detail($case->reservation, 'admin'),
            'messages' => $messages,
            'relocations' => $relocations,
            'admins' => $admins,
            'statusOptions' => collect(CaseStatus::cases())->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->all(),
            'priorityOptions' => collect(CasePriority::cases())->map(fn ($p) => ['value' => $p->value, 'label' => $p->label()])->all(),
        ]);
    }

    public function storeMessage(
        AddCaseMessageRequest $request,
        CustomerProtectionCase $case,
        AddCaseMessage $action,
    ): RedirectResponse {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $action->execute($case, $admin, $request->validated());

        return back()->with('status', 'Message posted successfully.');
    }

    public function updateStatus(
        Request $request,
        CustomerProtectionCase $case,
        UpdateCaseStatus $action,
    ): RedirectResponse {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $validated = $request->validate([
            'status' => ['nullable', 'string'],
            'priority' => ['nullable', 'string'],
            'assigned_admin_id' => ['nullable', 'integer'],
        ]);

        $action->execute($case, $admin, $validated);

        return back()->with('status', 'Case updated successfully.');
    }

    public function resolve(
        Request $request,
        CustomerProtectionCase $case,
        UpdateCaseStatus $action,
    ): RedirectResponse {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $validated = $request->validate([
            'resolution_type' => ['required', 'string', 'max:64'],
            'resolution_summary' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $action->execute($case, $admin, array_merge($validated, [
            'status' => CaseStatus::Resolved->value,
        ]));

        return back()->with('status', 'Case marked as resolved.');
    }

    public function downloadAttachment(
        Request $request,
        CustomerProtectionCase $case,
        CustomerProtectionCaseMessage $message,
    ): StreamedResponse {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);
        abort_if($message->customer_protection_case_id !== $case->id, 404);
        abort_if(! is_string($message->attachment_path) || $message->attachment_path === '', 404);

        $diskName = (string) config('tijum.customer_protection.attachments.disk', 'local');
        $disk = Storage::disk($diskName);
        abort_unless($disk->exists($message->attachment_path), 404);

        return $disk->download(
            $message->attachment_path,
            $message->attachment_name ?: basename($message->attachment_path),
            ['X-Content-Type-Options' => 'nosniff'],
        );
    }
}
