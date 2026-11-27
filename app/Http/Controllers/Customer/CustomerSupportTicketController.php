<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Http\Controllers\Controller;
use App\Models\CustomerProtectionCase;
use App\Models\PlatformSetting;
use App\Models\Reservation;
use App\Models\SupportTicket;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CustomerSupportTicketController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $status = $request->query('status');

        $query = SupportTicket::query()
            ->where('ticket_type', SupportTicketType::Customer)
            ->where('user_id', $user->id)
            ->with(['property.city', 'reservation'])
            ->latest('id');

        if (is_string($status) && $status !== '' && SupportTicketStatus::tryFrom($status) !== null) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate(15)->withQueryString();

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
                'booking_reference' => $t->reservation?->booking_reference,
                'property_name' => $t->property?->name,
                'city_name' => $t->property?->city?->name,
                'created_at' => $t->created_at->toISOString(),
                'last_reply_at' => $t->last_reply_at?->toISOString(),
            ])->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];

        // Also fetch active customer reservations for dropdown
        $reservations = Reservation::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(10)
            ->get(['id', 'booking_reference', 'snapshot_property_name'])
            ->map(static fn ($r) => [
                'id' => $r->id,
                'booking_reference' => $r->booking_reference,
                'property_name' => $r->snapshot_property_name,
            ])
            ->all();

        // Also fetch protection cases count
        $casesCount = CustomerProtectionCase::query()->where('user_id', $user->id)->count();

        return Inertia::render('support/tickets/index', [
            'tickets' => $tickets,
            'filters' => [
                'status' => $status ?? 'all',
            ],
            'reservations' => $reservations,
            'categories' => $this->customerCategories(),
            'casesCount' => $casesCount,
            'grievanceOfficer' => PlatformSetting::getGrievanceOfficer(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:64'],
            'priority' => ['required', 'string', 'in:low,standard,high,urgent'],
            'message' => ['required', 'string', 'max:5000'],
            'booking_reference' => ['nullable', 'string', 'max:64'],
        ]);

        $reservation = null;
        if (! empty($validated['booking_reference'])) {
            $reservation = Reservation::query()
                ->where('booking_reference', $validated['booking_reference'])
                ->where('user_id', $user->id)
                ->first();
        }

        $priority = SupportTicketPriority::from($validated['priority']);
        $slaDueAt = CarbonImmutable::now()->addHours($priority->defaultSlaHours());

        $ticket = SupportTicket::create([
            'ticket_reference' => SupportTicket::generateReference(SupportTicketType::Customer),
            'ticket_type' => SupportTicketType::Customer,
            'user_id' => $user->id,
            'reservation_id' => $reservation?->id,
            'property_id' => $reservation?->property_id,
            'subject' => $validated['subject'],
            'category' => $validated['category'],
            'status' => SupportTicketStatus::Open,
            'priority' => $priority,
            'message' => $validated['message'],
            'sla_due_at' => $slaDueAt,
            'last_reply_at' => now(),
            'last_reply_by_type' => 'customer',
        ]);

        $ticket->messages()->create([
            'sender_type' => 'customer',
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'message' => $validated['message'],
            'is_internal_note' => false,
        ]);

        try {
            app(NotificationDispatcher::class)->dispatch(
                eventType: 'support.request_received',
                recipients: $user,
                variables: [
                    'customer_name' => $user->name,
                    'ticket_reference' => $ticket->ticket_reference,
                    'subject' => $ticket->subject,
                    'created_at' => $ticket->created_at->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'action_url' => route('support.tickets.show', $ticket->ticket_reference),
                ],
                related: $ticket,
                relatedReference: $ticket->ticket_reference,
                idempotencySeed: 'support_received_'.$ticket->id
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch support.request_received notification: '.$e->getMessage(), [
                'ticket_id' => $ticket->id,
            ]);
        }

        return redirect()
            ->route('support.tickets.show', $ticket->ticket_reference)
            ->with('status', "Support ticket {$ticket->ticket_reference} submitted. A customer advocate will reply promptly.");
    }

    public function show(Request $request, string $ticketReference): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $ticket = SupportTicket::query()
            ->where('ticket_reference', $ticketReference)
            ->where('user_id', $user->id)
            ->where('ticket_type', SupportTicketType::Customer)
            ->with(['property.city', 'reservation', 'messages'])
            ->firstOrFail();

        $messages = $ticket->messages
            ->where('is_internal_note', false)
            ->map(static fn ($m) => [
                'id' => $m->id,
                'sender_type' => $m->sender_type,
                'sender_name' => $m->sender_name,
                'message' => $m->message,
                'created_at' => $m->created_at->toISOString(),
            ])
            ->values()
            ->all();

        return Inertia::render('support/tickets/show', [
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
                'booking_reference' => $ticket->reservation?->booking_reference,
                'property_name' => $ticket->property?->name,
                'city_name' => $ticket->property?->city?->name,
                'sla_due_at' => $ticket->sla_due_at?->toISOString(),
                'resolved_at' => $ticket->resolved_at?->toISOString(),
                'resolution_summary' => $ticket->resolution_summary,
                'closed_at' => $ticket->closed_at?->toISOString(),
                'created_at' => $ticket->created_at->toISOString(),
            ],
            'messages' => $messages,
            'grievanceOfficer' => PlatformSetting::getGrievanceOfficer(),
        ]);
    }

    public function storeMessage(Request $request, string $ticketReference): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $ticket = SupportTicket::query()
            ->where('ticket_reference', $ticketReference)
            ->where('user_id', $user->id)
            ->where('ticket_type', SupportTicketType::Customer)
            ->firstOrFail();

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $ticket->messages()->create([
            'sender_type' => 'customer',
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'message' => $validated['message'],
            'is_internal_note' => false,
        ]);

        $ticket->forceFill([
            'last_reply_at' => now(),
            'last_reply_by_type' => 'customer',
            'status' => in_array($ticket->status, [SupportTicketStatus::Resolved, SupportTicketStatus::Closed], true)
                ? SupportTicketStatus::Open
                : $ticket->status,
        ])->save();

        return back()->with('status', 'Your message has been sent to TIJUM support.');
    }

    public function close(Request $request, string $ticketReference): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $ticket = SupportTicket::query()
            ->where('ticket_reference', $ticketReference)
            ->where('user_id', $user->id)
            ->where('ticket_type', SupportTicketType::Customer)
            ->firstOrFail();

        $ticket->forceFill([
            'status' => SupportTicketStatus::Closed,
            'closed_at' => now(),
        ])->save();

        return back()->with('status', "Ticket {$ticket->ticket_reference} has been closed.");
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function customerCategories(): array
    {
        return [
            ['value' => 'booking_assistance', 'label' => 'Booking & Stay Assistance'],
            ['value' => 'payment_refund', 'label' => 'Payment & Refund Help'],
            ['value' => 'checkin_arrival', 'label' => 'Check-in & Reception Help'],
            ['value' => 'cancellation_change', 'label' => 'Cancellation & Date Changes'],
            ['value' => 'rewards_coupons', 'label' => 'Rewards, Points & Promo Codes'],
            ['value' => 'account_security', 'label' => 'Account & Profile Security'],
            ['value' => 'general_inquiry', 'label' => 'General Inquiry & Feedback'],
        ];
    }
}
