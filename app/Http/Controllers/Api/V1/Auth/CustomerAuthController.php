<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\SubscriberStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\CustomerProfileResource;
use App\Models\MarketingConsentRecord;
use App\Models\MarketingSubscriber;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;

class CustomerAuthController extends ApiController
{
    private const CUSTOMER_ABILITIES = [
        'customer:read',
        'customer:write',
        'reservations:read',
        'reservations:create',
        'reservations:cancel',
        'reviews:create',
        'notifications:read',
    ];

    public function register(Request $request): JsonResponse
    {
        $rawPhone = (string) $request->input('phone', '');
        $normalizedPhone = preg_replace('/[^0-9]/', '', $rawPhone);
        if (is_string($normalizedPhone) && strlen($normalizedPhone) === 12 && str_starts_with($normalizedPhone, '91')) {
            $normalizedPhone = substr($normalizedPhone, 2);
        }
        if (is_string($normalizedPhone) && $normalizedPhone !== '') {
            $request->merge(['phone' => $normalizedPhone]);
        }

        if (! $request->has('terms') && $request->has('terms_accepted')) {
            $request->merge(['terms' => $request->input('terms_accepted')]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^[0-9]{10}$/', 'unique:users,phone'],
            'password' => ['required', 'string', Password::min(8)],
            'device_name' => ['nullable', 'string', 'max:100'],
            'referral_code' => ['nullable', 'string', 'max:50'],
            'terms' => ['required', 'accepted'],
            'marketing_consent' => ['nullable', 'boolean'],
        ]);

        /** @var User $user */
        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'terms_accepted_at' => now(),
        ]);

        // Initialize wallet & referral profile
        app(LoyaltyPointsService::class)->getOrCreateWallet($user);
        app(ReferralService::class)->getOrCreateProfile($user);

        $referralCode = $validated['referral_code'] ?? $request->cookie('tijum_referral_code');
        if (! empty($referralCode)) {
            app(ReferralService::class)->attributeReferral(
                referredUser: $user,
                referralCode: (string) $referralCode,
                ip: $request->ip(),
                userAgent: $request->userAgent(),
            );
        }

        $deviceName = $validated['device_name'] ?? 'Customer Mobile Device';
        $token = $user->createToken(
            $deviceName,
            self::CUSTOMER_ABILITIES,
            now()->addDays(30)
        );

        if ($validated['marketing_consent'] ?? false) {
            $this->recordMarketingOptIn($user, $request->ip(), (string) $request->userAgent());
        }

        return $this->success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => now()->addDays(30)->toIso8601String(),
            'user' => new CustomerProfileResource($user),
        ], 'Registration successful', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'code' => ['nullable', 'string'],
            'two_factor_code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $login = trim((string) ($request->input('email') ?? $request->input('phone') ?? $request->input('login') ?? ''));

        $throttleKey = 'customer_login:'.Str::lower($login).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return $this->error("Too many login attempts. Please try again in {$seconds} seconds.", 'RATE_LIMITED', 429);
        }

        $phoneDigits = (string) preg_replace('/[^0-9]/', '', $login);
        if (strlen($phoneDigits) === 12 && str_starts_with($phoneDigits, '91')) {
            $phoneDigits = substr($phoneDigits, 2);
        }

        /** @var User|null $user */
        $user = User::query()
            ->where('email', strtolower($login))
            ->orWhere(function ($query) use ($login, $phoneDigits): void {
                $query->where('phone', $login);
                if ($phoneDigits !== '') {
                    $query->orWhere('phone', $phoneDigits);
                }
            })
            ->first();

        if ($user === null || ! Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            return $this->error('The provided credentials do not match our customer records.', 'INVALID_CREDENTIALS', 401);
        }

        if ($user->hasEnabledTwoFactorAuthentication()) {
            $recoveryCode = trim((string) ($validated['recovery_code'] ?? ''));
            $totpCode = trim((string) ($validated['code'] ?? $validated['two_factor_code'] ?? ''));

            if ($recoveryCode === '' && $totpCode === '') {
                return $this->error(
                    'Two-factor authentication code is required for this account.',
                    'TWO_FACTOR_REQUIRED',
                    403,
                    ['two_factor_required' => true],
                );
            }

            if ($recoveryCode !== '') {
                $validRecoveryCode = collect($user->recoveryCodes())
                    ->first(static fn (string $code): bool => hash_equals($code, $recoveryCode));

                if (! is_string($validRecoveryCode)) {
                    RateLimiter::hit($throttleKey, 60);

                    return $this->error(
                        'The provided two-factor recovery code was invalid.',
                        'INVALID_TWO_FACTOR_CODE',
                        422,
                        ['recovery_code' => ['The provided two-factor recovery code was invalid.']],
                    );
                }

                $user->replaceRecoveryCode($validRecoveryCode);
            } else {
                $verified = app(TwoFactorAuthenticationProvider::class)->verify(
                    decrypt((string) $user->two_factor_secret),
                    $totpCode,
                );

                if (! $verified) {
                    RateLimiter::hit($throttleKey, 60);

                    return $this->error(
                        'The provided two-factor authentication code was invalid.',
                        'INVALID_TWO_FACTOR_CODE',
                        422,
                        ['code' => ['The provided two-factor authentication code was invalid.']],
                    );
                }
            }
        }

        RateLimiter::clear($throttleKey);

        $deviceName = $validated['device_name'] ?? 'Customer Mobile Device';
        $token = $user->createToken(
            $deviceName,
            self::CUSTOMER_ABILITIES,
            now()->addDays(30)
        );

        return $this->success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => now()->addDays(30)->toIso8601String(),
            'user' => new CustomerProfileResource($user),
        ], 'Login successful');
    }

    private function recordMarketingOptIn(User $user, ?string $ip, string $userAgent): void
    {
        $email = strtolower($user->email);

        /** @var MarketingSubscriber $subscriber */
        $subscriber = MarketingSubscriber::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $user->name,
                'status' => SubscriberStatus::Subscribed,
                'confirmed_at' => now(),
                'unsubscribe_token' => Str::random(48),
                'source' => 'mobile_register',
                'ip_address' => $ip,
                'user_agent' => substr($userAgent, 0, 500),
            ],
        );

        if ($subscriber->status !== SubscriberStatus::Subscribed) {
            $subscriber->update([
                'status' => SubscriberStatus::Subscribed,
                'confirmed_at' => $subscriber->confirmed_at ?? now(),
                'unsubscribed_at' => null,
            ]);
        }

        MarketingConsentRecord::query()->create([
            'marketing_subscriber_id' => $subscriber->id,
            'action' => 'opt_in',
            'channel' => 'email',
            'source' => 'mobile_register',
            'ip_address' => $ip,
            'user_agent' => substr($userAgent, 0, 500),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user instanceof User) {
            $user->currentAccessToken()?->delete();
        }

        return $this->success(null, 'Successfully logged out.');
    }

    public function revokeAll(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user instanceof User) {
            $user->tokens()->delete();
        }

        return $this->success(null, 'All mobile sessions revoked.');
    }

    public function tokens(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return $this->error('Unauthorized account type.', 'INVALID_ACCOUNT_TYPE', 403);
        }

        $tokens = $user->tokens()->get(['id', 'name', 'abilities', 'last_used_at', 'created_at', 'expires_at']);

        return $this->success($tokens);
    }

    public function deleteToken(Request $request, int $tokenId): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return $this->error('Unauthorized account type.', 'INVALID_ACCOUNT_TYPE', 403);
        }

        $deleted = $user->tokens()->where('id', $tokenId)->delete();
        if ($deleted === 0) {
            return $this->error('Token not found.', 'NOT_FOUND', 404);
        }

        return $this->success(null, 'Session token revoked.');
    }
}
