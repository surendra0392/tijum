<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Dashboard;

use App\Enums\AdminRole;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminDashboardAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_customers_and_owners_cannot_access_admin_dashboard(): void
    {
        $customer = User::factory()->create();
        $owner = Owner::factory()->active()->create();

        $this->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
        $this->actingAs($customer, 'web')->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
    }

    public function test_admin_without_totp_is_redirected_to_two_factor_setup(): void
    {
        $admin = Admin::factory()->withoutTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.two-factor.setup'));
    }

    public function test_inactive_admin_is_redirected_to_login(): void
    {
        $admin = Admin::factory()->withTwoFactor()->inactive()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'));
    }

    public function test_super_admin_can_access_dashboard_with_all_capabilities(): void
    {
        $admin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->has('marketplaceOverview')
                ->has('reservationMetrics')
                ->has('paymentMetrics')
                ->has('revenueBreakdown')
                ->has('customerProtectionMetrics')
                ->has('financialOperations')
                ->has('queues')
                ->has('recentActivities')
                ->has('systemHealth')
                ->where('capabilities.canViewFinance', true)
                ->where('capabilities.canViewOperations', true)
                ->where('capabilities.canViewProtection', true)
            );
    }

    public function test_operations_admin_receives_dashboard_with_sensitive_finance_redacted(): void
    {
        $admin = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->has('marketplaceOverview')
                ->has('reservationMetrics')
                ->where('revenueBreakdown', null)
                ->where('paymentMetrics', null)
                ->where('financialOperations', null)
                ->where('capabilities.canViewFinance', false)
                ->where('capabilities.canViewOperations', true)
            );
    }

    public function test_finance_admin_receives_dashboard_with_financial_breakdown_populated(): void
    {
        $admin = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->has('revenueBreakdown')
                ->has('paymentMetrics')
                ->has('financialOperations')
                ->where('capabilities.canViewFinance', true)
            );
    }
}
