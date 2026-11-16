<?php

namespace Tests\Feature\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Enums\OwnerStatus;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Notifications\Owner\PartnerApplicationRejectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PartnerVerificationRejectionTest extends TestCase
{
    use RefreshDatabase;

    private function createUnderReviewApp(): OwnerVerificationApplication
    {
        $owner = Owner::factory()->pendingReview()->create();

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000501',
            'status' => OwnerVerificationStatus::UnderReview,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        return $app;
    }

    public function test_rejection_requires_a_documented_reason(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $app = $this->createUnderReviewApp();

        $this->actingAs($admin, 'admin')
            ->from(route('admin.partners.show', $app))
            ->post(route('admin.partners.reject', $app), [
                'decision_reason' => 'Too short',
            ])
            ->assertRedirect(route('admin.partners.show', $app))
            ->assertSessionHasErrors('decision_reason');

        $this->assertSame(OwnerVerificationStatus::UnderReview, $app->refresh()->status);
    }

    public function test_rejection_documents_reason_notifies_owner_and_does_not_block_owner_login(): void
    {
        Notification::fake();

        $admin = Admin::factory()->superAdmin()->withTwoFactor()->create();
        $app = $this->createUnderReviewApp();

        $reason = 'Business address document could not be matched to an active operator address.';

        $this->actingAs($admin, 'admin')
            ->post(route('admin.partners.reject', $app), [
                'decision_reason' => $reason,
                'internal_reviewer_notes' => 'Confidential check trace',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('admin.partners.show', $app));

        $app->refresh();
        $owner = $app->owner->refresh();

        $this->assertSame(OwnerVerificationStatus::Rejected, $app->status);
        $this->assertNull($app->active_owner_id);
        $this->assertSame($reason, $app->decision_reason);
        $this->assertSame($admin->id, $app->reviewed_by_admin_id);

        // Ordinary application rejection keeps OwnerStatus::PendingReview and portal sign-in accessible
        $this->assertSame(OwnerStatus::PendingReview, $owner->status);
        $this->assertTrue($owner->canSignIn());

        Notification::assertSentTo($owner, PartnerApplicationRejectedNotification::class);
    }
}
