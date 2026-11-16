<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Support;

use App\Enums\AdminRole;
use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Reservation;
use App\Models\SupportTicket;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SupportDeskTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): Admin
    {
        return Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
    }

    private function createCustomerTicket(User $user, ?Reservation $reservation = null): SupportTicket
    {
        $ticket = SupportTicket::create([
            'ticket_reference' => SupportTicket::generateReference(SupportTicketType::Customer),
            'ticket_type' => SupportTicketType::Customer,
            'user_id' => $user->id,
            'reservation_id' => $reservation?->id,
            'property_id' => $reservation?->property_id,
            'subject' => 'Need help with room check-in',
            'category' => 'checkin_arrival',
            'status' => SupportTicketStatus::Open,
            'priority' => SupportTicketPriority::Standard,
            'message' => 'I would like to know if early check-in is possible.',
            'sla_due_at' => CarbonImmutable::now()->addHours(24),
            'last_reply_at' => now(),
            'last_reply_by_type' => 'customer',
        ]);

        $ticket->messages()->create([
            'sender_type' => 'customer',
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'message' => 'I would like to know if early check-in is possible.',
            'is_internal_note' => false,
        ]);

        return $ticket;
    }

    private function createPartnerTicket(Owner $owner, ?Property $property = null): SupportTicket
    {
        $ticket = SupportTicket::create([
            'ticket_reference' => SupportTicket::generateReference(SupportTicketType::Partner),
            'ticket_type' => SupportTicketType::Partner,
            'owner_id' => $owner->id,
            'property_id' => $property?->id,
            'subject' => 'Inquiry about settlement batch timing',
            'category' => 'payout_settlement',
            'status' => SupportTicketStatus::Open,
            'priority' => SupportTicketPriority::High,
            'message' => 'Please confirm when yesterday settlements will be deposited.',
            'sla_due_at' => CarbonImmutable::now()->addHours(12),
            'last_reply_at' => now(),
            'last_reply_by_type' => 'partner',
        ]);

        $ticket->messages()->create([
            'sender_type' => 'partner',
            'sender_id' => $owner->id,
            'sender_name' => $owner->name,
            'message' => 'Please confirm when yesterday settlements will be deposited.',
            'is_internal_note' => false,
        ]);

        return $ticket;
    }

    public function test_admin_customer_support_index_renders_and_filters(): void
    {
        $admin = $this->superAdmin();
        $user = User::factory()->create();
        $this->createCustomerTicket($user);

        $response = $this->actingAs($admin, 'admin')->get(route('admin.support.customers.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('admin/support/customer/index')
            ->has('tickets.data', 1)
            ->has('stats')
            ->where('stats.total_active', 1)
        );
    }

    public function test_admin_customer_support_show_and_reply(): void
    {
        $admin = $this->superAdmin();
        $user = User::factory()->create();
        $ticket = $this->createCustomerTicket($user);

        $showResponse = $this->actingAs($admin, 'admin')->get(route('admin.support.customers.show', $ticket->ticket_reference));
        $showResponse->assertOk();
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('admin/support/customer/show')
            ->where('ticket.ticket_reference', $ticket->ticket_reference)
            ->has('messages', 1)
        );

        $replyResponse = $this->actingAs($admin, 'admin')->post(route('admin.support.customers.messages.store', $ticket->ticket_reference), [
            'message' => 'Yes, early check-in is permitted starting at 10 AM.',
            'is_internal_note' => false,
        ]);

        $replyResponse->assertRedirect();
        $this->assertDatabaseHas('support_ticket_messages', [
            'support_ticket_id' => $ticket->id,
            'sender_type' => 'admin',
            'message' => 'Yes, early check-in is permitted starting at 10 AM.',
            'is_internal_note' => false,
        ]);
    }

    public function test_admin_customer_support_internal_note_and_resolve(): void
    {
        $admin = $this->superAdmin();
        $user = User::factory()->create();
        $ticket = $this->createCustomerTicket($user);

        // Add internal note
        $noteResponse = $this->actingAs($admin, 'admin')->post(route('admin.support.customers.messages.store', $ticket->ticket_reference), [
            'message' => 'Staff verified room cleaning will complete at 9:30 AM.',
            'is_internal_note' => true,
        ]);
        $noteResponse->assertRedirect();

        $this->assertDatabaseHas('support_ticket_messages', [
            'support_ticket_id' => $ticket->id,
            'is_internal_note' => true,
        ]);

        // Resolve ticket
        $resolveResponse = $this->actingAs($admin, 'admin')->post(route('admin.support.customers.resolve', $ticket->ticket_reference), [
            'resolution_summary' => 'Confirmed with property host that guest can check in at 10 AM.',
        ]);
        $resolveResponse->assertRedirect();

        $ticket->refresh();
        $this->assertSame(SupportTicketStatus::Resolved, $ticket->status);
        $this->assertSame('Confirmed with property host that guest can check in at 10 AM.', $ticket->resolution_summary);
    }

    public function test_admin_partner_support_index_and_show(): void
    {
        $admin = $this->superAdmin();
        $owner = Owner::factory()->create();
        $ticket = $this->createPartnerTicket($owner);

        $indexResponse = $this->actingAs($admin, 'admin')->get(route('admin.support.partners.index'));
        $indexResponse->assertOk();
        $indexResponse->assertInertia(fn (Assert $page) => $page
            ->component('admin/support/partner/index')
            ->has('tickets.data', 1)
        );

        $showResponse = $this->actingAs($admin, 'admin')->get(route('admin.support.partners.show', $ticket->ticket_reference));
        $showResponse->assertOk();
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('admin/support/partner/show')
            ->where('ticket.ticket_reference', $ticket->ticket_reference)
        );
    }

    public function test_admin_partner_support_resolve_and_assign(): void
    {
        $admin = $this->superAdmin();
        $owner = Owner::factory()->create();
        $ticket = $this->createPartnerTicket($owner);

        $assignResponse = $this->actingAs($admin, 'admin')->patch(route('admin.support.partners.assign', $ticket->ticket_reference), [
            'assigned_admin_id' => $admin->id,
        ]);
        $assignResponse->assertRedirect();

        $resolveResponse = $this->actingAs($admin, 'admin')->post(route('admin.support.partners.resolve', $ticket->ticket_reference), [
            'resolution_summary' => 'Settlement processed and UTR provided.',
        ]);
        $resolveResponse->assertRedirect();

        $ticket->refresh();
        $this->assertSame($admin->id, $ticket->assigned_admin_id);
        $this->assertSame(SupportTicketStatus::Resolved, $ticket->status);
    }

    public function test_partner_can_create_ticket_and_reply(): void
    {
        $owner = Owner::factory()->create();

        $createResponse = $this->actingAs($owner, 'owner')->post(route('owner.support.store'), [
            'subject' => 'Need help with payout',
            'category' => 'payout_settlement',
            'priority' => 'high',
            'message' => 'My bank account was changed recently.',
        ]);

        $createResponse->assertRedirect();
        $ticket = SupportTicket::query()->where('owner_id', $owner->id)->first();
        $this->assertNotNull($ticket);
        $this->assertSame('Need help with payout', $ticket->subject);

        // Partner views their ticket
        $showResponse = $this->actingAs($owner, 'owner')->get(route('owner.support.show', $ticket->ticket_reference));
        $showResponse->assertOk();
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('owner/support/show')
            ->where('ticket.ticket_reference', $ticket->ticket_reference)
        );

        // Partner replies
        $replyResponse = $this->actingAs($owner, 'owner')->post(route('owner.support.messages.store', $ticket->ticket_reference), [
            'message' => 'Attaching IFSC details for verification.',
        ]);
        $replyResponse->assertRedirect();

        $this->assertDatabaseHas('support_ticket_messages', [
            'support_ticket_id' => $ticket->id,
            'message' => 'Attaching IFSC details for verification.',
        ]);
    }

    public function test_partner_cannot_see_internal_notes(): void
    {
        $admin = $this->superAdmin();
        $owner = Owner::factory()->create();
        $ticket = $this->createPartnerTicket($owner);

        // Admin adds internal staff note
        $this->actingAs($admin, 'admin')->post(route('admin.support.partners.messages.store', $ticket->ticket_reference), [
            'message' => 'INTERNAL NOTE: Sensitive compliance verification pending.',
            'is_internal_note' => true,
        ]);

        // Partner requests show view
        $response = $this->actingAs($owner, 'owner')->get(route('owner.support.show', $ticket->ticket_reference));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('owner/support/show')
            ->has('messages', 1) // only the initial partner message, NOT the internal note!
        );
    }

    public function test_partner_can_close_ticket(): void
    {
        $owner = Owner::factory()->create();
        $ticket = $this->createPartnerTicket($owner);

        $closeResponse = $this->actingAs($owner, 'owner')->post(route('owner.support.close', $ticket->ticket_reference));
        $closeResponse->assertRedirect();

        $ticket->refresh();
        $this->assertSame(SupportTicketStatus::Closed, $ticket->status);
        $this->assertNotNull($ticket->closed_at);
    }

    public function test_customer_can_create_ticket_and_reply(): void
    {
        $user = User::factory()->create();

        $createResponse = $this->actingAs($user)->post(route('support.tickets.store'), [
            'subject' => 'Question about breakfast timings',
            'category' => 'checkin_arrival',
            'priority' => 'standard',
            'message' => 'Is breakfast served until 11am?',
        ]);

        $createResponse->assertRedirect();
        $ticket = SupportTicket::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($ticket);

        // Customer views ticket
        $showResponse = $this->actingAs($user)->get(route('support.tickets.show', $ticket->ticket_reference));
        $showResponse->assertOk();
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('support/tickets/show')
            ->where('ticket.ticket_reference', $ticket->ticket_reference)
        );

        // Customer replies
        $replyResponse = $this->actingAs($user)->post(route('support.tickets.messages.store', $ticket->ticket_reference), [
            'message' => 'Thank you, understood!',
        ]);
        $replyResponse->assertRedirect();
    }

    public function test_customer_cannot_see_internal_notes(): void
    {
        $admin = $this->superAdmin();
        $user = User::factory()->create();
        $ticket = $this->createCustomerTicket($user);

        // Add internal staff note directly
        $ticket->messages()->create([
            'sender_type' => 'admin',
            'sender_id' => $admin->id,
            'sender_name' => $admin->name,
            'message' => 'INTERNAL STAFF AUDIT: Customer flagged for high frequency inquiries.',
            'is_internal_note' => true,
        ]);

        // Customer requests show view
        $response = $this->actingAs($user, 'web')->get(route('support.tickets.show', $ticket->ticket_reference));
        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('support/tickets/show')
            ->has('messages', 1) // only the initial customer message, NOT the internal note!
        );
    }

    public function test_customer_can_close_ticket(): void
    {
        $user = User::factory()->create();
        $ticket = $this->createCustomerTicket($user);

        $closeResponse = $this->actingAs($user)->post(route('support.tickets.close', $ticket->ticket_reference));
        $closeResponse->assertRedirect();

        $ticket->refresh();
        $this->assertSame(SupportTicketStatus::Closed, $ticket->status);
        $this->assertNotNull($ticket->closed_at);
    }
}
