<?php

declare(strict_types=1);

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[+0-9\s\-()]{10,20}$/',
                Rule::unique(User::class, 'phone'),
            ],
            'password' => $this->passwordRules(),
            'terms' => ['accepted'],
        ], [
            'phone.required' => 'A mobile number is required to register.',
            'phone.regex' => 'Please enter a valid mobile number.',
            'phone.unique' => 'This mobile number is already registered.',
            'terms.accepted' => 'You must accept the Terms and Conditions to register.',
        ])->validate();

        $phone = preg_replace('/[^0-9]/', '', (string) ($input['phone'] ?? ''));
        if (strlen($phone) === 12 && str_starts_with($phone, '91')) {
            $phone = substr($phone, 2);
        }

        /** @var User $user */
        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'phone' => $phone ?: $input['phone'],
            'password' => $input['password'],
            'terms_accepted_at' => now(),
        ]);

        // Initialize wallet & referral profile
        app(LoyaltyPointsService::class)->getOrCreateWallet($user);
        app(ReferralService::class)->getOrCreateProfile($user);

        // Attribute referral if present in payload or cookie
        $referralCode = $input['referral_code'] ?? request()->cookie('tijum_referral_code');
        if (is_string($referralCode) && trim($referralCode) !== '') {
            app(ReferralService::class)->attributeReferral(
                referredUser: $user,
                referralCode: trim($referralCode),
                ip: request()->ip(),
                userAgent: request()->userAgent(),
            );
        }

        return $user;
    }
}
