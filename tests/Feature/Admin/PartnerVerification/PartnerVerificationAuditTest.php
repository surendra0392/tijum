<?php

namespace Tests\Feature\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\TestCase;

class PartnerVerificationAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_verification_events_are_append_only_and_hidden_admin_doc_events_are_filtered_for_owners(): void
    {
        $owner = Owner::factory()->pendingReview()->create();
        $verifier = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000701',
            'status' => OwnerVerificationStatus::Submitted,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        $submittedEvent = OwnerVerificationEvent::record(
            application: $app,
            eventType: OwnerVerificationEventType::ApplicationSubmitted,
            actorType: 'owner',
            actorId: $owner->id,
            actorName: $owner->name,
            previousStatus: OwnerVerificationStatus::Draft,
            newStatus: OwnerVerificationStatus::Submitted,
            notes: 'Owner submitted.',
        );

        OwnerVerificationEvent::record(
            application: $app,
            eventType: OwnerVerificationEventType::DocumentViewed,
            actorType: 'admin',
            actorId: $verifier->id,
            actorName: $verifier->name,
            notes: 'Internal doc view.',
        );

        $this->expectException(LogicException::class);
        $submittedEvent->forceFill(['notes' => 'Tampered note'])->save();
    }

    public function test_audit_event_cannot_be_deleted_and_admin_history_endpoint_renders_events(): void
    {
        $owner = Owner::factory()->pendingReview()->create();
        $verifier = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000702',
            'status' => OwnerVerificationStatus::Submitted,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        $event = OwnerVerificationEvent::record(
            application: $app,
            eventType: OwnerVerificationEventType::ApplicationSubmitted,
            actorType: 'owner',
            actorId: $owner->id,
            actorName: $owner->name,
            previousStatus: OwnerVerificationStatus::Draft,
            newStatus: OwnerVerificationStatus::Submitted,
        );

        OwnerVerificationEvent::record(
            application: $app,
            eventType: OwnerVerificationEventType::DocumentViewed,
            actorType: 'admin',
            actorId: $verifier->id,
            actorName: $verifier->name,
        );

        $this->actingAs($verifier, 'admin')
            ->get(route('admin.partners.history', $app))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/partners/verification/history')
                ->has('events', 2),
            );

        $this->actingAs($owner, 'owner')
            ->get(route('owner.onboarding.status'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/onboarding/application-status')
                ->has('events', 1)
                ->where('events.0.event_type', OwnerVerificationEventType::ApplicationSubmitted->value),
            );

        $this->expectException(LogicException::class);
        $event->delete();
    }
}
