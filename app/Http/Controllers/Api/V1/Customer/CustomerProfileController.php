<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\CustomerProfileResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
            'phone' => ['nullable', 'string', 'max:20'],
            'marketing_consent' => ['nullable', 'boolean'],
        ]);

        $user->update($validated);

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

        return $this->success(null, 'Password changed successfully');
    }
}
