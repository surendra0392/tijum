<?php

namespace Tests\Feature\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PartnerVerificationAccessTest extends TestCase
{
    use RefreshDatabase;

    private function createVerificationApplication(): OwnerVerificationApplication
    {
        $owner = Owner::factory()->pendingReview()->create();

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000201',
            'status' => OwnerVerificationStatus::Submitted,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        return $app;
    }

    public function test_guests_customers_and_owners_cannot_access_admin_partner_verification(): void
    {
        $app = $this->createVerificationApplication();
        $customer = User::factory()->create();
        $owner = Owner::factory()->active()->create();

        $this->get(route('admin.partners.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($customer, 'web')->get(route('admin.partners.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->get(route('admin.partners.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->post(route('admin.partners.approve', $app))->assertRedirect(route('admin.login'));
    }

    public function test_inactive_or_non_totp_admins_cannot_access_partner_verification(): void
    {
        $app = $this->createVerificationApplication();

        $noTotpAdmin = Admin::factory()->role(AdminRole::PropertyVerification)->withoutTwoFactor()->create();
        $this->actingAs($noTotpAdmin, 'admin')
            ->get(route('admin.partners.index'))
            ->assertRedirect(route('admin.two-factor.setup'));

        $inactiveAdmin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->inactive()->create();
        $this->actingAs($inactiveAdmin, 'admin')
            ->get(route('admin.partners.show', $app))
            ->assertRedirect(route('admin.login'));
    }

    public function test_role_based_access_matrix_for_finance_support_operations_verification_and_super_admin(): void
    {
        $app = $this->createVerificationApplication();

        $finance = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create();
        $this->actingAs($finance, 'admin')->get(route('admin.partners.index'))->assertForbidden();
        $this->actingAs($finance, 'admin')->get(route('admin.partners.show', $app))->assertForbidden();

        $support = Admin::factory()->role(AdminRole::CustomerSupport)->withTwoFactor()->create();
        $this->actingAs($support, 'admin')->get(route('admin.partners.index'))->assertForbidden();
        $this->actingAs($support, 'admin')->post(route('admin.partners.start-review', $app))->assertForbidden();

        $operations = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();
        $this->actingAs($operations, 'admin')
            ->get(route('admin.partners.show', $app))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/partners/verification/show')
                ->where('capabilities.canViewDocuments', false)
                ->where('capabilities.canApprove', false),
            );
        $this->actingAs($operations, 'admin')
            ->post(route('admin.partners.start-review', $app))
            ->assertForbidden();

        $verifier = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $this->actingAs($verifier, 'admin')->get(route('admin.partners.index'))->assertOk();
        $this->actingAs($verifier, 'admin')->get(route('admin.partners.show', $app))->assertOk();

        $superAdmin = Admin::factory()->superAdmin()->withTwoFactor()->create();
        $this->actingAs($superAdmin, 'admin')->get(route('admin.partners.index'))->assertOk();
    }
}
