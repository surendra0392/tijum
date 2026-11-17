<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Support;

use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\Property;
use App\Models\SupportTicket;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OwnerSupportTicketController extends Controller
{
    public function index(Request $request): Response
    {
        $owner = $this->owner($request->user('owner'));
        $status = $request->query('status');

        $query = SupportTicket::query()
            ->where('ticket_type', SupportTicketType::Partner)
            ->where('owner_id', $owner->id)
            ->with(['property'])
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
                'property_name' => $t->property?->name,
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

        return Inertia::render('owner/support/index', [
            'tickets' => $tickets,
            'filters' => [
                'status' => $status ?? 'all',
            ],
            'properties' => Property::query()
                ->where('owner_id', $owner->id)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->all(),
            'categories' => $this->partnerCategories(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $owner = $this->owner($request->user('owner'));

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:64'],
            'priority' => ['required', 'string', 'in:low,standard,high,urgent'],
            'message' => ['required', 'string', 'max:5000'],
            'property_id' => [
                'nullable',
                Rule::exists('properties', 'id')->where('owner_id', $owner->id),
            ],
        ]);

        $priority = SupportTicketPriority::from($validated['priority']);
        $slaDueAt = CarbonImmutable::now()->addHours($priority->defaultSlaHours());

        $ticket = SupportTicket::create([
            'ticket_reference' => SupportTicket::generateReference(SupportTicketType::Partner),
            'ticket_type' => SupportTicketType::Partner,
            'owner_id' => $owner->id,
            'property_id' => ! empty($validated['property_id']) ? (int) $validated['property_id'] : null,
            'subject' => $validated['subject'],
            'category' => $validated['category'],
            'status' => SupportTicketStatus::Open,
            'priority' => $priority,
            'message' => $validated['message'],
            'sla_due_at' => $slaDueAt,
            'last_reply_at' => now(),
            'last_reply_by_type' => 'partner',
        ]);

        $ticket->messages()->create([
            'sender_type' => 'partner',
            'sender_id' => $owner->id,
            'sender_name' => $owner->name,
            'message' => $validated['message'],
            'is_internal_note' => false,
        ]);

        return redirect()
            ->route('owner.support.show', $ticket->ticket_reference)
            ->with('status', "Support ticket {$ticket->ticket_reference} submitted. A partner success specialist will reply shortly.");
    }

    public function show(Request $request, string $ticketReference): Response
    {
        $owner = $this->owner($request->user('owner'));

        $ticket = SupportTicket::query()
            ->where('ticket_reference', $ticketReference)
            ->where('owner_id', $owner->id)
            ->where('ticket_type', SupportTicketType::Partner)
            ->with(['property', 'messages'])
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

        return Inertia::render('owner/support/show', [
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
                'property_name' => $ticket->property?->name,
                'sla_due_at' => $ticket->sla_due_at?->toISOString(),
                'resolved_at' => $ticket->resolved_at?->toISOString(),
                'resolution_summary' => $ticket->resolution_summary,
                'closed_at' => $ticket->closed_at?->toISOString(),
                'created_at' => $ticket->created_at->toISOString(),
            ],
            'messages' => $messages,
        ]);
    }

    public function storeMessage(Request $request, string $ticketReference): RedirectResponse
    {
        $owner = $this->owner($request->user('owner'));

        $ticket = SupportTicket::query()
            ->where('ticket_reference', $ticketReference)
            ->where('owner_id', $owner->id)
            ->where('ticket_type', SupportTicketType::Partner)
            ->firstOrFail();

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $ticket->messages()->create([
            'sender_type' => 'partner',
            'sender_id' => $owner->id,
            'sender_name' => $owner->name,
            'message' => $validated['message'],
            'is_internal_note' => false,
        ]);

        $ticket->forceFill([
            'last_reply_at' => now(),
            'last_reply_by_type' => 'partner',
            'status' => in_array($ticket->status, [SupportTicketStatus::Resolved, SupportTicketStatus::Closed], true)
                ? SupportTicketStatus::Open
                : $ticket->status,
        ])->save();

        return back()->with('status', 'Your message has been sent to partner support.');
    }

    public function close(Request $request, string $ticketReference): RedirectResponse
    {
        $owner = $this->owner($request->user('owner'));

        $ticket = SupportTicket::query()
            ->where('ticket_reference', $ticketReference)
            ->where('owner_id', $owner->id)
            ->where('ticket_type', SupportTicketType::Partner)
            ->firstOrFail();

        $ticket->forceFill([
            'status' => SupportTicketStatus::Closed,
            'closed_at' => now(),
        ])->save();

        return back()->with('status', "Ticket {$ticket->ticket_reference} has been closed.");
    }

    private function owner(mixed $owner): Owner
    {
        abort_unless($owner instanceof Owner, 401);

        return $owner;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function partnerCategories(): array
    {
        return [
            ['value' => 'payout_settlement', 'label' => 'Payouts & Settlements'],
            ['value' => 'verification_onboarding', 'label' => 'Verification & Business Profile'],
            ['value' => 'inventory_pricing', 'label' => 'Room Inventory, Beds & Pricing'],
            ['value' => 'guest_dispute', 'label' => 'Guest Dispute or Grievance'],
            ['value' => 'tax_gst_invoice', 'label' => 'Tax, TDS & GST Invoices'],
            ['value' => 'technical_support', 'label' => 'Partner Portal & App Support'],
            ['value' => 'general_inquiry', 'label' => 'General Inquiry & Platform Policies'],
        ];
    }
}
