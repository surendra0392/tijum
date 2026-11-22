<?php

declare(strict_types=1);

namespace Tests\Feature\Auth\Admin;

use App\Enums\AdminRole;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use App\Notifications\Admin\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AdminAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_screen_can_be_rendered(): void
    {
        $response = $this->get(route('admin.login'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('admin/auth/login')
            ->where('canResetPassword', true)
            ->where('auth.admin', null)
            ->missing('auth.user')
            ->missing('auth.owner'),
        );
    }

    public function test_newly_provisioned_admin_without_totp_must_enroll_before_accessing_dashboard(): void
    {
        $admin = Admin::factory()->withoutTwoFactor()->create();

        $loginResponse = $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $loginResponse->assertRedirect(route('admin.two-factor.setup'));
        $this->assertAuthenticatedAs($admin, 'admin');

        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.two-factor.setup'));
    }

    public function test_admin_can_enroll_and_confirm_totp_to_unlock_dashboard(): void
    {
        $admin = Admin::factory()->withoutTwoFactor()->superAdmin()->create();

        $this->actingAs($admin, 'admin')
            ->post(route('admin.two-factor.enable'))
            ->assertRedirect(route('admin.two-factor.setup'));

        $admin->refresh();

        $this->assertNotNull($admin->two_factor_secret);
        $this->assertNull($admin->two_factor_confirmed_at);
        $this->assertFalse($admin->hasTwoFactorEnabled());
        $this->assertNotSame($admin->two_factor_secret, $admin->getRawOriginal('two_factor_secret'));

        $setupPage = $this->actingAs($admin, 'admin')
            ->get(route('admin.two-factor.setup'));

        $setupPage->assertOk();
        $setupPage->assertInertia(fn (Assert $page) => $page
            ->component('admin/security/two-factor')
            ->where('twoFactorEnabled', false)
            ->where('pendingEnrollment', true)
            ->has('qrCodeSvg')
            ->has('setupKey'),
        );

        $this->actingAs($admin, 'admin')
            ->post(route('admin.two-factor.confirm'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $validOtp = (new Google2FA)->getCurrentOtp((string) $admin->two_factor_secret);

        $confirmResponse = $this->actingAs($admin, 'admin')
            ->post(route('admin.two-factor.confirm'), ['code' => $validOtp]);

        $confirmResponse->assertRedirect(route('admin.two-factor.setup'));
        $confirmResponse->assertSessionHas('status', 'two-factor-confirmed');
        $confirmResponse->assertSessionHas('recoveryCodes');

        $admin->refresh();

        $this->assertTrue($admin->hasTwoFactorEnabled());
        $this->assertNotNull($admin->two_factor_confirmed_at);
        $this->assertCount(8, $admin->recoveryCodes());

        $this->actingAs($admin, 'admin')
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('securitySummary.twoFactorEnabled', true)
                ->where('securitySummary.guard', 'admin'),
            );
    }

    public function test_admin_with_totp_enabled_cannot_bypass_two_factor_challenge(): void
    {
        $secret = 'JBSWY3DPEHPK3PXP';
        $admin = Admin::factory()->withTwoFactor($secret)->create();

        $loginResponse = $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $loginResponse->assertRedirect(route('admin.two-factor.challenge'));
        $this->assertGuest('admin');

        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'));

        $this->post(route('admin.two-factor.challenge.verify'), [
            'code' => '999999',
        ])->assertSessionHasErrors('code');

        $this->assertGuest('admin');

        $this->travel(35)->seconds();
        $validOtp = (new Google2FA)->getCurrentOtp($secret);

        $challengeResponse = $this->post(route('admin.two-factor.challenge.verify'), [
            'code' => $validOtp,
        ]);

        $challengeResponse->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($admin, 'admin');
    }

    public function test_admin_can_verify_challenge_with_single_use_recovery_code(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();
        $recoveryCodes = $admin->recoveryCodes();
        $firstRecoveryCode = $recoveryCodes[0];

        $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('admin.two-factor.challenge'));

        $this->post(route('admin.two-factor.challenge.verify'), [
            'recovery_code' => $firstRecoveryCode,
        ])->assertRedirect(route('admin.dashboard'));

        $this->assertAuthenticatedAs($admin, 'admin');
        $this->assertCount(7, $admin->fresh()->recoveryCodes());

        $this->post(route('admin.logout'));

        $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('admin.two-factor.challenge'));

        $this->post(route('admin.two-factor.challenge.verify'), [
            'recovery_code' => $firstRecoveryCode,
        ])->assertSessionHasErrors('recovery_code');

        $this->assertGuest('admin');
    }

    public function test_inactive_admin_cannot_login_or_stay_authenticated(): void
    {
        $inactiveAdmin = Admin::factory()->inactive()->withTwoFactor()->create();

        $this->post(route('admin.login.store'), [
            'email' => $inactiveAdmin->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest('admin');

        $activeAdmin = Admin::factory()->withTwoFactor()->create();
        $this->actingAs($activeAdmin, 'admin');
        $activeAdmin->forceFill(['is_active' => false])->save();

        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest('admin');
    }

    public function test_admin_login_and_two_factor_challenge_are_rate_limited(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post(route('admin.login.store'), [
                'email' => $admin->email,
                'password' => 'wrong-password',
            ]);
        }

        $this->post(route('admin.login.store'), [
            'email' => $admin->email,
            'password' => 'wrong-password',
        ])->assertTooManyRequests();

        $otherAdmin = Admin::factory()->withTwoFactor()->create();

        $this->post(route('admin.login.store'), [
            'email' => $otherAdmin->email,
            'password' => 'password',
        ])->assertRedirect(route('admin.two-factor.challenge'));

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post(route('admin.two-factor.challenge.verify'), [
                'code' => '000000',
            ]);
        }

        $this->post(route('admin.two-factor.challenge.verify'), [
            'code' => '000000',
        ])->assertTooManyRequests();
    }

    public function test_admin_can_logout_without_destroying_customer_or_owner_sessions(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($user, 'web');
        $this->actingAs($owner, 'owner');
        $this->actingAs($admin, 'admin');

        $response = $this->post(route('admin.logout'));

        $response->assertRedirect(route('admin.login'));
        $this->assertGuest('admin');
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertAuthenticatedAs($owner, 'owner');
    }

    public function test_admin_password_reset_is_isolated_to_admins_broker(): void
    {
        Notification::fake();

        $admin = Admin::factory()->withTwoFactor()->create();

        $this->post(route('admin.password.email'), [
            'email' => $admin->email,
        ])->assertSessionHas('status');

        $this->assertDatabaseHas('admin_password_reset_tokens', [
            'email' => $admin->email,
        ]);
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->assertDatabaseCount('owner_password_reset_tokens', 0);

        Notification::assertSentTo($admin, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($admin): bool {
            $this->get(route('admin.password.reset', [
                'token' => $notification->token,
                'email' => $admin->email,
            ]))->assertOk();

            $this->post(route('admin.password.update'), [
                'token' => $notification->token,
                'email' => $admin->email,
                'password' => 'NewAdminPass#2026!',
                'password_confirmation' => 'NewAdminPass#2026!',
            ])->assertRedirect(route('admin.login'));

            $this->assertTrue(Hash::check('NewAdminPass#2026!', $admin->fresh()->password));

            return true;
        });
    }

    public function test_admin_role_middleware_enforces_super_admin_and_restricted_roles(): void
    {
        Route::middleware(['web', 'auth:admin', 'admin.active', 'admin.two-factor', 'admin.role:finance,operations'])
            ->get('/admin/_test/finance-ops', fn (): string => 'ok');

        $superAdmin = Admin::factory()->superAdmin()->withTwoFactor()->create();
        $operations = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();
        $support = Admin::factory()->role(AdminRole::CustomerSupport)->withTwoFactor()->create();

        $this->actingAs($superAdmin, 'admin')
            ->get('/admin/_test/finance-ops')
            ->assertOk();

        $this->actingAs($operations, 'admin')
            ->get('/admin/_test/finance-ops')
            ->assertOk();

        $this->actingAs($support, 'admin')
            ->get('/admin/_test/finance-ops')
            ->assertForbidden();
    }
}
