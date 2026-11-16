<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Owner\Auth\RegisterOwner;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Owner\Auth\RegisterRequest;
use App\Http\Resources\Api\V1\OwnerProfileResource;
use App\Models\Owner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OwnerAuthController extends ApiController
{
    private const OWNER_ABILITIES = [
        'owner:read',
        'owner:write',
        'properties:read',
        'reservations:read',
        'reservations:respond',
        'notifications:read',
    ];

    public function register(RegisterRequest $request, RegisterOwner $registerOwner): JsonResponse
    {
        /** @var array{name: string, email: string, phone: string|null, password: string} $validated */
        $validated = $request->validated();

        $owner = $registerOwner->execute($validated);

        $deviceName = $request->input('device_name') ?? 'Partner Mobile Device';
        $token = $owner->createToken(
            $deviceName,
            self::OWNER_ABILITIES,
            now()->addDays(30)
        );

        return $this->success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => now()->addDays(30)->toIso8601String(),
            'owner' => new OwnerProfileResource($owner),
        ], 'Partner registration successful', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $login = trim((string) ($request->input('email') ?? $request->input('phone') ?? $request->input('login') ?? ''));

        $throttleKey = 'owner_login:'.Str::lower($login).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return $this->error("Too many partner login attempts. Please try again in {$seconds} seconds.", 'RATE_LIMITED', 429);
        }

        /** @var Owner|null $owner */
        $owner = Owner::query()
            ->where('email', strtolower($login))
            ->orWhere('phone', $login)
            ->first();

        if ($owner === null || ! Hash::check($validated['password'], $owner->password)) {
            RateLimiter::hit($throttleKey, 60);

            return $this->error('The provided credentials do not match our partner records.', 'INVALID_CREDENTIALS', 401);
        }

        RateLimiter::clear($throttleKey);

        if (! $owner->canSignIn()) {
            return $this->error(
                $owner->status->accessDeniedMessage(),
                'PARTNER_ACCOUNT_INELIGIBLE',
                403,
                ['status' => $owner->status->value]
            );
        }

        $deviceName = $validated['device_name'] ?? 'Partner Mobile Device';
        $token = $owner->createToken(
            $deviceName,
            self::OWNER_ABILITIES,
            now()->addDays(30)
        );

        return $this->success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => now()->addDays(30)->toIso8601String(),
            'owner' => new OwnerProfileResource($owner),
        ], 'Partner login successful');
    }

    public function logout(Request $request): JsonResponse
    {
        $owner = $request->user();
        if ($owner instanceof Owner) {
            $owner->currentAccessToken()?->delete();
        }

        return $this->success(null, 'Successfully logged out.');
    }

    public function revokeAll(Request $request): JsonResponse
    {
        $owner = $request->user();
        if ($owner instanceof Owner) {
            $owner->tokens()->delete();
        }

        return $this->success(null, 'All partner mobile sessions revoked.');
    }

    public function tokens(Request $request): JsonResponse
    {
        $owner = $request->user();
        if (! $owner instanceof Owner) {
            return $this->error('Unauthorized account type.', 'INVALID_ACCOUNT_TYPE', 403);
        }

        $tokens = $owner->tokens()->get(['id', 'name', 'abilities', 'last_used_at', 'created_at', 'expires_at']);

        return $this->success($tokens);
    }

    public function deleteToken(Request $request, int $tokenId): JsonResponse
    {
        $owner = $request->user();
        if (! $owner instanceof Owner) {
            return $this->error('Unauthorized account type.', 'INVALID_ACCOUNT_TYPE', 403);
        }

        $deleted = $owner->tokens()->where('id', $tokenId)->delete();
        if ($deleted === 0) {
            return $this->error('Token not found.', 'NOT_FOUND', 404);
        }

        return $this->success(null, 'Partner session token revoked.');
    }
}
