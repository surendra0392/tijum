<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use App\Notifications\Customer\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CustomerAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_customer_dashboard_renders_real_account_overview_and_security_summary(): void
    {
        $customer = User::factory()->withPhone('+91 9876543210')->create([
            'name' => 'Aarav Sharma',
            'email' => 'aarav@example.com',
            'two_factor_secret' => encrypt('TESTSECRET123456'),
            'two_factor_recovery_codes' => encrypt(json_encode(['code-1', 'code-2'])),
            'two_factor_confirmed_at' => now(),
        ]);

        DB::table('passkeys')->insert([
            'user_id' => $customer->id,
            'name' => 'Work Laptop',
            'credential_id' => 'cred-customer-1',
            'credential' => json_encode(['id' => 'cred-customer-1']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($customer, 'web')->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('customer.id', $customer->id)
            ->where('customer.name', 'Aarav Sharma')
            ->where('customer.email', 'aarav@example.com')
            ->where('customer.phone', '+91 9876543210')
            ->where('customer.phone_verified_at', null)
            ->missing('customer.password')
            ->missing('customer.two_factor_secret')
            ->missing('customer.two_factor_recovery_codes')
            ->missing('customer.remember_token')
            ->missing('bookings')
            ->missing('recentBookings')
            ->where('accountOverview.emailVerified', true)
            ->where('accountOverview.phoneAdded', true)
            ->where('accountOverview.phoneVerified', false)
            ->where('accountOverview.incompleteFields', [])
            ->where('accountOverview.profileComplete', true)
            ->where('securitySummary.passwordConfigured', true)
            ->where('securitySummary.twoFactorEnabled', true)
            ->where('securitySummary.twoFactorConfirmed', true)
            ->where('securitySummary.passkeysSupported', true)
            ->where('securitySummary.passkeyCount', 1),
        );
    }

    public function test_unverified_customer_is_redirected_to_verification_notice_from_dashboard(): void
    {
        $customer = User::factory()->unverified()->create();

        $response = $this->actingAs($customer, 'web')->get(route('dashboard'));

        $response->assertRedirect(route('verification.notice'));
    }

    public function test_owner_and_admin_sessions_cannot_access_customer_dashboard_or_settings(): void
    {
        $owner = Owner::factory()->active()->create();

        $this->actingAs($owner, 'owner');
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->get(route('security.edit'))->assertRedirect(route('login'));
        $this->get(route('appearance.edit'))->assertRedirect(route('login'));

        $this->post(route('owner.logout'));

        $admin = Admin::factory()->create();
        $this->actingAs($admin, 'admin');
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->get(route('profile.edit'))->assertRedirect(route('login'));
    }

    public function test_shared_auth_prop_does_not_leak_customer_phone_on_public_pages(): void
    {
        $customer = User::factory()->withPhone('+91 9988776655')->create([
            'name' => 'Neha Reddy',
        ]);

        $response = $this->actingAs($customer, 'web')->get(route('home'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.name', 'Neha Reddy')
            ->where('auth.user.email', $customer->email)
            ->where('auth.user.phone', $customer->phone)
            ->missing('auth.user.phone_verified_at')
            ->missing('auth.user.password'),
        );
    }

    public function test_customer_profile_page_renders_with_customer_account_prop(): void
    {
        $customer = User::factory()->create([
            'name' => 'Rohan Rao',
            'email' => 'rohan@example.com',
        ]);

        $response = $this->actingAs($customer, 'web')->get(route('profile.edit'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('customer.name', 'Rohan Rao')
            ->where('customer.email', 'rohan@example.com')
            ->where('customer.phone', null)
            ->missing('customer.password'),
        );
    }

    public function test_customer_can_update_name_and_phone_and_clearing_phone_is_rejected(): void
    {
        $customer = User::factory()->create([
            'name' => 'Kavya Menon',
            'email' => 'kavya@example.com',
            'phone' => '+91 9876500000',
        ]);

        $response = $this->actingAs($customer, 'web')->patch(route('profile.update'), [
            'name' => 'Kavya S Menon',
            'email' => 'kavya@example.com',
            'phone' => '  +91 98765 43210  ',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

        $customer->refresh();
        $this->assertSame('Kavya S Menon', $customer->name);
        $this->assertSame('+91 98765 43210', $customer->phone);
        $this->assertNull($customer->phone_verified_at);
        $this->assertNotNull($customer->email_verified_at);

        $clearResponse = $this->actingAs($customer, 'web')->patch(route('profile.update'), [
            'name' => 'Kavya S Menon',
            'email' => 'kavya@example.com',
            'phone' => '   ',
        ]);

        $clearResponse->assertSessionHasErrors('phone');
        $customer->refresh();
        $this->assertSame('+91 98765 43210', $customer->phone);
    }

    public function test_customer_profile_rejects_invalid_phone_number_and_duplicate_email(): void
    {
        $otherCustomer = User::factory()->create(['email' => 'existing@example.com']);
        $customer = User::factory()->create(['email' => 'me@example.com']);

        $invalidPhoneResponse = $this->actingAs($customer, 'web')
            ->from(route('profile.edit'))
            ->patch(route('profile.update'), [
                'name' => 'My Name',
                'email' => 'me@example.com',
                'phone' => 'not-a-phone!',
            ]);

        $invalidPhoneResponse
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHasErrors('phone');

        $duplicateEmailResponse = $this->actingAs($customer, 'web')
            ->from(route('profile.edit'))
            ->patch(route('profile.update'), [
                'name' => 'My Name',
                'email' => $otherCustomer->email,
                'phone' => '+91 9876543210',
            ]);

        $duplicateEmailResponse
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHasErrors('email');

        $customer->refresh();
        $this->assertSame('me@example.com', $customer->email);
        $this->assertNull($customer->phone);
    }

    public function test_customer_email_and_phone_changes_reset_verification_and_send_verify_email_notification(): void
    {
        Notification::fake();

        $customer = User::factory()->withPhone('+91 9876543210')->create([
            'email' => 'old-email@example.com',
        ]);
        $customer->forceFill(['phone_verified_at' => now()])->save();

        $response = $this->actingAs($customer, 'web')->patch(route('profile.update'), [
            'name' => $customer->name,
            'email' => 'NEW-EMAIL@EXAMPLE.COM',
            'phone' => '+91 9123456789',
            'email_verified_at' => now()->toIso8601String(),
            'phone_verified_at' => now()->toIso8601String(),
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

        $customer->refresh();
        $this->assertSame('new-email@example.com', $customer->email);
        $this->assertSame('+91 9123456789', $customer->phone);
        $this->assertNull($customer->email_verified_at);
        $this->assertNull($customer->phone_verified_at);

        Notification::assertSentTo($customer, VerifyEmailNotification::class);
    }

    public function test_customer_can_update_password_and_rejects_wrong_current_password(): void
    {
        $customer = User::factory()->create([
            'password' => Hash::make('OldPassword123!'),
        ]);

        $invalidResponse = $this->actingAs($customer, 'web')
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'WrongPassword!',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);

        $invalidResponse
            ->assertRedirect(route('security.edit'))
            ->assertSessionHasErrors('current_password');

        $validResponse = $this->actingAs($customer, 'web')
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'OldPassword123!',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);

        $validResponse
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('security.edit'));

        $customer->refresh();
        $this->assertTrue(Hash::check('NewPassword123!', $customer->password));
    }

    public function test_security_and_appearance_pages_render_for_confirmed_verified_customer(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'web')
            ->withSession(['auth.password_confirmed_at' => time()]);

        $this->get(route('security.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/security')
                ->where('passwordConfigured', true)
                ->where('twoFactorEnabled', false)
                ->where('twoFactorConfirmed', false)
                ->where('passkeys', []),
            );

        $this->get(route('appearance.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/appearance'),
            );
    }

    public function test_customer_account_deletion_cascades_passkeys_and_preserves_owner_and_admin_sessions_and_records(): void
    {
        $sharedEmail = 'shared-person@tijum.test';

        $customer = User::factory()->create([
            'email' => $sharedEmail,
            'password' => Hash::make('CustomerSecret123!'),
        ]);
        $owner = Owner::factory()->active()->create([
            'email' => $sharedEmail,
        ]);
        $admin = Admin::factory()->create([
            'email' => $sharedEmail,
        ]);

        DB::table('passkeys')->insert([
            'user_id' => $customer->id,
            'name' => 'Phone Key',
            'credential_id' => 'cred-delete-1',
            'credential' => json_encode(['id' => 'cred-delete-1']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($customer, 'web');
        $this->actingAs($owner, 'owner');
        $this->actingAs($admin, 'admin');

        $response = $this->delete(route('profile.destroy'), [
            'password' => 'CustomerSecret123!',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('home'));

        $this->assertGuest('web');
        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertAuthenticatedAs($admin, 'admin');

        $this->assertDatabaseMissing('users', ['id' => $customer->id]);
        $this->assertDatabaseMissing('passkeys', ['user_id' => $customer->id]);
        $this->assertDatabaseHas('owners', ['id' => $owner->id, 'email' => $sharedEmail]);
        $this->assertDatabaseHas('admins', ['id' => $admin->id, 'email' => $sharedEmail]);
    }

    public function test_customer_account_deletion_fails_with_wrong_password(): void
    {
        $customer = User::factory()->create([
            'password' => Hash::make('CustomerSecret123!'),
        ]);

        $response = $this->actingAs($customer, 'web')
            ->from(route('profile.edit'))
            ->delete(route('profile.destroy'), [
                'password' => 'WrongPassword!',
            ]);

        $response
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHasErrors('password');

        $this->assertAuthenticatedAs($customer, 'web');
        $this->assertDatabaseHas('users', ['id' => $customer->id]);
    }
}
