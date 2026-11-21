<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\Reservation;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CustomerSupportTicketController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(SupportTicketStatus::class)],
        ]);

        $query = SupportTicket::query()
            ->where('ticket_type', SupportTicketType::Customer)
            ->where('user_id', $user->id)
            ->with(['property.city', 'reservation'])
            ->latest('id');

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $tickets = $query->paginate(15);
        $reservations = Reservation::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(20)
            ->get(['id', 'booking_reference', 'snapshot_property_name'])
            ->map(static fn (Reservation $reservation): array => [
                'id' => $reservation->id,
                'booking_reference' => $reservation->booking_reference,
                'property_name' => $reservation->snapshot_property_name,
            ])
            ->values()
            ->all();

        return $this->success([
            'tickets' => collect($tickets->items())
                ->map(fn (SupportTicket $ticket): array => $this->ticketSummary($ticket))
                ->values()
                ->all(),
            'categories' => $this->categories(),
            'reservations' => $reservations,
        ], 'Customer support tickets retrieved', 200, [
            'current_page' => $tickets->currentPage(),
            'last_page' => $tickets->lastPage(),
            'total' => $tickets->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(array_column($this->categories(), 'value'))],
            'priority' => ['required', Rule::enum(SupportTicketPriority::class)],
            'message' => ['required', 'string', 'min:20', 'max:5000'],
            'booking_reference' => ['nullable', 'string', 'max:64'],
        ]);

        $reservation = null;
        if (! empty($validated['booking_reference'])) {
            $reservation = Reservation::query()
                ->where('booking_reference', $validated['booking_reference'])
                ->where('user_id', $user->id)
                ->first();

            if ($reservation === null) {
                return $this->error('The booking reference does not belong to this customer.', 'INVALID_BOOKING_REFERENCE', 422);
            }
        }

        $priority = SupportTicketPriority::from($validated['priority']);

        /** @var SupportTicket $ticket */
        $ticket = DB::transaction(function () use ($user, $validated, $reservation, $priority): SupportTicket {
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
                'sla_due_at' => CarbonImmutable::now()->addHours($priority->defaultSlaHours()),
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

            return $ticket;
        });

        return $this->success($this->ticketSummary($ticket), 'Support ticket created', 201);
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        $ticket = $this->customerTicket($request, $reference, true);
        if ($ticket === null) {
            return $this->error('Support ticket not found.', 'NOT_FOUND', 404);
        }

        return $this->success([
            'ticket' => $this->ticketDetail($ticket),
            'messages' => $ticket->messages
                ->where('is_internal_note', false)
                ->map(fn (SupportTicketMessage $message): array => $this->messagePayload($message))
                ->values()
                ->all(),
        ]);
    }

    public function addMessage(Request $request, string $reference): JsonResponse
    {
        $ticket = $this->customerTicket($request, $reference);
        if ($ticket === null) {
            return $this->error('Support ticket not found.', 'NOT_FOUND', 404);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:5000'],
        ]);
        /** @var User $user */
        $user = $request->user();

        $message = $ticket->messages()->create([
            'sender_type' => 'customer',
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'message' => $validated['message'],
            'is_internal_note' => false,
        ]);

        $ticket->forceFill([
            'last_reply_at' => now(),
            'last_reply_by_type' => 'customer',
            'status' => $ticket->status->isTerminal() ? SupportTicketStatus::Open : $ticket->status,
        ])->save();

        return $this->success($this->messagePayload($message), 'Support message sent', 201);
    }

    public function close(Request $request, string $reference): JsonResponse
    {
        $ticket = $this->customerTicket($request, $reference);
        if ($ticket === null) {
            return $this->error('Support ticket not found.', 'NOT_FOUND', 404);
        }

        $ticket->forceFill([
            'status' => SupportTicketStatus::Closed,
            'closed_at' => now(),
        ])->save();

        return $this->success($this->ticketSummary($ticket->refresh()), 'Support ticket closed');
    }

    private function customerTicket(Request $request, string $reference, bool $withMessages = false): ?SupportTicket
    {
        /** @var User $user */
        $user = $request->user();

        return SupportTicket::query()
            ->where('ticket_reference', $reference)
            ->where('ticket_type', SupportTicketType::Customer)
            ->where('user_id', $user->id)
            ->with($withMessages ? ['property.city', 'reservation', 'messages'] : [])
            ->first();
    }

    /** @return array<string, mixed> */
    private function ticketSummary(SupportTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'ticket_reference' => $ticket->ticket_reference,
            'subject' => $ticket->subject,
            'category' => $ticket->category,
            'status' => $ticket->status->value,
            'status_label' => $ticket->status->label(),
            'priority' => $ticket->priority->value,
            'priority_label' => $ticket->priority->label(),
            'booking_reference' => $ticket->reservation?->booking_reference,
            'property_name' => $ticket->property?->name,
            'created_at' => $ticket->created_at->toISOString(),
            'last_reply_at' => $ticket->last_reply_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function ticketDetail(SupportTicket $ticket): array
    {
        return array_merge($this->ticketSummary($ticket), [
            'message' => $ticket->message,
            'sla_due_at' => $ticket->sla_due_at?->toISOString(),
            'resolved_at' => $ticket->resolved_at?->toISOString(),
            'resolution_summary' => $ticket->resolution_summary,
            'closed_at' => $ticket->closed_at?->toISOString(),
        ]);
    }

    /** @return array<string, mixed> */
    private function messagePayload(SupportTicketMessage $message): array
    {
        return [
            'id' => $message->id,
            'sender_type' => $message->sender_type,
            'sender_name' => $message->sender_name,
            'message' => $message->message,
            'created_at' => $message->created_at->toISOString(),
        ];
    }

    /** @return list<array{value: string, label: string}> */
    private function categories(): array
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
