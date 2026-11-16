<?php

namespace Tests\Feature\Auth;

use App\Enums\ReferralStatus;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '+919876543210',
            'terms' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'phone' => '9876543210',
        ]);
    }

    public function test_registration_requires_phone_number()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'terms' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors(['phone']);
        $this->assertGuest();
    }

    public function test_registration_requires_terms_acceptance()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '+919876543210',
            'terms' => false,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors(['terms']);
        $this->assertGuest();
    }

    public function test_registration_with_valid_referral_code_awards_welcome_bonus_points()
    {
        /** @var User $referrer */
        $referrer = User::factory()->create([
            'phone' => '9111111111',
        ]);
        $profile = app(ReferralService::class)->getOrCreateProfile($referrer);

        $response = $this->post(route('register.store'), [
            'name' => 'Referred Friend',
            'email' => 'friend@example.com',
            'phone' => '9222222222',
            'referral_code' => $profile->referral_code,
            'terms' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        /** @var User $newUser */
        $newUser = User::where('email', 'friend@example.com')->firstOrFail();
        $this->assertSame($referrer->id, $newUser->referred_by_user_id);

        // Check wallet has 250 welcome points credited
        $wallet = app(LoyaltyPointsService::class)->getOrCreateWallet($newUser);
        $this->assertSame(250, $wallet->available_points);

        $this->assertDatabaseHas('customer_referrals', [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $newUser->id,
            'referral_code_used' => $profile->referral_code,
            'status' => ReferralStatus::Registered->value,
            'referred_reward_points' => 250,
        ]);
    }
}
