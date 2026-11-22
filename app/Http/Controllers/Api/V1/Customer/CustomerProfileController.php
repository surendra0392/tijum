<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\CustomerProfileResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CustomerProfileController extends ApiController
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->success(new CustomerProfileResource($user));
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class, 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'marketing_consent' => ['nullable', 'boolean'],
        ]);

        $emailChanged = isset($validated['email']) && strtolower((string) $validated['email']) !== strtolower($user->email);
        $phoneChanged = array_key_exists('phone', $validated) && $validated['phone'] !== $user->phone;

        $user->fill($validated);

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        if ($phoneChanged) {
            $user->phone_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        return $this->success(new CustomerProfileResource($user), 'Profile updated successfully');
    }

    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            return $this->error('The provided current password does not match.', 'INVALID_PASSWORD', 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        $currentTokenId = optional($user->currentAccessToken())->getKey();
        $user->tokens()
            ->when($currentTokenId !== null, static fn ($q) => $q->where('id', '!=', $currentTokenId))
            ->delete();

        return $this->success(null, 'Password changed successfully');
    }
}
