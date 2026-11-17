<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Support;

use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\SupportTicket;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminCustomerSupportController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $category = $request->query('category');
        $priority = $request->query('priority');
        $overdue = $request->boolean('overdue');
        $search = $request->query('search');

        $baseQuery = SupportTicket::query()->where('ticket_type', SupportTicketType::Customer);

        $now = CarbonImmutable::now();
        $stats = [
            'total_active' => (clone $baseQuery)->whereNotIn('status', [SupportTicketStatus::Resolved->value, SupportTicketStatus::Closed->value])->count(),
            'awaiting_agent' => (clone $baseQuery)->where(static function ($q): void {
                $q->where('status', SupportTicketStatus::Open->value)
                    ->orWhere('last_reply_by_type', 'customer');
            })->whereNotIn('status', [SupportTicketStatus::Resolved->value, SupportTicketStatus::Closed->value])->count(),
            'overdue' => (clone $baseQuery)->whereNotIn('status', [SupportTicketStatus::Resolved->value, SupportTicketStatus::Closed->value])
                ->where('sla_due_at', '<', $now)->count(),
            'resolved_today' => (clone $baseQuery)->where('status', SupportTicketStatus::Resolved->value)
                ->whereDate('resolved_at', $now->toDateString())->count(),
        ];

        $query = (clone $baseQuery)
            ->with(['user', 'property.city', 'reservation', 'assignedAdmin'])
            ->latest('id');

        if (is_string($status) && $status !== '' && SupportTicketStatus::tryFrom($status) !== null) {
            $query->where('status', $status);
        }

        if (is_string($category) && $category !== '') {
            $query->where('category', $category);
        }

        if (is_string($priority) && $priority !== '' && SupportTicketPriority::tryFrom($priority) !== null) {
            $query->where('priority', $priority);
        }

        if ($overdue) {
            $query->whereNotIn('status', [SupportTicketStatus::Resolved->value, SupportTicketStatus::Closed->value])
                ->where('sla_due_at', '<', $now);
        }

        if (is_string($search) && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(static function (Builder $q) use ($term): void {
                $q->where('ticket_reference', 'like', $term)
                    ->orWhere('subject', 'like', $term)
                    ->orWhereHas('user', static fn ($u) => $u->where('name', 'like', $term)->orWhere('email', 'like', $term)->orWhere('phone', 'like', $term));
            });
        }

        $paginator = $query->paginate(20)->withQueryString();

        $tickets = [
            'data' => collect($paginator->items())->map(static fn (SupportTicket $t): array => [
                'id' => $t->id,
                'ticket_reference' => $t->ticket_reference,
                'subject' => $t->subject,
                'category' => $t->category,
                'status' => $t->status->value,
                'status_label' => $t->status->label(),
                'status_badge' => $t->status->badgeVariant(),
                'priority' => $t->priority->value,
                'priority_label' => $t->priority->label(),
                'customer_name' => $t->user?->name ?? 'Guest User',
                'customer_email' => $t->user?->email,
                'customer_phone' => $t->user?->phone,
                'booking_reference' => $t->reservation?->booking_reference,
                'property_name' => $t->property?->name,
                'city_name' => $t->property?->city?->name,
                'assigned_admin_name' => $t->assignedAdmin?->name,
                'sla_due_at' => $t->sla_due_at?->toISOString(),
                'is_overdue' => $t->isOverdue(),
                'last_reply_at' => $t->last_reply_at?->toISOString(),
                'last_reply_by_type' => $t->last_reply_by_type,
                'created_at' => $t->created_at->toISOString(),
            ])->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];

        return Inertia::render('admin/support/customer/index', [
            'tickets' => $tickets,
            'stats' => $stats,
            'filters' => [
                'status' => $status ?? 'all',
                'category' => $category ?? 'all',
                'priority' => $priority ?? 'all',
                'overdue' => $overdue,
                'search' => $search ?? '',
            ],
            'admins' => Admin::query()->where('is_active', true)->get(['id', 'name'])->all(),
        ]);
    }

    public function show(SupportTicket $ticket): Response
    {
        abort_unless($ticket->ticket_type === SupportTicketType::Customer, 404);

        $ticket->loadMissing([
            'user',
            'property.city',
            'reservation',
            'assignedAdmin',
            'messages',
        ]);

        return Inertia::render('admin/support/customer/show', [
            'ticket' => [
                'id' => $ticket->id,
                'ticket_reference' => $ticket->ticket_reference,
                'subject' => $ticket->subject,
                'category' => $ticket->category,
                'status' => $ticket->status->value,
                'status_label' => $ticket->status->label(),
                'priority' => $ticket->priority->value,
                'priority_label' => $ticket->priority->label(),
                'message' => $ticket->message,
                'customer_name' => $ticket->user?->name ?? 'Guest User',
                'customer_email' => $ticket->user?->email,
                'customer_phone' => $ticket->user?->phone,
                'booking_reference' => $ticket->reservation?->booking_reference,
                'property_name' => $ticket->property?->name,
                'city_name' => $ticket->property?->city?->name,
                'assigned_admin_id' => $ticket->assigned_admin_id,
                'assigned_admin_name' => $ticket->assignedAdmin?->name,
                'sla_due_at' => $ticket->sla_due_at?->toISOString(),
                'is_overdue' => $ticket->isOverdue(),
                'resolved_at' => $ticket->resolved_at?->toISOString(),
                'resolution_summary' => $ticket->resolution_summary,
                'closed_at' => $ticket->closed_at?->toISOString(),
                'created_at' => $ticket->created_at->toISOString(),
            ],
            'messages' => $ticket->messages->map(static fn ($m) => [
                'id' => $m->id,
                'sender_type' => $m->sender_type,
                'sender_name' => $m->sender_name,
                'message' => $m->message,
                'is_internal_note' => $m->is_internal_note,
                'created_at' => $m->created_at->toISOString(),
            ])->all(),
            'admins' => Admin::query()->where('is_active', true)->get(['id', 'name'])->all(),
        ]);
    }

    public function storeMessage(Request $request, SupportTicket $ticket): RedirectResponse
    {
        abort_unless($ticket->ticket_type === SupportTicketType::Customer, 404);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'is_internal_note' => ['boolean'],
        ]);

        $admin = $request->user('admin');

        $ticketMessage = $ticket->messages()->create([
            'sender_type' => 'admin',
            'sender_id' => $admin ? $admin->id : 1,
            'sender_name' => $admin ? $admin->name : 'TIJUM Support',
            'message' => $validated['message'],
            'is_internal_note' => (bool) ($validated['is_internal_note'] ?? false),
        ]);

        if (! ($validated['is_internal_note'] ?? false)) {
            $ticket->forceFill([
                'last_reply_at' => now(),
                'last_reply_by_type' => 'admin',
                'status' => SupportTicketStatus::InProgress,
            ])->save();

            $this->dispatchStatusNotification(
                ticket: $ticket,
                latestUpdate: Str::limit($validated['message'], 160),
                idempotencySeed: 'support_msg_'.$ticketMessage->id
            );
        }

        return back()->with('status', 'Response sent successfully.');
    }

    public function updateStatus(Request $request, SupportTicket $ticket): RedirectResponse
    {
        abort_unless($ticket->ticket_type === SupportTicketType::Customer, 404);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:open,in_progress,waiting_user,resolved,closed'],
        ]);

        $previousStatus = $ticket->status;
        $status = SupportTicketStatus::from($validated['status']);
        $updates = ['status' => $status];

        if ($status === SupportTicketStatus::Closed) {
            $updates['closed_at'] = now();
        }

        $ticket->forceFill($updates)->save();

        if ($previousStatus !== $status) {
            $this->dispatchStatusNotification(
                ticket: $ticket,
                latestUpdate: "Your support request status changed to {$status->label()}.",
                idempotencySeed: 'support_status_'.$ticket->id.'_'.$status->value.'_'.$ticket->updated_at->timestamp
            );
        }

        return back()->with('status', "Ticket status changed to {$status->label()}.");
    }

    public function assign(Request $request, SupportTicket $ticket): RedirectResponse
    {
        abort_unless($ticket->ticket_type === SupportTicketType::Customer, 404);

        $validated = $request->validate([
            'assigned_admin_id' => ['nullable', 'exists:admins,id'],
        ]);

        $ticket->forceFill(['assigned_admin_id' => $validated['assigned_admin_id']])->save();

        return back()->with('status', 'Ticket assigned successfully.');
    }

    public function resolve(Request $request, SupportTicket $ticket): RedirectResponse
    {
        abort_unless($ticket->ticket_type === SupportTicketType::Customer, 404);

        $validated = $request->validate([
            'resolution_summary' => ['required', 'string', 'max:2000'],
        ]);

        $ticket->forceFill([
            'status' => SupportTicketStatus::Resolved,
            'resolved_at' => now(),
            'resolution_summary' => $validated['resolution_summary'],
        ])->save();

        $this->dispatchStatusNotification(
            ticket: $ticket,
            latestUpdate: Str::limit($validated['resolution_summary'], 180),
            idempotencySeed: 'support_resolved_'.$ticket->id
        );

        return back()->with('status', 'Ticket marked as resolved.');
    }

    private function dispatchStatusNotification(SupportTicket $ticket, string $latestUpdate, string $idempotencySeed): void
    {
        try {
            $ticket->loadMissing('user');
            if ($ticket->user === null) {
                return;
            }

            app(NotificationDispatcher::class)->dispatch(
                eventType: 'support.status_updated',
                recipients: $ticket->user,
                variables: [
                    'customer_name' => $ticket->user->name,
                    'ticket_reference' => $ticket->ticket_reference,
                    'ticket_status' => $ticket->status->label(),
                    'latest_update' => $latestUpdate,
                    'updated_at' => $ticket->updated_at->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'action_url' => route('support.tickets.show', $ticket->ticket_reference),
                ],
                related: $ticket,
                relatedReference: $ticket->ticket_reference,
                idempotencySeed: $idempotencySeed
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch support.status_updated notification: '.$e->getMessage(), [
                'ticket_id' => $ticket->id,
            ]);
        }
    }
}
