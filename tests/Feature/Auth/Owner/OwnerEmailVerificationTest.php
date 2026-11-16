<?php

declare(strict_types=1);

namespace Tests\Feature\Auth\Owner;

use App\Enums\OwnerStatus;
use App\Models\Owner;
use App\Notifications\Owner\VerifyEmailNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class OwnerEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_owner_can_view_verification_notice_and_resend_email(): void
    {
        Notification::fake();

        $owner = Owner::factory()->unverified()->create();

        $this->actingAs($owner, 'owner')
            ->get(route('owner.verification.notice'))
            ->assertOk();

        $this->actingAs($owner, 'owner')
            ->post(route('owner.verification.send'))
            ->assertSessionHas('status', 'verification-link-sent');

        Notification::assertSentTo($owner, VerifyEmailNotification::class);
    }

    public function test_owner_email_verification_advances_pending_verification_to_pending_review(): void
    {
        Event::fake([Verified::class]);

        $owner = Owner::factory()->unverified()->create();

        $verificationUrl = URL::temporarySignedRoute(
            'owner.verification.verify',
            now()->addMinutes(60),
            [
                'id' => $owner->id,
                'hash' => sha1($owner->email),
            ],
        );

        $response = $this->actingAs($owner, 'owner')->get($verificationUrl);

        $response->assertRedirect(route('owner.dashboard'));

        $owner->refresh();

        $this->assertNotNull($owner->email_verified_at);
        $this->assertSame(OwnerStatus::PendingReview, $owner->status);
        Event::assertDispatched(Verified::class);
    }

    public function test_email_verification_preserves_already_active_owner_status(): void
    {
        $owner = Owner::factory()->create([
            'status' => OwnerStatus::Active,
            'email_verified_at' => null,
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'owner.verification.verify',
            now()->addMinutes(60),
            [
                'id' => $owner->id,
                'hash' => sha1($owner->email),
            ],
        );

        $this->actingAs($owner, 'owner')->get($verificationUrl)
            ->assertRedirect(route('owner.dashboard'));

        $owner->refresh();

        $this->assertTrue($owner->hasVerifiedEmail());
        $this->assertSame(OwnerStatus::Active, $owner->status);
    }

    public function test_owner_email_verification_rejects_invalid_hash(): void
    {
        $owner = Owner::factory()->unverified()->create();

        $verificationUrl = URL::temporarySignedRoute(
            'owner.verification.verify',
            now()->addMinutes(60),
            [
                'id' => $owner->id,
                'hash' => sha1('wrong@hostel.in'),
            ],
        );

        $this->actingAs($owner, 'owner')
            ->get($verificationUrl)
            ->assertForbidden();

        $this->assertFalse($owner->fresh()->hasVerifiedEmail());
    }
}
