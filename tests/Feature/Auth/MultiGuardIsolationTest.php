<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use App\Notifications\Owner\ResetPasswordNotification as OwnerResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class MultiGuardIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cannot_access_owner_or_admin_dashboards(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->get(route('owner.dashboard'))
            ->assertRedirect(route('owner.login'));

        $this->actingAs($user, 'web')
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'));
    }

    public function test_owner_cannot_access_customer_or_admin_dashboards(): void
    {
        $owner = Owner::factory()->active()->create();

        $this->actingAs($owner, 'owner')
            ->get(route('dashboard'))
            ->assertRedirect(route('login'));

        $this->actingAs($owner, 'owner')
            ->get(route('profile.edit'))
            ->assertRedirect(route('login'));

        $this->actingAs($owner, 'owner')
            ->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'));
    }

    public function test_admin_cannot_access_customer_or_owner_dashboards(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->get(route('dashboard'))
            ->assertRedirect(route('login'));

        $this->actingAs($admin, 'admin')
            ->get(route('profile.edit'))
            ->assertRedirect(route('login'));

        $this->actingAs($admin, 'admin')
            ->get(route('owner.dashboard'))
            ->assertRedirect(route('owner.login'));
    }

    public function test_all_three_identities_can_share_same_email_address_independently(): void
    {
        $sharedEmail = 'shared-identity@tijum.in';

        $user = User::factory()->create([
            'email' => $sharedEmail,
            'password' => 'CustomerPass#123',
        ]);

        $owner = Owner::factory()->active()->create([
            'email' => $sharedEmail,
            'password' => 'OwnerPass#123',
        ]);

        $admin = Admin::factory()->withoutTwoFactor()->create([
            'email' => $sharedEmail,
            'password' => 'AdminPass#123',
        ]);

        $this->post(route('owner.login.store'), [
            'email' => $sharedEmail,
            'password' => 'CustomerPass#123',
        ])->assertSessionHasErrors('email');
        $this->assertGuest('owner');

        $this->post(route('owner.login.store'), [
            'email' => $sharedEmail,
            'password' => 'OwnerPass#123',
        ])->assertRedirect(route('owner.dashboard'));

        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertGuest('web');
        $this->assertGuest('admin');

        $this->post(route('admin.login.store'), [
            'email' => $sharedEmail,
            'password' => 'OwnerPass#123',
        ])->assertSessionHasErrors('email');
        $this->assertGuest('admin');

        $this->post(route('login.store'), [
            'email' => $sharedEmail,
            'password' => 'CustomerPass#123',
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertTrue(Hash::check('AdminPass#123', $admin->password));
    }

    public function test_password_reset_tokens_never_cross_authentication_domains(): void
    {
        Notification::fake();

        $sharedEmail = 'reset-boundary@tijum.in';

        $user = User::factory()->create(['email' => $sharedEmail]);
        $owner = Owner::factory()->active()->create(['email' => $sharedEmail]);
        $admin = Admin::factory()->withTwoFactor()->create(['email' => $sharedEmail]);

        $this->post(route('owner.password.email'), [
            'email' => $sharedEmail,
        ])->assertSessionHas('status');

        $capturedToken = '';

        Notification::assertSentTo($owner, OwnerResetPasswordNotification::class, function (OwnerResetPasswordNotification $notification) use (&$capturedToken): bool {
            $capturedToken = $notification->token;

            return true;
        });

        $this->post(route('password.update'), [
            'token' => $capturedToken,
            'email' => $sharedEmail,
            'password' => 'CrossResetAttempt#123',
            'password_confirmation' => 'CrossResetAttempt#123',
        ])->assertSessionHasErrors();

        $this->post(route('admin.password.update'), [
            'token' => $capturedToken,
            'email' => $sharedEmail,
            'password' => 'CrossResetAttempt#123',
            'password_confirmation' => 'CrossResetAttempt#123',
        ])->assertSessionHasErrors('email');

        $this->assertFalse(Hash::check('CrossResetAttempt#123', $user->fresh()->password));
        $this->assertFalse(Hash::check('CrossResetAttempt#123', $admin->fresh()->password));
    }

    public function test_simultaneous_multi_guard_session_and_guard_scoped_logout_isolation(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $adminSecret = 'JBSWY3DPEHPK3PXQ';
        $admin = Admin::factory()->withTwoFactor($adminSecret)->create();

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect(route('dashboard'));

        $this->post(route('owner.login.store'), [
            'email' => $owner->email,
            'password' => 'password',
        ])->assertRedirect(route('owner.dashboard'));

        $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('admin.two-factor.challenge'));

        $this->post(route('admin.two-factor.challenge.verify'), [
            'code' => (new Google2FA)->getCurrentOtp($adminSecret),
        ])->assertRedirect(route('admin.dashboard'));

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertAuthenticatedAs($admin, 'admin');

        $this->post(route('owner.logout'))
            ->assertRedirect(route('owner.login'));

        $this->assertGuest('owner');
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertAuthenticatedAs($admin, 'admin');

        $this->post(route('owner.login.store'), [
            'email' => $owner->email,
            'password' => 'password',
        ])->assertRedirect(route('owner.dashboard'));

        $this->post(route('admin.logout'))
            ->assertRedirect(route('admin.login'));

        $this->assertGuest('admin');
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertAuthenticatedAs($owner, 'owner');
    }

    public function test_inertia_shared_auth_props_isolate_portals_without_cross_leakage(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($user, 'web');
        $this->actingAs($owner, 'owner');
        $this->actingAs($admin, 'admin');

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user.email', $user->email)
                ->missing('auth.owner')
                ->missing('auth.admin'),
            );

        $this->get(route('owner.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.owner.email', $owner->email)
                ->missing('auth.user')
                ->missing('auth.admin')
                ->missing('auth.owner.password')
                ->missing('auth.owner.remember_token'),
            );

        $this->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.admin.email', $admin->email)
                ->missing('auth.user')
                ->missing('auth.owner')
                ->missing('auth.admin.password')
                ->missing('auth.admin.two_factor_secret')
                ->missing('auth.admin.two_factor_recovery_codes'),
            );
    }

    public function test_intended_redirect_does_not_cross_portals(): void
    {
        $owner = Owner::factory()->active()->create();

        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'));

        $this->post(route('owner.login.store'), [
            'email' => $owner->email,
            'password' => 'password',
        ])->assertRedirect(route('owner.dashboard'));
    }
}
