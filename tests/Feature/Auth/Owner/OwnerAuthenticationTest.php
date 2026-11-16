<?php

declare(strict_types=1);

namespace Tests\Feature\Auth\Owner;

use App\Enums\OwnerStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use App\Notifications\Owner\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class OwnerAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_login_screen_can_be_rendered(): void
    {
        $response = $this->get(route('owner.login'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('owner/auth/login')
            ->where('canResetPassword', true)
            ->where('auth.owner', null)
            ->missing('auth.user')
            ->missing('auth.admin'),
        );
    }

    #[TestWith(['pending_verification'])]
    #[TestWith(['pending_review'])]
    #[TestWith(['active'])]
    public function test_permitted_owners_can_authenticate_and_view_dashboard(string $statusValue): void
    {
        $status = OwnerStatus::from($statusValue);

        $owner = Owner::factory()->create([
            'status' => $status,
            'email_verified_at' => $status === OwnerStatus::PendingVerification ? null : now(),
        ]);

        $response = $this->post(route('owner.login.store'), [
            'email' => $owner->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('owner.dashboard'));
        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertGuest('web');
        $this->assertGuest('admin');

        $dashboardResponse = $this->actingAs($owner, 'owner')
            ->get(route('owner.dashboard'));

        $dashboardResponse->assertOk();
        $dashboardResponse->assertInertia(fn (Assert $page) => $page
            ->component('owner/dashboard')
            ->where('onboarding.accountStatus', $statusValue)
            ->where('onboarding.canPublishProperties', $status === OwnerStatus::Active),
        );
    }

    public function test_owners_can_authenticate_using_phone_number(): void
    {
        $owner = Owner::factory()->create([
            'phone' => '+919876543210',
            'status' => OwnerStatus::Active,
            'password' => bcrypt('PartnerPass123!'),
        ]);

        $response = $this->post(route('owner.login.store'), [
            'email' => '+919876543210',
            'password' => 'PartnerPass123!',
        ]);

        $response->assertRedirect(route('owner.dashboard'));
        $this->assertAuthenticatedAs($owner, 'owner');
        $this->assertGuest('web');
        $this->assertGuest('admin');
    }

    #[TestWith(['rejected'])]
    #[TestWith(['suspended'])]
    public function test_rejected_and_suspended_owners_cannot_authenticate(string $statusValue): void
    {
        $owner = Owner::factory()->create([
            'status' => OwnerStatus::from($statusValue),
        ]);

        $response = $this->from(route('owner.login'))
            ->post(route('owner.login.store'), [
                'email' => $owner->email,
                'password' => 'password',
            ]);

        $response->assertRedirect(route('owner.login'));
        $response->assertSessionHasErrors('email');
        $this->assertGuest('owner');
    }

    #[TestWith(['rejected'])]
    #[TestWith(['suspended'])]
    public function test_rejected_and_suspended_owners_are_logged_out_by_middleware(string $statusValue): void
    {
        $owner = Owner::factory()->active()->create();

        $this->actingAs($owner, 'owner');
        $owner->forceFill(['status' => OwnerStatus::from($statusValue)])->save();

        $response = $this->get(route('owner.dashboard'));

        $response->assertRedirect(route('owner.login'));
        $response->assertSessionHasErrors('email');
        $this->assertGuest('owner');
    }

    public function test_owners_cannot_authenticate_with_invalid_password(): void
    {
        $owner = Owner::factory()->active()->create();

        $response = $this->post(route('owner.login.store'), [
            'email' => $owner->email,
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest('owner');
    }

    public function test_owner_login_is_rate_limited(): void
    {
        $owner = Owner::factory()->active()->create();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post(route('owner.login.store'), [
                'email' => $owner->email,
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->post(route('owner.login.store'), [
            'email' => $owner->email,
            'password' => 'wrong-password',
        ]);

        $response->assertTooManyRequests();
    }

    public function test_owners_can_logout_without_destroying_customer_or_admin_sessions(): void
    {
        $user = User::factory()->create();
        $owner = Owner::factory()->active()->create();
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($user, 'web');
        $this->actingAs($owner, 'owner');
        $this->actingAs($admin, 'admin');

        $response = $this->post(route('owner.logout'));

        $response->assertRedirect(route('owner.login'));
        $this->assertGuest('owner');
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertAuthenticatedAs($admin, 'admin');
    }

    public function test_owners_can_update_profile_and_email_change_triggers_reverification(): void
    {
        Notification::fake();

        $owner = Owner::factory()->pendingReview()->create();

        $response = $this->actingAs($owner, 'owner')
            ->patch(route('owner.profile.update'), [
                'name' => 'Updated Partner Name',
                'email' => 'new-partner@hostel.in',
                'phone' => '+919988776655',
            ]);

        $response->assertRedirect(route('owner.profile.edit'));

        $owner->refresh();

        $this->assertSame('Updated Partner Name', $owner->name);
        $this->assertSame('new-partner@hostel.in', $owner->email);
        $this->assertNull($owner->email_verified_at);
        $this->assertSame(OwnerStatus::PendingVerification, $owner->status);

        Notification::assertSentTo($owner, VerifyEmailNotification::class);
    }
}
