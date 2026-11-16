<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DesignSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_welcome_renders_without_owner_or_admin_prop_leakage(): void
    {
        $owner = Owner::factory()->active()->create();
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($owner, 'owner');
        $this->actingAs($admin, 'admin');

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('auth.user', null)
                ->missing('auth.owner')
                ->missing('auth.admin'),
            );
    }

    public function test_design_system_showcase_renders_in_testing_and_local_environments(): void
    {
        $this->get(route('dev.design-system'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dev/design-system')
                ->missing('auth.owner')
                ->missing('auth.admin'),
            );
    }

    public function test_design_system_showcase_returns_404_in_production_environment(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->get(route('dev.design-system'))
            ->assertNotFound();
    }

    public function test_customer_appearance_settings_renders_with_authenticated_verified_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->get(route('appearance.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/appearance')
                ->where('auth.user.email', $user->email)
                ->missing('auth.owner')
                ->missing('auth.admin'),
            );
    }
}
