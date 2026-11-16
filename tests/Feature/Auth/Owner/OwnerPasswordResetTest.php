<?php

declare(strict_types=1);

namespace Tests\Feature\Auth\Owner;

use App\Models\Owner;
use App\Notifications\Owner\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OwnerPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_reset_link_screen_can_be_rendered(): void
    {
        $this->get(route('owner.password.request'))
            ->assertOk();
    }

    public function test_owner_reset_link_can_be_requested_and_stored_exclusively_in_owner_table(): void
    {
        Notification::fake();

        $owner = Owner::factory()->active()->create();

        $response = $this->post(route('owner.password.email'), [
            'email' => $owner->email,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('status');

        $this->assertDatabaseHas('owner_password_reset_tokens', [
            'email' => $owner->email,
        ]);
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->assertDatabaseCount('admin_password_reset_tokens', 0);

        Notification::assertSentTo($owner, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($owner): bool {
            $resetResponse = $this->get(route('owner.password.reset', [
                'token' => $notification->token,
                'email' => $owner->email,
            ]));

            $resetResponse->assertOk();

            $updateResponse = $this->post(route('owner.password.update'), [
                'token' => $notification->token,
                'email' => $owner->email,
                'password' => 'NewPartnerPass123!',
                'password_confirmation' => 'NewPartnerPass123!',
            ]);

            $updateResponse->assertRedirect(route('owner.login'));
            $this->assertTrue(Hash::check('NewPartnerPass123!', $owner->fresh()->password));

            return true;
        });
    }

    public function test_owner_reset_link_can_be_requested_with_phone_number(): void
    {
        Notification::fake();

        $owner = Owner::factory()->active()->create([
            'phone' => '+919876543210',
        ]);

        $response = $this->post(route('owner.password.email'), [
            'email' => '+919876543210',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('status');

        $this->assertDatabaseHas('owner_password_reset_tokens', [
            'email' => $owner->email,
        ]);

        Notification::assertSentTo($owner, ResetPasswordNotification::class);
    }
}
